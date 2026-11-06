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
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { exportStyledXlsx } from "../../../lib/exportStyledXlsx";
import "./reg-reg-report.css";
import "./reg-ar-detail.css";

const detailSvc = createRegionalService("rpt/sales/ar-detail", { crud: false });
const summarySvc = createRegionalService("rpt/sales/ar-detail/summary", { crud: false });

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
const ALL_OPT = { value: "ALL", label: "ALL" };
const n = (r, k) => Number(r?.[k] ?? 0) || 0;

const DETAIL_COLS = [
  { key: "STORE", label: "STORE", width: 10 },
  { key: "tanggal_transaksi", label: "TANGGAL", width: 12 },
  { key: "CASH", label: "CASH", num: true, width: 12 },
  { key: "CARD", label: "CARD", num: true, width: 12 },
  { key: "VOUCHER", label: "VOUCHER", num: true, width: 12 },
  { key: "OVO", label: "OVO", num: true, width: 12 },
  { key: "KQRIS", label: "KQRIS", num: true, width: 12 },
  { key: "D_QRIS_BCA", label: "D_QRIS_BCA", num: true, width: 12 },
  { key: "D_QRIS_BNI", label: "D_QRIS_BNI", num: true, width: 12 },
  { key: "D_QRIS_BRI", label: "D_QRIS_BRI", num: true, width: 12 },
  { key: "D_QRIS_MDR", label: "D_QRIS_MDR", num: true, width: 12 },
  { key: "KATOME", label: "KATOME", num: true, width: 12 },
  { key: "KINDODANA", label: "KINDODANA", num: true, width: 12 },
  { key: "SISA_VOUCHER", label: "SISA_VOUCHER", num: true, width: 12 },
  { key: "REFUND", label: "REFUND", num: true, width: 12 },
  { key: "TOTAL", label: "TOTAL", num: true, width: 12 },
];

const SUMMARY_COLS = [
  { key: "STORE", label: "STORE", width: 10 },
  { key: "TANGGAL_TRANSAKSI", label: "TANGGAL_TRANSAKSI", width: 14 },
  { key: "PLU", label: "PLU", width: 16 },
  { key: "QTY", label: "QTY", num: true, width: 8 },
  { key: "HPP", label: "HPP", num: true, width: 12 },
  { key: "PRICE", label: "PRICE", num: true, width: 12 },
  { key: "DISKON", label: "DISKON", num: true, width: 12 },
  { key: "TOTAL", label: "TOTAL", num: true, width: 12 },
  { key: "RUMUS", label: "RUMUS", num: true, width: 12 },
  { key: "SELISIH", label: "SELISIH", num: true, width: 12 },
  { key: "REFUND", label: "REFUND", num: true, width: 12 },
];

const daySpan = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000);
};

const sumKey = (rows, key) => rows.reduce((s, r) => s + n(r, key), 0);

const RegArDetailPage = () => {
  const [sm, setSm] = useState(false);
  const [tab, setTab] = useState("detail");
  const [brandId, setBrandId] = useState("ALL");
  const [storeId, setStoreId] = useState("ALL");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);
  const [detailRows, setDetailRows] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
  }, []);

  useEffect(() => {
    const parentId = brandId === "ALL" ? "" : brandId;
    regionalLookupOptions("store_all", { parentId }).then((opts) => {
      const list = (Array.isArray(opts) ? opts : []).filter(
        (o) => String(o.value).toUpperCase() !== "ALL"
      );
      setStoreOpts([ALL_OPT, ...list]);
    });
  }, [brandId]);

  const canSearch = Boolean(fromDate && toDate);

  const load = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError("Pilih tanggal dulu");
      return;
    }
    if (daySpan(fromDate, toDate) > 31) {
      setError("Range tanggal maksimal 31 hari");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = {
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
      };
      const [dRes, sRes] = await Promise.all([detailSvc.list(params), summarySvc.list(params)]);
      if (!isSuccess(dRes)) {
        setError(dRes?.responseMessage || "Gagal memuat Detail");
        setDetailRows([]);
        setSummaryRows([]);
        setLoaded(false);
        return;
      }
      if (!isSuccess(sRes)) {
        setError(sRes?.responseMessage || "Gagal memuat Summary");
        setDetailRows([]);
        setSummaryRows([]);
        setLoaded(false);
        return;
      }
      setDetailRows(extractRows(dRes));
      setSummaryRows(extractRows(sRes));
      setLoaded(true);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setDetailRows([]);
      setSummaryRows([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [brandId, fromDate, storeId, toDate]);

  const totalDetail = useMemo(() => sumKey(detailRows, "TOTAL"), [detailRows]);
  const totalSummary = useMemo(() => sumKey(summaryRows, "TOTAL"), [summaryRows]);
  const bandingSelisih = totalDetail - totalSummary;
  const rows = tab === "detail" ? detailRows : summaryRows;
  const cols = tab === "detail" ? DETAIL_COLS : SUMMARY_COLS;

  const footer = useMemo(() => {
    const t = {};
    cols.forEach((c) => {
      if (c.num) t[c.key] = sumKey(rows, c.key);
    });
    return t;
  }, [cols, rows]);

  const exportExcel = useCallback(
    async (which) => {
      if (exporting) return;
      const data = which === "detail" ? detailRows : summaryRows;
      const columns = which === "detail" ? DETAIL_COLS : SUMMARY_COLS;
      if (!data.length) {
        setError("Tidak ada data untuk di-export");
        return;
      }
      setExporting(true);
      setError("");
      try {
        await exportStyledXlsx({
          fileName: `AR_${which}_${fromDate}_${toDate}`,
          sheetName: which === "detail" ? "Detail" : "Summary",
          columns: columns.map((c) => ({
            key: c.key,
            label: c.label,
            width: c.width,
            align: c.num ? "right" : "left",
            numFmt: c.num ? "#,##0.00" : undefined,
          })),
          rows: data.map((r) => {
            const out = {};
            columns.forEach((c) => {
              out[c.key] = c.num ? n(r, c.key) : r?.[c.key] ?? "";
            });
            return out;
          }),
          getRowStyle: (r) =>
            which === "summary" && Math.abs(n(r, "SELISIH")) > 0.009
              ? { fill: "FFFFF5F4", font: { color: { argb: "FFE85347" } } }
              : null,
        });
      } catch (e) {
        setError(e?.message || "Gagal export");
      } finally {
        setExporting(false);
      }
    },
    [detailRows, exporting, fromDate, summaryRows, toDate]
  );

  const scrollRevision = `${loading ? "loading" : "ready"}-${tab}-${rows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_AR_DETAIL">
      <Head title="AR Detail" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  AR Detail
                </BlockTitle>
                <BlockDes className="text-soft">
                  {loaded
                    ? `Detail ${detailRows.length} · Summary ${summaryRows.length}`
                    : "Filter lalu muat Detail + Summary"}
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
                      <li className="hrd-filter-select">
                        <RSelect
                          className="hrd-filter-rselect"
                          styles={filterSelectStyles}
                          isSearchable
                          placeholder="Brand"
                          options={brandOpts}
                          value={brandOpts.find((o) => String(o.value) === String(brandId)) || ALL_OPT}
                          onChange={(o) => setBrandId(o?.value ?? "ALL")}
                        />
                      </li>
                      <li className="hrd-filter-select">
                        <RSelect
                          className="hrd-filter-rselect"
                          styles={filterSelectStyles}
                          isSearchable
                          placeholder="Store"
                          options={storeOpts}
                          value={storeOpts.find((o) => String(o.value) === String(storeId)) || ALL_OPT}
                          onChange={(o) => setStoreId(o?.value ?? "ALL")}
                        />
                      </li>
                      <li>
                        <button
                          type="button"
                          className="btn btn-icon btn-trigger admin-filter-premium-btn"
                          onClick={load}
                          disabled={loading || !canSearch}
                          title="Cari"
                          aria-label="Cari"
                        >
                          <Icon pack="premium" name="pencarian" size={32} />
                        </button>
                      </li>
                      <li>
                        <Button
                          color="primary"
                          size="sm"
                          disabled={exporting || !loaded}
                          onClick={() => exportExcel("detail")}
                        >
                          {exporting ? "Export..." : "Export Detail"}
                        </Button>
                      </li>
                      <li>
                        <Button
                          color="primary"
                          outline
                          size="sm"
                          disabled={exporting || !loaded}
                          onClick={() => exportExcel("summary")}
                        >
                          Export Summary
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
            {loading ? <div className="text-soft small mb-2">Memuat Detail + Summary...</div> : null}

            {loaded ? (
              <div className="rad-compare">
                <span>
                  Total Detail: <strong>{fmtNum(totalDetail)}</strong>
                </span>
                <span>
                  Total Summary: <strong>{fmtNum(totalSummary)}</strong>
                </span>
                <span>
                  Selisih (Detail − Summary):{" "}
                  <span className={Math.abs(bandingSelisih) < 0.5 ? "rad-diff-ok" : "rad-diff-bad"}>
                    {fmtNum(bandingSelisih)}
                  </span>
                </span>
              </div>
            ) : null}

            <div className="rad-tabs">
              <button
                type="button"
                className={`rad-tab${tab === "detail" ? " is-active" : ""}`}
                onClick={() => setTab("detail")}
              >
                Detail
              </button>
              <button
                type="button"
                className={`rad-tab${tab === "summary" ? " is-active" : ""}`}
                onClick={() => setTab("summary")}
              >
                Summary
              </button>
            </div>

            {!loaded && !loading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}
            {loaded && !rows.length ? <div className="reg-rpt-empty">Data belum tersedia</div> : null}

            {loaded && rows.length > 0 ? (
              <div className="card card-bordered">
                <div className="card-inner">
                  <div className="rad-table-wrap">
                    <table className="rad-table">
                      <thead>
                        <tr>
                          {cols.map((c) => (
                            <th key={c.key} className={c.num ? "num" : undefined}>
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const bad = tab === "summary" && Math.abs(n(r, "SELISIH")) > 0.009;
                          return (
                            <tr key={`${tab}-${i}`} className={bad ? "rad-selisih" : undefined}>
                              {cols.map((c) => {
                                if (!c.num) {
                                  return <td key={c.key}>{r?.[c.key] ?? ""}</td>;
                                }
                                const v = n(r, c.key);
                                return (
                                  <td key={c.key} className={`num${v === 0 ? " rad-zero" : ""}`}>
                                    {v === 0 ? "—" : fmtNum(v)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          {cols.map((c, idx) => {
                            if (!c.num) {
                              return <td key={c.key}>{idx === 0 ? "TOTAL" : ""}</td>;
                            }
                            return (
                              <td key={c.key} className="num">
                                {fmtNum(footer[c.key] || 0)}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegArDetailPage;
