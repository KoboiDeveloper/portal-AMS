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
  Button,
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
import {
  buildStOutPrintHtml,
  openStOutPrintWindow,
  writeStOutPrintWindow,
} from "./printStOutPdf";
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-sales-detail.css";
import "./reg-inv-report.css";

/** Legacy Rpt_Tr_st.aspx — list + detail modal + STOUT print PDF */
const svc = createRegionalService("rpt/inv/tr-st-out", { crud: false });

const fetchTrStOutDetail = (headerId) =>
  api.get(`/regional/rpt/inv/tr-st-out/${encodeURIComponent(headerId)}/detail`);

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
  if (!v) return "";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return s;
};

const ALL_OPT = { value: "ALL", label: "ALL" };
const RENDER_STEP = 100;

const headerIdOf = (r) => String(r?.NO_TR_ST_HEADER || r?.no_tr_st_header || "").trim();

const qtyOf = (r) => Number(r.QTY_OUT ?? r.QTY_REAL ?? 0);
const hppOf = (r) => Number(r.HPP_OUT ?? r.HPP_REAL ?? 0);
const priceOf = (r) => Number(r.PRICE_OUT ?? r.Price_OUT ?? r.PRICE_REAL ?? 0);

const RegTrStOutPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());

  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);

  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);
  const [printBusy, setPrintBusy] = useState("");

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
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(null);
        return;
      }
      setRows(extractRows(res));
      setView({ brandId, storeId, fromDate, toDate });
      setLimit(RENDER_STEP);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, storeId, fromDate, toDate]);

  const openDetail = useCallback(async (row) => {
    const id = headerIdOf(row);
    if (!id) return;
    setDetailHeaderId(id);
    setDetailTrNo(id);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetailItems([]);
    try {
      const res = await fetchTrStOutDetail(id);
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

  const handlePrint = useCallback(
    async (row, e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      const id = headerIdOf(row);
      if (!id || printBusy) return;

      // Open under the click gesture (before await) so browser does not blank/block.
      const printWin = openStOutPrintWindow();
      if (!printWin) {
        setError("Popup diblokir — izinkan popup untuk situs ini, lalu coba lagi");
        return;
      }

      setPrintBusy(id);
      setError("");
      try {
        const res = await fetchTrStOutDetail(id);
        if (!isSuccess(res)) {
          try {
            printWin.close();
          } catch {
            /* ignore */
          }
          setError(res?.responseMessage || "Gagal memuat data print");
          return;
        }
        const html = buildStOutPrintHtml(
          {
            brand: row.Brand_OUT || row.BRAND_OUT || "",
            stockDept: row.ID_Store_OUT || row.ID_STORE_OUT || "",
            date: fmtDate(row.tgl_out || row.TGL_OUT || row.Tgl_Out),
            receiver: row.ID_Store_IN || row.ID_STORE_IN || "",
            noStOut: id,
          },
          extractRows(res)
        );
        writeStOutPrintWindow(printWin, html);
      } catch (err) {
        try {
          printWin.close();
        } catch {
          /* ignore */
        }
        setError(err?.message || "Gagal print");
      } finally {
        setPrintBusy("");
      }
    },
    [printBusy]
  );

  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);

  const footer = useMemo(() => {
    let qty = 0;
    let hpp = 0;
    let price = 0;
    rows.forEach((r) => {
      qty += qtyOf(r);
      hpp += hppOf(r);
      price += priceOf(r);
    });
    return { qty, hpp, price };
  }, [rows]);

  const detailFooter = useMemo(() => {
    let qty = 0;
    let hpp = 0;
    let price = 0;
    let totalHpp = 0;
    let totalPrice = 0;
    detailItems.forEach((r) => {
      qty += Number(r.QTY_OUT || 0);
      hpp += Number(r.HPP_OUT || 0);
      price += Number(r.PRICE_OUT || 0);
      totalHpp += Number(r.TOTAL_HPP_OUT || r.Total_HPP_OUT || 0);
      totalPrice += Number(r.TOTAL_PRICE_OUT || r.Total_Price_OUT || 0);
    });
    return { qty, hpp, price, totalHpp, totalPrice };
  }, [detailItems]);

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_TR_ST_OUT">
      <Head title="Tr St Out" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Tr St Out
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
                    ? `You have total ${rows.length} transactions`
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
                <div className="riv-table-wrap riv-table-wrap--wide">
                  <table ref={tableRef} className="riv-table">
                    <thead>
                      <tr>
                        <th className="rds-no" rowSpan={2}>
                          NO
                        </th>
                        <th rowSpan={2}>NO. TRANSACTION</th>
                        <th rowSpan={2}>DATE</th>
                        <th colSpan={3} className="ctr">
                          FROM
                        </th>
                        <th colSpan={3} className="ctr">
                          TO
                        </th>
                        <th rowSpan={2} className="num">
                          QTY
                        </th>
                        <th rowSpan={2} className="num">
                          HPP
                        </th>
                        <th rowSpan={2} className="num">
                          PRICE
                        </th>
                        <th rowSpan={2} className="ctr">
                          ACTION
                        </th>
                      </tr>
                      <tr>
                        <th className="ctr">BRAND</th>
                        <th className="ctr">STORE</th>
                        <th className="ctr">GRADE</th>
                        <th className="ctr">BRAND</th>
                        <th className="ctr">STORE</th>
                        <th className="ctr">GRADE</th>
                      </tr>
                    </thead>
                      <tbody>
                        {!shown.length ? (
                          <tr>
                            <td colSpan={13} className="rds-empty">
                              There Is No Data
                            </td>
                          </tr>
                        ) : (
                          shown.map((r, i) => {
                            const id = headerIdOf(r);
                            return (
                              <tr
                                key={id || i}
                                className="rsd-row-click"
                                title="Double-click untuk detail"
                                onDoubleClick={() => openDetail(r)}
                              >
                                <td className="rds-no">{i + 1}</td>
                                <td className="ctr">{id}</td>
                                <td className="ctr">{fmtDate(r.tgl_out || r.TGL_OUT || r.Tgl_Out)}</td>
                                <td className="ctr">{r.Brand_OUT || r.BRAND_OUT || ""}</td>
                                <td className="ctr">{r.ID_Store_OUT || r.ID_STORE_OUT || ""}</td>
                                <td className="ctr">{r.Grade_OUT || r.GRADE_OUT || ""}</td>
                                <td className="ctr">{r.Brand_IN || r.BRAND_IN || ""}</td>
                                <td className="ctr">{r.ID_Store_IN || r.ID_STORE_IN || ""}</td>
                                <td className="ctr">{r.Grade_IN || r.GRADE_IN || ""}</td>
                                <td className="num">{fmtNum(qtyOf(r))}</td>
                                <td className="num">{fmtNum(hppOf(r))}</td>
                                <td className="num">{fmtNum(priceOf(r))}</td>
                                <td className="ctr">
                                  <button
                                    type="button"
                                    className="btn btn-icon btn-trigger btn-sm"
                                    title="Print PDF"
                                    aria-label="Print PDF"
                                    disabled={printBusy === id}
                                    onClick={(ev) => handlePrint(r, ev)}
                                  >
                                    <Icon name="printer" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {rows.length ? (
                        <tfoot>
                          <tr>
                            <td colSpan={9} className="num">
                              TOTAL
                            </td>
                            <td className="num">{fmtNum(footer.qty)}</td>
                            <td className="num">{fmtNum(footer.hpp)}</td>
                            <td className="num">{fmtNum(footer.price)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>
                  <RivStickyThead tableRef={tableRef} enabled={Boolean(view && rows.length)} />
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
              <h5 className="rsd-detail-title">ST OUT DETAIL</h5>
              <p className="rsd-detail-sub">
                {detailTrNo ? `No. Transaction: ${detailTrNo}` : null}
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
                          <td className="ctr">{r.PLU || ""}</td>
                          <td className="num">{fmtNum(r.QTY_OUT)}</td>
                          <td className="num">{fmtNum(r.HPP_OUT)}</td>
                          <td className="num">{fmtNum(r.PRICE_OUT)}</td>
                          <td className="num">{fmtNum(r.TOTAL_HPP_OUT || r.Total_HPP_OUT)}</td>
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

export default RegTrStOutPage;
