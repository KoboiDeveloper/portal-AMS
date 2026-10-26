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
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { buildImageStorageUrl, isMissingImagePath } from "../../../lib/imageStorage";
import "./reg-reg-report.css";
import "./reg-dcr.css";

/** Legacy Dcr_rpt.aspx (REG) composite: batch + sales + payment + cash detail */
const svc = createRegionalService("rpt/sales/dcr", { crud: false });

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem" }),
};

const pad2 = (n) => String(n).padStart(2, "0");
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));

const ALL_OPT = { value: "ALL", label: "ALL" };

/** Payment panels, same grouping / labels as legacy (PAYMENT | AMOUNT x3) */
const PAY_GROUPS = [
  [
    ["CASH", "CASH"],
    ["D.BCA", "DBCA"],
    ["D.MANDIRI", "DMANDIRI"],
    ["D.BNI", "DBNI"],
    ["D.BRI", "DBRI"],
    ["C.BCA", "KBCA"],
    ["C.MANDIRI", "KMANDIRI"],
    ["C.BNI", "KBNI"],
    ["C.BRI", "KBRI"],
  ],
  [
    ["VOUCHER", "VOUCHER"],
    ["VOUCHER ONLINE", "VOUCHER_ONLINE"],
    ["OVO", "KOVO"],
    ["ATOME", "ATOME"],
    ["INDODANA", "INDODANA"],
    ["ONLINE", "ONLINE"],
    ["COD", "COD"],
  ],
  [
    ["QRIS BCA", "D_QRIS_BCA"],
    ["QRIS BNI", "D_QRIS_BNI"],
    ["QRIS BRI", "D_QRIS_BRI"],
    ["QRIS MANDIRI", "D_QRIS_MANDIRI"],
  ],
];

const Photo = ({ name }) => {
  if (!name || isMissingImagePath(name)) return <span className="rdc-nophoto">-</span>;
  const url = buildImageStorageUrl(name);
  if (!url) return <span className="rdc-nophoto">{String(name)}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="rdc-photo">
      <img src={url} alt="" width={30} height={30} />
    </a>
  );
};

const RegDcrPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(todayYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);

  const [batch, setBatch] = useState(null);
  const [sales, setSales] = useState([]);
  const [payment, setPayment] = useState(null);
  const [cash, setCash] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        (o) => String(o.value).toUpperCase() !== "ALL"
      );
      setStoreOpts([ALL_OPT, ...list]);
    });
    setStoreId("");
  }, [brandId]);

  const canSearch = Boolean(brandId && storeId && fromDate && toDate);

  const load = useCallback(async () => {
    if (!brandId || !storeId || !fromDate || !toDate) {
      setError("Pilih Brand, Store, dan tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // p_select_date = from_date, p_to_date = to_date (legacy Dcr_rpt.aspx.cs)
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate || fromDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setBatch(null);
        setSales([]);
        setPayment(null);
        setCash([]);
        setLoaded(false);
        return;
      }
      setBatch(res.batch || null);
      setSales(extractRows(res));
      setPayment(res.payment || null);
      setCash(Array.isArray(res.cash_detail) ? res.cash_detail : []);
      setLoaded(true);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [brandId, fromDate, storeId, toDate]);

  const salesTotals = useMemo(() => {
    const t = { QTY: 0, LABA: 0, SALES: 0, DISCOUNT: 0, PP: 0, NET_SALES: 0, NET_LABA: 0 };
    sales.forEach((r) => {
      Object.keys(t).forEach((k) => {
        t[k] += Number(r[k] || 0);
      });
    });
    return t;
  }, [sales]);

  const cashTotals = useMemo(
    () => ({
      TI22_CASH: cash.reduce((a, r) => a + Number(r.TI22_CASH || 0), 0),
      PU94_CASH: cash.reduce((a, r) => a + Number(r.PU94_CASH || 0), 0),
    }),
    [cash]
  );

  return (
    <AccessGuard moduleCode="REG_RPT_DCR">
      <Head title="Daily Collection Report" />
      <Content>
        <BlockHead size="sm" className="no-print">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Daily Collection Report
              </BlockTitle>
              <BlockDes className="text-soft">
                Batch, sales, payment detail dan cash detail
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
                          onChange={(fromYmd, toYmd) => {
                            setFromDate(fromYmd || "");
                            setToDate(toYmd || "");
                          }}
                        />
                      </div>
                    </li>
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
                    <li>
                      <button
                        type="button"
                        className="btn btn-icon btn-trigger admin-filter-premium-btn"
                        onClick={load}
                        disabled={loading || !canSearch}
                        title={canSearch ? "Filter" : "Pilih filter dulu"}
                        aria-label="Filter"
                      >
                        <Icon pack="premium" name="pencarian" size={32} />
                      </button>
                    </li>
                    <li>
                      <Button
                        color="light"
                        size="sm"
                        onClick={() => window.print()}
                        disabled={!loaded}
                      >
                        <Icon name="printer" />
                        <span>Print</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>
          {!loaded && !loading && !error ? (
            <div className="reg-rpt-empty">Data belum tersedia</div>
          ) : null}
          {loaded && !error && !sales.length && !cash.length && !batch ? (
            <div className="reg-rpt-empty">Data belum tersedia</div>
          ) : null}
          {loading || error || (loaded && (sales.length > 0 || cash.length > 0 || batch)) ? (
          <div className="card rsa-card rdc-card">
            <div className="card-inner">
              {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
              {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

              {loaded && (sales.length > 0 || cash.length > 0 || batch) ? (
                <div className="rdc-report">
                  <div className="rdc-print-title">
                    DAILY COLLECTION REPORT - {brandId} / {storeId} - {fromDate}
                    {toDate && toDate !== fromDate ? ` s/d ${toDate}` : ""}
                  </div>

                  {/* 1. BATCH */}
                  <div className="rdc-batch">
                    <div className="rdc-batch-item">
                      <div className="rdc-batch-val">{batch?.BATCH || "-"}</div>
                      <span className="rdc-help">Batch</span>
                    </div>
                    <div className="rdc-batch-item">
                      <div className="rdc-batch-val">{batch?.START_DATE || "-"}</div>
                      <span className="rdc-help">Open</span>
                    </div>
                    <div className="rdc-batch-item">
                      <div className="rdc-batch-val">{batch?.CLOSING_DATE || "-"}</div>
                      <span className="rdc-help">Closed</span>
                    </div>
                    {batch && Number(batch.BATCH_COUNT) > 1 ? (
                      <div className="rdc-batch-item rdc-batch-item--sm">
                        <div className="rdc-batch-val">
                          {batch.BATCH_COUNT}
                          {Number(batch.OPEN_COUNT) ? ` (${batch.OPEN_COUNT} open)` : ""}
                        </div>
                        <span className="rdc-help">Batches</span>
                      </div>
                    ) : null}
                  </div>

                  {/* 2. SALES */}
                  <div className="rdc-section">
                    <div className="rdc-section-title">SALES</div>
                    <div className="rdc-table-wrap">
                      <table className="rdc-table">
                        <thead>
                          <tr>
                            <th className="ctr">No</th>
                            <th className="ctr">STORE</th>
                            <th>DEPT</th>
                            <th className="num">QTY</th>
                            <th className="num">LABA</th>
                            <th className="num">GROSS SALES</th>
                            <th className="num">DISCOUNT</th>
                            <th className="num">PRICE POINT</th>
                            <th className="num">NET SALES</th>
                            <th className="num">NET LABA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!sales.length ? (
                            <tr>
                              <td colSpan={10} className="rdc-empty">
                                There Is No Data
                              </td>
                            </tr>
                          ) : (
                            sales.map((r, i) => (
                              <tr key={i}>
                                <td className="ctr">{i + 1}</td>
                                <td className="ctr">{r.Store_ID || r.STORE_ID || ""}</td>
                                <td>{r.PLU || ""}</td>
                                <td className="num">{fmtNum(r.QTY)}</td>
                                <td className="num">{fmtNum(r.LABA)}</td>
                                <td className="num">{fmtNum(r.SALES)}</td>
                                <td className="num">{fmtNum(r.DISCOUNT)}</td>
                                <td className="num">{fmtNum(r.PP)}</td>
                                <td className="num">{fmtNum(r.NET_SALES)}</td>
                                <td className="num">{fmtNum(r.NET_LABA)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {sales.length ? (
                          <tfoot>
                            <tr>
                              <td />
                              <td />
                              <td>TOTAL</td>
                              <td className="num">{fmtNum(salesTotals.QTY)}</td>
                              <td className="num">{fmtNum(salesTotals.LABA)}</td>
                              <td className="num">{fmtNum(salesTotals.SALES)}</td>
                              <td className="num">{fmtNum(salesTotals.DISCOUNT)}</td>
                              <td className="num">{fmtNum(salesTotals.PP)}</td>
                              <td className="num">{fmtNum(salesTotals.NET_SALES)}</td>
                              <td className="num">{fmtNum(salesTotals.NET_LABA)}</td>
                            </tr>
                          </tfoot>
                        ) : null}
                      </table>
                    </div>
                  </div>

                  {/* 3. PAYMENT DETAIL */}
                  <div className="rdc-section">
                    <div className="rdc-section-title">PAYMENT DETAIL</div>
                    <div className="rdc-pay">
                      {PAY_GROUPS.map((grp, gi) => (
                        <div key={gi} className="rdc-pay-group">
                          <div className="rdc-pay-head">
                            <span>PAYMENT</span>
                            <span>AMOUNT</span>
                          </div>
                          {grp.map(([label, key]) => (
                            <div key={key} className="rdc-pay-row">
                              <span>{label}</span>
                              <span className="num">{fmtNum(payment?.[key])}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="rdc-pay-total">
                      <span>TOTAL PAYMENT</span>
                      <strong>{fmtNum(payment?.totalnyaLOH)}</strong>
                    </div>
                  </div>

                  {/* 4. CASH DETAIL (not printed, as legacy) */}
                  <div className="rdc-section no-print">
                    <div className="rdc-section-title">CASH DETAIL</div>
                    <div className="rdc-table-wrap">
                      <table className="rdc-table">
                        <thead>
                          <tr>
                            <th className="ctr">No</th>
                            <th className="ctr">STORE</th>
                            <th className="ctr">TANGGAL</th>
                            <th className="num">MANDIRI</th>
                            <th className="ctr">FOTO</th>
                            <th className="num">BNI</th>
                            <th className="ctr">FOTO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!cash.length ? (
                            <tr>
                              <td colSpan={7} className="rdc-empty">
                                There Is No Data
                              </td>
                            </tr>
                          ) : (
                            cash.map((r, i) => (
                              <tr key={i}>
                                <td className="ctr">{i + 1}</td>
                                <td className="ctr">{r.STORE_ID || ""}</td>
                                <td className="ctr">{r.TANGGAL || ""}</td>
                                <td className="num">{fmtNum(r.TI22_CASH)}</td>
                                <td className="ctr">
                                  <Photo name={r.TI22} />
                                </td>
                                <td className="num">{fmtNum(r.PU94_CASH)}</td>
                                <td className="ctr">
                                  <Photo name={r.PU94} />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {cash.length ? (
                          <tfoot>
                            <tr>
                              <td colSpan={3}>TOTAL</td>
                              <td className="num">{fmtNum(cashTotals.TI22_CASH)}</td>
                              <td />
                              <td className="num">{fmtNum(cashTotals.PU94_CASH)}</td>
                              <td />
                            </tr>
                          </tfoot>
                        ) : null}
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          ) : null}
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default RegDcrPage;
