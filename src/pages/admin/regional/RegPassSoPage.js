import React, { useCallback, useEffect, useState } from "react";
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
import AppDatePicker from "../../../components/AppDatePicker";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import api from "../../../lib/api";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import "./reg-reg-report.css";
import "./reg-pass-so.css";

/** Legacy module/Tools/PassSO.aspx + PassSO_info.aspx */
const svc = createRegionalService("util/pass-so", { crud: true });

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: "0.8125rem" }),
};

const TIPE_OPTS = [
  { value: "ALL", label: "ALL" },
  { value: "NASIONAL", label: "SO NASIONAL" },
  { value: "PARSIAL", label: "SO PARSIAL" },
];
const TIPE_FORM_OPTS = TIPE_OPTS.filter((o) => o.value !== "ALL");

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayYmd = () => ymd(new Date());
const monthStartYmd = () => {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
};
const parseYmd = (s) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const emptyForm = () => ({
  tipe_so: "NASIONAL",
  tgl_so: todayYmd(),
  keterangan: "",
  class: "",
  password: "",
});

const RegPassSoPage = () => {
  const [sm, setSm] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [status, setStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [modal, setModal] = useState({ open: false, mode: "add", id: null });
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [stores, setStores] = useState([]);
  const [brandOpts, setBrandOpts] = useState([]);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupBrand, setLookupBrand] = useState("");
  const [lookupStores, setLookupStores] = useState([]);
  const [selectedStores, setSelectedStores] = useState(() => new Set());
  const [lookupLoading, setLookupLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(false);

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      setBrandOpts(Array.isArray(opts) ? opts.filter((o) => String(o.value).toUpperCase() !== "ALL") : []);
    });
  }, []);

  const resetStoreLookup = useCallback(() => {
    setLookupOpen(false);
    setLookupBrand("");
    setLookupStores([]);
    setSelectedStores(new Set());
    setLookupLoading(false);
  }, []);

  const openStoreLookup = () => {
    setLookupBrand("");
    setLookupStores([]);
    setSelectedStores(new Set());
    setLookupOpen(true);
  };

  const closeStoreLookup = () => {
    setLookupOpen(false);
    setLookupBrand("");
    setLookupStores([]);
    setSelectedStores(new Set());
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        keywords: keywords.trim(),
        status: status || "ALL",
        from_date: fromDate || "",
        to_date: toDate || "",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setLoaded(false);
        return;
      }
      setRows(extractRows(res));
      setLoaded(true);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [fromDate, keywords, status, toDate]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadStores = useCallback(async (id) => {
    if (!id) {
      setStores([]);
      return;
    }
    setStoresLoading(true);
    try {
      const res = await api.get(`/regional/util/pass-so/${encodeURIComponent(id)}/stores`);
      setStores(isSuccess(res) ? extractRows(res) : []);
    } catch {
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  const openAdd = () => {
    setForm(emptyForm());
    setFormError("");
    setStores([]);
    resetStoreLookup();
    setModal({ open: true, mode: "add", id: null });
  };

  const openEdit = async (row) => {
    const id = cell(row, "id");
    setFormError("");
    resetStoreLookup();
    setModal({ open: true, mode: "edit", id });
    setForm({
      tipe_so: String(cell(row, "tipe_so") || "NASIONAL"),
      tgl_so: String(cell(row, "tgl_so") || todayYmd()).replace(/\//g, "-"),
      keterangan: String(cell(row, "keterangan") || ""),
      class: "",
      password: String(cell(row, "password") || ""),
    });
    try {
      const res = await svc.get(id);
      if (isSuccess(res)) {
        const r = extractRow(res) || {};
        setForm({
          tipe_so: String(cell(r, "tipe_so") || "NASIONAL"),
          tgl_so: String(cell(r, "tgl_so") || todayYmd()).replace(/\//g, "-"),
          keterangan: String(cell(r, "keterangan") || ""),
          class: String(cell(r, "class") || ""),
          password: String(cell(r, "password") || ""),
        });
      }
    } catch {
      /* keep list row values */
    }
    loadStores(id);
  };

  const closeModal = () => {
    setModal({ open: false, mode: "add", id: null });
    setFormError("");
    resetStoreLookup();
  };

  const loadLookupStores = useCallback(
    async (brand) => {
      if (!brand) {
        setLookupStores([]);
        setSelectedStores(new Set());
        return;
      }
      setLookupLoading(true);
      try {
        const opts = await regionalLookupOptions("store", { parentId: brand, force: true });
        const used = new Set(stores.map((s) => String(cell(s, "store_id")).toUpperCase()));
        const list = (Array.isArray(opts) ? opts : [])
          .filter((o) => String(o.value).toUpperCase() !== "ALL")
          .filter((o) => !used.has(String(o.value).toUpperCase()))
          .map((o) => ({
            store_id: String(o.value),
            store_desc: String(o.label || o.value),
          }));
        setLookupStores(list);
        setSelectedStores(new Set());
      } catch {
        setLookupStores([]);
        setSelectedStores(new Set());
      } finally {
        setLookupLoading(false);
      }
    },
    [stores]
  );

  const onLookupBrandChange = (opt) => {
    const brand = opt?.value != null ? String(opt.value) : "";
    setLookupBrand(brand);
    loadLookupStores(brand);
  };

  const toggleStoreSelect = (storeId) => {
    const key = String(storeId);
    setSelectedStores((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAllLookup = (checked) => {
    if (!checked) {
      setSelectedStores(new Set());
      return;
    }
    setSelectedStores(new Set(lookupStores.map((s) => String(s.store_id))));
  };

  const onSave = async () => {
    if (!form.tipe_so || !form.tgl_so || !String(form.keterangan || "").trim()) {
      setFormError("Tipe SO, Tanggal, dan Keterangan wajib");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        tipe_so: form.tipe_so,
        tgl_so: form.tgl_so,
        keterangan: String(form.keterangan).trim(),
        class: form.tipe_so === "PARSIAL" ? String(form.class || "").trim() : "",
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
      if (modal.mode === "add") {
        const created = extractRow(res) || {};
        const newId = cell(created, "id");
        if (newId) {
          setModal({ open: true, mode: "edit", id: newId });
          const detail = await svc.get(newId);
          if (isSuccess(detail)) {
            const r = extractRow(detail) || {};
            setForm({
              tipe_so: String(cell(r, "tipe_so") || payload.tipe_so),
              tgl_so: String(cell(r, "tgl_so") || payload.tgl_so).replace(/\//g, "-"),
              keterangan: String(cell(r, "keterangan") || payload.keterangan),
              class: String(cell(r, "class") || payload.class),
              password: String(cell(r, "password") || ""),
            });
          }
          await loadStores(newId);
        } else {
          closeModal();
        }
      }
      await loadList();
    } catch (e) {
      setFormError(e?.message || "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteHeader = async (id) => {
    if (!id || !window.confirm("Delete selected data?")) return;
    try {
      const res = await svc.remove(id);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal hapus");
        return;
      }
      if (modal.open && String(modal.id) === String(id)) closeModal();
      await loadList();
    } catch (e) {
      setError(e?.message || "Gagal hapus");
    }
  };

  const onAddSelectedStores = async () => {
    if (!modal.id || !selectedStores.size) return;
    if (!window.confirm(`Add selected store (${selectedStores.size})?`)) return;
    setStoresLoading(true);
    setFormError("");
    try {
      const ids = Array.from(selectedStores);
      const results = await Promise.all(
        ids.map((storeId) =>
          api.post(`/regional/util/pass-so/${encodeURIComponent(modal.id)}/stores`, {
            store_id: storeId,
          })
        )
      );
      const failed = results.filter((res) => !isSuccess(res));
      if (failed.length) {
        setFormError(failed[0]?.responseMessage || `Gagal tambah ${failed.length} store`);
        await loadStores(modal.id);
        await loadLookupStores(lookupBrand);
        return;
      }
      await loadStores(modal.id);
      closeStoreLookup();
    } catch (e) {
      setFormError(e?.message || "Gagal tambah store");
    } finally {
      setStoresLoading(false);
    }
  };

  const onDeleteStore = async (detailId) => {
    if (!detailId) return;
    setStoresLoading(true);
    try {
      const res = await api.delete(`/regional/util/pass-so/store-detail/${encodeURIComponent(detailId)}`);
      if (!isSuccess(res)) {
        setFormError(res?.responseMessage || "Gagal hapus store");
        return;
      }
      await loadStores(modal.id);
      if (lookupBrand) await loadLookupStores(lookupBrand);
    } catch (e) {
      setFormError(e?.message || "Gagal hapus store");
    } finally {
      setStoresLoading(false);
    }
  };

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;
  const showClass = form.tipe_so === "PARSIAL";
  const allLookupSelected = lookupStores.length > 0 && selectedStores.size === lookupStores.length;

  return (
    <AccessGuard moduleCode="REG_TOOLS_PASS_SO">
      <Head title="Password SO" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rps-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Password SO List
                </BlockTitle>
                <BlockDes className="text-soft">
                  {loaded ? `You have total ${rows.length} rows` : "Kelola password Stock Opname"}
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
                          options={TIPE_OPTS}
                          value={TIPE_OPTS.find((o) => o.value === status) || TIPE_OPTS[0]}
                          onChange={(opt) => setStatus(opt?.value || "ALL")}
                        />
                      </li>
                      <li className="hrd-filter-daterange">
                        <div className="form-control-wrap">
                          <div className="form-icon form-icon-left">
                            <Icon name="calendar" />
                          </div>
                          <AppDateRangePicker
                            startDate={fromDate}
                            endDate={toDate}
                            placeholder="Date Range"
                            className="form-control form-control-sm date-picker ps-4"
                            onChange={(fromYmd, toYmd) => {
                              setFromDate(fromYmd || "");
                              setToDate(toYmd || "");
                            }}
                          />
                        </div>
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
                          <span>Add</span>
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

            <div className="riv-table-wrap rps-table-wrap">
              <table className="riv-table riv-table--rps">
                <thead>
                  <tr>
                    <th className="rds-no">NO</th>
                    <th>TIPE SO</th>
                    <th>KETERANGAN</th>
                    <th className="ctr">TANGGAL SO</th>
                    <th className="ctr">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {!rows.length ? (
                    <tr>
                      <td colSpan={5} className="ctr">
                        There Is No Data
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={cell(r, "id") || i}>
                        <td className="rds-no">{i + 1}</td>
                        <td>{cell(r, "tipe_so")}</td>
                        <td>{cell(r, "keterangan")}</td>
                        <td className="ctr">{cell(r, "tgl_so")}</td>
                        <td className="ctr rps-actions">
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => openEdit(r)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => onDeleteHeader(cell(r, "id"))}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Block>
        </PageSmoothScroll>

        <Modal
          isOpen={modal.open}
          toggle={closeModal}
          size={modal.mode === "edit" ? "xl" : "lg"}
          className={`modal-dialog-centered rps-modal${modal.mode === "edit" ? " rps-modal--wide" : " rps-modal--add"}`}
        >
          <ModalBody className="p-0">
            <div className="rps-modal__head">
              <div>
                <h5 className="rps-modal__title">
                  {modal.mode === "add" ? "Add Password SO" : `Edit Password SO #${modal.id}`}
                </h5>
              </div>
              <button type="button" className="rps-modal__close" aria-label="Close" onClick={closeModal}>
                <Icon name="cross" />
              </button>
            </div>

            {formError ? <div className="rrd-msg err rps-modal__err">{formError}</div> : null}

            <div className={`rps-modal__body${modal.mode === "edit" ? " rps-modal__body--split" : " rps-modal__body--add"}`}>
              <div className="rps-modal__col rps-modal__col--form">
                <div className="rps-form-grid">
                  <div className="rps-field">
                    <label className="form-label">Tipe SO</label>
                    <RSelect
                      styles={filterSelectStyles}
                      options={TIPE_FORM_OPTS}
                      value={TIPE_FORM_OPTS.find((o) => o.value === form.tipe_so) || TIPE_FORM_OPTS[0]}
                      onChange={(opt) => setForm((f) => ({ ...f, tipe_so: opt?.value || "NASIONAL" }))}
                    />
                  </div>
                  <div className="rps-field">
                    <label className="form-label">Tanggal SO</label>
                    <div className="form-control-wrap">
                      <AppDatePicker
                        selected={parseYmd(form.tgl_so)}
                        onChange={(d) => setForm((f) => ({ ...f, tgl_so: d ? ymd(d) : "" }))}
                        dateFormat="dd/MM/yyyy"
                        className="form-control form-control-sm date-picker"
                        portalId="rps-datepicker-portal"
                      />
                    </div>
                  </div>
                  {modal.mode === "edit" ? (
                    <div className="rps-field">
                      <label className="form-label">Password</label>
                      <input type="text" className="form-control form-control-sm" value={form.password} readOnly />
                    </div>
                  ) : null}
                  {showClass ? (
                    <div className="rps-field">
                      <label className="form-label">Class</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={form.class}
                        onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                        placeholder="Class (PARSIAL)"
                      />
                    </div>
                  ) : null}
                  <div className="rps-field rps-field--full">
                    <label className="form-label">Keterangan</label>
                    <textarea
                      className="form-control form-control-sm no-resize"
                      rows={3}
                      maxLength={50}
                      value={form.keterangan}
                      onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                      placeholder="Keterangan SO"
                    />
                  </div>
                </div>
              </div>

              {modal.mode === "edit" && modal.id ? (
                <div className={`rps-modal__col rps-modal__col--stores${lookupOpen ? " is-lookup" : ""}`}>
                  <div className={`rps-store-panel${lookupOpen ? " is-lookup" : ""}`}>
                    <div className="rps-store-view rps-store-view--assigned">
                      <div className="rps-assigned-head">
                        <div className="rps-panel-label mb-0">
                          Assigned Store <span>{stores.length}</span>
                        </div>
                        <Button color="primary" size="sm" onClick={openStoreLookup} disabled={storesLoading}>
                          <Icon name="plus" />
                          <span>Add</span>
                        </Button>
                      </div>
                      {storesLoading && !lookupOpen ? (
                        <div className="text-soft small mb-2">Memuat...</div>
                      ) : null}
                      <div className="rps-assigned-list rps-assigned-list--fill">
                        {!stores.length ? (
                          <div className="rps-empty">Belum ada store. Klik Add untuk menambah.</div>
                        ) : (
                          stores.map((s, i) => (
                            <div className="rps-assigned-row" key={cell(s, "id") || i}>
                              <div className="rps-assigned-main">
                                <strong>
                                  {cell(s, "store_desc") ||
                                    (cell(s, "store_kota")
                                      ? `${cell(s, "store_id")} - ${cell(s, "store_kota")}`
                                      : cell(s, "store_id"))}
                                </strong>
                                <span>
                                  {cell(s, "brand")}
                                  {cell(s, "status_pakai") ? ` · ${cell(s, "status_pakai")}` : ""}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="btn btn-icon btn-sm rps-assigned-remove"
                                title="Hapus"
                                aria-label="Hapus store"
                                onClick={() => onDeleteStore(cell(s, "id"))}
                              >
                                <Icon name="cross" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rps-store-view rps-store-view--lookup" aria-hidden={!lookupOpen}>
                      <div className="rps-assigned-head">
                        <div className="rps-panel-label mb-0">Store Lookup</div>
                        <button type="button" className="btn btn-sm btn-light" onClick={closeStoreLookup}>
                          Kembali
                        </button>
                      </div>
                      <div className="rps-lookup-toolbar">
                        <div className="rps-lookup-brand">
                          <RSelect
                            styles={filterSelectStyles}
                            isSearchable
                            isClearable
                            placeholder="BRAND"
                            options={brandOpts}
                            value={brandOpts.find((o) => String(o.value) === String(lookupBrand)) || null}
                            onChange={onLookupBrandChange}
                          />
                        </div>
                        <Button
                          color="primary"
                          size="sm"
                          onClick={onAddSelectedStores}
                          disabled={!selectedStores.size || storesLoading || lookupLoading}
                        >
                          <Icon name="plus" />
                          <span>Add ({selectedStores.size})</span>
                        </Button>
                      </div>
                      {lookupLoading ? <div className="text-soft small mb-2">Memuat store...</div> : null}
                      {!lookupBrand && !lookupLoading ? <div className="rps-empty">Pilih brand dulu</div> : null}
                      {lookupBrand ? (
                        <div className="rps-lookup-scroll">
                          <table className="rps-lookup-table">
                            <thead>
                              <tr>
                                <th className="rps-check-col">
                                  <input
                                    type="checkbox"
                                    checked={allLookupSelected}
                                    onChange={(e) => toggleSelectAllLookup(e.target.checked)}
                                    disabled={!lookupStores.length}
                                    aria-label="Select all"
                                  />
                                </th>
                                <th>No</th>
                                <th>Store</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!lookupStores.length ? (
                                <tr>
                                  <td colSpan={3} className="ctr">
                                    There Is No Data
                                  </td>
                                </tr>
                              ) : (
                                lookupStores.map((s, i) => {
                                  const sid = String(s.store_id);
                                  return (
                                    <tr
                                      key={sid}
                                      className={selectedStores.has(sid) ? "is-checked" : ""}
                                      onClick={() => toggleStoreSelect(sid)}
                                    >
                                      <td className="rps-check-col" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={selectedStores.has(sid)}
                                          onChange={() => toggleStoreSelect(sid)}
                                          aria-label={sid}
                                        />
                                      </td>
                                      <td className="rps-no">{i + 1}</td>
                                      <td>{s.store_desc}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rps-modal__foot">
              <div className="rps-modal__foot-left">
                {modal.mode === "edit" && modal.id ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDeleteHeader(modal.id)}
                    disabled={saving}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <div className="rps-modal__foot-right">
                <button type="button" className="btn btn-sm btn-light" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <Button color="primary" size="sm" onClick={onSave} disabled={saving}>
                  {saving ? "Saving..." : modal.mode === "add" ? "Save" : "Update"}
                </Button>
              </div>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </AccessGuard>
  );
};

export default RegPassSoPage;
