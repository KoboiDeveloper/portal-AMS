import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import "./reg-reg-report.css";
import "./reg-print-ssr.css";

/** Legacy module/Rpt/PrintSSRPU.aspx — Sales Summary Report PU */
const svc = createRegionalService("util/print-ssr", { crud: false });

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
const parseYmd = (s) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => {
  if (v == null || v === "") return "0";
  const s = String(v).replace(/,/g, "");
  if (Number.isNaN(Number(s))) return String(v);
  return nf0.format(Number(s));
};
const parseNum = (v) => {
  if (v == null || v === "") return 0;
  return Number(String(v).replace(/,/g, "")) || 0;
};
const fmtDisplayDate = (ymdStr) => {
  if (!ymdStr) return "";
  const d = new Date(`${ymdStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymdStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

const PAY_ROWS = [
  { label: "TOTAL TRANSAKSI", day: "total_tran", mtd: "total_tran1" },
  { label: "CASH", day: "cash", mtd: "cash1" },
  { label: "CREDIT CARD", day: "card", mtd: "card1" },
  { label: "DEBIT CARD", day: "debit", mtd: "debit1" },
  { label: "VOUCHER", day: "voucher", mtd: "voucher1" },
  { label: "REFUND", day: "refund", mtd: "refund1" },
  { label: "OVO", day: "OVO", mtd: "OVO1" },
  { label: "ONLINE", day: "online", mtd: "online1" },
  { label: "CASH ON DELIVERY", day: "cod", mtd: "cod1" },
  { label: "ATOME", day: "ATOME", mtd: "ATOME1" },
  { label: "INDODANA", day: "INDODANA", mtd: "INDODANA1" },
  { label: "QRIS", day: "KQRIS", mtd: "KQRIS1" },
  { label: "QRIS BCA", day: "D_QRIS_BCA", mtd: "D_QRIS1_BCA" },
  { label: "QRIS BNI", day: "D_QRIS_BNI", mtd: "D_QRIS1_BNI" },
  { label: "QRIS BRI", day: "D_QRIS_BRI", mtd: "D_QRIS1_BRI" },
  { label: "QRIS MANDIRI", day: "D_QRIS_MANDIRI", mtd: "D_QRIS1_MANDIRI" },
];

const RegPrintSsrPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [reportDate, setReportDate] = useState(todayYmd());
  const [brandOpts, setBrandOpts] = useState([]);
  const [storeOpts, setStoreOpts] = useState([]);

  const [headerRows, setHeaderRows] = useState([]);
  const [payment, setPayment] = useState(null);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = (Array.isArray(opts) ? opts : []).filter((o) => String(o.value).toUpperCase() !== "ALL");
      setBrandOpts(list);
    });
  }, []);

  useEffect(() => {
    regionalLookupOptions("store", { parentId: brandId || "" }).then((opts) => {
      const list = (Array.isArray(opts) ? opts : []).filter((o) => String(o.value).toUpperCase() !== "ALL");
      setStoreOpts(list);
    });
    setStoreId("");
  }, [brandId]);

  const canSearch = Boolean(brandId && storeId && reportDate && brandId !== "ALL" && storeId !== "ALL");

  const loadData = useCallback(async () => {
    if (!canSearch) {
      setError("Pilih Brand, Store, dan tanggal");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = {
        from_date: reportDate,
        id_brand: brandId,
        id_store: storeId,
      };
      const [hRes, pRes] = await Promise.all([
        svc.list({ ...params, tipe: "header" }),
        svc.list({ ...params, tipe: "payment" }),
      ]);
      if (!isSuccess(hRes)) {
        setError(hRes?.responseMessage || "Gagal memuat header SSR");
        setHeaderRows([]);
        setPayment(null);
        setView(null);
        return;
      }
      if (!isSuccess(pRes)) {
        setError(pRes?.responseMessage || "Gagal memuat payment SSR");
        setHeaderRows([]);
        setPayment(null);
        setView(null);
        return;
      }
      const payRows = extractRows(pRes);
      setHeaderRows(extractRows(hRes));
      setPayment(payRows[0] || null);
      setView({ brandId, storeId, reportDate });
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setHeaderRows([]);
      setPayment(null);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, canSearch, reportDate, storeId]);

  const totals = useMemo(() => {
    let qty = 0;
    let net = 0;
    let qtyMtd = 0;
    let netMtd = 0;
    headerRows.forEach((r) => {
      qty += parseNum(cell(r, "QTY"));
      net += parseNum(cell(r, "NET_SALES"));
      qtyMtd += parseNum(cell(r, "QTY_MTD"));
      netMtd += parseNum(cell(r, "NET_SALES_MTD"));
    });
    return { qty, net, qtyMtd, netMtd };
  }, [headerRows]);

  const displayDate = view ? fmtDisplayDate(view.reportDate) : "";
  const scrollRevision = `${loading ? "loading" : "ready"}-${headerRows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_PRINT_SSR">
      <Head title="Sales Summary Report" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rssr-page">
          <BlockHead size="sm" className="rssr-no-print">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Sales Summary Report
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
                    ? `${view.storeId} · ${displayDate}`
                    : "Filter Brand, Store, Date lalu View SSR (PrintSSRPU)"}
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
                      <li className="hrd-filter-daterange" style={{ minWidth: 140 }}>
                        <div className="form-control-wrap">
                          <div className="form-icon form-icon-left">
                            <Icon name="calendar" />
                          </div>
                          <AppDatePicker
                            selected={parseYmd(reportDate)}
                            onChange={(d) => setReportDate(d ? ymd(d) : "")}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Date"
                            className="form-control form-control-sm date-picker ps-4"
                            isClearable
                          />
                        </div>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={loadData}
                          disabled={loading || !canSearch}
                        >
                          {loading ? "Loading..." : "View SSR"}
                        </button>
                      </li>
                      {view ? (
                        <li>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-light"
                            onClick={() => window.print()}
                          >
                            <Icon name="printer" />
                            <span>Print</span>
                          </button>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            {error ? <div className="rrd-msg err mb-2 rssr-no-print">{error}</div> : null}
            {!view && !loading && !error ? (
              <div className="reg-rpt-empty rssr-no-print">Pilih filter lalu View SSR</div>
            ) : null}

            {view ? (
              <div className="rssr-sheet" id="ssr-print-area">
                <div className="rssr-title-block">
                  <div className="rssr-title">STORE SALES REPORT</div>
                  <div className="rssr-meta">
                    <div>Daily Report : {displayDate} (Department)</div>
                    <div>Store : {view.storeId}</div>
                  </div>
                </div>

                <table className="rssr-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>No.</th>
                      <th colSpan={2}>Department</th>
                      <th colSpan={2}>{displayDate}</th>
                      <th colSpan={2}>(Month to Date) 01 - {displayDate}</th>
                    </tr>
                    <tr>
                      <th>Code</th>
                      <th>Description</th>
                      <th>QTY</th>
                      <th>Net Sales</th>
                      <th>QTY</th>
                      <th>Net Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!headerRows.length ? (
                      <tr>
                        <td colSpan={7} className="ctr">
                          There Is No Data
                        </td>
                      </tr>
                    ) : (
                      headerRows.map((r, i) => (
                        <tr key={`${cell(r, "CODE")}-${i}`}>
                          <td className="num">{cell(r, "NO") || i + 1}</td>
                          <td className="ctr">{cell(r, "CODE")}</td>
                          <td>{cell(r, "DESKRIPSI")}</td>
                          <td className="num">{fmtNum(cell(r, "QTY"))}</td>
                          <td className="num">{fmtNum(cell(r, "NET_SALES"))}</td>
                          <td className="num">{fmtNum(cell(r, "QTY_MTD"))}</td>
                          <td className="num">{fmtNum(cell(r, "NET_SALES_MTD"))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {headerRows.length ? (
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="ctr">
                          TOTAL
                        </td>
                        <td className="num">{fmtNum(totals.qty)}</td>
                        <td className="num">{fmtNum(totals.net)}</td>
                        <td className="num">{fmtNum(totals.qtyMtd)}</td>
                        <td className="num">{fmtNum(totals.netMtd)}</td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>

                {payment ? (
                  <table className="rssr-table rssr-pay">
                    <tbody>
                      {PAY_ROWS.map((row) => (
                        <tr key={row.label}>
                          <td>{row.label}</td>
                          <td className="num">{fmtNum(cell(payment, row.day))}</td>
                          <td className="num">{fmtNum(cell(payment, row.mtd))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegPrintSsrPage;
