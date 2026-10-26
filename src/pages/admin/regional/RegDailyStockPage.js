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
import "./reg-sales-detail.css";
import "./reg-inv-report.css";

/** Legacy module/Rpt/Daily_s_stock2.aspx — Daily Stock Summary 2 */
const svc = createRegionalService("rpt/inv/daily-stock", { crud: false });

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

const ALL_OPT = { value: "ALL", label: "ALL" };
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

const RENDER_STEP = 100;

const MOV_GROUPS = [
  { key: "beg", label: "BEGINING", qty: "A", hpp: "MA", price: "XA", cls: "ls-grp--a" },
  { key: "sti", label: "ST IN", qty: "ST_IN", hpp: "MST_IN", price: "XST_IN", cls: "ls-grp--b" },
  { key: "tin", label: "REFUND", qty: "TRADE_IN", hpp: "MTRADE_IN", price: "XTRADE_IN", cls: "ls-grp--a" },
  { key: "sto", label: "ST OUT", qty: "ST_OUT", hpp: "MST_OUT", price: "XST_OUT", cls: "ls-grp--b" },
  { key: "tou", label: "TRADE OUT", qty: "TRADE_OUT", hpp: "MTRADE_OUT", price: "XTRADE_OUT", cls: "ls-grp--a" },
  { key: "sal", label: "SALES", qty: "SALES", hpp: "MSALES", price: "XSALES", cls: "ls-grp--b" },
  { key: "adj", label: "ADJ.", qty: "ADJ", hpp: "MADJ", price: "XADJ", cls: "ls-grp--a" },
  { key: "end", label: "ENDING", qty: "Z", hpp: "MZ", price: "XZ", cls: "ls-grp--end" },
];

const cellOf = (r, key) => {
  if (r == null) return null;
  if (r[key] != null) return r[key];
  const up = String(key).toUpperCase();
  const hit = Object.keys(r).find((k) => String(k).toUpperCase() === up);
  return hit != null ? r[hit] : null;
};

const RegDailyStockPage = () => {
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [digit, setDigit] = useState("FULL");
  const [mode, setMode] = useState("1");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [article, setArticle] = useState("");

  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);

  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);
  const tableRef = useRef(null);

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
  }, []);

  useEffect(() => {
    regionalLookupOptions("store", { parentId: brandId === "ALL" ? "" : brandId }).then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setStoreOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
    setStoreId("");
  }, [brandId]);

  const canSearch = Boolean(brandId && storeId && fromDate && toDate);

  const loadData = useCallback(async () => {
    if (!brandId || !storeId || !fromDate || !toDate) {
      setError("Pilih Brand, Store, dan tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    setLimit(RENDER_STEP);
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
        plu: digit,
        tipe: mode,
        article: article.trim(),
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(null);
        return;
      }
      setRows(extractRows(res));
      setView({ digit, mode, fromDate, toDate });
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [article, brandId, digit, fromDate, mode, storeId, toDate]);

  const showDate = view?.mode === "2" && view?.digit === "FULL";
  const showPlu = view?.mode === "1" || (view?.mode === "2" && view?.digit !== "FULL");
  const showUnit = view?.mode === "1";
  const pluLabel =
    view?.digit === "3" ? "CLASS" : view?.digit === "1" ? "DEPT" : "PLU";

  const metaColSpan = 1 + 1 + (showDate ? 1 : 0) + (showPlu ? 1 : 0) + (showUnit ? 2 : 0);
  const totalColSpan = metaColSpan + MOV_GROUPS.length * 3;

  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);

  const totals = useMemo(() => {
    const t = {};
    MOV_GROUPS.forEach((g) => {
      t[g.qty] = 0;
      t[g.hpp] = 0;
      t[g.price] = 0;
    });
    rows.forEach((r) => {
      MOV_GROUPS.forEach((g) => {
        t[g.qty] += Number(cellOf(r, g.qty) || 0);
        t[g.hpp] += Number(cellOf(r, g.hpp) || 0);
        t[g.price] += Number(cellOf(r, g.price) || 0);
      });
    });
    return t;
  }, [rows]);

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}-${view?.mode || ""}`;

  return (
    <AccessGuard moduleCode="REG_RPT_DAILY_STOCK">
      <Head title="Daily Stock Summary" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Daily Stock Summary
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
                    ? `You have total ${rows.length} rows`
                    : "Isi filter lalu klik Filter"}
                </BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block className="riv-filters mb-2">
            <ul>
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
              <li className="hrd-filter-select hrd-filter-select--sm">
                <RSelect
                  className="hrd-filter-rselect"
                  styles={filterSelectStyles}
                  placeholder="PLU Digit"
                  options={DIGIT_OPTS}
                  value={DIGIT_OPTS.find((o) => o.value === digit) || DIGIT_OPTS[0]}
                  onChange={(o) => setDigit(o?.value || "FULL")}
                />
              </li>
              <li className="hrd-filter-select hrd-filter-select--sm">
                <RSelect
                  className="hrd-filter-rselect"
                  styles={filterSelectStyles}
                  placeholder="Mode"
                  options={MODE_OPTS}
                  value={MODE_OPTS.find((o) => o.value === mode) || MODE_OPTS[0]}
                  onChange={(o) => setMode(o?.value || "1")}
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
              <li className="hrd-filter-article">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="PLU / CLASS"
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  aria-label="PLU / CLASS"
                />
              </li>
              <li>
                <Button
                  color="primary"
                  size="sm"
                  onClick={loadData}
                  disabled={loading || !canSearch}
                  title={canSearch ? "Load" : "Pilih filter dulu"}
                >
                  Filter
                </Button>
              </li>
            </ul>
          </Block>

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
                <div className="riv-table-wrap riv-table-wrap--dailystock">
                  <table ref={tableRef} className="riv-table riv-table--dailystock">
                    <thead>
                      <tr>
                        <th className="rds-no" rowSpan={2}>
                          NO
                        </th>
                        <th className="ctr ls-meta" rowSpan={2}>
                          STORE
                        </th>
                        {showDate ? (
                          <th className="ctr ls-meta" rowSpan={2}>
                            DATE
                          </th>
                        ) : null}
                        {showPlu ? (
                          <th className="ctr ls-meta" rowSpan={2}>
                            {pluLabel}
                          </th>
                        ) : null}
                        {showUnit ? (
                          <>
                            <th className="num ls-meta" rowSpan={2}>
                              PRICE
                            </th>
                            <th className="num ls-meta" rowSpan={2}>
                              HPP
                            </th>
                          </>
                        ) : null}
                        {MOV_GROUPS.map((g) => (
                          <th key={g.key} colSpan={3} className={`ctr ls-grp ${g.cls} ls-sep`}>
                            {g.label}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {MOV_GROUPS.map((g) => (
                          <React.Fragment key={`${g.key}-sub`}>
                            <th className={`num ${g.cls} ls-sep`}>QTY</th>
                            <th className={`num ${g.cls}`}>HPP</th>
                            <th className={`num ${g.cls}`}>PRICE</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!shown.length ? (
                        <tr>
                          <td colSpan={totalColSpan} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        shown.map((r, i) => (
                          <tr key={`${cellOf(r, "STORE_ID")}-${cellOf(r, "PLU")}-${i}`}>
                            <td className="rds-no">{i + 1}</td>
                            <td className="ctr ls-meta">{cellOf(r, "STORE_ID")}</td>
                            {showDate ? (
                              <td className="ctr ls-meta">{fmtDate(cellOf(r, "TANGGAL"))}</td>
                            ) : null}
                            {showPlu ? (
                              <td className="ctr ls-meta">{cellOf(r, "PLU")}</td>
                            ) : null}
                            {showUnit ? (
                              <>
                                <td className="num ls-meta">{fmtNum(cellOf(r, "PRICE"))}</td>
                                <td className="num ls-meta">{fmtNum(cellOf(r, "HPP"))}</td>
                              </>
                            ) : null}
                            {MOV_GROUPS.map((g) => (
                              <React.Fragment key={`${g.key}-${i}`}>
                                <td className={`num ${g.cls} ls-sep`}>{fmtNum(cellOf(r, g.qty))}</td>
                                <td className={`num ${g.cls}`}>{fmtNum(cellOf(r, g.hpp))}</td>
                                <td className={`num ${g.cls}`}>{fmtNum(cellOf(r, g.price))}</td>
                              </React.Fragment>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {rows.length ? (
                      <tfoot>
                        <tr>
                          <td colSpan={metaColSpan} className="num">
                            Total
                          </td>
                          {MOV_GROUPS.map((g) => (
                            <React.Fragment key={`f-${g.key}`}>
                              <td className={`num ${g.cls} ls-sep`}>{fmtNum(totals[g.qty])}</td>
                              <td className={`num ${g.cls}`}>{fmtNum(totals[g.hpp])}</td>
                              <td className={`num ${g.cls}`}>{fmtNum(totals[g.price])}</td>
                            </React.Fragment>
                          ))}
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                </div>
                <RivStickyThead
                  tableRef={tableRef}
                  enabled={Boolean(view && rows.length)}
                  tableClassName="riv-table riv-table--dailystock"
                />
                {limit < rows.length ? (
                  <div className="text-center mt-2">
                    <Button color="light" size="sm" onClick={() => setLimit((n) => n + RENDER_STEP)}>
                      Load more ({Math.min(limit, rows.length)} / {rows.length})
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegDailyStockPage;
