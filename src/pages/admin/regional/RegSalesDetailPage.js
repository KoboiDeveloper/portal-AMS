import React, { useCallback, useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
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
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import api from "../../../lib/api";
import { extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import "./reg-reg-report.css";
import "./reg-daily-sales.css";
import "./reg-sales-detail.css";

/** Legacy Seles_Detail.aspx (REG) — DAILY SALES DETAIL */
const svc = createRegionalService("rpt/sales/sales-detail", { crud: false });

/** Parity seles_detail_info.aspx — items + payments by ID_TR_SALES_HEADER */
const fetchSalesDetailInfo = (headerId) =>
  api.get(`/regional/rpt/sales/sales-detail/${encodeURIComponent(headerId)}/info`);

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
  if (!v) return "";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
};

const ALL_OPT = { value: "ALL", label: "ALL" };
const HDR_TABS = [
  { id: "ALL", label: "ALL" },
  { id: "POS", label: "POS" },
  { id: "ONLINE", label: "ONLINE" },
];
const TABS = [...HDR_TABS, { id: "WOMAN", label: "WOMAN" }];

const HDR_COLS = [
  { key: "ID_STORE", field: "ID_STORE", label: "STORE", align: "center" },
  { key: "ID_USER", field: "ID_USER", label: "CASHIER", align: "left" },
  { key: "BILLING_CODE", field: "BILLING_CODE", label: "BILLING CODE", align: "center" },
  { key: "TANGGAL", field: "TANGGAL_TRANSAKSI", label: "DATE", align: "center", date: true },
  { key: "QTY", field: "QTY", label: "QTY", num: true, sum: true },
  { key: "TOTAL_HPP", field: "TOTAL_HPP", label: "TOTAL HPP", num: true, sum: true },
  { key: "SUB_TOTAL", field: "SUB_TOTAL", label: "GROSS SALES", num: true, sum: true },
  { key: "TOTAL_DISCOUNT", field: "TOTAL_DISCOUNT", label: "DISC", num: true, sum: true },
  { key: "GRAND_TOTAL", field: "GRAND_TOTAL", label: "NET SALES", num: true, sum: true },
];

const WOMAN_COLS = [
  { key: "ID_STORE", field: "ID_STORE", label: "STORE", align: "left" },
  { key: "PLU", field: "PLU", label: "PLU", align: "left" },
  { key: "TGL", field: "TGL", label: "TGL", align: "center", date: true },
  { key: "DESKRIPSI", field: "DESKRIPSI", label: "DESKRIPSI", align: "left" },
  { key: "HPP", field: "HPP", label: "HPP", num: true, sum: true },
  { key: "PPN", field: "PPN", label: "PPN", num: true, sum: true },
  { key: "HARGA_JUAL", field: "Harga_Jual", label: "HARGA JUAL", num: true, sum: true },
  { key: "QTY", field: "QTY", label: "QTY", num: true, sum: true },
  { key: "NET", field: "NET", label: "NET", num: true, sum: true },
];

const badgeClass = (bg) => {
  const s = String(bg || "");
  if (s.includes("success")) return "rsd-badge rsd-badge--ok";
  if (s.includes("warning")) return "rsd-badge rsd-badge--warn";
  if (s.includes("info")) return "rsd-badge rsd-badge--info";
  if (s.includes("important")) return "rsd-badge rsd-badge--pos";
  return "rsd-badge";
};

const RENDER_STEP = 500;

const emptyTotals = () => ({
  TOTAL_POS: 0,
  TOTAL_ONLINE_ORDER: 0,
  GRAND_TOTAL: 0,
});

/** ALL response STATUS = POS | ONLINE */
const rowIsOnline = (r) => {
  const s = String(r.STATUS ?? r.status ?? "").toUpperCase();
  if (s === "ONLINE") return true;
  if (s === "POS") return false;
  return Number(r.order_online ?? r.ORDER_ONLINE ?? 0) > 0;
};

const RegSalesDetailPage = () => {
  const [sm, setSm] = useState(false);
  const [tab, setTab] = useState("ALL");
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());

  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);

  /** One ALL hit → shared by POS / ONLINE / ALL tabs */
  const [allRows, setAllRows] = useState([]);
  const [allTotals, setAllTotals] = useState(null);
  const [hdrLoaded, setHdrLoaded] = useState(false);
  const [hdrView, setHdrView] = useState(null);

  /** WOMAN separate */
  const [womanRows, setWomanRows] = useState([]);
  const [womanLoaded, setWomanLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);

  /** Drill-down modal */
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailHeaderId, setDetailHeaderId] = useState("");
  const [detailBilling, setDetailBilling] = useState("");
  const [detailItems, setDetailItems] = useState([]);
  const [detailPayments, setDetailPayments] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const isWoman = tab === "WOMAN";
  const isHdrTab = !isWoman;

  const openDetail = useCallback(async (row) => {
    const id = String(row?.ID_TR_SALES_HEADER || row?.id_tr_sales_header || "").trim();
    if (!id) return;
    setDetailHeaderId(id);
    setDetailBilling(String(row?.BILLING_CODE || row?.billing_code || ""));
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetailItems([]);
    setDetailPayments([]);
    try {
      const res = await fetchSalesDetailInfo(id);
      if (!isSuccess(res)) {
        setDetailError(res?.responseMessage || "Gagal memuat detail");
        return;
      }
      setDetailItems(extractRows(res));
      setDetailPayments(Array.isArray(res?.payments) ? res.payments : []);
    } catch (e) {
      setDetailError(e?.message || "Gagal memuat detail");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailHeaderId("");
    setDetailBilling("");
    setDetailItems([]);
    setDetailPayments([]);
    setDetailError("");
  }, []);

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
  }, []);

  useEffect(() => {
    if (isWoman) return;
    const parentId = brandId === "ALL" ? "" : brandId;
    regionalLookupOptions("store", { parentId }).then((opts) => {
      const list = (Array.isArray(opts) ? opts : []).filter(
        (o) => String(o.value).toUpperCase() !== "ALL"
      );
      setStoreOpts([ALL_OPT, ...list]);
    });
    setStoreId("");
  }, [brandId, isWoman]);

  /** Filter POS/ONLINE/ALL from one ALL payload */
  const rows = useMemo(() => {
    if (isWoman) return womanRows;
    if (!hdrLoaded) return [];
    if (tab === "POS") return allRows.filter((r) => !rowIsOnline(r));
    if (tab === "ONLINE") return allRows.filter((r) => rowIsOnline(r));
    return allRows;
  }, [allRows, hdrLoaded, isWoman, tab, womanRows]);

  const view = isWoman
    ? womanLoaded
      ? { tab: "WOMAN", fromDate, toDate }
      : null
    : hdrLoaded
      ? { tab, brandId: hdrView?.brandId, storeId: hdrView?.storeId, fromDate: hdrView?.fromDate, toDate: hdrView?.toDate }
      : null;

  const loadHdr = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        tipe: "ALL",
        confirm_status: "5",
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setAllRows([]);
        setAllTotals(null);
        setHdrLoaded(false);
        setHdrView(null);
        return;
      }
      setAllRows(extractRows(res));
      setAllTotals(res.totals || null);
      setHdrView({ brandId, storeId, fromDate, toDate });
      setHdrLoaded(true);
      setLimit(RENDER_STEP);
      if (tab === "WOMAN") setTab("ALL");
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setAllRows([]);
      setAllTotals(null);
      setHdrLoaded(false);
      setHdrView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, fromDate, storeId, tab, toDate]);

  const loadWoman = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        tipe: "WOMAN",
        confirm_status: "5",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setWomanRows([]);
        setWomanLoaded(false);
        return;
      }
      setWomanRows(extractRows(res));
      setWomanLoaded(true);
      setLimit(RENDER_STEP);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setWomanRows([]);
      setWomanLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const canSearch = isWoman
    ? Boolean(fromDate && toDate)
    : Boolean(brandId && storeId && fromDate && toDate);

  const load = useCallback(() => {
    if (isWoman) {
      if (!fromDate || !toDate) {
        setError("Tanggal wajib diisi");
        return;
      }
      return loadWoman();
    }
    if (!brandId || !storeId || !fromDate || !toDate) {
      setError("Pilih Brand, Store, dan tanggal dulu");
      return;
    }
    return loadHdr();
  }, [isWoman, loadHdr, loadWoman, brandId, storeId, fromDate, toDate]);

  const onSelectTab = useCallback(
    (id) => {
      if (id === tab) return;
      if ((id === "POS" || id === "ONLINE") && !hdrLoaded) return;
      setTab(id);
      setLimit(RENDER_STEP);
      setError("");
    },
    [hdrLoaded, tab]
  );

  const columns = useMemo(() => {
    if (!view) return [];
    if (view.tab === "WOMAN") return WOMAN_COLS;
    const cols = [...HDR_COLS];
    if (tab === "ALL") {
      cols.push({ key: "SALES_FROM", field: "STATUS", label: "SALES FROM", badge: true });
    }
    return cols;
  }, [tab, view]);

  const detailItemSums = useMemo(() => {
    let qty = 0;
    let net = 0;
    detailItems.forEach((r) => {
      qty += Number(r.QTY ?? r.qty ?? 0);
      net += Number(r.NET ?? r.Net ?? r.net ?? 0);
    });
    return { qty, net };
  }, [detailItems]);

  const footerSums = useMemo(() => {
    const keys = (isWoman ? WOMAN_COLS : HDR_COLS).filter((c) => c.sum).map((c) => c.field);
    const t = {};
    keys.forEach((k) => {
      t[k] = 0;
    });
    rows.forEach((r) => {
      keys.forEach((k) => {
        t[k] += Number(r[k] ?? r[k?.toLowerCase?.()] ?? 0);
      });
    });
    return t;
  }, [isWoman, rows]);

  const onExportWoman = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setError("");
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        tipe: "WOMAN",
        confirm_status: "5",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal export");
        return;
      }
      const data = extractRows(res);
      if (!data.length) {
        setError("Tidak ada data untuk periode ini");
        return;
      }
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("WOMAN");
      ws.addRow(["STORE", "PLU", "TGL", "ARTICLE", "DESKRIPSI", "HPP", "PPN", "HARGA JUAL", "QTY", "NET"]);
      data.forEach((r) => {
        ws.addRow([
          r.ID_STORE,
          r.PLU,
          r.TGL,
          r.ARTICLE,
          r.DESKRIPSI,
          Number(r.HPP || 0),
          Number(r.PPN || 0),
          Number(r.Harga_Jual || r.HARGA_JUAL || 0),
          Number(r.QTY || 0),
          Number(r.NET || r.Net || 0),
        ]);
      });
      await saveXlsxFile(wb, `WOMAN_${fromDate}_${toDate}.xlsx`);
    } catch (e) {
      setError(e?.message || "Gagal export");
    } finally {
      setExporting(false);
    }
  }, [exporting, fromDate, toDate]);

  const cellVal = (c, r) => {
    const v = r[c.field] ?? r[c.field?.toLowerCase?.()] ?? "";
    if (c.date) return fmtDate(v);
    if (c.num) return fmtNum(v);
    if (c.info) {
      return (
        <span className="rsd-info">
          <span className={String(r.STATUS_ECR) === "ECR" ? "rsd-ecr" : "rsd-non-ecr"}>{r.STATUS_ECR}</span>
          {String(r.STATUS_ECR) !== "ECR" && r.NIK_AC_NON_ECR ? (
            <span className="rsd-nik">{r.NIK_AC_NON_ECR}</span>
          ) : null}
        </span>
      );
    }
    if (c.badge) {
      return <span className={badgeClass(r.BGCLASS || r.bgclass)}>{r.STATUS}</span>;
    }
    return String(v ?? "");
  };

  const shown = rows.slice(0, limit);
  const totalsBar = allTotals || emptyTotals();

  return (
    <AccessGuard moduleCode="REG_RPT_SALES_DETAIL">
      <Head title="Daily Sales Detail" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Daily Sales Detail
              </BlockTitle>
              <BlockDes className="text-soft">
                Filter sekali (ALL) — tab POS / ONLINE tanpa hit ulang
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
                          onChange={(f, t) => {
                            setFromDate(f || "");
                            setToDate(t || "");
                          }}
                        />
                      </div>
                    </li>
                    {isHdrTab ? (
                      <>
                        <li className="hrd-filter-select">
                          <RSelect
                            className="hrd-filter-rselect"
                            styles={filterSelectStyles}
                            isSearchable
                            isClearable
                            placeholder="Brand"
                            options={brandOpts}
                            value={brandOpts.find((o) => String(o.value) === String(brandId)) || null}
                            onChange={(o) => setBrandId(o?.value ?? "")}
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
                            onChange={(o) => setStoreId(o?.value ?? "")}
                          />
                        </li>
                      </>
                    ) : null}
                    <li>
                      <button
                        type="button"
                        className="btn btn-icon btn-trigger admin-filter-premium-btn"
                        onClick={load}
                        disabled={loading || !canSearch}
                        title={canSearch ? "Filter" : "Pilih filter dulu"}
                        aria-label="Filter"
                      >
                        <Icon pack="premium" name="pencarian" size={32} />
                      </button>
                    </li>
                    {isWoman ? (
                      <li>
                        <Button
                          color="light"
                          size="sm"
                          onClick={onExportWoman}
                          disabled={exporting || !fromDate || !toDate}
                        >
                          <Icon name="download" />
                          <span>{exporting ? "Export..." : "Export Excel"}</span>
                        </Button>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <div className="card rsa-card">
            <div className="card-inner">
              <ul className="rsd-tabs">
                {TABS.map((t) => {
                  const locked = (t.id === "POS" || t.id === "ONLINE") && !hdrLoaded;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`rsd-tab${tab === t.id ? " active" : ""}${locked ? " disabled" : ""}`}
                        disabled={locked}
                        title={locked ? "Filter dulu (ALL) agar POS / ONLINE tersedia" : undefined}
                        onClick={() => onSelectTab(t.id)}
                      >
                        {t.label}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {isHdrTab && hdrLoaded && allTotals ? (
                <div className="rsd-all-totals">
                  <div>
                    <span className="rsd-tot-label">TOTAL POS</span>
                    <span className="rsd-tot-val">{fmtNum(totalsBar.TOTAL_POS)}</span>
                  </div>
                  <div>
                    <span className="rsd-tot-label">TOTAL ONLINE</span>
                    <span className="rsd-tot-val">{fmtNum(totalsBar.TOTAL_ONLINE_ORDER)}</span>
                  </div>
                  <div>
                    <span className="rsd-tot-label">GRAND TOTAL</span>
                    <span className="rsd-tot-val">{fmtNum(totalsBar.GRAND_TOTAL)}</span>
                  </div>
                </div>
              ) : null}

              {error ? <div className="rrd-msg err mt-2">{error}</div> : null}
              {loading ? <div className="text-soft small mt-2">Memuat data...</div> : null}

              {!view && !loading && !error ? (
                <div className="reg-rpt-empty">Data belum tersedia</div>
              ) : null}
              {view && !error && !rows.length ? (
                <div className="reg-rpt-empty">Data belum tersedia</div>
              ) : null}

              {view && rows.length > 0 ? (
                <>
                  <div className="rds-table-wrap mt-3">
                    <table className="rds-table rsd-table">
                      <thead>
                        <tr>
                          <th className="rds-no">No</th>
                          {columns.map((c) => (
                            <th key={c.key} className={c.num ? "num" : ""}>
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {!shown.length ? (
                          <tr>
                            <td colSpan={columns.length + 1} className="rds-empty">
                              There Is No Data
                            </td>
                          </tr>
                        ) : (
                          shown.map((r, i) => (
                            <tr
                              key={r.ID_TR_SALES_HEADER || r.NO || i}
                              className={!isWoman ? "rsd-row-click" : undefined}
                              title={!isWoman ? "Double-click untuk detail" : undefined}
                              onDoubleClick={!isWoman ? () => openDetail(r) : undefined}
                            >
                              <td className="rds-no">{i + 1}</td>
                              {columns.map((c) => (
                                <td
                                  key={c.key}
                                  className={c.num ? "num" : c.align === "center" ? "ctr" : ""}
                                >
                                  {cellVal(c, r)}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                      {rows.length ? (
                        <tfoot>
                          <tr>
                            <td className="rds-no" />
                            {columns.map((c) => (
                              <td key={c.key} className={c.num ? "num" : ""}>
                                {c.sum ? fmtNum(footerSums[c.field] || 0) : c.key === "ID_STORE" ? "TOTAL" : ""}
                              </td>
                            ))}
                          </tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>
                  <div className="rds-meta">
                    <span>
                      {rows.length ? `Menampilkan ${shown.length} dari ${rows.length} baris` : "0 baris"}
                    </span>
                    {rows.length > shown.length ? (
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
                          onClick={() => setLimit(rows.length)}
                        >
                          Tampilkan semua
                        </button>
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </Block>

        <Modal
          isOpen={detailOpen}
          toggle={closeDetail}
          size="xl"
          className="modal-dialog-centered rsd-detail-modal"
        >
          <div className="rsd-detail-hero">
            <div>
              <h5 className="rsd-detail-title">SALES DETAIL</h5>
              <p className="rsd-detail-sub">
                {detailBilling ? `Billing: ${detailBilling}` : null}
                {detailHeaderId ? (
                  <span className="text-soft"> {detailBilling ? "· " : ""}ID: {detailHeaderId}</span>
                ) : null}
              </p>
            </div>
            <button type="button" className="btn btn-icon btn-trigger" onClick={closeDetail} aria-label="Tutup">
              <Icon name="cross" />
            </button>
          </div>
          <ModalBody className="rsd-detail-body">
            {detailError ? <div className="rrd-msg err mb-2">{detailError}</div> : null}
            {detailLoading ? <div className="text-soft small mb-2">Memuat detail...</div> : null}

            <div className="rsd-detail-section">
              <span className="rsd-detail-section-label">SALES DETAIL</span>
              <div className="rds-table-wrap">
                <table className="rds-table rsd-table rsd-detail-table">
                  <thead>
                    <tr>
                      <th className="rds-no">No</th>
                      <th>STORE</th>
                      <th>PLU</th>
                      <th>DESC</th>
                      <th className="num">HPP</th>
                      <th className="num">PPN</th>
                      <th className="num">PRICE</th>
                      <th className="ctr">QTY</th>
                      <th className="num">NET SALES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!detailItems.length ? (
                      <tr>
                        <td colSpan={9} className="rds-empty">
                          There Is No Data
                        </td>
                      </tr>
                    ) : (
                      detailItems.map((r, i) => (
                        <tr key={r.ID_TR_SALES_DETAIL || r.PLU || i}>
                          <td className="rds-no">{i + 1}</td>
                          <td className="ctr">{r.ID_STORE || r.id_store || ""}</td>
                          <td className="ctr">{r.PLU || ""}</td>
                          <td>{r.DESKRIPSI || ""}</td>
                          <td className="num">{fmtNum(r.HPP)}</td>
                          <td className="num">{fmtNum(r.PPN)}</td>
                          <td className="num">{fmtNum(r.HARGA_JUAL ?? r.Harga_Jual)}</td>
                          <td className="ctr">{fmtNum(r.QTY)}</td>
                          <td className="num">{fmtNum(r.NET ?? r.Net)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {detailItems.length ? (
                    <tfoot>
                      <tr>
                        <td colSpan={7} />
                        <td className="ctr">{fmtNum(detailItemSums.qty)}</td>
                        <td className="num">{fmtNum(detailItemSums.net)}</td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </div>

            <div className="rsd-detail-section mt-3">
              <span className="rsd-detail-section-label">PAYMENT</span>
              <div className="rds-table-wrap">
                <table className="rds-table rsd-detail-pay-table">
                  <thead>
                    <tr>
                      <th className="rds-no">No</th>
                      <th>PAYMENT TYPE</th>
                      <th className="num">VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!detailPayments.length ? (
                      <tr>
                        <td colSpan={3} className="rds-empty">
                          There Is No Data
                        </td>
                      </tr>
                    ) : (
                      detailPayments.map((r, i) => (
                        <tr key={i}>
                          <td className="rds-no">{i + 1}</td>
                          <td>{r.TIPE_BAYAR || r.tipe_bayar || ""}</td>
                          <td className="num">{fmtNum(r.BAYAR ?? r.bayar)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </AccessGuard>
  );
};

export default RegSalesDetailPage;
