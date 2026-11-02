import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import api from "../../../lib/api";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import "./reg-reg-report.css";
import "./reg-group-head.css";

/** Legacy module/admin/MasterGH.aspx + masterlookup.aspx */
const svc = createRegionalService("util/group-head", { crud: true });

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: "0.8125rem" }),
};

const PAGE_SIZE = 100;
const ALL_OPT = { value: "ALL", label: "ALL" };
const STATUS_OPTS = [
  ALL_OPT,
  { value: "AKTIF", label: "AKTIF" },
  { value: "TIDAK AKTIF", label: "TIDAK AKTIF" },
];
const KATEGORI_OPTS = [
  { value: "gh", label: "GROUP HEAD" },
  { value: "ac", label: "AREA COORDINATOR" },
  { value: "sc", label: "STORE COORDINATOR" },
];

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const isActiveRow = (r) => {
  const st = String(cell(r, "status") || "").toUpperCase();
  if (st.includes("TIDAK")) return false;
  if (st.includes("AKTIF")) return true;
  return Number(cell(r, "is_active", "STATUS")) === 1;
};

const SORT_COLS = {
  nama: { get: (r) => String(cell(r, "nama", "full_name") || "").toUpperCase() },
  code: { get: (r) => String(cell(r, "id_gh") || "").toUpperCase() },
  tipe: {
    get: (r) =>
      String(cell(r, "kategori_label") || cell(r, "kategori") || "").toUpperCase(),
  },
  status: { get: (r) => (isActiveRow(r) ? 1 : 0), num: true },
};

const emptyForm = () => ({
  id_gh: "",
  nama_nick: "",
  full_name: "",
  email: "",
  kategori: "gh",
  status: "AKTIF",
  is_active: 1,
  confirm_status: "NONAKTIFKAN",
});

const RegGroupHeadPage = () => {
  const [sm, setSm] = useState(false);
  const [status, setStatus] = useState("AKTIF");
  const [keywords, setKeywords] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "", dir: "asc" });

  const [modal, setModal] = useState({ open: false, mode: "add", id: null });
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [stores, setStores] = useState([]);
  const [storeSel, setStoreSel] = useState(() => new Set());
  const [storeKw, setStoreKw] = useState("");
  const [storesLoading, setStoresLoading] = useState(false);

  const [scRows, setScRows] = useState([]);
  const [scOpts, setScOpts] = useState([]);
  const [scPick, setScPick] = useState("");
  const [scLoading, setScLoading] = useState(false);

  const [brandOpts, setBrandOpts] = useState([]);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupBrand, setLookupBrand] = useState("");
  const [lookupStores, setLookupStores] = useState([]);
  const [lookupSel, setLookupSel] = useState(() => new Set());
  const [lookupLoading, setLookupLoading] = useState(false);

  const [userPickOpen, setUserPickOpen] = useState(false);
  const [userKw, setUserKw] = useState("");
  const [userRows, setUserRows] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    regionalLookupOptions("brand_all").then((opts) => {
      setBrandOpts(Array.isArray(opts) ? opts.filter((o) => String(o.value).toUpperCase() !== "ALL") : []);
    });
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        keywords: keywords.trim(),
        status: status || "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setLoaded(false);
        return;
      }
      setRows(extractRows(res));
      setPage(1);
      setLoaded(true);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [keywords, status]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const sorted = useMemo(() => {
    const col = SORT_COLS[sort.key];
    if (!col) return rows;
    const mul = sort.dir === "desc" ? -1 : 1;
    return rows
      .map((r, i) => ({ r, i, v: col.get(r) }))
      .sort((a, b) => {
        const an = a.v == null || a.v === "";
        const bn = b.v == null || b.v === "";
        if (an || bn) return an === bn ? a.i - b.i : an ? 1 : -1;
        const c = col.num ? a.v - b.v : String(a.v).localeCompare(String(b.v), "id", { numeric: true });
        return c !== 0 ? c * mul : a.i - b.i;
      })
      .map((x) => x.r);
  }, [rows, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const shown = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, safePage]);

  const toggleSort = (key) => {
    setPage(1);
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: "", dir: "asc" };
    });
  };

  const sortTh = (key, label, className = "") => {
    const active = sort.key === key;
    return (
      <th
        className={`rgh-sortable ${className} ${active ? "is-sorted" : ""}`.trim()}
        onClick={() => toggleSort(key)}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        title="Klik untuk urutkan"
      >
        <span className="rgh-th-inner">
          {label}
          <Icon
            name={active ? (sort.dir === "asc" ? "caret-up-fill" : "caret-down-fill") : "sort"}
            className="rgh-sort-ic"
          />
        </span>
      </th>
    );
  };

  const loadStores = useCallback(async (id) => {
    if (!id) {
      setStores([]);
      return;
    }
    setStoresLoading(true);
    try {
      const res = await api.get(`/regional/util/group-head/${encodeURIComponent(id)}/stores`);
      setStores(isSuccess(res) ? extractRows(res) : []);
      setStoreSel(new Set());
    } catch {
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  const loadSc = useCallback(async (idOrCode) => {
    if (!idOrCode) {
      setScRows([]);
      return;
    }
    setScLoading(true);
    try {
      const res = await api.get(`/regional/util/group-head/${encodeURIComponent(idOrCode)}/sc`);
      setScRows(isSuccess(res) ? extractRows(res) : []);
    } catch {
      setScRows([]);
    } finally {
      setScLoading(false);
    }
  }, []);

  const loadScOptions = useCallback(async () => {
    try {
      const res = await api.get("/regional/util/group-head/sc-options");
      const list = isSuccess(res) ? extractRows(res) : [];
      setScOpts(
        list.map((r) => ({
          value: String(cell(r, "value", "id_gh")),
          label: String(cell(r, "label", "nama") || cell(r, "id_gh")),
        }))
      );
    } catch {
      setScOpts([]);
    }
  }, []);

  const openAdd = () => {
    setForm(emptyForm());
    setFormError("");
    setStores([]);
    setScRows([]);
    setScPick("");
    setLookupOpen(false);
    setUserPickOpen(false);
    setModal({ open: true, mode: "add", id: null });
    loadScOptions();
  };

  const openEdit = async (row) => {
    const id = cell(row, "id");
    setFormError("");
    setLookupOpen(false);
    setUserPickOpen(false);
    setModal({ open: true, mode: "edit", id });
    setForm({
      id_gh: String(cell(row, "id_gh") || ""),
      nama_nick: "",
      full_name: String(cell(row, "nama", "full_name") || ""),
      email: String(cell(row, "email") || ""),
      kategori: String(cell(row, "kategori") || "gh").toLowerCase(),
      status: String(cell(row, "status") || (isActiveRow(row) ? "AKTIF" : "TIDAK AKTIF")),
      is_active: isActiveRow(row) ? 1 : 0,
      confirm_status: isActiveRow(row) ? "NONAKTIFKAN" : "AKTIFKAN",
    });
    loadScOptions();
    try {
      const res = await svc.get(id);
      if (isSuccess(res)) {
        const r = extractRow(res) || {};
        const active = isActiveRow(r);
        setForm({
          id_gh: String(cell(r, "id_gh") || ""),
          nama_nick: String(cell(r, "nama_nick") || ""),
          full_name: String(cell(r, "full_name", "nama") || ""),
          email: String(cell(r, "email") || ""),
          kategori: String(cell(r, "kategori") || "gh").toLowerCase(),
          status: String(cell(r, "status") || (active ? "AKTIF" : "TIDAK AKTIF")),
          is_active: active ? 1 : 0,
          confirm_status: String(cell(r, "confirm_status") || (active ? "NONAKTIFKAN" : "AKTIFKAN")),
        });
        if (String(cell(r, "kategori") || "").toLowerCase() === "ac") {
          loadSc(cell(r, "id_gh") || id);
        }
      }
    } catch {
      /* keep list row */
    }
    loadStores(id);
  };

  const closeModal = () => {
    setModal({ open: false, mode: "add", id: null });
    setFormError("");
    setLookupOpen(false);
    setUserPickOpen(false);
  };

  const searchUsers = async (kw = userKw) => {
    setUserLoading(true);
    try {
      const res = await api.get("/regional/util/group-head/users", { params: { keywords: kw.trim() } });
      setUserRows(isSuccess(res) ? extractRows(res) : []);
    } catch {
      setUserRows([]);
    } finally {
      setUserLoading(false);
    }
  };

  const openUserPick = () => {
    setUserPickOpen(true);
    setUserKw("");
    searchUsers("");
  };

  const pickUser = (u) => {
    setForm((f) => ({
      ...f,
      id_gh: String(cell(u, "id_gh", "id_user", "value") || ""),
      nama_nick: String(cell(u, "nama_nick") || ""),
      full_name: String(cell(u, "full_name", "label") || ""),
      email: String(cell(u, "email") || ""),
    }));
    setUserPickOpen(false);
  };

  const onSave = async () => {
    if (!String(form.id_gh || "").trim() || !String(form.full_name || "").trim()) {
      setFormError("CODE dan FULL NAME wajib");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        id_gh: String(form.id_gh).trim(),
        full_name: String(form.full_name).trim(),
        kategori: form.kategori || "gh",
      };
      let res;
      if (modal.mode === "add") {
        res = await svc.create(payload);
      } else {
        res = await svc.update(modal.id, payload);
      }
      if (!isSuccess(res)) {
        setFormError(res?.responseMessage || "Gagal simpan");
        return;
      }
      await loadList();
      if (modal.mode === "add") {
        const created = extractRow(res) || {};
        const newId = cell(created, "id");
        if (newId) {
          await openEdit({
            id: newId,
            id_gh: payload.id_gh,
            nama: payload.full_name,
            full_name: payload.full_name,
            kategori: payload.kategori,
            status: "AKTIF",
            is_active: 1,
          });
        }
      } else {
        const detail = await svc.get(modal.id);
        if (isSuccess(detail)) {
          const r = extractRow(detail) || {};
          setForm((f) => ({
            ...f,
            full_name: String(cell(r, "full_name", "nama") || f.full_name),
            kategori: String(cell(r, "kategori") || f.kategori).toLowerCase(),
            status: String(cell(r, "status") || f.status),
            is_active: isActiveRow(r) ? 1 : 0,
            confirm_status: String(cell(r, "confirm_status") || f.confirm_status),
          }));
        }
      }
    } catch (e) {
      setFormError(e?.message || "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  const onToggleStatus = async () => {
    if (!modal.id) return;
    setSaving(true);
    setFormError("");
    try {
      const res = await svc.update(modal.id, { confirm_status: form.confirm_status });
      if (!isSuccess(res)) {
        setFormError(res?.responseMessage || "Gagal update status");
        return;
      }
      const detail = await svc.get(modal.id);
      if (isSuccess(detail)) {
        const r = extractRow(detail) || {};
        const active = isActiveRow(r);
        setForm((f) => ({
          ...f,
          status: String(cell(r, "status") || (active ? "AKTIF" : "TIDAK AKTIF")),
          is_active: active ? 1 : 0,
          confirm_status: String(cell(r, "confirm_status") || (active ? "NONAKTIFKAN" : "AKTIFKAN")),
        }));
      }
      await loadList();
    } catch (e) {
      setFormError(e?.message || "Gagal update status");
    } finally {
      setSaving(false);
    }
  };

  const filteredStores = useMemo(() => {
    const kw = storeKw.trim().toLowerCase();
    if (!kw) return stores;
    return stores.filter((s) => {
      const blob = `${cell(s, "brand")} ${cell(s, "store_id", "store")} ${cell(s, "store_desc")}`.toLowerCase();
      return blob.includes(kw);
    });
  }, [stores, storeKw]);

  const loadLookupStores = useCallback(
    async (brand) => {
      if (!brand) {
        setLookupStores([]);
        setLookupSel(new Set());
        return;
      }
      setLookupLoading(true);
      try {
        const opts = await regionalLookupOptions("store_all", { parentId: brand, force: true });
        const used = new Set(stores.map((s) => String(cell(s, "store_id", "store")).toUpperCase()));
        setLookupStores(
          (Array.isArray(opts) ? opts : [])
            .filter((o) => String(o.value).toUpperCase() !== "ALL")
            .filter((o) => !used.has(String(o.value).toUpperCase()))
            .map((o) => ({ store_id: String(o.value), store_desc: String(o.label || o.value) }))
        );
        setLookupSel(new Set());
      } catch {
        setLookupStores([]);
        setLookupSel(new Set());
      } finally {
        setLookupLoading(false);
      }
    },
    [stores]
  );

  const onAddSelectedStores = async () => {
    if (!modal.id || !lookupBrand || !lookupSel.size) return;
    setStoresLoading(true);
    setFormError("");
    try {
      const results = await Promise.all(
        Array.from(lookupSel).map((storeId) =>
          api.post(`/regional/util/group-head/${encodeURIComponent(modal.id)}/stores`, {
            brand: lookupBrand,
            store_id: storeId,
          })
        )
      );
      const failed = results.find((res) => !isSuccess(res));
      if (failed) {
        setFormError(failed?.responseMessage || "Gagal tambah store");
      }
      await loadStores(modal.id);
      setLookupOpen(false);
      setLookupBrand("");
      setLookupStores([]);
      setLookupSel(new Set());
    } catch (e) {
      setFormError(e?.message || "Gagal tambah store");
    } finally {
      setStoresLoading(false);
    }
  };

  const onDeleteStores = async () => {
    if (!storeSel.size) return;
    if (!window.confirm("Delete selected data?")) return;
    setStoresLoading(true);
    try {
      for (const id of Array.from(storeSel)) {
        const res = await api.delete(`/regional/util/group-head/store-detail/${encodeURIComponent(id)}`);
        if (!isSuccess(res)) {
          setFormError(res?.responseMessage || "Gagal hapus store");
          break;
        }
      }
      await loadStores(modal.id);
    } catch (e) {
      setFormError(e?.message || "Gagal hapus store");
    } finally {
      setStoresLoading(false);
    }
  };

  const onAddSc = async () => {
    if (!modal.id || !form.id_gh || !scPick) return;
    setScLoading(true);
    setFormError("");
    try {
      const res = await api.post(`/regional/util/group-head/${encodeURIComponent(form.id_gh)}/sc`, {
        id_sc: scPick,
      });
      if (!isSuccess(res)) {
        setFormError(res?.responseMessage || "Gagal tambah SC");
        return;
      }
      setScPick("");
      await loadSc(form.id_gh);
    } catch (e) {
      setFormError(e?.message || "Gagal tambah SC");
    } finally {
      setScLoading(false);
    }
  };

  const onDeleteSc = async (id) => {
    if (!id) return;
    setScLoading(true);
    try {
      const res = await api.delete(`/regional/util/group-head/sc-detail/${encodeURIComponent(id)}`);
      if (!isSuccess(res)) {
        setFormError(res?.responseMessage || "Gagal hapus SC");
        return;
      }
      await loadSc(form.id_gh || modal.id);
    } catch (e) {
      setFormError(e?.message || "Gagal hapus SC");
    } finally {
      setScLoading(false);
    }
  };

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${safePage}-${error || "ok"}`;
  const showScPanel = form.kategori === "ac";
  const showStorePanel = modal.mode === "edit" && modal.id;

  return (
    <AccessGuard moduleCode="REG_TOOLS_GH">
      <Head title="Group Head" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rgh-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Group Head List
                </BlockTitle>
                <BlockDes className="text-soft">
                  {loaded ? `You have total ${rows.length} rows` : "Master Group Head"}
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <div className="toggle-wrap nk-block-tools-toggle">
                  <Button
                    className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                    onClick={() => setSm(!sm)}
                  >
                    <Icon name="menu-alt-r" />
                  </Button>
                  <div className="toggle-expand-content" style={{ display: sm ? "block" : undefined }}>
                    <ul className="nk-block-tools g-3 align-items-center">
                      <li className="hrd-filter-select" style={{ minWidth: 140 }}>
                        <RSelect
                          styles={filterSelectStyles}
                          options={STATUS_OPTS}
                          value={STATUS_OPTS.find((o) => o.value === status) || STATUS_OPTS[1]}
                          onChange={(opt) => setStatus(opt?.value || "AKTIF")}
                          placeholder="Status"
                        />
                      </li>
                      <li>
                        <div className="form-control-wrap" style={{ minWidth: 160 }}>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Keywords"
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") loadList();
                            }}
                          />
                        </div>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="btn btn-icon btn-trigger admin-filter-premium-btn"
                          onClick={loadList}
                          disabled={loading}
                          title="Search"
                        >
                          <Icon pack="premium" name="pencarian" size={32} />
                        </button>
                      </li>
                      <li>
                        <Button color="primary" size="sm" onClick={openAdd}>
                          <Icon name="plus" />
                          <span>Create</span>
                        </Button>
                      </li>
                    </ul>
                  </div>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
            {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

            <div className="riv-table-wrap">
              <table className="riv-table riv-table--rgh">
                <thead>
                  <tr>
                    <th className="rds-no">NO</th>
                    {sortTh("nama", "NAMA")}
                    {sortTh("code", "CODE")}
                    {sortTh("tipe", "TIPE")}
                    {sortTh("status", "STATUS", "ctr")}
                  </tr>
                </thead>
                <tbody>
                  {!shown.length ? (
                    <tr>
                      <td colSpan={5} className="ctr">
                        There Is No Data
                      </td>
                    </tr>
                  ) : (
                    shown.map((r, i) => {
                      const id = String(cell(r, "id") || i);
                      const active = isActiveRow(r);
                      return (
                        <tr key={id}>
                          <td className="rds-no">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                          <td>
                            <button type="button" className="rgh-nama-link" onClick={() => openEdit(r)}>
                              {cell(r, "nama", "full_name") || "-"}
                            </button>
                          </td>
                          <td>{cell(r, "id_gh")}</td>
                          <td>{cell(r, "kategori_label") || String(cell(r, "kategori") || "").toUpperCase()}</td>
                          <td className="ctr">{active ? "AKTIF" : "TIDAK AKTIF"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {sorted.length > PAGE_SIZE ? (
              <div className="rsl-pager" style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <span className="text-soft small">
                  Halaman {safePage}/{totalPages}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-dim btn-outline-light"
                    disabled={safePage <= 1}
                    onClick={() => setPage(Math.max(1, safePage - 1))}
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-dim btn-outline-light"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>

        <Modal
          isOpen={modal.open}
          toggle={closeModal}
          className={`modal-dialog-centered rgh-modal${showStorePanel ? " rgh-modal--wide" : " rgh-modal--narrow"}`}
        >
          <ModalBody className="p-0">
            <div className="rgh-modal__head">
              <div>
                <h5 className="rgh-modal__title">Group Head Info</h5>
              </div>
              <button type="button" className="rgh-modal__close" aria-label="Close" onClick={closeModal}>
                <Icon name="cross" />
              </button>
            </div>

            {formError ? <div className="rrd-msg err rgh-modal__err">{formError}</div> : null}

            <div className="rgh-modal__body">
              <div className="rgh-toolbar">
                <div className="rgh-toolbar__actions">
                  <Button color="primary" size="sm" onClick={onSave} disabled={saving}>
                    <Icon name="save" />
                    <span>{modal.mode === "add" ? "Save" : "Update"}</span>
                  </Button>
                </div>
                {modal.mode === "edit" ? (
                  <div className="rgh-status">
                    <Icon name="info" />
                    <strong>{form.status}</strong>
                    <Button
                      color={form.is_active ? "danger" : "success"}
                      size="sm"
                      onClick={onToggleStatus}
                      disabled={saving}
                    >
                      {form.confirm_status}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className={`rgh-layout${showStorePanel ? " has-store" : ""}`}>
                <div className="rgh-layout__left">
                  <div className="rgh-form-panel">
                    <div className="rgh-field">
                      <label className="form-label">CODE</label>
                      <div className="rgh-code-row">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={openUserPick}
                          disabled={modal.mode === "edit"}
                          title="Lookup"
                        >
                          <Icon name="list" />
                        </button>
                        <input type="text" className="form-control form-control-sm" value={form.id_gh} readOnly />
                      </div>
                    </div>
                    <div className="rgh-field">
                      <label className="form-label">NICK NAME</label>
                      <input type="text" className="form-control form-control-sm" value={form.nama_nick} readOnly />
                    </div>
                    <div className="rgh-field">
                      <label className="form-label">FULL NAME</label>
                      <input type="text" className="form-control form-control-sm" value={form.full_name} readOnly />
                    </div>
                    <div className="rgh-field">
                      <label className="form-label">EMAIL</label>
                      <input type="text" className="form-control form-control-sm" value={form.email} readOnly />
                    </div>

                    <div className="rgh-field">
                      <label className="form-label">Tipe Account</label>
                      <div className="rgh-kategori">
                        {KATEGORI_OPTS.map((o) => (
                          <label key={o.value}>
                            <input
                              type="radio"
                              name="kategori"
                              value={o.value}
                              checked={form.kategori === o.value}
                              onChange={() => {
                                setForm((f) => ({ ...f, kategori: o.value }));
                                if (o.value === "ac" && (form.id_gh || modal.id)) {
                                  loadSc(form.id_gh || modal.id);
                                }
                              }}
                            />
                            <span>{o.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {showScPanel ? (
                      <div className="rgh-panel">
                        <div className="rgh-panel__title">Select Store Coordinator</div>
                        <div className="rgh-panel__bar">
                          <div style={{ minWidth: 160, flex: 1 }}>
                            <RSelect
                              styles={filterSelectStyles}
                              isSearchable
                              options={scOpts}
                              value={scOpts.find((o) => o.value === scPick) || null}
                              onChange={(opt) => setScPick(opt?.value || "")}
                              placeholder="Pilih SC"
                            />
                          </div>
                          <Button color="primary" size="sm" onClick={onAddSc} disabled={!scPick || scLoading}>
                            <Icon name="plus" />
                            <span>Add</span>
                          </Button>
                        </div>
                        <table className="rgh-mini-table">
                          <thead>
                            <tr>
                              <th>NO</th>
                              <th>NAMA</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {!scRows.length ? (
                              <tr>
                                <td colSpan={3} className="ctr">
                                  There Is No Data
                                </td>
                              </tr>
                            ) : (
                              scRows.map((r, i) => (
                                <tr key={cell(r, "id") || i}>
                                  <td>{i + 1}</td>
                                  <td>{cell(r, "nama")}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      onClick={() => onDeleteSc(cell(r, "id"))}
                                    >
                                      <Icon name="trash" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    <div className={`rgh-user-slide${userPickOpen ? " is-open" : ""}`} aria-hidden={!userPickOpen}>
                      <div className="rgh-user-slide__head">
                        <div className="rgh-panel__title" style={{ margin: 0 }}>
                          Lookup CODE
                        </div>
                        <Button size="sm" color="light" onClick={() => setUserPickOpen(false)}>
                          Close
                        </Button>
                      </div>
                      <div className="rgh-panel__bar">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Keywords"
                          value={userKw}
                          onChange={(e) => setUserKw(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") searchUsers(userKw);
                          }}
                        />
                        <Button size="sm" color="info" onClick={() => searchUsers(userKw)}>
                          Search
                        </Button>
                      </div>
                      {userLoading ? <div className="text-soft small px-3">Memuat...</div> : null}
                      <div className="rgh-user-pick">
                        {userRows.map((u, i) => (
                          <button type="button" key={cell(u, "id_user") || i} onClick={() => pickUser(u)}>
                            <strong>{cell(u, "id_user", "id_gh")}</strong> — {cell(u, "full_name") || cell(u, "nama_nick")}
                            <span className="meta">
                              {cell(u, "nama_nick")} · {cell(u, "email")}
                            </span>
                          </button>
                        ))}
                        {!userRows.length && !userLoading ? (
                          <div className="text-soft small p-2">There Is No Data</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {showStorePanel ? (
                  <div className="rgh-layout__right">
                    <div className="rgh-store">
                      <div className="rgh-store__head">
                        <div className="rgh-panel__title" style={{ margin: 0 }}>
                          STORE LIST
                        </div>
                        <div className="rgh-panel__bar rgh-store__actions" style={{ margin: 0 }}>
                          <input
                            type="text"
                            className="rgh-underline-input"
                            placeholder="Keywords"
                            value={storeKw}
                            onChange={(e) => setStoreKw(e.target.value)}
                          />
                          <Button
                            color="primary"
                            size="sm"
                            onClick={() => {
                              setLookupOpen(true);
                              setLookupBrand("");
                              setLookupStores([]);
                              setLookupSel(new Set());
                            }}
                          >
                            <Icon name="plus" />
                            <span>ADD</span>
                          </Button>
                          <Button color="danger" size="sm" onClick={onDeleteStores} disabled={!storeSel.size}>
                            <Icon name="trash" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </div>

                      <div className="rgh-store__body">
                        {storesLoading ? <div className="text-soft small mb-1">Memuat store list...</div> : null}
                        <div className="rgh-store__scroll">
                          <table className="rgh-mini-table">
                            <thead>
                              <tr>
                                <th style={{ width: 36 }}>
                                  <input
                                    type="checkbox"
                                    checked={
                                      filteredStores.length > 0 &&
                                      filteredStores.every((s) => storeSel.has(String(cell(s, "id"))))
                                    }
                                    onChange={(e) => {
                                      setStoreSel((prev) => {
                                        const next = new Set(prev);
                                        filteredStores.forEach((s) => {
                                          const id = String(cell(s, "id"));
                                          if (e.target.checked) next.add(id);
                                          else next.delete(id);
                                        });
                                        return next;
                                      });
                                    }}
                                  />
                                </th>
                                <th>NO</th>
                                <th>BRAND</th>
                                <th>STORE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!filteredStores.length ? (
                                <tr>
                                  <td colSpan={4} className="ctr">
                                    There is no data
                                  </td>
                                </tr>
                              ) : (
                                filteredStores.map((s, i) => {
                                  const id = String(cell(s, "id") || i);
                                  return (
                                    <tr key={id}>
                                      <td>
                                        <input
                                          type="checkbox"
                                          checked={storeSel.has(id)}
                                          onChange={(e) => {
                                            setStoreSel((prev) => {
                                              const next = new Set(prev);
                                              if (e.target.checked) next.add(id);
                                              else next.delete(id);
                                              return next;
                                            });
                                          }}
                                        />
                                      </td>
                                      <td>{i + 1}</td>
                                      <td>{cell(s, "brand")}</td>
                                      <td>{cell(s, "store_desc") || cell(s, "store_id", "store")}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className={`rgh-store-slide${lookupOpen ? " is-open" : ""}`} aria-hidden={!lookupOpen}>
                          <div className="rgh-store-slide__head">
                            <div className="rgh-panel__title" style={{ margin: 0 }}>
                              Add Store
                            </div>
                            <Button
                              color="light"
                              size="sm"
                              onClick={() => {
                                setLookupOpen(false);
                                setLookupBrand("");
                                setLookupStores([]);
                                setLookupSel(new Set());
                              }}
                            >
                              Close
                            </Button>
                          </div>
                          <div className="rgh-panel__bar">
                            <div style={{ minWidth: 160, flex: 1 }}>
                              <RSelect
                                styles={filterSelectStyles}
                                isSearchable
                                options={brandOpts}
                                value={brandOpts.find((o) => String(o.value) === String(lookupBrand)) || null}
                                onChange={(opt) => {
                                  const brand = opt?.value != null ? String(opt.value) : "";
                                  setLookupBrand(brand);
                                  loadLookupStores(brand);
                                }}
                                placeholder="Brand"
                              />
                            </div>
                            <Button
                              color="primary"
                              size="sm"
                              disabled={!lookupSel.size || storesLoading}
                              onClick={onAddSelectedStores}
                            >
                              Add selected
                            </Button>
                          </div>
                          {lookupLoading ? <div className="text-soft small">Memuat store...</div> : null}
                          <div className="rgh-store-slide__scroll">
                            <table className="rgh-mini-table">
                              <thead>
                                <tr>
                                  <th style={{ width: 36 }}>
                                    <input
                                      type="checkbox"
                                      checked={
                                        lookupStores.length > 0 && lookupSel.size === lookupStores.length
                                      }
                                      onChange={(e) => {
                                        if (!e.target.checked) setLookupSel(new Set());
                                        else setLookupSel(new Set(lookupStores.map((s) => String(s.store_id))));
                                      }}
                                    />
                                  </th>
                                  <th>STORE</th>
                                </tr>
                              </thead>
                              <tbody>
                                {!lookupStores.length ? (
                                  <tr>
                                    <td colSpan={2} className="ctr">
                                      {lookupBrand ? "There Is No Data" : "Pilih brand"}
                                    </td>
                                  </tr>
                                ) : (
                                  lookupStores.map((s) => {
                                    const sid = String(s.store_id);
                                    return (
                                      <tr key={sid}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={lookupSel.has(sid)}
                                            onChange={(e) => {
                                              setLookupSel((prev) => {
                                                const next = new Set(prev);
                                                if (e.target.checked) next.add(sid);
                                                else next.delete(sid);
                                                return next;
                                              });
                                            }}
                                          />
                                        </td>
                                        <td>{s.store_desc || sid}</td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </AccessGuard>
  );
};

export default RegGroupHeadPage;
