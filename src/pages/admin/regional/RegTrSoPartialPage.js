import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  ModalBody,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
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
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { ModalSmoothScroll } from "../../../components/ModalSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import api from "../../../lib/api";
import { extractRows, isSuccess } from "../../../lib/response";
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-sales-detail.css";
import "./reg-inv-report.css";

/** Legacy module/Rpt/Rpt_Tr_So_Partial.aspx + Rpt_Tr_So_Partial_Detail2.aspx */
const svc = createRegionalService("rpt/so/tr-so-partial", { crud: false });

const fetchDetail = (headerId) =>
  api.get(`/regional/rpt/so/tr-so-partial/${encodeURIComponent(headerId)}/detail`);

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem" }),
};

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayYmd = () => ymd(new Date());
const monthStartYmd = () => {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
};

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));
const fmtDate = (v) => {
  if (v == null || v === "") return "";
  const s = String(v);
  const m = s.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
};
const fmtBit = (v) => {
  if (v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true") return "1";
  return "0";
};

const ALL_OPT = { value: "ALL", label: "ALL" };
const RENDER_STEP = 80;

const headerIdOf = (r) => String(r?.NO_TR_SO_HEADER || r?.no_tr_so_header || "").trim();
const storeOf = (r) => String(r?.ID_STORE_SO || r?.id_store_so || r?.ID_Store_SO || "").trim();

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const RegTrSoPartialPage = () => {
  const tableRef = useRef(null);
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());

  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);

  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);
  const [selectedId, setSelectedId] = useState("");
  const [listQuery, setListQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalHeader, setModalHeader] = useState("");
  const [modalStore, setModalStore] = useState("");
  const [modalItems, setModalItems] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const detailTableRef = useRef(null);

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
  }, []);

  useEffect(() => {
    regionalLookupOptions("store", { parentId: brandId === "ALL" ? "" : brandId || "" }).then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setStoreOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
    setStoreId("");
  }, [brandId]);

  const canSearch = Boolean(brandId && storeId && fromDate && toDate);

  /* Sync sticky 2nd header row `top` to real 1st-row height (no rowspan — sticky-safe) */
  useEffect(() => {
    if (!modalOpen) return undefined;
    const table = detailTableRef.current;
    const row1 = table?.tHead?.rows?.[0];
    if (!table || !row1) return undefined;
    const sync = () => {
      const h = Math.max(20, Math.ceil(row1.getBoundingClientRect().height));
      table.style.setProperty("--riv-sop-h1", `${h}px`);
    };
    sync();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(row1);
    window.addEventListener("resize", sync);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [modalOpen, modalLoading, modalItems.length]);


  const loadData = useCallback(async () => {
    if (!brandId || !storeId || !fromDate || !toDate) {
      setError("Pilih Brand, Store, dan tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(null);
        return;
      }
      setRows(extractRows(res));
      setView({ brandId, storeId, fromDate, toDate });
      setLimit(RENDER_STEP);
      setSelectedId("");
      setListQuery("");
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, storeId, fromDate, toDate]);

  const openDetail = useCallback(async (row) => {
    const id = headerIdOf(row);
    const store = storeOf(row);
    if (!id) return;
    setModalHeader(id);
    setModalStore(store);
    setModalOpen(true);
    setModalLoading(true);
    setModalError("");
    setModalItems([]);
    try {
      const res = await fetchDetail(id);
      if (!isSuccess(res)) {
        setModalError(res?.responseMessage || "Gagal memuat");
        return;
      }
      setModalItems(extractRows(res));
    } catch (e) {
      setModalError(e?.message || "Gagal memuat");
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalHeader("");
    setModalStore("");
    setModalItems([]);
    setModalError("");
  }, []);

  const filteredRows = useMemo(() => {
    const q = String(listQuery || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = [
        headerIdOf(r),
        storeOf(r),
        cell(r, "BRAND_SO"),
        cell(r, "CLASS_SO"),
        cell(r, "GRADE_SO"),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, listQuery]);

  const shown = useMemo(() => filteredRows.slice(0, limit), [filteredRows, limit]);

  const detailFooter = useMemo(() => {
    let qa = 0,
      ha = 0,
      pa = 0,
      tha = 0,
      tpa = 0,
      qr = 0,
      hr = 0,
      pr = 0,
      thr = 0,
      tpr = 0,
      qs = 0,
      ths = 0,
      tps = 0;
    modalItems.forEach((r) => {
      qa += Number(cell(r, "QTY_A") || 0);
      ha += Number(cell(r, "HPP_A") || 0);
      pa += Number(cell(r, "PRICE_A") || 0);
      tha += Number(cell(r, "TOTAL_HPP_A") || 0);
      tpa += Number(cell(r, "TOTAL_PRICE_A") || 0);
      qr += Number(cell(r, "QTY_REAL") || 0);
      hr += Number(cell(r, "HPP_REAL") || 0);
      pr += Number(cell(r, "PRICE_REAL") || 0);
      thr += Number(cell(r, "TOTAL_HPP_REAL") || 0);
      tpr += Number(cell(r, "TOTAL_PRICE_REAL") || 0);
      qs += Number(cell(r, "QTY_SELISIH") || 0);
      ths += Number(cell(r, "TOTAL_HPP_SELISIH") || 0);
      tps += Number(cell(r, "TOTAL_PRICE_SELISIH") || 0);
    });
    return { qa, ha, pa, tha, tpa, qr, hr, pr, thr, tpr, qs, ths, tps };
  }, [modalItems]);

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_TR_SO_PARTIAL">
      <Head title="Tr So Partial" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Tr So Partial
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
                    ? `You have total ${rows.length} transactions`
                    : "Isi filter lalu klik Cari untuk memuat data"}
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
                      <li className="hrd-filter-select">
                        <RSelect
                          className="hrd-filter-rselect"
                          styles={filterSelectStyles}
                          isSearchable
                          isClearable
                          placeholder="Brand"
                          options={brandOpts}
                          value={brandOpts.find((o) => String(o.value) === String(brandId)) || null}
                          onChange={(opt) => setBrandId(opt?.value != null ? String(opt.value) : "")}
                        />
                      </li>
                      <li className="hrd-filter-select">
                        <RSelect
                          className="hrd-filter-rselect"
                          styles={filterSelectStyles}
                          isSearchable
                          isClearable
                          placeholder="Store"
                          options={storeOpts}
                          value={storeOpts.find((o) => String(o.value) === String(storeId)) || null}
                          onChange={(opt) => setStoreId(opt?.value != null ? String(opt.value) : "")}
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
                        <button
                          type="button"
                          className="btn btn-icon btn-trigger admin-filter-premium-btn"
                          onClick={loadData}
                          disabled={loading || !canSearch}
                          title={canSearch ? "Load" : "Pilih filter dulu"}
                          aria-label="Load"
                        >
                          <Icon pack="premium" name="pencarian" size={32} />
                        </button>
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

            {!view && !loading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}
            {view && !error && !rows.length ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}

            {view && rows.length > 0 ? (
              <div className="riv-bleed">
                <div className="riv-list-toolbar">
                  <input
                    type="search"
                    className="riv-list-search"
                    placeholder="Cari SO / store / class…"
                    value={listQuery}
                    onChange={(e) => {
                      setListQuery(e.target.value);
                      setLimit(RENDER_STEP);
                    }}
                    aria-label="Cari SO, store, atau class"
                  />
                </div>
                <div className="riv-table-wrap riv-table-wrap--trso">
                  <table ref={tableRef} className="riv-table riv-table--trso">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="rds-no riv-trso-pin-no">
                          NO
                        </th>
                        <th rowSpan={2} className="ctr riv-trso-pin-so">
                          SO.NUMBER
                        </th>
                        <th rowSpan={2} className="ctr">
                          BRAND
                        </th>
                        <th rowSpan={2} className="ctr">
                          STORE
                        </th>
                        <th rowSpan={2} className="ctr">
                          CLASS
                        </th>
                        <th rowSpan={2} className="ctr">
                          GRADE
                        </th>
                        <th colSpan={2} className="ctr riv-trso-grp--date">
                          DATE
                        </th>
                        <th colSpan={3} className="ctr riv-trso-grp--data">
                          DATA
                        </th>
                        <th colSpan={5} className="ctr riv-trso-grp--so">
                          STOCK OPNAME
                        </th>
                        <th colSpan={3} className="ctr riv-trso-grp--diff">
                          DIFFERENT
                        </th>
                        <th rowSpan={2} className="ctr riv-trso-act">
                          ACTION
                        </th>
                      </tr>
                      <tr>
                        <th className="ctr riv-trso-grp--date">OPEN</th>
                        <th className="ctr riv-trso-grp--date">CLOSED</th>
                        <th className="num riv-trso-grp--data">QTY</th>
                        <th className="num riv-trso-grp--data">HPP</th>
                        <th className="num riv-trso-grp--data">PRICE</th>
                        <th className="num riv-trso-grp--so">SO.STOCK</th>
                        <th className="num riv-trso-grp--so">HPP REAL</th>
                        <th className="num riv-trso-grp--so">PRICE REAL</th>
                        <th className="ctr riv-trso-grp--so">SO.STATUS</th>
                        <th className="ctr riv-trso-grp--so">CLOSING</th>
                        <th className="num riv-trso-grp--diff">QTY</th>
                        <th className="num riv-trso-grp--diff">HPP</th>
                        <th className="num riv-trso-grp--diff">PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!shown.length ? (
                        <tr>
                          <td colSpan={20} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        shown.map((r, i) => {
                          const id = headerIdOf(r);
                          const selected = id && id === selectedId;
                          return (
                            <tr
                              key={id || i}
                              className={`rsd-row-click${selected ? " riv-trso-selected" : ""}`}
                              onClick={() => setSelectedId(id)}
                            >
                              <td className="rds-no riv-trso-pin-no">{i + 1}</td>
                              <td className="ctr riv-trso-pin-so riv-trso-so">{id}</td>
                              <td className="ctr">{cell(r, "BRAND_SO")}</td>
                              <td className="ctr">{cell(r, "ID_STORE_SO")}</td>
                              <td className="ctr">{cell(r, "CLASS_SO")}</td>
                              <td className="ctr">{cell(r, "GRADE_SO")}</td>
                              <td className="ctr riv-trso-grp--date">{fmtDate(cell(r, "JAM_OPEN_SO"))}</td>
                              <td className="ctr riv-trso-grp--date">{fmtDate(cell(r, "JAM_TUTUP_SO"))}</td>
                              <td className="num riv-trso-grp--data">{fmtNum(cell(r, "QTY_A"))}</td>
                              <td className="num riv-trso-grp--data">{fmtNum(cell(r, "HPP_A"))}</td>
                              <td className="num riv-trso-grp--data">{fmtNum(cell(r, "PRICE_A"))}</td>
                              <td className="num riv-trso-grp--so">{fmtNum(cell(r, "QTY_REAL"))}</td>
                              <td className="num riv-trso-grp--so">{fmtNum(cell(r, "HPP_REAL"))}</td>
                              <td className="num riv-trso-grp--so">{fmtNum(cell(r, "PRICE_REAL"))}</td>
                              <td className="ctr riv-trso-grp--so">{fmtBit(cell(r, "STATUS_SO"))}</td>
                              <td className="ctr riv-trso-grp--so">{fmtBit(cell(r, "STATUS_CLOSING"))}</td>
                              <td className="num riv-trso-grp--diff">{fmtNum(cell(r, "QTY_SELISIH"))}</td>
                              <td className="num riv-trso-grp--diff">{fmtNum(cell(r, "HPP_SELISIH"))}</td>
                              <td className="num riv-trso-grp--diff">{fmtNum(cell(r, "PRICE_SELISIH"))}</td>
                              <td className="ctr riv-trso-act" onClick={(e) => e.stopPropagation()}>
                                <UncontrolledDropdown>
                                  <DropdownToggle
                                    tag="a"
                                    href="#action"
                                    className="text-soft dropdown-toggle btn btn-icon btn-trigger riv-trso-dd-toggle"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <Icon name="more-h" />
                                  </DropdownToggle>
                                  <DropdownMenu end container="body" className="riv-trso-dd-menu">
                                    <DropdownItem onClick={() => openDetail(r)}>DETAIL</DropdownItem>
                                  </DropdownMenu>
                                </UncontrolledDropdown>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <RivStickyThead
                  tableRef={tableRef}
                  enabled={Boolean(view && filteredRows.length)}
                  tableClassName="riv-table riv-table--trso"
                />
                <div className="rds-meta">
                  <span>
                    {filteredRows.length
                      ? `Menampilkan ${shown.length} dari ${filteredRows.length} baris${
                          listQuery.trim() ? ` (filter dari ${rows.length})` : ""
                        }`
                      : "0 baris"}
                  </span>
                  {filteredRows.length > shown.length ? (
                    <span className="rds-more">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setLimit((l) => l + RENDER_STEP)}
                      >
                        Tampilkan {RENDER_STEP} lagi
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setLimit(filteredRows.length)}
                      >
                        Tampilkan semua
                      </button>
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>

        <Modal
          isOpen={modalOpen}
          toggle={closeModal}
          size="xl"
          className="modal-dialog-centered rsd-detail-modal riv-detail-modal riv-detail-modal--sopartial"
        >
          <div className="rsd-detail-hero">
            <div>
              <h5 className="rsd-detail-title">DETAIL</h5>
              <p className="rsd-detail-sub">
                {modalHeader ? `SO: ${modalHeader}` : null}
                {modalStore ? <span className="text-soft"> · Store: {modalStore}</span> : null}
              </p>
            </div>
            <button type="button" className="btn btn-icon btn-trigger" onClick={closeModal} aria-label="Tutup">
              <Icon name="cross" />
            </button>
          </div>
          <ModalBody className="rsd-detail-body">
            <ModalSmoothScroll
              active={modalOpen}
              revision={`${modalLoading ? "loading" : "ready"}-${modalItems.length}-${modalHeader}`}
            >
              {modalError ? <div className="rrd-msg err mb-2">{modalError}</div> : null}
              {modalLoading ? <div className="text-soft small mb-2">Memuat...</div> : null}

              <div className="riv-detail-wrap">
                <table
                  ref={detailTableRef}
                  className="riv-table riv-detail-table riv-detail-table--sopartial"
                >
                  <colgroup>
                    <col className="riv-sop-col-no" />
                    <col className="riv-sop-col-plu" />
                    <col className="riv-sop-col-desc" />
                    {Array.from({ length: 13 }).map((_, i) => (
                      <col key={i} className="riv-sop-col-num" />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="rds-no riv-sop-pin riv-sop-pin--label">NO</th>
                      <th className="ctr riv-sop-pin riv-sop-pin--label">PLU</th>
                      <th className="riv-sop-pin riv-sop-pin--label">DESKRIPSI</th>
                      <th colSpan={5} className="ctr riv-trso-grp--data">
                        DATA
                      </th>
                      <th colSpan={5} className="ctr riv-trso-grp--so">
                        SO
                      </th>
                      <th colSpan={3} className="ctr riv-trso-grp--diff">
                        SELISIH
                      </th>
                    </tr>
                    <tr>
                      <th className="rds-no riv-sop-pin riv-sop-pin--pad" aria-hidden="true" />
                      <th className="ctr riv-sop-pin riv-sop-pin--pad" aria-hidden="true" />
                      <th className="riv-sop-pin riv-sop-pin--pad" aria-hidden="true" />
                      <th className="num riv-trso-grp--data">QTY</th>
                      <th className="num riv-trso-grp--data">HPP</th>
                      <th className="num riv-trso-grp--data">PRICE</th>
                      <th className="num riv-trso-grp--data">TOTAL_HPP</th>
                      <th className="num riv-trso-grp--data">TOTAL_PRICE</th>
                      <th className="num riv-trso-grp--so">QTY</th>
                      <th className="num riv-trso-grp--so">HPP</th>
                      <th className="num riv-trso-grp--so">PRICE</th>
                      <th className="num riv-trso-grp--so">TOTAL_HPP</th>
                      <th className="num riv-trso-grp--so">TOTAL_PRICE</th>
                      <th className="num riv-trso-grp--diff">QTY</th>
                      <th className="num riv-trso-grp--diff">TOTAL_HPP</th>
                      <th className="num riv-trso-grp--diff">TOTAL_PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!modalItems.length && !modalLoading ? (
                      <tr>
                        <td colSpan={16} className="rds-empty">
                          There Is No Data
                        </td>
                      </tr>
                    ) : (
                      modalItems.map((r, i) => (
                        <tr key={`${cell(r, "PLU")}-${i}`}>
                          <td className="rds-no">{i + 1}</td>
                          <td className="ctr">{cell(r, "PLU")}</td>
                          <td>{cell(r, "DESKRIPSI")}</td>
                          <td className="num riv-trso-grp--data">{fmtNum(cell(r, "QTY_A"))}</td>
                          <td className="num riv-trso-grp--data">{fmtNum(cell(r, "HPP_A"))}</td>
                          <td className="num riv-trso-grp--data">{fmtNum(cell(r, "PRICE_A"))}</td>
                          <td className="num riv-trso-grp--data">{fmtNum(cell(r, "TOTAL_HPP_A"))}</td>
                          <td className="num riv-trso-grp--data">{fmtNum(cell(r, "TOTAL_PRICE_A"))}</td>
                          <td className="num riv-trso-grp--so">{fmtNum(cell(r, "QTY_REAL"))}</td>
                          <td className="num riv-trso-grp--so">{fmtNum(cell(r, "HPP_REAL"))}</td>
                          <td className="num riv-trso-grp--so">{fmtNum(cell(r, "PRICE_REAL"))}</td>
                          <td className="num riv-trso-grp--so">{fmtNum(cell(r, "TOTAL_HPP_REAL"))}</td>
                          <td className="num riv-trso-grp--so">{fmtNum(cell(r, "TOTAL_PRICE_REAL"))}</td>
                          <td className="num riv-trso-grp--diff">{fmtNum(cell(r, "QTY_SELISIH"))}</td>
                          <td className="num riv-trso-grp--diff">{fmtNum(cell(r, "TOTAL_HPP_SELISIH"))}</td>
                          <td className="num riv-trso-grp--diff">{fmtNum(cell(r, "TOTAL_PRICE_SELISIH"))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {modalItems.length ? (
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="num">
                          TOTAL
                        </td>
                        <td className="num riv-trso-grp--data">{fmtNum(detailFooter.qa)}</td>
                        <td className="num riv-trso-grp--data">{fmtNum(detailFooter.ha)}</td>
                        <td className="num riv-trso-grp--data">{fmtNum(detailFooter.pa)}</td>
                        <td className="num riv-trso-grp--data">{fmtNum(detailFooter.tha)}</td>
                        <td className="num riv-trso-grp--data">{fmtNum(detailFooter.tpa)}</td>
                        <td className="num riv-trso-grp--so">{fmtNum(detailFooter.qr)}</td>
                        <td className="num riv-trso-grp--so">{fmtNum(detailFooter.hr)}</td>
                        <td className="num riv-trso-grp--so">{fmtNum(detailFooter.pr)}</td>
                        <td className="num riv-trso-grp--so">{fmtNum(detailFooter.thr)}</td>
                        <td className="num riv-trso-grp--so">{fmtNum(detailFooter.tpr)}</td>
                        <td className="num riv-trso-grp--diff">{fmtNum(detailFooter.qs)}</td>
                        <td className="num riv-trso-grp--diff">{fmtNum(detailFooter.ths)}</td>
                        <td className="num riv-trso-grp--diff">{fmtNum(detailFooter.tps)}</td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </ModalSmoothScroll>
          </ModalBody>
        </Modal>
      </Content>
    </AccessGuard>
  );
};

export default RegTrSoPartialPage;
