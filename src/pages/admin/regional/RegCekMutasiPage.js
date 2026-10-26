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

/** Legacy module/Rpt/Chk_Mutasi.aspx — Cek Mutasi */
const svc = createRegionalService("rpt/inv/cek-mutasi", { crud: false });

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

const noAll = (opts) =>
  (Array.isArray(opts) ? opts : []).filter((o) => String(o.value).toUpperCase() !== "ALL");

const RENDER_STEP = 100;

const cellOf = (r, key) => {
  if (r == null) return null;
  if (r[key] != null) return r[key];
  const up = String(key).toUpperCase();
  const hit = Object.keys(r).find((k) => String(k).toUpperCase() === up);
  return hit != null ? r[hit] : null;
};

const RegCekMutasiPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [plu, setPlu] = useState("");

  const [brandOpts, setBrandOpts] = useState([]);
  const [storeOpts, setStoreOpts] = useState([]);

  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);
  const tableRef = useRef(null);

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => setBrandOpts(noAll(opts)));
  }, []);

  useEffect(() => {
    regionalLookupOptions("store", { parentId: brandId || "" }).then((opts) =>
      setStoreOpts(noAll(opts))
    );
    setStoreId("");
  }, [brandId]);

  const canSearch = Boolean(storeId && String(plu || "").trim() && fromDate && toDate);

  const loadData = useCallback(async () => {
    if (!storeId) {
      setError("Store wajib dipilih");
      return;
    }
    if (!String(plu || "").trim()) {
      setError("PLU wajib diisi");
      return;
    }
    if (!fromDate || !toDate) {
      setError("Tanggal wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    setLimit(RENDER_STEP);
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "",
        id_store: storeId,
        plu: String(plu).trim(),
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setLoaded(null);
        return;
      }
      setRows(extractRows(res));
      setLoaded({ storeId, plu: String(plu).trim(), fromDate, toDate });
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setLoaded(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, fromDate, plu, storeId, toDate]);

  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_CEK_MUTASI">
      <Head title="Cek Mutasi" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Cek Mutasi
                </BlockTitle>
                <BlockDes className="text-soft">
                  {loaded
                    ? `You have total ${rows.length} rows · ${loaded.storeId} · ${loaded.plu}`
                    : "Pilih Store + PLU + tanggal lalu Filter"}
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
                          placeholder="PLU"
                          value={plu}
                          onChange={(e) => setPlu(e.target.value)}
                          aria-label="PLU"
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
                  </div>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

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
                <div className="riv-table-wrap riv-table-wrap--cekmutasi">
                  <table ref={tableRef} className="riv-table riv-table--cekmutasi">
                    <thead>
                      <tr>
                        <th className="rds-no">NO</th>
                        <th className="ctr">ID</th>
                        <th className="ctr">CODE</th>
                        <th className="ctr">TANGGAL</th>
                        <th className="ctr">PLU</th>
                        <th className="num">A</th>
                        <th className="num">TRANSAKSI</th>
                        <th className="num">Z</th>
                        <th className="ctr">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!shown.length ? (
                        <tr>
                          <td colSpan={9} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        shown.map((r, i) => {
                          const st = String(cellOf(r, "STATUS") || "");
                          const bad = st.toUpperCase().includes("BAD");
                          return (
                            <tr
                              key={`${cellOf(r, "IDNYA")}-${i}`}
                              className={bad ? "riv-row-bad" : undefined}
                            >
                              <td className="rds-no">{i + 1}</td>
                              <td className="ctr" title={String(cellOf(r, "IDNYA") || "")}>
                                {cellOf(r, "IDNYA")}
                              </td>
                              <td className="ctr">{cellOf(r, "KODE")}</td>
                              <td className="ctr">{fmtDate(cellOf(r, "TANGGAL"))}</td>
                              <td className="ctr">{cellOf(r, "PLU")}</td>
                              <td className="num">{fmtNum(cellOf(r, "A"))}</td>
                              <td className="num">{fmtNum(cellOf(r, "TRANSAKSI"))}</td>
                              <td className="num">{fmtNum(cellOf(r, "Z"))}</td>
                              <td className="ctr">{st}</td>
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
                  tableClassName="riv-table riv-table--cekmutasi"
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

export default RegCekMutasiPage;
