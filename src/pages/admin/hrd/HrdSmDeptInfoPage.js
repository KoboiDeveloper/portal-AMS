import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { useNavigate, useParams } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import ConfirmDialog from "../../../components/admin/common/ConfirmDialog";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { extractRow, extractRows, notifyResponse } from "../../../lib/response";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import {
  createHrdService,
  hrdLookupOptions,
} from "../../../services/hrd/hrd.service";
import { ScBtn, ScEmptyState, ScError, ScPageHeader, ScSkeletonBlock } from "../dgs/sc";
import { RivStickyThead } from "../regional/RivStickyThead";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";
import "./hrd-kontrak.css";

const MODULE = "HRD_PAR_SM_DEPT";
const headerService = createHrdService("par/sm-dept", { crud: true });
const detailService = createHrdService("par/sm-dept-detail", { crud: true });
const personelService = createHrdService("abs/personel", { crud: true });

/**
 * ASP sm_dept_info.aspx — Senior Manager header + DEPARTMENT LIST grid.
 * /admin/hrd/par/sm-dept/new | /admin/hrd/par/sm-dept/:id
 */
const HrdSmDeptInfoPage = () => {
  const { id: routeId } = useParams();
  const isNew = !routeId || routeId === "new";
  const navigate = useNavigate();
  const perms = useActionPermissions(MODULE);
  const tableRef = useRef(null);

  const [header, setHeader] = useState({ id: "", nik: "", nama: "", jabatan: "" });
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [deptLoading, setDeptLoading] = useState(false);
  const [error, setError] = useState("");
  const [deptSearch, setDeptSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [confirmDel, setConfirmDel] = useState({ open: false, ids: [] });

  const [pick, setPick] = useState({
    open: false,
    q: "",
    loading: false,
    rows: [],
    error: "",
  });
  const [addDept, setAddDept] = useState({
    open: false,
    q: "",
    loading: false,
    rows: [],
    error: "",
  });
  const [addPicked, setAddPicked] = useState(() => new Set());

  const canUpdate = !perms.loading && perms.UPDATE;
  const canCreate = !perms.loading && perms.CREATE;
  const canWrite = isNew ? canCreate : canUpdate;

  const loadHeader = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError("");
    try {
      const row = extractRow(await headerService.get(routeId));
      if (!row?.id) throw new Error("Data tidak ditemukan");
      setHeader({
        id: String(row.id),
        nik: row.nik || "",
        nama: row.nama || "",
        jabatan: row.jabatan || "",
      });
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Gagal memuat SM");
      setHeader({ id: "", nik: "", nama: "", jabatan: "" });
    } finally {
      setLoading(false);
    }
  }, [isNew, routeId]);

  const loadDepts = useCallback(async () => {
    if (!header.nik) {
      setDepts([]);
      return;
    }
    setDeptLoading(true);
    try {
      const res = await detailService.list({
        nik: header.nik,
        ...(deptSearch.trim() ? { search: deptSearch.trim() } : {}),
      });
      setDepts(extractRows(res));
      setSelected(new Set());
    } catch (err) {
      notifyResponse(err);
      setDepts([]);
    } finally {
      setDeptLoading(false);
    }
  }, [header.nik, deptSearch]);

  useEffect(() => {
    loadHeader();
  }, [loadHeader]);

  useEffect(() => {
    if (!isNew && header.nik) loadDepts();
  }, [isNew, header.nik, loadDepts]);

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

  const pickEmployee = (emp) => {
    setHeader((h) => ({
      ...h,
      nik: emp?.nik || "",
      nama: emp?.employee_name || "",
      jabatan: emp?.job_title || emp?.jabatan || "",
    }));
    closePick();
  };

  const saveHeader = async () => {
    if (!header.nik) {
      notifyResponse({ responseMessage: "Pilih pegawai dulu" });
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const res = await headerService.create({
          nik: header.nik,
          nama: header.nama,
        });
        if (notifyResponse(res, "Senior Manager tersimpan")) {
          const newId = extractRow(res)?.id;
          if (newId) navigate(`/admin/hrd/par/sm-dept/${encodeURIComponent(newId)}`, { replace: true });
          else navigate("/admin/hrd/par/sm-dept");
        }
      } else {
        const res = await headerService.update(header.id, {
          nik: header.nik,
          nama: header.nama,
        });
        notifyResponse(res, "Data diperbarui");
        loadHeader();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = (checked) => {
    if (checked) setSelected(new Set(depts.map((d) => String(d.id))));
    else setSelected(new Set());
  };

  const toggleOne = (id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(String(id));
      else next.delete(String(id));
      return next;
    });
  };

  const openAddDept = async () => {
    setAddPicked(new Set());
    setAddDept({ open: true, q: "", loading: true, rows: [], error: "" });
    try {
      const opts = await hrdLookupOptions("department", { force: true });
      const assigned = new Set(depts.map((d) => String(d.dept || "").trim()));
      /* lookup value = DepartemenIDLng; also keep kode via label search only — filter by already-assigned codes later on save */
      setAddDept({
        open: true,
        q: "",
        loading: false,
        rows: opts,
        error: opts.length ? "" : "Tidak ada department",
      });
      void assigned;
    } catch (err) {
      setAddDept({
        open: true,
        q: "",
        loading: false,
        rows: [],
        error: err?.responseMessage || "Gagal memuat department",
      });
    }
  };

  const filteredAddRows = useMemo(() => {
    const isJunk = (r) => {
      const label = String(r.label || "").trim().toUpperCase();
      const value = String(r.value || "").trim().toUpperCase();
      if (!label || label === "0" || value === "0") return true;
      if (label.includes("TIDAK DIKETAHUI") || label.includes("* NONE *")) return true;
      return false;
    };
    const q = addDept.q.trim().toLowerCase();
    return addDept.rows.filter((r) => {
      if (isJunk(r)) return false;
      if (!q) return true;
      return (
        String(r.label || "").toLowerCase().includes(q) ||
        String(r.value || "").toLowerCase().includes(q)
      );
    });
  }, [addDept.rows, addDept.q]);

  const saveAddDept = async () => {
    if (!header.nik || addPicked.size === 0) return;
    setSaving(true);
    try {
      const res = await detailService.create({
        nik: header.nik,
        depts: Array.from(addPicked),
      });
      if (notifyResponse(res, "Department ditambahkan")) {
        setAddDept({ open: false, q: "", loading: false, rows: [], error: "" });
        setAddPicked(new Set());
        loadDepts();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const runDeleteDepts = async () => {
    const ids = confirmDel.ids;
    if (!ids.length) return;
    setSaving(true);
    try {
      let ok = 0;
      for (const id of ids) {
        const res = await detailService.remove(id);
        if (String(res?.responseCode) === "2002500") ok += 1;
      }
      notifyResponse(
        { responseCode: ok ? "2002500" : "4002500", responseMessage: ok ? "Department dihapus" : "Gagal hapus" },
        `${ok} department dihapus`
      );
      setConfirmDel({ open: false, ids: [] });
      loadDepts();
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const titleName = header.nama || header.nik || (isNew ? "Baru" : "…");

  return (
    <AccessGuard moduleCode={MODULE} permission="VIEW">
      <Head title={`SM · ${titleName}`} />
      <Content>
        <PageSmoothScroll revision={`${loading}-${header.nik}-${depts.length}`} className="riv-page-scroll">
          <div className="hrd-sc hrd-kontrak dgs-dash sc-scope">
            <ScPageHeader
              title="Senior Manager Info"
              description={
                header.nik
                  ? [header.nik, header.nama, header.jabatan].filter(Boolean).join(" · ")
                  : "Pilih pegawai sebagai Senior Manager"
              }
              actions={
                <div className="hrd-toolbar-actions">
                  <ScBtn variant="soft" onClick={() => navigate("/admin/hrd/par/sm-dept")}>
                    <Icon name="arrow-left" /> Back
                  </ScBtn>
                  {canWrite ? (
                    <ScBtn disabled={saving || !header.nik} onClick={saveHeader}>
                      <Icon name="save" /> {saving ? "Menyimpan…" : "Save"}
                    </ScBtn>
                  ) : null}
                </div>
              }
            />

            {error ? <ScError message={error} onRetry={loadHeader} /> : null}

            {loading ? (
              <div className="sc-panel" aria-busy="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ScSkeletonBlock key={i} style={{ height: 36, margin: "8px 12px" }} />
                ))}
              </div>
            ) : (
              <section className="sc-panel hrd-master-form hrd-sm-info">
                <h3 className="hrd-master-form__sec">Senior Manager</h3>
                <div className="hrd-master-form__row">
                  <label>NAMA</label>
                  <div className="hrd-sm-info__nama">
                    {isNew || canWrite ? (
                      <ScBtn
                        variant="soft"
                        type="button"
                        onClick={() =>
                          setPick({ open: true, q: "", loading: false, rows: [], error: "" })
                        }
                      >
                        <Icon name="list" /> Pilih
                      </ScBtn>
                    ) : null}
                    <span className="hrd-display-value hrd-sm-info__display">
                      {[header.nik || "—", header.nama || "—", header.jabatan || "—"].join(" · ")}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {!isNew && header.nik ? (
              <section className="sc-panel hrd-sm-depts">
                <div className="hrd-sm-depts__head">
                  <h3 className="hrd-master-form__sec" style={{ margin: 0 }}>
                    Department List
                  </h3>
                  <div className="hrd-toolbar-actions">
                    {canWrite ? (
                      <ScBtn onClick={openAddDept}>
                        <Icon name="plus" /> ADD
                      </ScBtn>
                    ) : null}
                    {canWrite ? (
                      <ScBtn
                        variant="soft"
                        disabled={!selected.size}
                        onClick={() =>
                          setConfirmDel({ open: true, ids: Array.from(selected) })
                        }
                      >
                        <Icon name="trash" /> Delete
                      </ScBtn>
                    ) : null}
                    <div className="sc-page-search">
                      <input
                        className="form-control"
                        placeholder="Keywords…"
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadDepts()}
                      />
                      <ScBtn variant="soft" disabled={deptLoading} onClick={loadDepts}>
                        <Icon name="search" /> Search
                      </ScBtn>
                    </div>
                  </div>
                </div>

                {deptLoading ? (
                  <ScSkeletonBlock style={{ height: 120, margin: 12 }} />
                ) : depts.length === 0 ? (
                  <ScEmptyState
                    icon="folder"
                    title="Belum ada department"
                    hint="Klik ADD untuk assign department ke SM ini."
                  />
                ) : (
                  <div className="dgs-table-wrap" style={{ maxHeight: "none", border: 0 }}>
                    <table ref={tableRef} className="dgs-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44 }}>
                            <input
                              type="checkbox"
                              checked={selected.size > 0 && selected.size === depts.length}
                              onChange={(e) => toggleAll(e.target.checked)}
                              aria-label="Pilih semua"
                            />
                          </th>
                          <th>DEPARTMENT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {depts.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selected.has(String(row.id))}
                                onChange={(e) => toggleOne(row.id, e.target.checked)}
                                aria-label={`Pilih ${row.department}`}
                              />
                            </td>
                            <td>
                              <span className="sc-td-main">{row.department || row.dept || "—"}</span>
                              {row.dept && row.department && row.dept !== row.department ? (
                                <span className="sc-td-meta">{row.dept}</span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <RivStickyThead
                      tableRef={tableRef}
                      enabled={depts.length > 0}
                      tableClassName="dgs-table"
                      interactive
                    />
                  </div>
                )}
              </section>
            ) : null}

            {/* Pick employee */}
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
                  <p className="hrd-modal-head__sub">Cari by NIK atau nama (lookup GTSM)</p>
                </div>
                <button type="button" className="hrd-modal-head__close" onClick={closePick} aria-label="Tutup">
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
                    {pick.rows.map((emp) => (
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
                          <span className="hrd-kontrak-pick-item__addr">
                            {emp.job_title || emp.department || "—"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </ModalBody>
              <div className="dgs-modal-foot">
                <ScBtn variant="soft" onClick={closePick}>
                  Batal
                </ScBtn>
              </div>
            </Modal>

            {/* Add departments (ASP Lookup_dept) */}
            <Modal
              isOpen={addDept.open}
              toggle={() => setAddDept({ open: false, q: "", loading: false, rows: [], error: "" })}
              size="md"
              className="modal-dialog-centered admin-form-modal hrd-form-modal hrd-form-modal--sc hrd-kontrak-pick-modal"
              contentClassName="dgs-modal-content"
            >
              <div className="hrd-modal-head">
                <div>
                  <h5 className="hrd-modal-head__title">Department List</h5>
                  <p className="hrd-modal-head__sub">Centang department lalu Save</p>
                </div>
                <button
                  type="button"
                  className="hrd-modal-head__close"
                  onClick={() => setAddDept({ open: false, q: "", loading: false, rows: [], error: "" })}
                  aria-label="Tutup"
                >
                  <Icon name="cross" />
                </button>
              </div>
              <ModalBody className="dgs-modal-body hrd-modal-body hrd-kontrak-pick-body">
                <div className="hrd-kontrak-pick-search">
                  <input
                    className="form-control"
                    placeholder="Keywords…"
                    value={addDept.q}
                    onChange={(e) => setAddDept((p) => ({ ...p, q: e.target.value }))}
                  />
                </div>
                {addDept.loading ? <p className="hrd-kontrak-pick-hint">Memuat…</p> : null}
                {addDept.error ? (
                  <p className="hrd-kontrak-pick-hint is-muted">{addDept.error}</p>
                ) : null}
                <ul className="hrd-sm-dept-pick">
                  {filteredAddRows.map((opt) => {
                    const checked = addPicked.has(String(opt.value));
                    return (
                      <li key={opt.value}>
                        <label className={`hrd-sm-dept-pick__row${checked ? " is-checked" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setAddPicked((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(String(opt.value));
                                else next.delete(String(opt.value));
                                return next;
                              });
                            }}
                          />
                          <span className="hrd-sm-dept-pick__label">{opt.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </ModalBody>
              <div className="dgs-modal-foot">
                <ScBtn
                  variant="soft"
                  onClick={() => setAddDept({ open: false, q: "", loading: false, rows: [], error: "" })}
                >
                  Batal
                </ScBtn>
                <ScBtn disabled={saving || !addPicked.size} onClick={saveAddDept}>
                  <Icon name="save" /> SAVE
                </ScBtn>
              </div>
            </Modal>

            <ConfirmDialog
              isOpen={confirmDel.open}
              variant="sc"
              title="Hapus department"
              message={`Hapus ${confirmDel.ids.length} department terpilih?`}
              confirmLabel="Hapus"
              onConfirm={runDeleteDepts}
              onCancel={() => setConfirmDel({ open: false, ids: [] })}
              loading={saving}
            />
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdSmDeptInfoPage;
