import React, { useCallback, useEffect, useMemo, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import "./reg-reg-report.css";
import "./reg-daily-sales.css";

/** Legacy Daily_s_sales.aspx (REG) -> GET /regional/rpt/sales/daily-sales */
const svc = createRegionalService("rpt/sales/daily-sales", { crud: false });

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
const nf2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (v) => nf0.format(Number(v || 0));
const fmtPct = (v) => `${nf2.format(Number(v || 0))}%`;

const ALL_OPT = { value: "ALL", label: "ALL" };
const GROUP_BRAND_OPT = { value: "GROUP_BRAND", label: "GROUP BRAND" };

const DIGIT_OPTS = [
  { value: "FULL", label: "PLU" },
  { value: "3", label: "CLASS" },
  { value: "1", label: "DEPT" },
];
const MODE_OPTS = [
  { value: "1", label: "DETAIL" },
  { value: "2", label: "TOTAL" },
  { value: "3", label: "GRAND TOTAL" },
];

/** Legacy GridView column order (Daily_s_sales.aspx) */
const BASE_COLS = [
  { key: "STORE", field: "Store_ID", label: "STORE", align: "center" },
  { key: "TANGGAL", field: "tanggal", label: "TANGGAL", align: "center" },
  { key: "PLU", field: "PLU", label: "PLU", align: "left" },
  { key: "PRICE", field: "PRICE", label: "PRICE", num: true },
  { key: "QTY", field: "QTY", label: "QTY", num: true, sum: true },
  { key: "HPP", field: "HPP", label: "HPP", num: true, sum: true },
  { key: "HPP_TOTAL", field: "HPP_TOTAL", label: "HPP TOTAL", num: true, sum: true },
  { key: "SALES", field: "SALES", label: "SALES", num: true, sum: true },
  { key: "DISCOUNT", field: "DISCOUNT", label: "DISCOUNT", num: true, sum: true },
  { key: "PP", field: "PP", label: "PP", num: true, sum: true },
  { key: "NET_SALES", field: "NET_SALES", label: "NET SALES", num: true, sum: true },
  { key: "LABA", field: "LABA", label: "LABA", num: true, sum: true },
  { key: "NET_LABA", field: "NET_LABA", label: "NET LABA", num: true, sum: true },
  { key: "MARGIN", field: "MARGIN", label: "MARGIN", num: true },
  { key: "NET_PERSENTASE", field: "NET_PERSENTASE", label: "NET PERSENTASE (%)", pct: true },
];

/** Columns hidden client-side (same rules as legacy userGrid_Rowhide_* / UsersGrid_Rowhide_*) */
const hiddenKeys = ({ digit, mode, hideDate }) => {
  const h = new Set();
  if (mode === "1") {
    if (digit === "FULL") {
      h.add("HPP_TOTAL");
      if (hideDate) h.add("TANGGAL");
    } else {
      h.add("HPP_TOTAL");
      h.add("NET_PERSENTASE");
    }
  } else if (mode === "2") {
    ["TANGGAL", "HPP", "LABA", "NET_LABA", "NET_PERSENTASE", "HPP_TOTAL"].forEach((k) => h.add(k));
  } else if (mode === "3") {
    ["TANGGAL", "PLU", "HPP_TOTAL", "LABA", "NET_LABA", "PRICE"].forEach((k) => h.add(k));
  }
  return h;
};

const RENDER_STEP = 500;

const RegDailySalesPage = () => {
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [digit, setDigit] = useState("FULL");
  const [mode, setMode] = useState("1");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [hideDate, setHideDate] = useState(false);
  const [online, setOnline] = useState(false);

  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT, GROUP_BRAND_OPT]);

  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null); // snapshot of filters used for the loaded result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
  }, []);

  useEffect(() => {
    const parentId = brandId === "ALL" ? "" : brandId;
    regionalLookupOptions("store", { parentId }).then((opts) => {
      const list = (Array.isArray(opts) ? opts : []).filter(
        (o) => !["ALL", "GROUP_BRAND"].includes(String(o.value).toUpperCase())
      );
      // ALL + GROUP_BRAND (hardcoded, legacy BindRegBindRegStoreGroupBrandStore) + lookup
      setStoreOpts([ALL_OPT, GROUP_BRAND_OPT, ...list]);
    });
    setStoreId("");
  }, [brandId]);

  const detailFull = digit === "FULL" && mode === "1";

  useEffect(() => {
    if (!detailFull && hideDate) setHideDate(false);
  }, [detailFull, hideDate]);

  const canSearch = Boolean(brandId && storeId && fromDate && toDate);

  const load = useCallback(async () => {
    if (!brandId || !storeId || !fromDate || !toDate) {
      setError("Pilih Brand, Store, dan tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const hide = detailFull && hideDate;
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
        plu: digit,
        tipe: mode,
        confirm_status: hide ? "1" : "0",
        is_active: online ? "1" : "0",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(null);
        return;
      }
      setRows(extractRows(res));
      setView({ digit, mode, hideDate: hide, brandId, storeId });
      setLimit(RENDER_STEP);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, detailFull, digit, fromDate, hideDate, mode, online, storeId, toDate]);

  const columns = useMemo(() => {
    if (!view) return [];
    const hidden = hiddenKeys(view);
    const groupBrand = view.storeId === "GROUP_BRAND" && view.digit === "1" && view.mode === "3";
    return BASE_COLS.filter((c) => !hidden.has(c.key)).map((c) => {
      if (c.key === "PLU") {
        if (view.digit === "3") return { ...c, label: "CLASS" };
        if (view.digit === "1") return { ...c, label: "DEPARTMENT" };
      }
      if (c.key === "STORE" && groupBrand) return { ...c, label: "BRAND" };
      return c;
    });
  }, [view]);

  const totals = useMemo(() => {
    const t = { QTY: 0, HPP: 0, HPP_TOTAL: 0, SALES: 0, DISCOUNT: 0, PP: 0, NET_SALES: 0, LABA: 0, NET_LABA: 0 };
    rows.forEach((r) => {
      Object.keys(t).forEach((k) => {
        t[k] += Number(r[k] || 0);
      });
    });
    return t;
  }, [rows]);

  // margin % = (net - hpp) / net * 100 ; FULL DETAIL carries unit HPP, so HPP_TOTAL (hpp x qty) is the right basis there
  const marginPct = useMemo(() => {
    const hppBasis = view && view.digit === "FULL" && view.mode === "1" ? totals.HPP_TOTAL : totals.HPP;
    return totals.NET_SALES ? ((totals.NET_SALES - hppBasis) / totals.NET_SALES) * 100 : 0;
  }, [totals, view]);

  const footerHpp = view && view.digit === "FULL" && view.mode === "1" ? totals.HPP_TOTAL : totals.HPP;

  const renderCell = (c, r, i) => {
    if (c.key === "STORE") return r.Store_ID ?? "";
    if (c.key === "PLU") return r.PLU ?? "";
    if (c.key === "TANGGAL") return r.tanggal ?? "";
    if (c.pct) return fmtPct(r[c.field]);
    if (c.num) return fmtNum(r[c.field]);
    return String(r[c.field] ?? "");
  };

  const footerCell = (c) => {
    if (c.key === "STORE") return "TOTAL";
    if (c.key === "HPP") return fmtNum(footerHpp);
    if (c.key === "NET_PERSENTASE") return fmtPct(marginPct);
    if (c.sum) return fmtNum(totals[c.key]);
    return "";
  };

  const shown = rows.slice(0, limit);

  return (
    <AccessGuard moduleCode="REG_RPT_DAILY_SALES">
      <Head title="Daily Sales Summary" />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page>Daily Sales Summary</BlockTitle>
            <BlockDes>
              <p>Parity Daily_s_sales.aspx (REG) - filter, mode dan kolom sama dengan legacy.</p>
            </BlockDes>
          </BlockHeadContent>
        </BlockHead>
        <Block>
          <div className="card rsa-card">
            <div className="card-inner">
              <div className="rsa-filters">
                <div className="rsa-filter rsa-filter--select">
                  <label className="form-label">Brand</label>
                  <RSelect
                    styles={filterSelectStyles}
                    isClearable
                    isSearchable
                    placeholder="Brand"
                    options={brandOpts}
                    value={brandOpts.find((o) => String(o.value) === String(brandId)) || null}
                    onChange={(o) => setBrandId(o?.value ?? "")}
                  />
                </div>
                <div className="rsa-filter rsa-filter--select">
                  <label className="form-label">Store</label>
                  <RSelect
                    styles={filterSelectStyles}
                    isClearable
                    isSearchable
                    placeholder="Store"
                    options={storeOpts}
                    value={storeOpts.find((o) => String(o.value) === String(storeId)) || null}
                    onChange={(o) => setStoreId(o?.value ?? "")}
                  />
                </div>
                <div className="rsa-filter rsa-filter--text">
                  <label className="form-label">PLU Digit</label>
                  <select
                    className="form-select form-select-sm rds-select"
                    value={digit}
                    onChange={(e) => setDigit(e.target.value)}
                  >
                    {DIGIT_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rsa-filter rsa-filter--text">
                  <label className="form-label">Mode</label>
                  <select
                    className="form-select form-select-sm rds-select"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    {MODE_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rsa-filter">
                  <label className="form-label">Periode</label>
                  <AppDateRangePicker
                    startDate={fromDate}
                    endDate={toDate}
                    className="form-control form-control-sm"
                    onChange={(f, t) => {
                      setFromDate(f || "");
                      setToDate(t || "");
                    }}
                  />
                </div>
                <div className="rsa-filter rsa-filter--action">
                  <label className="form-label">&nbsp;</label>
                  <button
                    type="button"
                    className="btn btn-icon btn-trigger admin-filter-premium-btn"
                    onClick={load}
                    disabled={loading || !canSearch}
                    title={canSearch ? "Load" : "Pilih filter dulu"}
                  >
                    <Icon pack="premium" name="pencarian" size={32} />
                  </button>
                </div>
              </div>
              <div className="rsa-filters rsa-filters--opts">
                <div className="rsa-filter rsa-filter--check">
                  <div className="custom-control custom-checkbox">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="reg-daily-hide-date"
                      checked={hideDate}
                      disabled={!detailFull}
                      onChange={(e) => setHideDate(e.target.checked)}
                    />
                    <label className="custom-control-label" htmlFor="reg-daily-hide-date">
                      Hide date
                    </label>
                  </div>
                </div>
                <div className="rsa-filter rsa-filter--check">
                  <div className="custom-control custom-checkbox">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="reg-daily-online"
                      checked={online}
                      onChange={(e) => setOnline(e.target.checked)}
                    />
                    <label className="custom-control-label" htmlFor="reg-daily-online">
                      Online
                    </label>
                  </div>
                </div>
              </div>

              {error ? <div className="rrd-msg err mt-2">{error}</div> : null}
              {loading ? <div className="text-soft small mt-2">Memuat data...</div> : null}

              {view ? (
                <>
                  <div className="rds-table-wrap mt-3">
                    <table className="rds-table">
                      <thead>
                        <tr>
                          <th className="rds-no">No</th>
                          {columns.map((c) => (
                            <th key={c.key} className={c.num || c.pct ? "num" : ""}>
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
                            <tr key={i}>
                              <td className="rds-no">{i + 1}</td>
                              {columns.map((c) => (
                                <td
                                  key={c.key}
                                  className={c.num || c.pct ? "num" : c.align === "center" ? "ctr" : ""}
                                >
                                  {renderCell(c, r, i)}
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
                              <td key={c.key} className={c.num || c.pct ? "num" : ""}>
                                {footerCell(c)}
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
                      {rows.length ? ` | Margin: ${fmtPct(marginPct)} (footer menjumlahkan seluruh baris)` : ""}
                    </span>
                    {rows.length > shown.length ? (
                      <span className="rds-more">
                        <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setLimit((l) => l + RENDER_STEP)}>
                          Tampilkan {RENDER_STEP} lagi
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setLimit(rows.length)}>
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
      </Content>
    </AccessGuard>
  );
};

export default RegDailySalesPage;
