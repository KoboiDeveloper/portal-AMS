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

/** Legacy module/Rpt/Rpt_SO_Adjusment.aspx — So Adjustment (PLU / CLASS) */
const svc = createRegionalService("rpt/so/so-adj", { crud: false });

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
const VIEW_OPTS = [
  { value: "plu", label: "PLU" },
  { value: "class", label: "CLASS" },
];
const RENDER_STEP = 100;

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const RegSoAdjPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [viewMode, setViewMode] = useState("plu");

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
    regionalLookupOptions("store", { parentId: brandId === "ALL" ? "" : brandId || "" }).then((opts) => {
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
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
        tipe: viewMode || "plu",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(null);
        return;
      }
      setRows(extractRows(res));
      setView({ brandId, storeId, fromDate, toDate, viewMode });
      setLimit(RENDER_STEP);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, storeId, fromDate, toDate, viewMode]);

  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const isClass = view?.viewMode === "class";

  const footer = useMemo(() => {
    let qty = 0;
    let hpp = 0;
    let price = 0;
    let totalHpp = 0;
    let totalPrice = 0;
    rows.forEach((r) => {
      qty += Number(cell(r, "QTY") || 0);
      hpp += Number(cell(r, "HPP") || 0);
      price += Number(cell(r, "PRICE") || 0);
      totalHpp += Number(cell(r, "TOTAL_HPP") || 0);
      totalPrice += Number(cell(r, "TOTAL_PRICE") || 0);
    });
    return { qty, hpp, price, totalHpp, totalPrice };
  }, [rows]);

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}-${view?.viewMode || ""}`;
  const colSpan = isClass ? 4 : 9;

  return (
    <AccessGuard moduleCode="REG_RPT_SO_ADJ">
      <Head title="So Adjustment" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  So Adjustment
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
                    ? `You have total ${rows.length} rows · view ${String(view.viewMode).toUpperCase()}`
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
                      <li className="hrd-filter-select" style={{ minWidth: 110 }}>
                        <RSelect
                          className="hrd-filter-rselect"
                          styles={filterSelectStyles}
                          options={VIEW_OPTS}
                          value={VIEW_OPTS.find((o) => o.value === viewMode) || VIEW_OPTS[0]}
                          onChange={(opt) => setViewMode(opt?.value || "plu")}
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
                <div className="riv-table-wrap">
                  <table ref={tableRef} className="riv-table riv-table--soadj">
                    <thead>
                      {isClass ? (
                        <tr>
                          <th className="rds-no">NO</th>
                          <th className="ctr">PLU</th>
                          <th className="num">QTY</th>
                          <th className="num">TOTAL PRICE</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="rds-no">NO</th>
                          <th className="ctr">STORE</th>
                          <th className="ctr">PLU</th>
                          <th className="num">QTY</th>
                          <th className="num">HPP</th>
                          <th className="num">PRICE</th>
                          <th className="num">TOTAL HPP</th>
                          <th className="num">TOTAL PRICE</th>
                          <th className="ctr">ADJUSMENT DATE</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {!shown.length ? (
                        <tr>
                          <td colSpan={colSpan} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        shown.map((r, i) => (
                          <tr key={`${cell(r, "PLU")}-${cell(r, "STORE_ID")}-${i}`}>
                            <td className="rds-no">{i + 1}</td>
                            {isClass ? (
                              <>
                                <td className="ctr">{cell(r, "PLU")}</td>
                                <td className="num">{fmtNum(cell(r, "QTY"))}</td>
                                <td className="num">{fmtNum(cell(r, "TOTAL_PRICE"))}</td>
                              </>
                            ) : (
                              <>
                                <td className="ctr">{cell(r, "STORE_ID")}</td>
                                <td className="ctr">{cell(r, "PLU")}</td>
                                <td className="num">{fmtNum(cell(r, "QTY"))}</td>
                                <td className="num">{fmtNum(cell(r, "HPP"))}</td>
                                <td className="num">{fmtNum(cell(r, "PRICE"))}</td>
                                <td className="num">{fmtNum(cell(r, "TOTAL_HPP"))}</td>
                                <td className="num">{fmtNum(cell(r, "TOTAL_PRICE"))}</td>
                                <td className="ctr">{fmtDate(cell(r, "TGL_ADJUST"))}</td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {rows.length ? (
                      <tfoot>
                        {isClass ? (
                          <tr>
                            <td colSpan={2} className="num">
                              TOTAL
                            </td>
                            <td className="num">{fmtNum(footer.qty)}</td>
                            <td className="num">{fmtNum(footer.totalPrice)}</td>
                          </tr>
                        ) : (
                          <tr>
                            <td colSpan={3} className="num">
                              TOTAL
                            </td>
                            <td className="num">{fmtNum(footer.qty)}</td>
                            <td className="num">{fmtNum(footer.hpp)}</td>
                            <td className="num">{fmtNum(footer.price)}</td>
                            <td className="num">{fmtNum(footer.totalHpp)}</td>
                            <td className="num">{fmtNum(footer.totalPrice)}</td>
                            <td />
                          </tr>
                        )}
                      </tfoot>
                    ) : null}
                  </table>
                </div>
                <RivStickyThead
                  tableRef={tableRef}
                  enabled={Boolean(view && rows.length)}
                  tableClassName="riv-table riv-table--soadj"
                />
                <div className="rds-meta">
                  <span>{rows.length ? `Menampilkan ${shown.length} dari ${rows.length} baris` : "0 baris"}</span>
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

export default RegSoAdjPage;
