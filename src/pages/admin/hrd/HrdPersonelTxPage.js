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
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";
import "./hrd-kontrak.css";

const personelService = createHrdService("abs/personel", { crud: true });

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

const TxSkeleton = ({ cols = 5 }) => (
  <div className="hrd-skel" aria-busy="true">
    <div className="hrd-skel__table sc-panel sc-panel--flush">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="hrd-skel__tr">
          <ScSkeletonBlock className="hrd-skel__td hrd-skel__td--main" />
          {Array.from({ length: cols - 1 }).map((__, j) => (
            <ScSkeletonBlock key={j} className="hrd-skel__td" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const cellValue = (row, col) => {
  const raw = row?.[col.key];
  if (col.type === "date") return fmtDate(raw);
  if (raw == null || raw === "") return "—";
  return String(raw);
};

/**
 * Shared list+pick+2-col form page (status / promosi / mutasi / resign style).
 * @param {{
 *  config: object,
 *  pageTitle: string,
 *  description: string,
 *  searchPlaceholder?: string,
 *  emptyTitle?: string,
 *  emptyHint?: string,
 *  sortCols: Array<{key:string,label:string,type?:string}>,
 *  defaultSort?: {key:string,dir:string},
 *  sectionColumns?: string[][],
 *  modalClassName?: string,
 *  pickSubtitle?: string,
 *  entityLabel?: string,
 *  buildPickPrefill?: (emp:object, detail:object|null) => object,
 *  mapDetailAliases?: (detail:object, mapped:object) => object,
 *  renderExtraCells?: (row:object) => React.ReactNode,
 * }} props
 */
const HrdPersonelTxPage = ({
  config,
  pageTitle,
  description,
  searchPlaceholder = "NIK / nama / nomor",
  emptyTitle = "Belum ada data",
  emptyHint = "Tambah data baru.",
  sortCols,
  defaultSort = { key: "tanggal_efektif", dir: "desc" },
  sectionColumns,
  modalClassName = "hrd-kontrak-form-anim hrd-form-modal--cols-compact",
  pickSubtitle = "Cari by NIK atau nama",
  entityLabel = "data",
  buildPickPrefill,
  mapDetailAliases,
}) => {
  const service = config.service;
  const pageSize = config.pageSize || 15;
  const idField = config.idField || "id";
  const perms = useActionPermissions(config.moduleCode);
  const tableRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(defaultSort);
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

  const toggleSort = useCallback(
    (key) => {
      setSort((s) =>
        s.key === key
          ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
          : { key, dir: key === defaultSort.key ? defaultSort.dir : "asc" }
      );
      setPage(1);
    },
    [defaultSort.key, defaultSort.dir]
  );

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
      setError(err?.responseMessage || `Gagal memuat ${entityLabel}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [service, search, entityLabel]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const sortedRows = useMemo(() => {
    const col = sortCols.find((c) => c.key === sort.key);
    const type = col?.type || "str";
    return [...rows].sort((a, b) => {
      const cmp =
        type === "date"
          ? cmpDate(a?.[sort.key], b?.[sort.key], sort.dir)
          : cmpStr(a?.[sort.key], b?.[sort.key], sort.dir);
      if (cmp !== 0) return cmp;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [rows, sort, sortCols]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

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
    let detail = null;
    if (pegawaiId) {
      try {
        detail = extractRow(await personelService.get(pegawaiId));
      } catch {
        detail = null;
      }
    }
    const extra = buildPickPrefill
      ? buildPickPrefill(emp, detail)
      : {
          jabatan: detail?.jabatan || emp?.job_title || "",
          department_sebelum: detail?.department || emp?.department || "—",
          jabatan_sebelum: detail?.jabatan || emp?.job_title || "—",
          cabang_sebelum: detail?.branch_name || emp?.branch_name || "—",
          brand_sebelum: detail?.brand || emp?.brand || "—",
        };
    closePick();
    setFormData({
      ...(config.initialForm || {}),
      pegawai_id: pegawaiId,
      nik,
      employee_name: name,
      ...extra,
    });
    window.setTimeout(() => setModal({ open: true, mode: "add" }), 120);
  };

  const openEdit = async (row) => {
    let mapped = { ...(config.initialForm || {}) };
    let detail = row;
    try {
      if (service.get) {
        const res = await service.get(row[idField]);
        detail = { ...row, ...(extractRow(res) || {}) };
      }
    } catch {
      detail = row;
    }
    (config.fields || []).forEach((field) => {
      let value = detail[field.name] ?? mapped[field.name];
      if (field.mask && value != null && value !== "") {
        value = applyFieldMask(field.mask, value);
      }
      mapped[field.name] = value;
    });
    mapped.pegawai_id = detail.pegawai_id || mapped.pegawai_id;
    if (!mapped.no_promosi && detail.nomor) mapped.no_promosi = detail.nomor;
    if (!mapped.no_mutasi && detail.nomor) mapped.no_mutasi = detail.nomor;
    if (!mapped.tanggal_aktif && detail.tanggal_efektif) {
      mapped.tanggal_aktif = detail.tanggal_efektif;
    }
    if (!mapped.effective && (detail.tgl_resign || detail.tanggal_efektif)) {
      mapped.effective = detail.tgl_resign || detail.tanggal_efektif;
    }
    if (mapDetailAliases) mapped = mapDetailAliases(detail, mapped);
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
      else res = await service.update(modal.row[idField], payload);
      if (
        notifyResponse(
          res,
          modal.mode === "add" ? `${entityLabel} tersimpan` : `${entityLabel} diperbarui`
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
      const res = await service.remove(confirm.row[idField]);
      if (notifyResponse(res, `${entityLabel} dihapus`)) {
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

  const nameCol = sortCols[0];
  const otherCols = sortCols.slice(1);

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
              title={pageTitle}
              description={description}
              actions={
                <div className="hrd-toolbar-actions">
                  <div className="sc-page-search">
                    <input
                      className="form-control form-control-sm sc-page-search__input"
                      placeholder={searchPlaceholder}
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

            {loading ? <TxSkeleton cols={sortCols.length} /> : null}
            {error ? <ScError message={error} onRetry={loadData} /> : null}

            {!loading && !error ? (
              rows.length === 0 ? (
                <ScEmptyState
                  icon="account-setting"
                  title={emptyTitle}
                  hint={emptyHint}
                  action={canCreate ? <ScBtn onClick={openAdd}>Tambah</ScBtn> : null}
                />
              ) : (
                <>
                  <div className="sc-panel sc-panel--flush">
                    <div className="dgs-table-wrap" style={{ maxHeight: "none", border: 0 }}>
                      <table ref={tableRef} className="dgs-table">
                        <thead>
                          <tr>
                            {sortCols.map((c) => (
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
                              key={row[idField] ?? row.id}
                              className="dgs-row-click"
                              onClick={() => canEdit && openEdit(row)}
                            >
                              <td>
                                <span className="sc-td-main">
                                  {row[nameCol?.key] || row.employee_name || "—"}
                                </span>
                                <span className="sc-td-meta">{row.nik || "—"}</span>
                              </td>
                              {otherCols.map((c) => (
                                <td key={c.key}>
                                  <span className="sc-td-main">{cellValue(row, c)}</span>
                                </td>
                              ))}
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
                  <p className="hrd-modal-head__sub">{pickSubtitle}</p>
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
              size={config.modalSize || "lg"}
              className={modalClassName}
              sectionColumns={sectionColumns}
              title={
                modal.mode === "add" ? `Tambah ${config.title}` : `Ubah ${config.title}`
              }
              subtitle={
                [formData.nik, formData.employee_name].filter(Boolean).join(" · ") ||
                description
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
              title={`Hapus ${entityLabel}`}
              message={`Hapus ${entityLabel} ${
                confirm.row?.nomor || confirm.row?.sk_no || confirm.row?.id || ""
              }?`}
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

export default HrdPersonelTxPage;
