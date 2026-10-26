import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { ModalSmoothScroll } from "../../../components/ModalSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import api from "../../../lib/api";
import { extractRows, isSuccess } from "../../../lib/response";
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-sales-detail.css";
import "./reg-inv-report.css";

/** Legacy Outstanding_stock_Transfer.aspx + outSstockDetail.aspx modal */
const svc = createRegionalService("rpt/inv/outstanding", { crud: false });

const fetchOutstandingDetail = (headerId) =>
  api.get(`/regional/rpt/inv/outstanding/${encodeURIComponent(headerId)}/detail`);

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

const displayTrNo = (r) =>
  String(r?.nomor || r?.NOMOR || r?.NO_TR_ST_HEADER || r?.no_tr_st_header || "").trim();

const headerIdOf = (r) => String(r?.NO_TR_ST_HEADER || r?.no_tr_st_header || "").trim();

const agingClass = (warna) => {
  const w = String(warna || "").toUpperCase();
  if (w === "RED") return "riv-age-red";
  if (w === "ORANGE") return "riv-age-orange";
  if (w === "YELLOW") return "riv-age-yellow";
  return "";
};

const RegOutstandingPage = () => {
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
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailHeaderId, setDetailHeaderId] = useState("");
  const [detailTrNo, setDetailTrNo] = useState("");
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
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
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(null);
        return;
      }
      setRows(extractRows(res));
      setView({ brandId, storeId, brandTo, storeTo, fromDate, toDate });
      setLimit(RENDER_STEP);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, storeId, brandTo, storeTo, fromDate, toDate]);

  const openDetail = useCallback(async (row) => {
    const id = headerIdOf(row);
    if (!id) return;
    setDetailHeaderId(id);
    setDetailTrNo(displayTrNo(row));
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetailItems([]);
    try {
      const res = await fetchOutstandingDetail(id);
      if (!isSuccess(res)) {
        setDetailError(res?.responseMessage || "Gagal memuat detail");
        return;
      }
      setDetailItems(extractRows(res));
    } catch (e) {
      setDetailError(e?.message || "Gagal memuat detail");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailHeaderId("");
    setDetailTrNo("");
    setDetailItems([]);
    setDetailError("");
  }, []);

  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);

  const detailFooter = useMemo(() => {
    let qty = 0;
    let hpp = 0;
    let price = 0;
    let totalHpp = 0;
    let totalPrice = 0;
    detailItems.forEach((r) => {
      qty += Number(r.QTY_OUT || 0);
      hpp += Number(r.HPP_OUT || 0);
      price += Number(r.PRICE_OUT || r.Price_OUT || 0);
      totalHpp += Number(r.Total_HPP_OUT || r.TOTAL_HPP_OUT || 0);
      totalPrice += Number(r.TOTAL_PRICE_OUT || r.Total_Price_OUT || 0);
    });
    return { qty, hpp, price, totalHpp, totalPrice };
  }, [detailItems]);

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_OUTSTANDING">
      <Head title="Outstanding Stock" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Outstanding Stock
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
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

            {!view && !loading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}
            {view && !error && !rows.length ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}

            {view && rows.length > 0 ? (
              <div className="riv-bleed">
                <div className="riv-table-wrap">
                  <table ref={tableRef} className="riv-table riv-table--out">
                    <thead>
                      <tr>
                        <th className="rds-no">NO</th>
                        <th className="ctr">NO. TRANSACTION</th>
                        <th className="ctr">DATE</th>
                        <th className="ctr">FROM</th>
                        <th className="ctr">TO</th>
                        <th className="ctr">AGING</th>
                      </tr>
                    </thead>
                      <tbody>
                        {!shown.length ? (
                          <tr>
                            <td colSpan={6} className="rds-empty">
                              There Is No Data
                            </td>
                          </tr>
                        ) : (
                          shown.map((r, i) => {
                            const id = headerIdOf(r);
                            const ageCls = agingClass(r.EGGING_WARNA || r.egging_warna || "");
                            return (
                              <tr
                                key={id || i}
                                className={`rsd-row-click ${ageCls}`.trim()}
                                title="Double-click untuk detail"
                                onDoubleClick={() => openDetail(r)}
                              >
                                <td className="rds-no">{i + 1}</td>
                                <td className="ctr" title={id}>
                                  {id}
                                </td>
                                <td className="ctr">{fmtDate(r.tgl_out || r.Tgl_Out || r.TGL_OUT)}</td>
                                <td className="ctr">{r.DARI || r.dari || ""}</td>
                                <td className="ctr">{r.TOss || r.TOSS || r.toss || ""}</td>
                                <td className="ctr">{r.EGGING ?? r.egging ?? ""}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <RivStickyThead
                    tableRef={tableRef}
                    enabled={Boolean(view && rows.length)}
                    tableClassName="riv-table riv-table--out"
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

        <Modal
          isOpen={detailOpen}
          toggle={closeDetail}
          className="modal-dialog-centered rsd-detail-modal riv-detail-modal"
        >
          <div className="rsd-detail-hero">
            <div>
              <h5 className="rsd-detail-title">OUTSTANDING DETAIL</h5>
              <p className="rsd-detail-sub">
                {detailTrNo ? `No. Transaction: ${detailTrNo}` : null}
                {detailHeaderId && detailTrNo !== detailHeaderId ? (
                  <span className="text-soft"> · ID: {detailHeaderId}</span>
                ) : null}
              </p>
            </div>
            <button type="button" className="btn btn-icon btn-trigger" onClick={closeDetail} aria-label="Tutup">
              <Icon name="cross" />
            </button>
          </div>
          <ModalBody className="rsd-detail-body">
            <ModalSmoothScroll
              active={detailOpen}
              revision={`${detailLoading ? "loading" : "ready"}-${detailItems.length}-${detailHeaderId}`}
            >
              {detailError ? <div className="rrd-msg err mb-2">{detailError}</div> : null}
              {detailLoading ? <div className="text-soft small mb-2">Memuat detail...</div> : null}
              <div className="riv-detail-wrap">
                <table className="riv-table riv-detail-table">
                  <thead>
                    <tr>
                      <th className="rds-no">No</th>
                      <th className="ctr">PLU</th>
                      <th className="num">QTY</th>
                      <th className="num">HPP</th>
                      <th className="num">PRICE</th>
                      <th className="num">TOTAL HPP</th>
                      <th className="num">TOTAL PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!detailItems.length && !detailLoading ? (
                      <tr>
                        <td colSpan={7} className="rds-empty">
                          There Is No Data
                        </td>
                      </tr>
                    ) : (
                      detailItems.map((r, i) => (
                        <tr key={`${r.PLU}-${i}`}>
                          <td className="rds-no">{i + 1}</td>
                          <td className="ctr">{r.PLU || r.plu || ""}</td>
                          <td className="num">{fmtNum(r.QTY_OUT)}</td>
                          <td className="num">{fmtNum(r.HPP_OUT)}</td>
                          <td className="num">{fmtNum(r.PRICE_OUT || r.Price_OUT)}</td>
                          <td className="num">{fmtNum(r.Total_HPP_OUT || r.TOTAL_HPP_OUT)}</td>
                          <td className="num">{fmtNum(r.TOTAL_PRICE_OUT || r.Total_Price_OUT)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {detailItems.length ? (
                    <tfoot>
                      <tr>
                        <td colSpan={2} className="num">
                          TOTAL
                        </td>
                        <td className="num">{fmtNum(detailFooter.qty)}</td>
                        <td className="num">{fmtNum(detailFooter.hpp)}</td>
                        <td className="num">{fmtNum(detailFooter.price)}</td>
                        <td className="num">{fmtNum(detailFooter.totalHpp)}</td>
                        <td className="num">{fmtNum(detailFooter.totalPrice)}</td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </ModalSmoothScroll>
          </ModalBody>
        </Modal>
      </Content>
    </AccessGuard>
  );
};

export default RegOutstandingPage;
