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
import { createHrdService } from "../../../services/hrd/hrd.service";
import {
  ScBtn,
  ScEmptyState,
  ScError,
  ScPageHeader,
  ScSkeletonBlock,
} from "../dgs/sc";
import { RivStickyThead } from "../regional/RivStickyThead";
import { hrdAbsStatus } from "./hrdConfigs";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";
import "./hrd-kontrak.css";

const config = hrdAbsStatus;
const service = config.service;
const personelService = createHrdService("abs/personel", { crud: true });
const pageSize = config.pageSize || 15;

const SORT_COLS = [
  { key: "employee_name", label: "Pegawai", type: "str" },
  { key: "nomor", label: "Nomor", type: "str" },
  { key: "status_lama", label: "Status lama", type: "str" },
  { key: "status_baru", label: "Status baru", type: "str" },
  { key: "tanggal_efektif", label: "Tgl. efektif", type: "date" },
];

const SECTION_COLS = [
  ["Dokumentasi", "Status terdahulu"],
  ["Status sekarang", "Tanggal"],
];

const cmpStr = (a, b, dir) => {
  const c = String(a ?? "").localeCompare(String(b ?? ""), "id", {
    sensitivity: "base",
    numeric: true,
  });
  return dir === "desc" ? -c : c;
};

const parseYmd = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const cmpDate = (a, b, dir) => {
  const da = parseYmd(a)?.getTime();
  const db = parseYmd(b)?.getTime();
  if (da == null && db == null) return 0;
  if (da == null) return 1;
  if (db == null) return -1;
  return dir === "desc" ? db - da : da - db;
};

const fmtDate = (raw) => {
  const d = parseYmd(raw);
  if (!d) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const sortMark = (key, sort) => {
  if (sort.key !== key) return "";
  return sort.dir === "asc" ? " ↑" : " ↓";
};

const HrdStatusSkeleton = () => (
  <div className="hrd-skel" aria-busy="true" aria-label="Memuat personel status">
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

const HrdPersonelStatusPage = () => {
  const perms = useActionPermissions(config.moduleCode);
  const tableRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "tanggal_efektif", dir: "desc" });
  const [modal, setModal] = useState({ open: false, mode: "add" });
  const [formData, setFormData] = useState(config.initialForm || {});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, row: null });
  const [pick, setPick] = useState({
    open: false,
    q: "",
    loading: false,
    rows: [],
    error: "",
  });

  const toggleSort = useCallback((key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "tanggal_efektif" ? "desc" : "asc" }
    );
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
      setError(err?.responseMessage || "Gagal memuat personel status");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const sortedRows = useMemo(() => {
    const col = SORT_COLS.find((c) => c.key === sort.key);
    const type = col?.type || "str";
    return [...rows].sort((a, b) => {
      const av = a?.[sort.key];
      const bv = b?.[sort.key];
      const cmp = type === "date" ? cmpDate(av, bv, sort.dir) : cmpStr(av, bv, sort.dir);
      if (cmp !== 0) return cmp;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [rows, sort]);

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
    let statusSebelum = emp?.status || emp?.status_pegawai || "—";
    let groupSebelum = emp?.group || emp?.group_pegawai || "—";
    if (pegawaiId) {
      try {
        const det = extractRow(await personelService.get(pegawaiId));
        if (det?.status_pegawai) statusSebelum = det.status_pegawai;
        if (det?.group_pegawai || det?.group) {
          groupSebelum = det.group_pegawai || det.group;
        }
      } catch {
        /* optional */
      }
    }
    closePick();
    setFormData({
      ...(config.initialForm || {}),
      pegawai_id: pegawaiId,
      nik,
      employee_name: name,
      status_sebelum: statusSebelum,
      group_pegawai_sebelum: groupSebelum,
    });
    window.setTimeout(() => setModal({ open: true, mode: "add" }), 120);
  };

  const openEdit = async (row) => {
    const mapped = { ...(config.initialForm || {}) };
    let detail = row;
    try {
      const res = await service.get(row[config.idField]);
      detail = { ...row, ...(extractRow(res) || {}) };
    } catch {
      detail = row;
    }
    (config.fields || []).forEach((field) => {
      let value = detail[field.name] ?? mapped[field.name];
      if (field.name === "no_status" && (value == null || value === "")) {
        value = detail.nomor ?? value;
      }
      if (field.name === "tanggal_aktif" && (value == null || value === "")) {
        value = detail.tanggal_efektif ?? value;
      }
      if (field.name === "status_sebelum" && (value == null || value === "" || value === "—")) {
        value = detail.status_lama ?? value;
      }
      if (
        field.name === "group_pegawai_sebelum" &&
        (value == null || value === "" || value === "—")
      ) {
        value =
          detail.group_lama ||
          detail.group_sebelum ||
          detail.GroupPegawaiStr ||
          value;
      }
      if (field.mask && value != null && value !== "") {
        value = applyFieldMask(field.mask, value);
      }
      mapped[field.name] = value;
    });
    mapped.pegawai_id = detail.pegawai_id || mapped.pegawai_id;
    if (detail.group_pegawai_sebelum) {
      mapped.group_pegawai_sebelum = detail.group_pegawai_sebelum;
    }
    if (detail.status_sebelum) {
      mapped.status_sebelum = detail.status_sebelum;
    }
    setFormData(mapped);
    setModal({ open: true, mode: "edit", row });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = normalizeFormPayload(config.fields || [], formData);
      if (formData.pegawai_id) payload.pegawai_id = formData.pegawai_id;
      let res;
      if (modal.mode === "add") res = await service.create(payload);
      else res = await service.update(modal.row[config.idField], payload);
      if (
        notifyResponse(
          res,
          modal.mode === "add" ? "Status tersimpan" : "Status diperbarui"
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
      if (notifyResponse(res, "Status dihapus")) {
        setConfirm({ open: false, row: null });
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const hidePegawai = Boolean(formData.nik);
  const modalFields = (config.fields || [])
    .filter((field) => !(hidePegawai && field.section === "Pegawai"))
    .map((field) => ({
      ...field,
      disabled: !!(field.disabled || (field.disabledOnEdit && modal.mode === "edit")),
    }));

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
              title="Personel status"
              description="Ubah status & group pegawai · pilih karyawan saat tambah"
              actions={
                <div className="hrd-toolbar-actions">
                  <div className="sc-page-search">
                    <input
                      className="form-control form-control-sm sc-page-search__input"
                      placeholder="NIK / nama / no. status"
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

            {loading ? <HrdStatusSkeleton /> : null}
            {error ? <ScError message={error} onRetry={loadData} /> : null}

            {!loading && !error ? (
              rows.length === 0 ? (
                <ScEmptyState
                  icon="account-setting"
                  title="Belum ada data status"
                  hint="Tambah perubahan status pegawai baru."
                  action={canCreate ? <ScBtn onClick={openAdd}>Tambah status</ScBtn> : null}
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
                                title="Klik untuk urutkan"
                              >
                                {c.label}
                                {sortMark(c.key, sort)}
                              </th>
                            ))}
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row) => (
                            <tr
                              key={row.id}
                              className="dgs-row-click"
                              onClick={() => canEdit && openEdit(row)}
                            >
                              <td>
                                <span className="sc-td-main">{row.employee_name || "—"}</span>
                                <span className="sc-td-meta">{row.nik || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">{row.nomor || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">{row.status_lama || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">{row.status_baru || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">{fmtDate(row.tanggal_efektif)}</span>
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
                          ))}
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
              )
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
                  <p className="hrd-modal-head__sub">
                    Cari by NIK atau nama, lalu isi perubahan status
                  </p>
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
                {pick.loading ? <p className="hrd-kontrak-pick-hint">Mencari…</p> : null}
                {!pick.loading && pick.error ? (
                  <p className="hrd-kontrak-pick-hint is-muted">{pick.error}</p>
                ) : null}
                {!pick.loading && pick.rows.length > 0 ? (
                  <ul className="hrd-kontrak-pick-list">
                    {pick.rows.map((emp) => {
                      const meta =
                        [emp.status || emp.status_pegawai, emp.department, emp.branch_name]
                          .filter(Boolean)
                          .join(" · ") || "—";
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
                            <span className="hrd-kontrak-pick-item__nik">{emp.nik || "—"}</span>
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
              className="hrd-kontrak-form-anim hrd-form-modal--cols-compact"
              sectionColumns={SECTION_COLS}
              title={
                modal.mode === "add" ? "Tambah Personel Status" : "Ubah Personel Status"
              }
              subtitle={
                [formData.nik, formData.employee_name].filter(Boolean).join(" · ") ||
                "Lengkapi perubahan status pegawai"
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
              title="Hapus status"
              message={`Hapus status ${confirm.row?.nomor || confirm.row?.id || ""}?`}
              confirmLabel="Hapus"
              onConfirm={handleDelete}
              onCancel={() => setConfirm({ open: false, row: null })}
              loading={saving}
            />
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdPersonelStatusPage;
