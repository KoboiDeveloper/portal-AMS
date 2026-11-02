import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-cek-setoran.css";

/** Legacy module/Rpt/rekonsiliasireg.aspx — Cek Setoran (REG2 brand path) */
const svc = createRegionalService("office/cek-setoran", { crud: false });

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

const ALL_OPT = { value: "ALL", label: "ALL" };
const RENDER_STEP = 150;

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const fmtDate = (v) => {
  if (v == null || v === "") return "";
  const s = String(v);
  const m = s.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
};

const vaHeaderLabel = (brand) =>
  String(brand || "").toUpperCase() === "CELCIUS WOMAN" ? "VA BNI" : "VA BCA";

const statusClass = (r) => {
  const raw = String(cell(r, "VA_STATUS_CLASS", "va_status_class") || "").toLowerCase();
  if (raw.includes("success") || raw.includes("primary")) return "rcs-status rcs-status--ok";
  if (raw.includes("danger") || raw.includes("warning") || raw.includes("fail")) return "rcs-status rcs-status--bad";
  const st = String(cell(r, "STATUS_PEMBAYARAN") || "").toLowerCase();
  if (st.includes("success") || st.includes("ok") || st.includes("match")) return "rcs-status rcs-status--ok";
  if (st.includes("fail") || st.includes("kurang") || st.includes("beda")) return "rcs-status rcs-status--bad";
  return "rcs-status";
};

const parseAmount = (v) => {
  let s = String(v ?? "").replace(/[^\d.,-]/g, "");
  if (!s) return null;
  const dec = s.match(/[.,](\d{1,2})$/);
  const frac = dec ? Number(`0.${dec[1]}`) : 0;
  if (dec) s = s.slice(0, -dec[0].length);
  const n = Number(s.replace(/[.,]/g, ""));
  if (!Number.isFinite(n)) return null;
  return n < 0 ? n - frac : n + frac;
};

const dateKey = (v) => {
  const s = String(v ?? "");
  let m = s.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (m) return `${m[3]}${m[2]}${m[1]}`;
  return s;
};

const SORT_COLS = {
  tgl: { get: (r) => dateKey(cell(r, "TGL")) },
  store: { get: (r) => String(cell(r, "STORE_ID") || "").toUpperCase() },
  pu: { get: (r) => parseAmount(cell(r, "PU")), num: true },
  va: { get: (r) => parseAmount(cell(r, "TRX_AMOUNT")), num: true },
  status: { get: (r) => String(cell(r, "STATUS_PEMBAYARAN") || "").toUpperCase() },
};

const RegCekSetoranPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);

  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);
  const [sort, setSort] = useState({ key: "", dir: "asc" });
  const tableRef = useRef(null);

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
  }, []);

  const canSearch = Boolean(brandId && fromDate && toDate);

  const loadData = useCallback(async () => {
    if (!brandId || !fromDate || !toDate) {
      setError("Pilih Brand dan tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(null);
        return;
      }
      setRows(extractRows(res));
      setView({ brandId, fromDate, toDate });
      setLimit(RENDER_STEP);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, fromDate, toDate]);

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

  const shown = useMemo(() => sorted.slice(0, limit), [sorted, limit]);

  const toggleSort = (key) =>
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: "", dir: "asc" };
    });

  const sortTh = (key, label, className = "") => {
    const active = sort.key === key;
    return (
      <th
        className={`rcs-sortable ${className} ${active ? "is-sorted" : ""}`}
        onClick={() => toggleSort(key)}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        title="Klik untuk urutkan"
      >
        <span className="rcs-th-inner">
          {label}
          <Icon
            name={active ? (sort.dir === "asc" ? "caret-up-fill" : "caret-down-fill") : "sort"}
            className="rcs-sort-ic"
          />
        </span>
      </th>
    );
  };
  const vaLabel = view ? vaHeaderLabel(view.brandId) : "VA";
  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_CEK_SETORAN">
      <Head title="Cek Setoran" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rcs-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Cek Setoran
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
                    ? `You have total ${rows.length} rows · ${view.brandId}`
                    : "Rekonsiliasi setoran VA (Brand + Date Range)"}
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
                          title={canSearch ? "Filter" : "Pilih filter dulu"}
                          aria-label="Filter"
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
              <div className="reg-rpt-empty">There Is No Data</div>
            ) : null}

            {view && rows.length > 0 ? (
              <div className="riv-bleed">
                <div className="riv-table-wrap rcs-table-wrap">
                  <table ref={tableRef} className="riv-table riv-table--rcs">
                    <thead>
                      <tr>
                        <th className="rds-no">NO</th>
                        {sortTh("tgl", "BATCH", "ctr")}
                        {sortTh("store", "STORE")}
                        {sortTh("pu", "AMOUNT POS", "num")}
                        {sortTh("va", vaLabel, "num")}
                        {sortTh("status", "STATUS", "ctr")}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r, i) => {
                        const font = String(cell(r, "FONT_COLOR", "font-color") || "");
                        const colorMatch = font.match(/color\s*:\s*([^;]+)/i);
                        const amountStyle = colorMatch ? { color: colorMatch[1].trim() } : undefined;
                        return (
                          <tr key={`${cell(r, "NO_URUT")}-${cell(r, "STORE_ID")}-${i}`}>
                            <td className="rds-no">{i + 1}</td>
                            <td className="ctr">{fmtDate(cell(r, "TGL"))}</td>
                            <td>{cell(r, "STORE_ID")}</td>
                            <td className="num">{cell(r, "PU")}</td>
                            <td className="num" style={amountStyle}>
                              {cell(r, "TRX_AMOUNT")}
                            </td>
                            <td className="ctr">
                              <span className={statusClass(r)}>{cell(r, "STATUS_PEMBAYARAN") || "—"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <RivStickyThead
                  tableRef={tableRef}
                  enabled={Boolean(view && rows.length)}
                  tableClassName="riv-table riv-table--rcs"
                  interactive
                />
                <div className="rds-meta">
                  <span>
                    Menampilkan {shown.length} dari {rows.length} baris
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
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegCekSetoranPage;
