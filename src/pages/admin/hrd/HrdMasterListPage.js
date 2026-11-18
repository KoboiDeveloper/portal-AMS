import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalBody,
} from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import FormModal from "../../../components/admin/common/FormModal";
import ConfirmDialog from "../../../components/admin/common/ConfirmDialog";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { extractRow, extractRows, notifyResponse } from "../../../lib/response";
import { normalizeFormPayload, applyFieldMask } from "../../../lib/formFieldUtils";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import { hrdProcess, hrdProcessService } from "../../../services/hrd/hrd.service";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { ScBadge, ScBtn, ScEmptyState, ScError, ScPageHeader, ScSkeletonBlock } from "../dgs/sc";
import { RivStickyThead } from "../regional/RivStickyThead";
import HrdHScrollRail from "./HrdHScrollRail";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "../regional/reg-store-list.css";
import "./hrd-personel.css";
import "./hrd-kontrak.css";

const isActiveStatus = (row) => {
  if (row?.aktif === 1 || row?.aktif === "1" || row?.aktif === true) return true;
  if (row?.aktif === 0 || row?.aktif === "0" || row?.aktif === false) return false;
  const s = String(row?.status || "").toUpperCase();
  return s === "AKTIF" || s === "ACTIVE";
};

const cellText = (row, col) => {
  if (!col) return "—";
  if (col.type === "title") {
    return {
      main: row[col.titleKey] || row[col.key] || "—",
      meta: col.subtitleKey ? row[col.subtitleKey] || "" : "",
    };
  }
  const v = row[col.key];
  if (v == null || v === "") return { main: "—" };
  return { main: String(v) };
};

const sortKeyOf = (col) => {
  if (!col) return "";
  if (col.type === "title") return col.titleKey || col.key;
  if (col.type === "status_toggle") return "aktif";
  return col.key || "";
};

const cmpStr = (a, b, dir) => {
  const c = String(a ?? "").localeCompare(String(b ?? ""), "id", {
    sensitivity: "base",
    numeric: true,
  });
  return dir === "desc" ? -c : c;
};

const toSortNumber = (v) => {
  if (v == null || v === "") return NaN;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (!s) return NaN;
  /* id-ID "20.000,00" atau plain "20000.00" */
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) || /^\d+,\d+$/.test(s)) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

const sortMark = (key, sort) => {
  if (sort.key !== key) return "";
  return sort.dir === "asc" ? " ↑" : " ↓";
};

const statusPillTone = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED BY HRD" || s === "APPROVED" || s === "AKTIF" || s === "ACTIVE") {
    return "ok";
  }
  if (s === "APPROVED BY MANAGERIAL" || s === "NEW" || s === "PENDING") {
    return "warn";
  }
  if (s === "REJECTED" || s === "NON ACTIVE" || s === "TIDAK AKTIF") {
    return "bad";
  }
  return "new";
};

const deptNameOf = (row, groupKey = "department") => {
  const v = row?.[groupKey] || row?.department || row?.department_name || row?.DepartemenStr;
  const s = String(v || "").trim();
  return s || "Tanpa departemen";
};

const buildFilterState = (filterDefs = []) =>
  (filterDefs || []).reduce((acc, f) => {
    if (f.type === "daterange") {
      const fromKey = f.fromKey || "from_date";
      const toKey = f.toKey || "to_date";
      acc[fromKey] = f.defaultFrom ?? f.defaultValue?.from ?? "";
      acc[toKey] = f.defaultTo ?? f.defaultValue?.to ?? "";
      return acc;
    }
    acc[f.name] = f.defaultValue ?? "";
    return acc;
  }, {});

const HrdMasterListPage = ({ config }) => {
  const perms = useActionPermissions(config.moduleCode);
  const tableRef = useRef(null);
  const pageSize = config.pageSize || 20;
  const columns = config.projectListColumns || config.columns || [];
  const filterDefs = useMemo(
    () => config.filterDefs || [],
    [config.filterDefs]
  );
  const defaultSortKey =
    config.defaultSort?.key ||
    sortKeyOf(columns.find((c) => c.type === "title")) ||
    sortKeyOf(columns[0]) ||
    "nama";
  const defaultSortDir = config.defaultSort?.dir || "asc";
  const idField = config.idField || "id";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(() => buildFilterState(filterDefs));
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: defaultSortKey, dir: defaultSortDir });
  const [modal, setModal] = useState({ open: false, mode: "add" });
  const [formData, setFormData] = useState(config.initialForm || {});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, row: null });
  const [busyStatusId, setBusyStatusId] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, action: "" });
  const [pendingRows, setPendingRows] = useState([]);
  const [pendingPopup, setPendingPopup] = useState({ open: false, dept: "" });

  const canCreate = !config.readOnly && !perms.loading && perms.CREATE;
  const canEdit = !config.readOnly && !config.disableUpdate && !perms.loading && perms.UPDATE;
  const canDelete = !config.readOnly && !perms.loading && perms.DELETE;
  const canToggleStatus = !!config.statusToggle && canEdit;
  const selectable = !!config.selectable;
  const canBulkApprove = selectable && !!config.bulkApprove && canEdit;
  const canBulkDelete = selectable && !!config.bulkDelete && canDelete;
  const pendingBadge = config.pendingBadge || null;
  const pendingGroupKey = pendingBadge?.groupKey || "department";

  const rowSelectable = useCallback(
    (row) => {
      if (!selectable) return false;
      if (row?.selectable === false || row?.selectable === 0 || row?.selectable === "0") {
        return false;
      }
      const st = String(row?.status || "").toUpperCase();
      if (st === "APPROVED BY HRD") return false;
      return true;
    },
    [selectable]
  );

  const toggleSort = useCallback((key) => {
    if (!key) return;
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
    setPage(1);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filterParams = {};
      Object.entries(filters || {}).forEach(([key, v]) => {
        if (v != null && String(v).trim() !== "") filterParams[key] = String(v).trim();
      });
      const listParams = {
        keywords: search.trim() || undefined,
        ...filterParams,
      };
      const res = await config.service.list(listParams);
      /* replace + dedupe by id — jangan pernah append */
      const next = extractRows(res);
      const seen = new Set();
      const unique = [];
      next.forEach((row) => {
        const id = row?.[idField];
        const key = id != null && id !== "" ? String(id) : JSON.stringify(row);
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(row);
      });
      setRows(unique);
      setSelectedIds(new Set());
      setPage(1);

      /* Badge strip: always load pending status for same date range (ignore status filter) */
      if (pendingBadge?.status && config.service?.list) {
        const pendingParams = { ...listParams, status: pendingBadge.status };
        try {
          const pendingRes = await config.service.list(pendingParams);
          const pendingNext = extractRows(pendingRes);
          const pSeen = new Set();
          const pUnique = [];
          pendingNext.forEach((row) => {
            const id = row?.[idField];
            const key = id != null && id !== "" ? String(id) : JSON.stringify(row);
            if (pSeen.has(key)) return;
            pSeen.add(key);
            pUnique.push(row);
          });
          setPendingRows(pUnique);
        } catch {
          setPendingRows([]);
        }
      } else {
        setPendingRows([]);
      }
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Gagal memuat data");
      setRows([]);
      setSelectedIds(new Set());
      setPendingRows([]);
    } finally {
      setLoading(false);
    }
  }, [config.service, search, filters, filterDefs, idField, pendingBadge]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedRows = useMemo(() => {
    const key = sort.key;
    const colDef = columns.find((c) => sortKeyOf(c) === key);
    const valueKey = colDef?.sortKey || key;
    const sortType = colDef?.sortType || colDef?.type || "";
    const list = rows.slice();
    list.sort((a, b) => {
      let av = a?.[valueKey];
      let bv = b?.[valueKey];
      if (key === "aktif" || sortType === "status_toggle") {
        av = isActiveStatus(a) ? 1 : 0;
        bv = isActiveStatus(b) ? 1 : 0;
        const cmp = Number(av) - Number(bv);
        if (cmp !== 0) return sort.dir === "desc" ? -cmp : cmp;
      } else if (sortType === "number" || sortType === "money") {
        const an = toSortNumber(av);
        const bn = toSortNumber(bv);
        const aOk = Number.isFinite(an);
        const bOk = Number.isFinite(bn);
        if (aOk || bOk) {
          const cmp = (aOk ? an : 0) - (bOk ? bn : 0);
          if (cmp !== 0) return sort.dir === "desc" ? -cmp : cmp;
        }
      } else {
        const cmp = cmpStr(av, bv, sort.dir);
        if (cmp !== 0) return cmp;
      }
      /* secondary: jabatan lalu id ASC (parity SQL overtime_amount) */
      const j = cmpStr(a?.jabatan, b?.jabatan, "asc");
      if (j !== 0) return j;
      return Number(a?.[idField] || 0) - Number(b?.[idField] || 0);
    });
    return list;
  }, [rows, sort, columns, idField]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const openAdd = () => {
    setFormData({ ...(config.initialForm || {}) });
    setModal({ open: true, mode: "add" });
  };

  const openEdit = async (row) => {
    const mapped = { ...(config.initialForm || {}) };
    let detail = row;
    try {
      const res = await config.service.get(row[config.idField || "id"]);
      detail = { ...row, ...(extractRow(res) || {}) };
    } catch {
      detail = row;
    }
    (config.fields || []).forEach((field) => {
      let value = detail[field.name] ?? mapped[field.name];
      /* select FK: pakai *_id (bukan label list) */
      if (field.name === "divisi") {
        value = detail.divisi_id ?? detail.divisi ?? value;
      }
      if (field.name === "brand") {
        value = detail.brand_id ?? detail.brand ?? value;
      }
      if (field.type === "checkbox") {
        mapped[field.name] =
          value === true ||
          value === 1 ||
          value === "1" ||
          value === "true" ||
          value === "Y" ||
          value === "y";
        return;
      }
      if (field.mask && value != null && value !== "") {
        value = applyFieldMask(field.mask, value);
      }
      mapped[field.name] = value != null ? String(value) : "";
    });
    setFormData(mapped);
    setModal({ open: true, mode: "edit", row });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = normalizeFormPayload(config.fields || [], formData);
      let res;
      if (modal.mode === "add") res = await config.service.create(payload);
      else res = await config.service.update(modal.row[config.idField || "id"], payload);
      if (
        notifyResponse(
          res,
          modal.mode === "add" ? "Data tersimpan" : "Data diperbarui"
        )
      ) {
        setModal({ open: false, mode: "add" });
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm.row) return;
    setSaving(true);
    try {
      const res = await config.service.remove(confirm.row[config.idField || "id"]);
      if (notifyResponse(res, "Data dihapus")) {
        setConfirm({ open: false, row: null });
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (row, checked) => {
    const id = String(row?.[idField] ?? "");
    if (!id || !rowSelectable(row)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const pageSelectableRows = useMemo(
    () => pageRows.filter(rowSelectable),
    [pageRows, rowSelectable]
  );

  const pendingByDept = useMemo(() => {
    if (!pendingBadge) return [];
    const map = new Map();
    pendingRows.forEach((r) => {
      const key = deptNameOf(r, pendingGroupKey);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "id"));
  }, [pendingBadge, pendingRows, pendingGroupKey]);

  const pendingPopupRows = useMemo(() => {
    if (!pendingPopup.open) return [];
    if (!pendingPopup.dept) return pendingRows;
    return pendingRows.filter((r) => deptNameOf(r, pendingGroupKey) === pendingPopup.dept);
  }, [pendingPopup, pendingRows, pendingGroupKey]);

  const openPending = (dept) => {
    /* Hanya buka popup — jangan ubah filter/reload list utama */
    setPendingPopup({ open: true, dept: dept || "" });
  };

  const allPageSelected =
    pageSelectableRows.length > 0 &&
    pageSelectableRows.every((r) => selectedIds.has(String(r[idField])));

  const toggleSelectPage = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageSelectableRows.forEach((r) => {
        const id = String(r[idField]);
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const runBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setSaving(true);
    try {
      const path = config.approvePath || "par/overtime/approve";
      const res =
        path === "par/overtime/approve"
          ? await hrdProcessService.overtimeApprove({ ids })
          : await hrdProcess(path, { ids });
      if (notifyResponse(res, "Data di-approve")) {
        setBulkConfirm({ open: false, action: "" });
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const runBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setSaving(true);
    try {
      let ok = 0;
      for (const id of ids) {
        const res = await config.service.remove(id);
        if (String(res?.responseCode || "").startsWith("200")) ok += 1;
      }
      notifyResponse(
        { responseCode: "2002500", responseMessage: `${ok} data dihapus` },
        `${ok} data dihapus`
      );
      setBulkConfirm({ open: false, action: "" });
      loadData();
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    const id = row?.[config.idField || "id"];
    if (!id || !config.statusTogglePath) return;
    const active = isActiveStatus(row);
    const action =
      row.confirm_status || (active ? "NONAKTIFKAN" : "AKTIFKAN");
    setBusyStatusId(String(id));
    try {
      const res = await hrdProcess(config.statusTogglePath, {
        id: String(id),
        action,
        confirm_status: action,
        ngapain: action,
      });
      if (notifyResponse(res, active ? "Cabang dinonaktifkan" : "Cabang diaktifkan")) {
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setBusyStatusId("");
    }
  };

  const modalFields = (config.fields || []).map((field) => ({
    ...field,
    disabled: !!(field.disabled || (field.disabledOnEdit && modal.mode === "edit")),
  }));

  return (
    <AccessGuard moduleCode={config.moduleCode} permission="VIEW">
      <Head title={config.title} />
      <Content>
        <PageSmoothScroll
          /* Jangan ikut sort.key/dir — loco update saat sort bisa menduplikasi tampilan list */
          revision={`${loading ? 1 : 0}-${page}-${rows.length}`}
          className="riv-page-scroll"
        >
          <div className="hrd-sc hrd-kontrak dgs-dash sc-scope">
            <ScPageHeader
              title={config.title}
              description={config.description || "Master data HRD"}
              actions={
                <div className="hrd-toolbar-actions">
                  {filterDefs.map((f) => {
                    const isYear = f.name === "year" || f.name === "tahun";
                    const filterClass = `form-control form-control-sm hrd-toolbar-filter${
                      isYear ? " hrd-toolbar-filter--year" : ""
                    }`;
                    if (f.type === "daterange") {
                      const fromKey = f.fromKey || "from_date";
                      const toKey = f.toKey || "to_date";
                      return (
                        <div
                          key={f.name}
                          className="hrd-toolbar-filter hrd-toolbar-filter--daterange"
                          title={f.label || "Periode"}
                        >
                          <AppDateRangePicker
                            startDate={filters[fromKey] || ""}
                            endDate={filters[toKey] || ""}
                            placeholder={f.label || "Select date range"}
                            className="form-control form-control-sm hrd-toolbar-daterange"
                            onChange={(fromYmd, toYmd) =>
                              setFilters((prev) => ({
                                ...prev,
                                [fromKey]: fromYmd || "",
                                [toKey]: toYmd || "",
                              }))
                            }
                          />
                        </div>
                      );
                    }
                    if (f.type === "select" || f.options) {
                      return (
                        <select
                          key={f.name}
                          className={filterClass}
                          value={filters[f.name] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFilters((prev) => ({ ...prev, [f.name]: val }));
                          }}
                          title={f.label || f.name}
                          aria-label={f.label || f.name}
                        >
                          {(f.options || []).map((opt) => (
                            <option key={String(opt.value)} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      );
                    }
                    return (
                      <input
                        key={f.name}
                        type={f.type === "date" ? "date" : "text"}
                        className={filterClass}
                        placeholder={f.label || f.name}
                        value={filters[f.name] ?? ""}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, [f.name]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && loadData()}
                        aria-label={f.label || f.name}
                      />
                    );
                  })}
                  {!config.hideSearch ? (
                    <div className="sc-page-search">
                      <input
                        className="form-control form-control-sm sc-page-search__input"
                        placeholder="Cari…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadData()}
                      />
                      <ScBtn disabled={loading} onClick={loadData}>
                        <Icon name="search" /> Cari
                      </ScBtn>
                    </div>
                  ) : null}
                  {canCreate ? (
                    <ScBtn onClick={openAdd}>
                      <Icon name="plus" /> Tambah
                    </ScBtn>
                  ) : null}
                  {canBulkApprove ? (
                    <ScBtn
                      disabled={saving || selectedIds.size === 0}
                      onClick={() => setBulkConfirm({ open: true, action: "approve" })}
                    >
                      <Icon name="check-circle" /> Approve
                    </ScBtn>
                  ) : null}
                  {canBulkDelete ? (
                    <ScBtn
                      variant="soft"
                      disabled={saving || selectedIds.size === 0}
                      onClick={() => setBulkConfirm({ open: true, action: "delete" })}
                    >
                      <Icon name="trash" /> Delete
                    </ScBtn>
                  ) : null}
                  <ScBtn variant="soft" disabled={loading} onClick={loadData}>
                    <Icon name="reload" />
                  </ScBtn>
                </div>
              }
            />

            {loading ? (
              <div className="hrd-skel" aria-busy="true">
                <div className="hrd-skel__table sc-panel sc-panel--flush">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="hrd-skel__tr">
                      <ScSkeletonBlock className="hrd-skel__td hrd-skel__td--main" />
                      <ScSkeletonBlock className="hrd-skel__td" />
                      <ScSkeletonBlock className="hrd-skel__td" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <ScError message={error} onRetry={loadData} /> : null}

            {!loading && !error ? (
              <>
                {pendingBadge ? (
                  <>
                    <div className="hrd-kontrak-expiry-head">
                      <div>
                        <strong>{pendingBadge.title || "Menunggu approve HRD"}</strong>
                        <span>{pendingBadge.hint || "Status APPROVED BY MANAGERIAL"}</span>
                      </div>
                      <ScBadge tone={pendingRows.length ? "bad" : "ok"}>
                        {pendingRows.length} data
                      </ScBadge>
                    </div>
                    {pendingRows.length > 0 ? (
                      <HrdHScrollRail
                        className="hrd-kontrak-expiry-rail"
                        ariaLabel="Badge overtime menunggu approve HRD per departemen"
                      >
                        <button
                          type="button"
                          className="hrd-dept-chip hrd-kontrak-chip is-warn"
                          onClick={() => openPending("")}
                        >
                          <span className="hrd-dept-chip__icon" aria-hidden>
                            <Icon name="alert-circle" />
                          </span>
                          <strong>{pendingRows.length}</strong>
                          <em>Semua</em>
                        </button>
                        {pendingByDept.map((d) => (
                          <button
                            key={d.name}
                            type="button"
                            className="hrd-dept-chip hrd-kontrak-chip is-warn"
                            onClick={() => openPending(d.name)}
                            title={d.name}
                          >
                            <span className="hrd-dept-chip__icon" aria-hidden>
                              <Icon name="folder" />
                            </span>
                            <strong>{d.count}</strong>
                            <em>{d.name}</em>
                          </button>
                        ))}
                      </HrdHScrollRail>
                    ) : (
                      <p className="hrd-kontrak-expiry-empty">
                        {pendingBadge.emptyText ||
                          "Tidak ada data menunggu approve HRD."}
                      </p>
                    )}
                  </>
                ) : null}

                {rows.length === 0 ? (
                  <ScEmptyState
                    icon="folder"
                    title="Belum ada data"
                    hint="Tambah data master baru."
                    action={canCreate ? <ScBtn onClick={openAdd}>Tambah</ScBtn> : null}
                  />
                ) : (
                <>
                  <div className="hrd-att__summary" aria-live="polite">
                    <span>
                      <strong>{rows.length.toLocaleString("id-ID")}</strong> data
                    </span>
                  </div>
                  <div className="sc-panel sc-panel--flush">
                    <div className="dgs-table-wrap" style={{ maxHeight: "none", border: 0 }}>
                      <table ref={tableRef} className="dgs-table">
                        <thead>
                          <tr>
                            {selectable ? (
                              <th style={{ width: 36 }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={allPageSelected}
                                  onChange={(e) => toggleSelectPage(e.target.checked)}
                                  aria-label="Pilih semua di halaman"
                                />
                              </th>
                            ) : null}
                            {columns.map((c) => {
                              const sk = sortKeyOf(c);
                              return (
                                <th
                                  key={c.key || c.label}
                                  className={`dgs-th-sort${
                                    sort.key === sk ? " is-sorted" : ""
                                  }`}
                                  onClick={() => toggleSort(sk)}
                                  title="Klik untuk urutkan"
                                >
                                  {c.label}
                                  {sortMark(sk, sort)}
                                </th>
                              );
                            })}
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row, rowIdx) => (
                            <tr
                              key={`${row[idField] ?? "row"}-${rowIdx}`}
                              className={`dgs-row-click${
                                String(row?.status || "").toUpperCase() ===
                                "APPROVED BY MANAGERIAL"
                                  ? " hrd-kontrak-row-expiring"
                                  : ""
                              }`}
                              onClick={() => canEdit && openEdit(row)}
                            >
                              {selectable ? (
                                <td onClick={(e) => e.stopPropagation()}>
                                  {rowSelectable(row) ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.has(String(row[idField]))}
                                      onChange={(e) => toggleSelect(row, e.target.checked)}
                                      aria-label={`Pilih ${row[idField]}`}
                                    />
                                  ) : null}
                                </td>
                              ) : null}
                              {columns.map((c) => {
                                if (c.type === "status_toggle") {
                                  const id = String(row[config.idField || "id"] || "");
                                  const active = isActiveStatus(row);
                                  const confirmLabel =
                                    row.confirm_status ||
                                    (active ? "NONAKTIFKAN" : "AKTIFKAN");
                                  const busy = busyStatusId === id;
                                  return (
                                    <td
                                      key={c.key || c.label}
                                      className="hrd-master-status-td"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {canToggleStatus ? (
                                        <UncontrolledDropdown>
                                          <DropdownToggle
                                            tag="button"
                                            type="button"
                                            className={`btn btn-sm rsl-status-btn ${
                                              active ? "is-on" : "is-off"
                                            }`}
                                            disabled={busy}
                                          >
                                            {busy
                                              ? "…"
                                              : row.status || (active ? "AKTIF" : "TIDAK AKTIF")}
                                            <Icon name="chevron-down" />
                                          </DropdownToggle>
                                          <DropdownMenu end className="rsl-status-menu">
                                            <ul className="link-list-opt no-bdr">
                                              <li>
                                                <DropdownItem
                                                  tag="a"
                                                  href="#toggle"
                                                  onClick={(ev) => {
                                                    ev.preventDefault();
                                                    toggleStatus(row);
                                                  }}
                                                >
                                                  <Icon name={active ? "na" : "check-circle"} />
                                                  <span>{confirmLabel}</span>
                                                </DropdownItem>
                                              </li>
                                            </ul>
                                          </DropdownMenu>
                                        </UncontrolledDropdown>
                                      ) : (
                                        <span
                                          className={`rsl-status-btn ${
                                            active ? "is-on" : "is-off"
                                          }`}
                                        >
                                          {row.status || (active ? "AKTIF" : "TIDAK AKTIF")}
                                        </span>
                                      )}
                                    </td>
                                  );
                                }
                                if (c.type === "badge") {
                                  const st = row[c.key];
                                  return (
                                    <td key={c.key || c.label}>
                                      <span className={`dgs-pill is-${statusPillTone(st)}`}>
                                        {st == null || st === "" ? "—" : String(st)}
                                      </span>
                                    </td>
                                  );
                                }
                                const cell = cellText(row, c);
                                return (
                                  <td key={c.key || c.label}>
                                    <span className="sc-td-main">{cell.main}</span>
                                    {cell.meta ? (
                                      <span className="sc-td-meta">{cell.meta}</span>
                                    ) : null}
                                  </td>
                                );
                              })}
                              <td onClick={(e) => e.stopPropagation()}>
                                <div className="hrd-kontrak-row-actions">
                                  {canEdit ? (
                                    <button
                                      type="button"
                                      className="hrd-kontrak-icon-btn"
                                      title="Detail"
                                      onClick={() => openEdit(row)}
                                    >
                                      <Icon name="eye" />
                                    </button>
                                  ) : null}
                                  {canDelete ? (
                                    <button
                                      type="button"
                                      className="hrd-kontrak-icon-btn is-danger"
                                      title="Hapus"
                                      onClick={() => setConfirm({ open: true, row })}
                                    >
                                      <Icon name="trash" />
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {sortedRows.length > pageSize ? (
                    <div className="reg-ar-pager">
                      <button
                        type="button"
                        className="reg-ar-pager-btn"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </button>
                      <span className="reg-ar-record-info">
                        Hal {page} / {pageCount}
                      </span>
                      <button
                        type="button"
                        className="reg-ar-pager-btn"
                        disabled={page >= pageCount}
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}

                  <RivStickyThead
                    tableRef={tableRef}
                    enabled={!loading && sortedRows.length > 0}
                    tableClassName="dgs-table"
                    interactive
                  />
                </>
                )}
              </>
            ) : null}

            <FormModal
              isOpen={modal.open}
              variant="sc"
              size={config.modalSize || "md"}
              className={`hrd-kontrak-form-anim hrd-form-modal--cols-compact${
                (config.sectionColumns || []).length >= 3 ? " hrd-form-modal--cols3" : ""
              }`}
              sectionColumns={
                config.sectionColumns ||
                /* Status shell: flat section (bukan card stack) */
                [[config.modalSectionTitle || "Data"]]
              }
              title={
                modal.mode === "add"
                  ? `Tambah ${config.modalEntityTitle || config.title}`
                  : `Ubah ${config.modalEntityTitle || config.title}`
              }
              subtitle={
                modal.mode === "edit" &&
                (formData.nama ||
                  formData.kode ||
                  formData.nik ||
                  formData.periode_year ||
                  formData.level ||
                  formData.holiday_date ||
                  formData.description)
                  ? [
                      formData.kode || formData.nik,
                      formData.nama,
                      formData.level
                        ? [formData.level, formData.jabatan].filter(Boolean).join(" / ")
                        : "",
                      formData.holiday_date || formData.description || "",
                      formData.periode_year
                        ? `${formData.periode_year}${
                            formData.periode_month
                              ? `/${String(formData.periode_month).padStart(2, "0")}`
                              : ""
                          }`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : config.modalSubtitle || "Lengkapi data master"
              }
              fields={modalFields}
              formData={formData}
              onChange={(name, value) => setFormData((prev) => ({ ...prev, [name]: value }))}
              onSubmit={handleSave}
              onClose={() => setModal({ open: false, mode: "add" })}
              loading={saving}
              submitLabel={modal.mode === "add" ? "Simpan" : "Update"}
            />

            <ConfirmDialog
              isOpen={confirm.open}
              variant="sc"
              title="Hapus data"
              message={`Hapus ${confirm.row?.nama || confirm.row?.employee_name || confirm.row?.nik || confirm.row?.id || "item"}?`}
              confirmLabel="Hapus"
              onConfirm={handleDelete}
              onCancel={() => setConfirm({ open: false, row: null })}
              loading={saving}
            />

            <ConfirmDialog
              isOpen={bulkConfirm.open}
              variant="sc"
              title={bulkConfirm.action === "approve" ? "Approve data" : "Hapus data"}
              message={
                bulkConfirm.action === "approve"
                  ? `Approve ${selectedIds.size} data terpilih?`
                  : `Hapus ${selectedIds.size} data terpilih?`
              }
              confirmLabel={bulkConfirm.action === "approve" ? "Approve" : "Hapus"}
              onConfirm={
                bulkConfirm.action === "approve" ? runBulkApprove : runBulkDelete
              }
              onCancel={() => setBulkConfirm({ open: false, action: "" })}
              loading={saving}
            />

            {pendingBadge ? (
              <Modal
                isOpen={pendingPopup.open}
                toggle={() => setPendingPopup({ open: false, dept: "" })}
                size="xl"
                className="modal-dialog-centered admin-form-modal hrd-form-modal hrd-form-modal--sc hrd-ot-pending-modal"
                contentClassName="dgs-modal-content"
              >
                <div className="hrd-modal-head">
                  <div>
                    <h5 className="hrd-modal-head__title">
                      {pendingBadge.title || "Menunggu approve HRD"}
                    </h5>
                    <p className="hrd-modal-head__sub">
                      {pendingPopup.dept || "Semua departemen"} · {pendingPopupRows.length}{" "}
                      data · {pendingBadge.status}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="hrd-modal-head__close"
                    onClick={() => setPendingPopup({ open: false, dept: "" })}
                    aria-label="Tutup"
                  >
                    <Icon name="cross" />
                  </button>
                </div>
                <ModalBody className="dgs-modal-body hrd-modal-body">
                  {pendingPopupRows.length === 0 ? (
                    <p className="text-soft mb-0">Tidak ada data.</p>
                  ) : (
                    <div className="dgs-table-wrap hrd-ot-pending-table">
                      <table className="dgs-table">
                        <thead>
                          <tr>
                            <th>Tanggal</th>
                            <th>Nama</th>
                            <th>NIK</th>
                            <th>Departemen</th>
                            <th>Jenis</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingPopupRows.map((row) => (
                            <tr
                              key={row[idField]}
                              className="dgs-row-click"
                              onClick={() => {
                                setPendingPopup({ open: false, dept: "" });
                                openEdit(row);
                              }}
                            >
                              <td>
                                <span className="sc-td-main">{row.tanggal || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">
                                  {row.employee_name || row.nama || "—"}
                                </span>
                              </td>
                              <td>
                                <span className="sc-td-main">{row.nik || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">
                                  {deptNameOf(row, pendingGroupKey)}
                                </span>
                              </td>
                              <td>
                                <span className="sc-td-main">
                                  {row.day || row.jenis_lembur || "—"}
                                </span>
                              </td>
                              <td>
                                <span className={`dgs-pill is-${statusPillTone(row.status)}`}>
                                  {row.status || "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ModalBody>
                <div className="dgs-modal-foot">
                  <ScBtn
                    variant="soft"
                    onClick={() => setPendingPopup({ open: false, dept: "" })}
                  >
                    Tutup
                  </ScBtn>
                </div>
              </Modal>
            ) : null}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdMasterListPage;
