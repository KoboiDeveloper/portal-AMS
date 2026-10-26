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
import AppDatePicker from "../../../components/AppDatePicker";
import { formatAppDateYmd, parseAppDate } from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createRegionalService,
  getLastStockBatchDate,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-sales-detail.css";
import "./reg-inv-report.css";

/** Legacy module/Rpt/Rpt_Last_stock.aspx — TOTAL + SALES dual grids */
const svc = createRegionalService("rpt/inv/last-stock", { crud: false });

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem" }),
};

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));

const RENDER_STEP = 100;
const noAll = (opts) =>
  (Array.isArray(opts) ? opts : []).filter((o) => String(o.value).toUpperCase() !== "ALL");

const cellOf = (r, key) => {
  if (r == null) return null;
  if (r[key] != null) return r[key];
  const up = String(key).toUpperCase();
  const hit = Object.keys(r).find((k) => String(k).toUpperCase() === up);
  return hit != null ? r[hit] : null;
};

const RegLastStockPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [batchDate, setBatchDate] = useState("");
  const [dateUnlocked, setDateUnlocked] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [articleDraft, setArticleDraft] = useState("");

  const [brandOpts, setBrandOpts] = useState([]);
  const [storeOpts, setStoreOpts] = useState([]);

  const [totalRows, setTotalRows] = useState([]);
  const [detailRows, setDetailRows] = useState([]);
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailLimit, setDetailLimit] = useState(RENDER_STEP);

  const totalTableRef = useRef(null);
  const detailTableRef = useRef(null);

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => setBrandOpts(noAll(opts)));
  }, []);

  useEffect(() => {
    setStoreId("");
    setLastDate("");
    setBatchDate("");
    setDateUnlocked(false);
    setError("");
    if (!brandId) {
      setStoreOpts([]);
      return;
    }
    regionalLookupOptions("store", { parentId: brandId }).then((opts) => setStoreOpts(noAll(opts)));
  }, [brandId]);

  /* ASP batch_SelectedIndexChanged → BindTglBatchAkhir → xsp_rpt_last_tanggal_batch_getrow */
  useEffect(() => {
    const sid = String(storeId || "").trim().toUpperCase();
    if (!sid) {
      setLastDate("");
      setBatchDate("");
      setDateUnlocked(false);
      return undefined;
    }
    let cancelled = false;
    setBatchLoading(true);
    setDateUnlocked(false);
    getLastStockBatchDate(sid)
      .then((res) => {
        if (cancelled) return;
        if (!isSuccess(res)) {
          setLastDate("");
          setBatchDate("");
          setError(res?.responseMessage || "Gagal ambil last date");
          return;
        }
        const row = extractRow(res) || {};
        const tgl = String(row.TANGGAL_BATCH || row.tanggal_batch || "").trim();
        if (!tgl) {
          setLastDate("");
          setBatchDate("");
          setError("last date kosong untuk store ini");
          return;
        }
        setBatchDate(tgl);
        setLastDate(tgl);
        setError("");
      })
      .catch((e) => {
        if (cancelled) return;
        setLastDate("");
        setBatchDate("");
        setError(e?.responseMessage || e?.message || "Gagal ambil last date");
      })
      .finally(() => {
        if (!cancelled) setBatchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const baseParams = useCallback(
    () => ({
      from_date: lastDate,
      id_brand: brandId,
      id_store: storeId,
    }),
    [brandId, storeId, lastDate]
  );

  const loadTotal = useCallback(async () => {
    const res = await svc.list({ ...baseParams(), tipe: "TOTAL" });
    if (!isSuccess(res)) throw new Error(res?.responseMessage || "Gagal memuat TOTAL");
    return extractRows(res);
  }, [baseParams]);

  const loadDetail = useCallback(
    async (articleVal) => {
      const res = await svc.list({
        ...baseParams(),
        tipe: "DETAIL",
        article: String(articleVal || "").trim(),
      });
      if (!isSuccess(res)) throw new Error(res?.responseMessage || "Gagal memuat SALES");
      return extractRows(res);
    },
    [baseParams]
  );

  const canSearch = Boolean(brandId && storeId && lastDate);

  const loadData = useCallback(async () => {
    const sid = String(storeId || "").trim().toUpperCase();
    if (!brandId) {
      setError("Pilih Brand dulu");
      return;
    }
    if (!sid) {
      setError("Pilih Store dulu");
      return;
    }
    if (!lastDate) {
      setError("last date belum tersedia untuk store ini");
      return;
    }
    setLoading(true);
    setError("");
    try {
      /* Load full SALES once; Article filter is client-side realtime */
      const [tot, det] = await Promise.all([loadTotal(), loadDetail("")]);
      setTotalRows(tot);
      setDetailRows(det);
      setLoaded({ brandId, storeId, lastDate });
      setDetailLimit(RENDER_STEP);
    } catch (e) {
      setError(e?.responseMessage || e?.message || "Gagal memuat");
      setTotalRows([]);
      setDetailRows([]);
      setLoaded(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, storeId, lastDate, loadTotal, loadDetail]);

  const filteredDetail = useMemo(() => {
    const q = String(articleDraft || "").trim().toUpperCase();
    if (!q) return detailRows;
    return detailRows.filter((r) => {
      const plu = String(cellOf(r, "PLU") || "").toUpperCase();
      return plu.includes(q);
    });
  }, [detailRows, articleDraft]);

  useEffect(() => {
    setDetailLimit(RENDER_STEP);
  }, [articleDraft]);

  const shownDetail = useMemo(
    () => filteredDetail.slice(0, detailLimit),
    [filteredDetail, detailLimit]
  );
  const scrollRevision = `${loading ? "loading" : "ready"}-${totalRows.length}-${filteredDetail.length}-${articleDraft}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_LAST_STOCK">
      <Head title="Last Stock" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll riv-laststock-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Last Stock
                </BlockTitle>
                <BlockDes className="text-soft">
                  {loaded
                    ? `TOTAL ${totalRows.length} store · SALES ${detailRows.length} baris · ${loaded.lastDate}`
                    : "Pilih Brand / Store lalu Filter"}
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
                    <ul className="nk-block-tools g-3 riv-laststock-filters">
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
                      <li className="hrd-filter-lastdate">
                        <div className="form-control-wrap">
                          <div className="form-icon form-icon-left">
                            <Icon name="calendar" />
                          </div>
                          <AppDatePicker
                            selected={parseAppDate(lastDate)}
                            onChange={(d) => {
                              if (!dateUnlocked) return;
                              setLastDate(d ? formatAppDateYmd(d) : "");
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="last date"
                            className={`form-control form-control-sm date-picker ps-4${
                              dateUnlocked ? "" : " riv-lastdate-locked"
                            }`}
                            disabled={!dateUnlocked}
                            isClearable={dateUnlocked}
                          />
                        </div>
                        <button
                          type="button"
                          className="riv-change-date"
                          onClick={() => {
                            setDateUnlocked(true);
                            if (!lastDate && batchDate) setLastDate(batchDate);
                          }}
                          disabled={!storeId || batchLoading}
                        >
                          change date
                        </button>
                      </li>
                      <li>
                        <Button
                          color="primary"
                          size="sm"
                          onClick={loadData}
                          disabled={loading || batchLoading || !canSearch}
                          title={canSearch ? "Filter" : "Pilih filter dulu"}
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
            {loading || batchLoading ? (
              <div className="text-soft small mb-2">
                {batchLoading ? "Memuat last date..." : "Memuat data..."}
              </div>
            ) : null}

            {!loaded && !loading && !batchLoading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}
            {loaded && !error && !totalRows.length && !detailRows.length ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}

            <div className="riv-bleed">
              {loaded && (totalRows.length > 0 || detailRows.length > 0) ? (
                <>
                  <div className="riv-section-label">TOTAL</div>
                  <div className="riv-table-wrap riv-table-wrap--laststock mb-4">
                    <table ref={totalTableRef} className="riv-table riv-table--laststock-total">
                      <thead>
                        <tr>
                          <th className="rds-no" rowSpan={2}>
                            NO
                          </th>
                          <th className="ctr ls-meta" rowSpan={2}>
                            STORE
                          </th>
                          <th colSpan={2} className="ctr ls-grp ls-grp--a ls-sep">
                            BEGINING
                          </th>
                          <th colSpan={2} className="ctr ls-grp ls-grp--b ls-sep">
                            ST IN
                          </th>
                          <th colSpan={2} className="ctr ls-grp ls-grp--a ls-sep">
                            REFUND
                          </th>
                          <th colSpan={2} className="ctr ls-grp ls-grp--b ls-sep">
                            ST OUT
                          </th>
                          <th colSpan={2} className="ctr ls-grp ls-grp--a ls-sep">
                            SALES
                          </th>
                          <th colSpan={2} className="ctr ls-grp ls-grp--b ls-sep">
                            ADJ.
                          </th>
                          <th colSpan={2} className="ctr ls-grp ls-grp--end ls-sep">
                            ENDING
                          </th>
                        </tr>
                        <tr>
                          <th className="num ls-grp--a ls-sep">QTY</th>
                          <th className="num ls-grp--a">PRICE</th>
                          <th className="num ls-grp--b ls-sep">QTY</th>
                          <th className="num ls-grp--b">PRICE</th>
                          <th className="num ls-grp--a ls-sep">QTY</th>
                          <th className="num ls-grp--a">PRICE</th>
                          <th className="num ls-grp--b ls-sep">QTY</th>
                          <th className="num ls-grp--b">PRICE</th>
                          <th className="num ls-grp--a ls-sep">QTY</th>
                          <th className="num ls-grp--a">PRICE</th>
                          <th className="num ls-grp--b ls-sep">QTY</th>
                          <th className="num ls-grp--b">PRICE</th>
                          <th className="num ls-grp--end ls-sep">QTY</th>
                          <th className="num ls-grp--end">PRICE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!totalRows.length ? (
                          <tr>
                            <td colSpan={16} className="rds-empty">
                              There Is No Data
                            </td>
                          </tr>
                        ) : (
                          totalRows.map((r, i) => (
                            <tr key={`${cellOf(r, "STORE_ID")}-${i}`}>
                              <td className="rds-no">{i + 1}</td>
                              <td className="ctr ls-meta">{cellOf(r, "STORE_ID")}</td>
                              <td className="num ls-grp--a ls-sep">{fmtNum(cellOf(r, "A"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "XA"))}</td>
                              <td className="num ls-grp--b ls-sep">{fmtNum(cellOf(r, "ST_IN"))}</td>
                              <td className="num ls-grp--b">{fmtNum(cellOf(r, "XST_IN"))}</td>
                              <td className="num ls-grp--a ls-sep">{fmtNum(cellOf(r, "TRADE_IN"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "XTRADE_IN"))}</td>
                              <td className="num ls-grp--b ls-sep">{fmtNum(cellOf(r, "ST_OUT"))}</td>
                              <td className="num ls-grp--b">{fmtNum(cellOf(r, "XST_OUT"))}</td>
                              <td className="num ls-grp--a ls-sep">{fmtNum(cellOf(r, "SALES"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "XSALES"))}</td>
                              <td className="num ls-grp--b ls-sep">{fmtNum(cellOf(r, "ADJ"))}</td>
                              <td className="num ls-grp--b">{fmtNum(cellOf(r, "XADJ"))}</td>
                              <td className="num ls-grp--end ls-sep">{fmtNum(cellOf(r, "Z"))}</td>
                              <td className="num ls-grp--end">{fmtNum(cellOf(r, "XZ"))}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <RivStickyThead
                    tableRef={totalTableRef}
                    enabled={Boolean(loaded && totalRows.length)}
                    tableClassName="riv-table riv-table--laststock-total"
                  />

                  <div className="riv-sales-block">
                    <div className="riv-section-bar riv-section-bar--sales mb-2">
                      <div className="riv-section-label mb-0">SALES</div>
                      <input
                        type="text"
                        className="form-control form-control-sm riv-article-input"
                        placeholder="Article / PLU"
                        value={articleDraft}
                        onChange={(e) => setArticleDraft(e.target.value)}
                        aria-label="Article / PLU"
                      />
                    </div>
                    <div className="riv-table-wrap riv-table-wrap--laststock">
                    <table ref={detailTableRef} className="riv-table riv-table--laststock-sales">
                      <thead>
                        <tr>
                          <th className="rds-no" rowSpan={2}>
                            NO
                          </th>
                          <th className="ctr ls-meta" rowSpan={2}>
                            STORE
                          </th>
                          <th className="ctr ls-meta" rowSpan={2}>
                            DATE
                          </th>
                          <th className="ctr ls-meta" rowSpan={2}>
                            PLU
                          </th>
                          <th className="num ls-meta" rowSpan={2}>
                            PRICE
                          </th>
                          <th className="num ls-meta" rowSpan={2}>
                            HPP
                          </th>
                          <th colSpan={3} className="ctr ls-grp ls-grp--a ls-sep">
                            BEGINING
                          </th>
                          <th colSpan={3} className="ctr ls-grp ls-grp--b ls-sep">
                            ST IN
                          </th>
                          <th colSpan={3} className="ctr ls-grp ls-grp--a ls-sep">
                            REFUND
                          </th>
                          <th colSpan={3} className="ctr ls-grp ls-grp--b ls-sep">
                            ST OUT
                          </th>
                          <th colSpan={3} className="ctr ls-grp ls-grp--a ls-sep">
                            TRADE OUT
                          </th>
                          <th colSpan={3} className="ctr ls-grp ls-grp--b ls-sep">
                            SALES
                          </th>
                          <th colSpan={3} className="ctr ls-grp ls-grp--a ls-sep">
                            ADJ.
                          </th>
                          <th colSpan={3} className="ctr ls-grp ls-grp--end ls-sep">
                            ENDING
                          </th>
                        </tr>
                        <tr>
                          {[
                            "ls-grp--a",
                            "ls-grp--b",
                            "ls-grp--a",
                            "ls-grp--b",
                            "ls-grp--a",
                            "ls-grp--b",
                            "ls-grp--a",
                            "ls-grp--end",
                          ].map((g, gi) => (
                            <React.Fragment key={gi}>
                              <th className={`num ${g} ls-sep`}>QTY</th>
                              <th className={`num ${g}`}>HPP</th>
                              <th className={`num ${g}`}>PRICE</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {!shownDetail.length ? (
                          <tr>
                            <td colSpan={30} className="rds-empty">
                              There Is No Data
                            </td>
                          </tr>
                        ) : (
                          shownDetail.map((r, i) => (
                            <tr key={`${cellOf(r, "STORE_ID")}-${cellOf(r, "PLU")}-${i}`}>
                              <td className="rds-no">{i + 1}</td>
                              <td className="ctr ls-meta">{cellOf(r, "STORE_ID")}</td>
                              <td className="ctr ls-meta">{cellOf(r, "TANGGAL")}</td>
                              <td className="ctr ls-meta">{cellOf(r, "PLU")}</td>
                              <td className="num ls-meta">{fmtNum(cellOf(r, "PRICE"))}</td>
                              <td className="num ls-meta">{fmtNum(cellOf(r, "HPP"))}</td>
                              <td className="num ls-grp--a ls-sep">{fmtNum(cellOf(r, "A"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "MA"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "XA"))}</td>
                              <td className="num ls-grp--b ls-sep">{fmtNum(cellOf(r, "ST_IN"))}</td>
                              <td className="num ls-grp--b">{fmtNum(cellOf(r, "MST_IN"))}</td>
                              <td className="num ls-grp--b">{fmtNum(cellOf(r, "XST_IN"))}</td>
                              <td className="num ls-grp--a ls-sep">{fmtNum(cellOf(r, "TRADE_IN"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "MTRADE_IN"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "XTRADE_IN"))}</td>
                              <td className="num ls-grp--b ls-sep">{fmtNum(cellOf(r, "ST_OUT"))}</td>
                              <td className="num ls-grp--b">{fmtNum(cellOf(r, "MST_OUT"))}</td>
                              <td className="num ls-grp--b">{fmtNum(cellOf(r, "XST_OUT"))}</td>
                              <td className="num ls-grp--a ls-sep">{fmtNum(cellOf(r, "TRADE_OUT"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "MTRADE_OUT"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "XTRADE_OUT"))}</td>
                              <td className="num ls-grp--b ls-sep">{fmtNum(cellOf(r, "SALES"))}</td>
                              <td className="num ls-grp--b">{fmtNum(cellOf(r, "MSALES"))}</td>
                              <td className="num ls-grp--b">{fmtNum(cellOf(r, "XSALES"))}</td>
                              <td className="num ls-grp--a ls-sep">{fmtNum(cellOf(r, "ADJ"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "MADJ"))}</td>
                              <td className="num ls-grp--a">{fmtNum(cellOf(r, "XADJ"))}</td>
                              <td className="num ls-grp--end ls-sep">{fmtNum(cellOf(r, "Z"))}</td>
                              <td className="num ls-grp--end">{fmtNum(cellOf(r, "MZ"))}</td>
                              <td className="num ls-grp--end">{fmtNum(cellOf(r, "XZ"))}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  </div>
                  <RivStickyThead
                    tableRef={detailTableRef}
                    enabled={Boolean(loaded && detailRows.length)}
                    tableClassName="riv-table riv-table--laststock-sales"
                  />
                  <div className="rds-meta">
                    <span>
                      {filteredDetail.length
                        ? `Menampilkan ${shownDetail.length} dari ${filteredDetail.length} baris${
                            articleDraft.trim() ? ` (filter dari ${detailRows.length})` : ""
                          }`
                        : "0 baris"}
                    </span>
                    {filteredDetail.length > shownDetail.length ? (
                      <span className="rds-more">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light"
                          onClick={() => setDetailLimit((l) => l + RENDER_STEP)}
                        >
                          Tampilkan {RENDER_STEP} lagi
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light"
                          onClick={() => setDetailLimit(filteredDetail.length)}
                        >
                          Tampilkan semua
                        </button>
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegLastStockPage;
