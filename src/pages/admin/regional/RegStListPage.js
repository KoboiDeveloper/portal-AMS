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

/** Legacy St List — TR_ST_HEADER list (View filter removed; always ALL) */
const svc = createRegionalService("rpt/inv/st-list", { crud: false });

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
const yearStartYmd = () => {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), 0, 1));
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
const RENDER_STEP = 100;

const headerIdOf = (r) => String(r?.NO_TR_ST_HEADER || r?.no_tr_st_header || "").trim();

const RegStListPage = () => {
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [brandTo, setBrandTo] = useState("");
  const [storeTo, setStoreTo] = useState("");
  const [fromDate, setFromDate] = useState(yearStartYmd());
  const [toDate, setToDate] = useState(todayYmd());

  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);
  const [storeToOpts, setStoreToOpts] = useState([ALL_OPT]);

  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(null);
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
    regionalLookupOptions("store", { parentId: brandId || "" }).then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setStoreOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
    setStoreId("");
  }, [brandId]);

  useEffect(() => {
    regionalLookupOptions("store", { parentId: brandTo || "" }).then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setStoreToOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
    setStoreTo("");
  }, [brandTo]);

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
        brand_to: brandTo || "ALL",
        store_to: storeTo || "ALL",
        tipe: "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setLoaded(null);
        return;
      }
      setRows(extractRows(res));
      setLoaded({ brandId, storeId, brandTo, storeTo, fromDate, toDate });
      setLimit(RENDER_STEP);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setLoaded(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, storeId, brandTo, storeTo, fromDate, toDate]);

  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_ST_LIST">
      <Head title="St List" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  St List
                </BlockTitle>
                <BlockDes className="text-soft">
                  {loaded
                    ? `You have total ${rows.length} transactions`
                    : "Isi filter lalu klik Cari untuk memuat data"}
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
                  isClearable
                  isSearchable
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
                  isClearable
                  isSearchable
                  placeholder="Store"
                  options={storeOpts}
                  value={storeOpts.find((o) => String(o.value) === String(storeId)) || null}
                  onChange={(opt) => setStoreId(opt?.value != null ? String(opt.value) : "")}
                />
              </li>
              <li className="hrd-filter-select">
                <RSelect
                  className="hrd-filter-rselect"
                  styles={filterSelectStyles}
                  isClearable
                  isSearchable
                  placeholder="Brand To"
                  options={brandOpts}
                  value={brandOpts.find((o) => String(o.value) === String(brandTo)) || null}
                  onChange={(opt) => setBrandTo(opt?.value != null ? String(opt.value) : "")}
                />
              </li>
              <li className="hrd-filter-select">
                <RSelect
                  className="hrd-filter-rselect"
                  styles={filterSelectStyles}
                  isClearable
                  isSearchable
                  placeholder="Store To"
                  options={storeToOpts}
                  value={storeToOpts.find((o) => String(o.value) === String(storeTo)) || null}
                  onChange={(opt) => setStoreTo(opt?.value != null ? String(opt.value) : "")}
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
          </Block>

          <Block>
            {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
            {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

            {!loaded && !loading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}
            {loaded && !error && !rows.length ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}

            {loaded && rows.length > 0 ? (
              <div className="riv-bleed">
                <div className="riv-table-wrap riv-table-wrap--wide">
                  <table ref={tableRef} className="riv-table riv-table--stlist">
                    <thead>
                      <tr>
                        <th className="rds-no">NO</th>
                        <th className="riv-col-tr">NO TR ST</th>
                        <th className="ctr">BRAND OUT</th>
                        <th className="ctr">STORE OUT</th>
                        <th className="ctr">BRAND IN</th>
                        <th className="ctr">STORE IN</th>
                        <th className="num">QTY</th>
                        <th className="ctr">TGL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!shown.length ? (
                        <tr>
                          <td colSpan={8} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        shown.map((r, i) => {
                          const id = headerIdOf(r);
                          return (
                            <tr key={id || i}>
                              <td className="rds-no">{i + 1}</td>
                              <td className="riv-col-tr" title={id}>
                                {id}
                              </td>
                              <td className="ctr">{r.Brand_OUT || r.BRAND_OUT || ""}</td>
                              <td className="ctr">{r.ID_Store_OUT || r.ID_STORE_OUT || ""}</td>
                              <td className="ctr">{r.Brand_IN || r.BRAND_IN || ""}</td>
                              <td className="ctr">{r.ID_Store_IN || r.ID_STORE_IN || ""}</td>
                              <td className="num">{fmtNum(r.QTY_REAL)}</td>
                              <td className="ctr">
                                {fmtDate(r.tgl_closed_real || r.Tgl_Closed_Real || r.TGL_CLOSED_REAL || r.tgl_out)}
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
                  enabled={Boolean(loaded && rows.length)}
                  tableClassName="riv-table riv-table--stlist"
                />
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
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegStListPage;
