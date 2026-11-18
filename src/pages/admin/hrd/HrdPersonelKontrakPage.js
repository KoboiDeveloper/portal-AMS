import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
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
import {
  createHrdService,
  hrdPersonelInfoService,
} from "../../../services/hrd/hrd.service";
import {
  ScBadge,
  ScBtn,
  ScEmptyState,
  ScError,
  ScPageHeader,
  ScSkeletonBlock,
} from "../dgs/sc";
import { RivStickyThead } from "../regional/RivStickyThead";
import HrdHScrollRail from "./HrdHScrollRail";
import { hrdAbsKontrak } from "./hrdConfigs";
import {
  applyKontrakAutoFields,
  terbilangBulan,
} from "./kontrakFormUtils";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";
import "./hrd-kontrak.css";

const config = hrdAbsKontrak;
const service = config.service;
const personelService = createHrdService("abs/personel", { crud: true });
const pageSize = config.pageSize || 15;

const SORT_COLS = [
  { key: "employee_name", label: "Pegawai", type: "str" },
  { key: "department_name", label: "Departemen", type: "str" },
  { key: "jabatan_name", label: "Jabatan", type: "str" },
  { key: "status_pegawai", label: "Status", type: "str" },
  { key: "tgl_mulai", label: "Mulai", type: "date" },
  { key: "tanggal_berakhir", label: "Selesai", type: "date" },
];

const cmpStr = (a, b, dir) => {
  const c = String(a ?? "").localeCompare(String(b ?? ""), "id", {
    sensitivity: "base",
    numeric: true,
  });
  return dir === "desc" ? -c : c;
};

const cmpDate = (a, b, dir, todayMs) => {
  const da = parseYmd(a)?.getTime();
  const db = parseYmd(b)?.getTime();
  if (da == null && db == null) return 0;
  if (da == null) return 1;
  if (db == null) return -1;
  if (dir === "near") {
    const dist = Math.abs(da - todayMs) - Math.abs(db - todayMs);
    if (dist !== 0) return dist;
    return da - db;
  }
  return dir === "desc" ? db - da : da - db;
};

const sortValOf = (row, key) => {
  if (key === "department_name") return deptNameOf(row);
  return row?.[key];
};

const sortMark = (key, sort) => {
  if (sort.key !== key) return "";
  if (sort.dir === "near") return " ≈";
  return sort.dir === "asc" ? " ↑" : " ↓";
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const parseYmd = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return startOfDay(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return startOfDay(d);
};

const fmtDate = (raw) => {
  const d = parseYmd(raw);
  if (!d) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const daysUntil = (raw, today = startOfDay(new Date())) => {
  const d = parseYmd(raw);
  if (!d) return null;
  return Math.round((d - today) / 86400000);
};

const isTetap = (row) => /tetap/i.test(String(row?.status_pegawai || ""));

const isActivePegawai = (row) => {
  if (row?.is_active === false || row?.is_active === 0 || row?.is_active === "0") return false;
  if (row?.pegawai_non_aktif === 1 || row?.pegawai_non_aktif === "1") return false;
  return true;
};

const deptNameOf = (row) => {
  const name = String(row?.department_name || "").trim();
  // Jangan pakai ID numerik sebagai label
  if (name && !/^\d+$/.test(name)) return name;
  return "Tanpa departemen";
};

/** Kontrak habis dalam 2 bulan: aktif, bukan Tetap, end date in [today, today+2m]. */
const isExpiringSoon = (row, today = startOfDay(new Date()), until = addMonths(today, 2)) => {
  if (!isActivePegawai(row) || isTetap(row)) return false;
  const end = parseYmd(row?.tanggal_berakhir);
  if (!end) return false;
  return end >= today && end <= until;
};

const HrdKontrakSkeleton = () => (
  <div className="hrd-skel" aria-busy="true" aria-label="Memuat personel kontrak">
    <div className="hrd-skel__dept">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="hrd-skel__chip">
          <ScSkeletonBlock className="hrd-skel__chip-icon" />
          <div className="hrd-skel__chip-text">
            <ScSkeletonBlock className="hrd-skel__chip-n" />
            <ScSkeletonBlock className="hrd-skel__chip-l" />
          </div>
        </div>
      ))}
    </div>
    <div className="hrd-skel__table sc-panel sc-panel--flush">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="hrd-skel__tr">
          <ScSkeletonBlock className="hrd-skel__td hrd-skel__td--main" />
          <ScSkeletonBlock className="hrd-skel__td" />
          <ScSkeletonBlock className="hrd-skel__td" />
          <ScSkeletonBlock className="hrd-skel__td" />
          <ScSkeletonBlock className="hrd-skel__td" />
        </div>
      ))}
    </div>
  </div>
);

const HrdPersonelKontrakPage = () => {
  const perms = useActionPermissions(config.moduleCode);
  const tableRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "tanggal_berakhir", dir: "near" });
  const [modal, setModal] = useState({ open: false, mode: "add" });
  const [formData, setFormData] = useState(config.initialForm || {});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, row: null });
  const [expiryPopup, setExpiryPopup] = useState({ open: false, dept: "" });
  const [pick, setPick] = useState({
    open: false,
    q: "",
    loading: false,
    rows: [],
    error: "",
  });

  const today = useMemo(() => startOfDay(new Date()), []);
  const until = useMemo(() => addMonths(today, 2), [today]);

  const toggleSort = useCallback((key) => {
    const col = SORT_COLS.find((c) => c.key === key);
    setSort((s) => {
      if (s.key !== key) {
        return { key, dir: col?.type === "date" && key === "tanggal_berakhir" ? "near" : "asc" };
      }
      if (col?.type === "date" && key === "tanggal_berakhir") {
        const next = s.dir === "near" ? "asc" : s.dir === "asc" ? "desc" : "near";
        return { key, dir: next };
      }
      return { key, dir: s.dir === "asc" ? "desc" : "asc" };
    });
    setPage(1);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await service.list({
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      setRows(extractRows(res));
      setPage(1);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat personel kontrak");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const expiringRows = useMemo(() => {
    return rows
      .filter((r) => isExpiringSoon(r, today, until))
      .sort((a, b) => {
        const da = parseYmd(a.tanggal_berakhir)?.getTime() || 0;
        const db = parseYmd(b.tanggal_berakhir)?.getTime() || 0;
        return da - db;
      });
  }, [rows, today, until]);

  const expiryByDept = useMemo(() => {
    const map = new Map();
    expiringRows.forEach((r) => {
      const key = deptNameOf(r);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }));
  }, [expiringRows]);

  const popupRows = useMemo(() => {
    if (!expiryPopup.open) return [];
    if (!expiryPopup.dept) return expiringRows;
    return expiringRows.filter((r) => deptNameOf(r) === expiryPopup.dept);
  }, [expiryPopup, expiringRows]);

  /** Default: selesai paling dekat ke hari ini; header klik untuk ganti kolom/arah. */
  const sortedRows = useMemo(() => {
    const todayMs = today.getTime();
    const col = SORT_COLS.find((c) => c.key === sort.key);
    const type = col?.type || "str";
    return [...rows].sort((a, b) => {
      const av = sortValOf(a, sort.key);
      const bv = sortValOf(b, sort.key);
      const cmp =
        type === "date"
          ? cmpDate(av, bv, sort.dir, todayMs)
          : cmpStr(av, bv, sort.dir);
      if (cmp !== 0) return cmp;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [rows, today, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page]);

  const canCreate = !perms.loading && perms.CREATE;
  const canEdit = !perms.loading && perms.UPDATE;
  const canDelete = !perms.loading && perms.DELETE;

  const closePick = () =>
    setPick({ open: false, q: "", loading: false, rows: [], error: "" });

  const searchPick = useCallback(async (qRaw) => {
    const q = String(qRaw ?? "").trim();
    if (q.length < 2) {
      setPick((p) => ({
        ...p,
        rows: [],
        error: q ? "Ketik minimal 2 karakter" : "",
        loading: false,
      }));
      return;
    }
    setPick((p) => ({ ...p, loading: true, error: "" }));
    try {
      const res = await personelService.list({ search: q, status: "ACTIVE" });
      const list = extractRows(res).slice(0, 40);
      setPick((p) => ({
        ...p,
        loading: false,
        rows: list,
        error: list.length ? "" : "Pegawai tidak ditemukan",
      }));
    } catch (err) {
      setPick((p) => ({
        ...p,
        loading: false,
        rows: [],
        error: err?.responseMessage || "Gagal mencari pegawai",
      }));
    }
  }, []);

  const openAdd = () => {
    setFormData({ ...(config.initialForm || {}) });
    setModal({ open: false, mode: "add" });
    setPick({ open: true, q: "", loading: false, rows: [], error: "" });
  };

  const pickEmployee = async (emp) => {
    const nik = emp?.nik || "";
    const name = emp?.employee_name || "";
    const pegawaiId = emp?.id || emp?.pegawai_id || "";
    let alamat = emp?.alamat || emp?.tinggal_jalan || "";
    if (!alamat && pegawaiId) {
      try {
        const addrRes = await hrdPersonelInfoService.alamat.get(pegawaiId);
        const addr = extractRow(addrRes);
        alamat =
          addr?.tinggal_jalan ||
          addr?.alamat ||
          [addr?.tinggal_kelurahan, addr?.tinggal_kecamatan].filter(Boolean).join(", ") ||
          "";
      } catch {
        /* ignore — alamat optional for display */
      }
    }
    if (!alamat) {
      alamat = [emp?.department, emp?.branch_name].filter(Boolean).join(" · ") || "—";
    }
    closePick();
    setFormData({
      ...(config.initialForm || {}),
      pegawai_id: pegawaiId,
      nik,
      employee_name: name,
      alamat,
    });
    // slight delay so pick closes then form animates in
    window.setTimeout(() => setModal({ open: true, mode: "add" }), 120);
  };

  const openEdit = (row) => {
    const mapped = { ...(config.initialForm || {}) };
    (config.fields || []).forEach((field) => {
      let value = row[field.name] ?? mapped[field.name];
      if (field.mask && value != null && value !== "") {
        value = applyFieldMask(field.mask, value);
      }
      mapped[field.name] = value;
    });
    // sync terbilang dari lama (data lama kadang "DUA TAHUN")
    if (mapped.lama_bulan) mapped.terbilang = terbilangBulan(mapped.lama_bulan);
    setFormData(mapped);
    setModal({ open: true, mode: "edit", row });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = normalizeFormPayload(config.fields || [], formData);
      let res;
      if (modal.mode === "add") res = await service.create(payload);
      else res = await service.update(modal.row[config.idField], payload);
      if (
        notifyResponse(
          res,
          modal.mode === "add" ? "Kontrak tersimpan" : "Kontrak diperbarui"
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
      const res = await service.remove(confirm.row[config.idField]);
      if (notifyResponse(res, "Kontrak dihapus")) {
        setConfirm({ open: false, row: null });
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const hidePegawaiSection =
    modal.mode === "edit" || (modal.mode === "add" && Boolean(formData.nik));

  const modalFields = (config.fields || [])
    .filter((field) => !(hidePegawaiSection && field.section === "Pegawai"))
    .map((field) => ({
      ...field,
      disabled: !!(field.disabled || (field.disabledOnEdit && modal.mode === "edit")),
    }));

  const modalSectionColumns = hidePegawaiSection
    ? [["Kontrak"], ["Penempatan"]]
    : [["Pegawai", "Kontrak"], ["Penempatan"]];

  const openExpiry = (dept) => setExpiryPopup({ open: true, dept: dept || "" });

  return (
    <AccessGuard moduleCode={config.moduleCode} permission="VIEW">
      <Head title={config.title} />
      <Content>
        <PageSmoothScroll
          revision={`${loading ? 1 : 0}-${page}-${sort.key}-${sort.dir}`}
          className="riv-page-scroll"
        >
          <div className="hrd-sc hrd-kontrak dgs-dash sc-scope">
            <ScPageHeader
              title="Personel kontrak"
              description="Kelola kontrak pegawai · badge = habis dalam 2 bulan (bukan Tetap)"
              actions={
                <div className="hrd-toolbar-actions">
                  <div className="sc-page-search">
                    <input
                      className="form-control form-control-sm sc-page-search__input"
                      placeholder="NIK / nama / no. kontrak / dept"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadData()}
                    />
                    <ScBtn disabled={loading} onClick={loadData}>
                      <Icon name="search" /> Cari
                    </ScBtn>
                  </div>
                  {canCreate ? (
                    <ScBtn onClick={openAdd}>
                      <Icon name="plus" /> Tambah
                    </ScBtn>
                  ) : null}
                  <ScBtn variant="soft" disabled={loading} onClick={loadData}>
                    <Icon name="reload" />
                  </ScBtn>
                </div>
              }
            />

            {loading ? <HrdKontrakSkeleton /> : null}

            {error ? <ScError message={error} onRetry={loadData} /> : null}

            {!loading && !error ? (
              <>
                <div className="hrd-kontrak-expiry-head">
                  <div>
                    <strong>Kontrak habis ≤ 2 bulan</strong>
                    <span>
                      {today.toLocaleDateString("id-ID")} –{" "}
                      {until.toLocaleDateString("id-ID")} · exclude status Tetap
                    </span>
                  </div>
                  <ScBadge tone={expiringRows.length ? "bad" : "ok"}>
                    {expiringRows.length} kontrak
                  </ScBadge>
                </div>

                {expiringRows.length > 0 ? (
                  <HrdHScrollRail
                    className="hrd-kontrak-expiry-rail"
                    ariaLabel="Badge kontrak hampir habis per departemen"
                  >
                    <button
                      type="button"
                      className="hrd-dept-chip hrd-kontrak-chip is-warn"
                      onClick={() => openExpiry("")}
                    >
                      <span className="hrd-dept-chip__icon" aria-hidden>
                        <Icon name="alert-circle" />
                      </span>
                      <strong>{expiringRows.length}</strong>
                      <em>Semua</em>
                    </button>
                    {expiryByDept.map((d) => (
                      <button
                        key={d.name}
                        type="button"
                        className="hrd-dept-chip hrd-kontrak-chip is-warn"
                        onClick={() => openExpiry(d.name)}
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
                    Tidak ada kontrak (non-Tetap) yang berakhir dalam 2 bulan.
                  </p>
                )}

                {rows.length === 0 ? (
                  <ScEmptyState
                    icon="file-docs"
                    title="Belum ada data kontrak"
                    hint="Tambah kontrak baru atau ubah kata kunci pencarian."
                    action={
                      canCreate ? (
                        <ScBtn onClick={openAdd}>Tambah kontrak</ScBtn>
                      ) : null
                    }
                  />
                ) : (
                  <>
                    <div className="sc-panel sc-panel--flush">
                      <div className="dgs-table-wrap" style={{ maxHeight: "none", border: 0 }}>
                        <table ref={tableRef} className="dgs-table">
                          <thead>
                            <tr>
                              {SORT_COLS.map((c) => (
                                <th
                                  key={c.key}
                                  className={`dgs-th-sort${sort.key === c.key ? " is-sorted" : ""}`}
                                  onClick={() => toggleSort(c.key)}
                                  title={
                                    c.key === "tanggal_berakhir"
                                      ? "Klik: terdekat → lama → baru"
                                      : "Klik untuk urutkan"
                                  }
                                >
                                  {c.label}
                                  {sortMark(c.key, sort)}
                                </th>
                              ))}
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {pageRows.map((row) => {
                              const expiring = isExpiringSoon(row, today, until);
                              const days = daysUntil(row.tanggal_berakhir, today);
                              return (
                                <tr
                                  key={row.id}
                                  className={`dgs-row-click${expiring ? " hrd-kontrak-row-expiring" : ""}`}
                                  onClick={() => canEdit && openEdit(row)}
                                >
                                  <td>
                                    <span className="sc-td-main">
                                      {row.employee_name || "—"}
                                    </span>
                                    <span className="sc-td-meta">
                                      {row.nik || "—"}
                                      {row.no_kontrak ? ` · ${row.no_kontrak}` : ""}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="sc-td-main">{deptNameOf(row)}</span>
                                  </td>
                                  <td>
                                    <span className="sc-td-main">
                                      {row.jabatan_name || "—"}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      className={`dgs-pill is-${
                                        isTetap(row) ? "ok" : expiring ? "warn" : "new"
                                      }`}
                                    >
                                      {row.status_pegawai || "—"}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="sc-td-main">{fmtDate(row.tgl_mulai)}</span>
                                  </td>
                                  <td>
                                    <span className="sc-td-main">
                                      {fmtDate(row.tanggal_berakhir)}
                                      {expiring && days != null ? (
                                        <em className="hrd-kontrak-days"> · {days}h</em>
                                      ) : null}
                                    </span>
                                  </td>
                                  <td onClick={(e) => e.stopPropagation()}>
                                    <div className="hrd-kontrak-row-actions">
                                      {canEdit ? (
                                        <button
                                          type="button"
                                          className="hrd-kontrak-icon-btn"
                                          title="Ubah"
                                          onClick={() => openEdit(row)}
                                        >
                                          <Icon name="edit" />
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
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {rows.length > pageSize ? (
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

            <Modal
              isOpen={pick.open}
              toggle={closePick}
              size="md"
              className="modal-dialog-centered admin-form-modal hrd-form-modal hrd-form-modal--sc hrd-kontrak-pick-modal"
              contentClassName="dgs-modal-content"
            >
              <div className="hrd-modal-head">
                <div>
                  <h5 className="hrd-modal-head__title">Pilih pegawai</h5>
                  <p className="hrd-modal-head__sub">Cari by NIK atau nama, lalu lanjut isi kontrak</p>
                </div>
                <button
                  type="button"
                  className="hrd-modal-head__close"
                  onClick={closePick}
                  aria-label="Tutup"
                >
                  <Icon name="cross" />
                </button>
              </div>
              <ModalBody className="dgs-modal-body hrd-modal-body hrd-kontrak-pick-body">
                <div className="hrd-kontrak-pick-search">
                  <input
                    className="form-control"
                    autoFocus
                    placeholder="Ketik NIK atau nama…"
                    value={pick.q}
                    onChange={(e) => setPick((p) => ({ ...p, q: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && searchPick(pick.q)}
                  />
                  <ScBtn disabled={pick.loading} onClick={() => searchPick(pick.q)}>
                    <Icon name="search" /> Cari
                  </ScBtn>
                </div>
                {pick.loading ? (
                  <p className="hrd-kontrak-pick-hint">Mencari…</p>
                ) : null}
                {!pick.loading && pick.error ? (
                  <p className="hrd-kontrak-pick-hint is-muted">{pick.error}</p>
                ) : null}
                {!pick.loading && pick.rows.length > 0 ? (
                  <ul className="hrd-kontrak-pick-list">
                    {pick.rows.map((emp) => {
                      const meta =
                        emp.alamat ||
                        emp.tinggal_jalan ||
                        [emp.department, emp.branch_name].filter(Boolean).join(" · ") ||
                        "—";
                      return (
                        <li key={emp.id || emp.nik}>
                          <button
                            type="button"
                            className="hrd-kontrak-pick-item"
                            onClick={() => pickEmployee(emp)}
                          >
                            <strong className="hrd-kontrak-pick-item__name">
                              {emp.employee_name || "—"}
                            </strong>
                            <span className="hrd-kontrak-pick-item__nik">
                              {emp.nik || "—"}
                            </span>
                            <span className="hrd-kontrak-pick-item__addr">{meta}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </ModalBody>
              <div className="dgs-modal-foot">
                <ScBtn variant="soft" onClick={closePick}>
                  Batal
                </ScBtn>
              </div>
            </Modal>

            <FormModal
              isOpen={modal.open}
              variant="sc"
              size={config.modalSize || "xl"}
              className="hrd-kontrak-form-anim"
              sectionColumns={modalSectionColumns}
              title={
                modal.mode === "add" ? "Tambah Personel Kontrak" : "Ubah Personel Kontrak"
              }
              subtitle={
                [formData.nik, formData.employee_name].filter(Boolean).join(" · ") ||
                (modal.mode === "edit"
                  ? "Perbarui data kontrak pegawai"
                  : "Lengkapi data kontrak pegawai baru")
              }
              fields={modalFields}
              formData={formData}
              onChange={(name, value) => {
                setFormData((prev) => applyKontrakAutoFields(prev, name, value));
              }}
              onSubmit={handleSave}
              onClose={() => setModal({ open: false, mode: "add" })}
              loading={saving}
              submitLabel={modal.mode === "add" ? "Simpan" : "Update"}
            />

            <ConfirmDialog
              isOpen={confirm.open}
              variant="sc"
              title="Hapus kontrak"
              message={`Hapus kontrak ${confirm.row?.no_kontrak || confirm.row?.id || ""}?`}
              confirmLabel="Hapus"
              onConfirm={handleDelete}
              onCancel={() => setConfirm({ open: false, row: null })}
              loading={saving}
            />

            <Modal
              isOpen={expiryPopup.open}
              toggle={() => setExpiryPopup({ open: false, dept: "" })}
              size="xl"
              className="modal-dialog-centered admin-form-modal hrd-form-modal hrd-form-modal--sc hrd-kontrak-expiry-modal"
              contentClassName="dgs-modal-content"
            >
              <div className="hrd-modal-head">
                <div>
                  <h5 className="hrd-modal-head__title">Kontrak hampir habis</h5>
                  <p className="hrd-modal-head__sub">
                    {expiryPopup.dept || "Semua departemen"} · {popupRows.length} pegawai
                  </p>
                </div>
                <button
                  type="button"
                  className="hrd-modal-head__close"
                  onClick={() => setExpiryPopup({ open: false, dept: "" })}
                  aria-label="Tutup"
                >
                  <Icon name="cross" />
                </button>
              </div>
              <ModalBody className="dgs-modal-body hrd-modal-body">
                {popupRows.length === 0 ? (
                  <p className="text-soft mb-0">Tidak ada data.</p>
                ) : (
                  <div className="dgs-table-wrap hrd-kontrak-expiry-table" style={{ maxHeight: 420, border: 0 }}>
                    <table className="dgs-table">
                      <thead>
                        <tr>
                          <th>Nama</th>
                          <th>NIK</th>
                          <th>Jabatan</th>
                          <th>Mulai</th>
                          <th>Berakhir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {popupRows.map((row) => {
                          const days = daysUntil(row.tanggal_berakhir, today);
                          return (
                            <tr key={row.id}>
                              <td>
                                <span className="sc-td-main">{row.employee_name || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">{row.nik || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">{row.jabatan_name || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">{fmtDate(row.tgl_mulai)}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">
                                  {fmtDate(row.tanggal_berakhir)}
                                  {days != null ? (
                                    <em className="hrd-kontrak-days"> · {days}h</em>
                                  ) : null}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </ModalBody>
              <div className="dgs-modal-foot">
                <ScBtn
                  variant="soft"
                  onClick={() => setExpiryPopup({ open: false, dept: "" })}
                >
                  Tutup
                </ScBtn>
              </div>
            </Modal>
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdPersonelKontrakPage;
