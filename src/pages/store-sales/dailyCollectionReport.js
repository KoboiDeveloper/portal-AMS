import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import DatePicker from "../../components/AppDatePicker";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { Spinner } from "reactstrap";
import { NumericFormat } from "react-number-format";
import Content from "../../layout/content/Content";
import Head from "../../layout/head/Head";
import CalendarDateInput from "../../components/CalendarDateInput";
import { PageSmoothScroll } from "../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../components/SalesEmptyState";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
} from "../../components/Component";
import { useStoreScope } from "../../hooks/useStoreScope";
import { buildImageStorageUrl, isDropboxStoragePath, isMissingImagePath } from "../../lib/imageStorage";
import { isSuccess } from "../../lib/response";
import { filesService } from "../../services/files.service";
import { storeSalesDcrService } from "../../services/store-sales-dcr.service";
import "./daily-collection-report.css";

const BRAND_ID = process.env.REACT_APP_BRAND_ID || "celcius";

const PAYMENT_COLS = [
  [
    { key: "cash", label: "Cash" },
    { key: "dBca", label: "D.BCA" },
    { key: "dMandiri", label: "D.Mandiri" },
    { key: "dBni", label: "D.BNI" },
    { key: "dBri", label: "D.BRI" },
    { key: "kBca", label: "C.BCA" },
    { key: "kMandiri", label: "C.Mandiri" },
    { key: "kBni", label: "C.BNI" },
    { key: "kBri", label: "C.BRI" },
  ],
  [
    { key: "voucher", label: "Voucher" },
    { key: "voucherOnline", label: "Voucher Online" },
    { key: "kOvo", label: "OVO" },
    { key: "atome", label: "Atome" },
    { key: "indodana", label: "Indodana" },
    { key: "online", label: "Online" },
    { key: "cod", label: "COD" },
    { key: "change", label: "Change" },
    { key: "kQris", label: "QRIS" },
  ],
  [
    { key: "dQrisBca", label: "QRIS BCA" },
    { key: "dQrisBni", label: "QRIS BNI" },
    { key: "dQrisBri", label: "QRIS BRI" },
    { key: "dQrisMandiri", label: "QRIS Mandiri" },
  ],
];

const toDateKey = (value) => {
  if (!value) return "";
  if (value instanceof Date && isValid(value)) return format(value, "yyyy-MM-dd");
  const raw = String(value).trim();
  if (!raw) return "";
  const first = raw.split(",")[0].trim();
  const parsed = parseISO(first.length <= 10 ? first : first.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  return first.slice(0, 10);
};

const formatDisplayDate = (value) => {
  const key = toDateKey(value);
  if (!key) return "—";
  const parsed = parseISO(key);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy") : key;
};

const isApiOk = (res) => {
  const code = String(res?.responseCode ?? "");
  return isSuccess(res) || code === "00" || code === "2000000";
};

const isNotFoundResponse = (res) => {
  const code = String(res?.responseCode ?? "");
  const msg = String(res?.responseMessage ?? "").toLowerCase();
  return (
    code === "01" ||
    code === "4040000" ||
    code === "4042500" ||
    msg.includes("tidak ditemukan") ||
    msg.includes("not found") ||
    msg.includes("tidak ada")
  );
};

const Money = ({ value, bold }) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator="."
    decimalSeparator=","
    displayType="text"
    renderText={(v) => (bold ? <strong>{v}</strong> : <span>{v}</span>)}
  />
);

const resolveImageUrl = async (filename) => {
  const value = String(filename ?? "").trim();
  if (!value || isMissingImagePath(value)) return "";
  if (isDropboxStoragePath(value)) {
    try {
      const path = value.startsWith("/") ? value : `/${value}`;
      const res = await filesService.getTemporaryLink(path);
      if ((isSuccess(res) || String(res?.responseCode) === "00") && res?.data?.temporaryLink) {
        return res.data.temporaryLink;
      }
    } catch {
      /* ignore */
    }
    return "";
  }
  return buildImageStorageUrl(value);
};

const batchCash = (batch, bank) => {
  if (bank === "mandiri") {
    return batch?.Mandiri ?? batch?.mandiri ?? batch?.ti22Cash ?? 0;
  }
  return batch?.BNI ?? batch?.bni ?? batch?.pu94Cash ?? 0;
};

const batchImage = (batch, bank) => {
  const keys =
    bank === "mandiri"
      ? ["ti22", "mandiriImage", "imageMandiri", "MandiriImage"]
      : ["pu94", "bniImage", "imageBni", "BNIImage"];
  for (const key of keys) {
    const raw = batch?.[key];
    if (raw == null) continue;
    const value = String(raw).trim();
    if (!value || /^-?\d+(\.\d+)?$/.test(value)) continue;
    return value;
  }
  return "";
};

const batchTanggal = (batch) => batch?.tanggal ?? batch?.Tanggal ?? batch?.noUrut ?? "";

const BatchThumb = ({ filename, label }) => {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    const value = String(filename ?? "").trim();
    if (!value || isMissingImagePath(value)) {
      setUrl("");
      setStatus("empty");
      return undefined;
    }
    setStatus("loading");
    resolveImageUrl(value).then((next) => {
      if (cancelled) return;
      if (!next) {
        setUrl("");
        setStatus("empty");
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          setUrl(next);
          setStatus("loaded");
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          setUrl("");
          setStatus("empty");
        }
      };
      img.src = next;
    });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  if (status === "loading") {
    return (
      <div className="dcr-batch-thumb is-loading">
        <Spinner size="sm" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className="dcr-batch-thumb is-empty" title={label}>
        <Icon name="img" />
        <span>Belum ada foto</span>
      </div>
    );
  }
  return (
    <Zoom zoomMargin={40}>
      <img src={url} alt={label} className="dcr-batch-thumb" />
    </Zoom>
  );
};

const Dcr = () => {
  const { storeId } = useStoreScope();
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const selectKey = toDateKey(fromDate);
  const toKey = toDateKey(toDate || fromDate);

  const loadData = useCallback(async () => {
    if (!storeId || !selectKey) return;
    setLoading(true);
    setError("");
    try {
      const res = await storeSalesDcrService.get({
        select_date: selectKey,
        to_date: toKey || selectKey,
        brand_id: BRAND_ID,
        store_id: storeId,
      });
      if (isApiOk(res)) {
        const data = res?.data || null;
        setPayload(data);
        setAppliedFrom(toDateKey(data?.fromDate) || selectKey);
        setAppliedTo(toDateKey(data?.toDate) || toKey || selectKey);
        return;
      }
      if (isNotFoundResponse(res)) {
        setPayload(null);
        setAppliedFrom("");
        setAppliedTo("");
        return;
      }
      setPayload(null);
      setAppliedFrom("");
      setAppliedTo("");
      setError(res?.responseMessage || "Gagal memuat DCR");
    } catch (err) {
      setPayload(null);
      setAppliedFrom("");
      setAppliedTo("");
      setError(err?.responseMessage || err?.message || "Gagal memuat DCR");
    } finally {
      setLoading(false);
    }
  }, [storeId, selectKey, toKey]);

  // Ganti store → reset hasil; load hanya lewat tombol Muat
  useEffect(() => {
    setPayload(null);
    setError("");
    setAppliedFrom("");
    setAppliedTo("");
  }, [storeId]);

  const salesData = useMemo(
    () => (Array.isArray(payload?.salesData) ? payload.salesData : []),
    [payload]
  );
  const payment = payload?.pembayaranData || {};
  const batches = useMemo(
    () => (Array.isArray(payload?.batchDetailData) ? payload.batchDetailData : []),
    [payload]
  );

  const salesTotals = useMemo(() => {
    return salesData.reduce(
      (acc, row) => {
        acc.qty += Number(row?.qty) || 0;
        acc.price += Number(row?.price) || 0;
        acc.discount += Number(row?.discount) || 0;
        acc.pp += Number(row?.pp) || 0;
        acc.netSales += Number(row?.netSales) || 0;
        return acc;
      },
      { qty: 0, price: 0, discount: 0, pp: 0, netSales: 0 }
    );
  }, [salesData]);

  const periodFrom = appliedFrom || toDateKey(payload?.fromDate);
  const periodTo = appliedTo || toDateKey(payload?.toDate);
  const periodLabel =
    periodFrom && periodTo && periodFrom !== periodTo
      ? `${formatDisplayDate(periodFrom)} – ${formatDisplayDate(periodTo)}`
      : formatDisplayDate(periodFrom || periodTo) || "Belum dimuat";

  const handlePrint = () => {
    window.print();
  };

  return (
    <React.Fragment>
      <Head title="Daily Collection Report" />
      <Content>
        <PageSmoothScroll
          revision={`${loading ? "loading" : "ready"}-${salesData.length}-${error || "ok"}-${payload ? "data" : "empty"}`}
        >
        <div className="dcr-page">
          <div className="dcr-print-title">
            <h2>Daily Collection Report</h2>
            <p>
              {storeId || "—"}
              {periodFrom || periodTo ? ` · ${periodLabel}` : ""}
              {payload?.brandId ? ` · ${payload.brandId}` : ""}
            </p>
          </div>
          <BlockHead size="sm" className="dcr-no-print">
            <BlockBetween className="page-head-stack">
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Daily Collection Report
                </BlockTitle>
                <BlockDes className="text-soft">
                  <p>Ringkasan penjualan, pembayaran, dan slip setoran harian</p>
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <div className="dcr-filter dcr-no-print">
                  <div className="dcr-filter-range">
                    <DatePicker
                      selected={fromDate}
                      onChange={(d) => {
                        setFromDate(d);
                        if (toDate && d && toDate < d) setToDate(d);
                      }}
                      selectsStart
                      startDate={fromDate}
                      endDate={toDate}
                      dateFormat="dd MMM yyyy"
                      customInput={<CalendarDateInput className="form-control date-picker dcr-filter-date" />}
                    />
                    <span className="dcr-filter-to">s/d</span>
                    <DatePicker
                      selected={toDate}
                      onChange={(d) => setToDate(d)}
                      selectsEnd
                      startDate={fromDate}
                      endDate={toDate}
                      minDate={fromDate}
                      dateFormat="dd MMM yyyy"
                      customInput={<CalendarDateInput className="form-control date-picker dcr-filter-date" />}
                    />
                  </div>
                  <Button
                    color="primary"
                    className="dcr-filter-load"
                    onClick={loadData}
                    disabled={loading || !storeId}
                  >
                    <Icon name="search" />
                    <span>Load</span>
                  </Button>
                  <Button
                    color="primary"
                    outline
                    className="btn-icon dcr-filter-print"
                    onClick={handlePrint}
                    disabled={!payload || loading}
                    title="Print"
                    aria-label="Print"
                  >
                    <Icon name="printer" />
                  </Button>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="dcr-toolbar">
              <div className="dcr-toolbar-left">
                <div className="dcr-store-badge">
                  <Icon name="building" />
                  <div>
                    <span className="dcr-badge-label">Store</span>
                    <strong>{storeId || "—"}</strong>
                  </div>
                </div>
                <div className="dcr-period-badge dcr-mobile-hide">
                  <Icon name="calender-date" />
                  <div>
                    <span className="dcr-badge-label">Periode</span>
                    <strong>{periodLabel}</strong>
                  </div>
                </div>
                {payload?.brandId ? (
                  <div className="dcr-period-badge dcr-mobile-hide">
                    <Icon name="tag" />
                    <div>
                      <span className="dcr-badge-label">Brand</span>
                      <strong>{payload.brandId}</strong>
                    </div>
                  </div>
                ) : null}
              </div>
              {payload ? (
                <div className="dcr-summary-pills dcr-no-print">
                  <div className="dcr-pill dcr-mobile-hide">
                    <span>Sales rows</span>
                    <strong>{salesData.length}</strong>
                  </div>
                  <div className="dcr-pill dcr-mobile-hide">
                    <span>Batch</span>
                    <strong>{batches.length}</strong>
                  </div>
                  <div className="dcr-pill dcr-pill--accent">
                    <span>Payment total</span>
                    <strong>
                      <Money value={payment?.total} />
                    </strong>
                  </div>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="dcr-empty is-error dcr-no-print">
                <div className="dcr-empty-icon">
                  <Icon name="alert-circle" />
                </div>
                <h5>Gagal memuat data</h5>
                <p>{error}</p>
                <Button color="primary" outline onClick={loadData} disabled={loading}>
                  Coba lagi
                </Button>
              </div>
            ) : null}

            {!error && payload ? (
              <>
                <section className="dcr-panel">
                  <div className="dcr-panel-head">
                    <div className="dcr-panel-title">
                      <span className="dcr-panel-dot" aria-hidden="true" />
                      <h4>Sales Detail</h4>
                    </div>
                    <span>{salesData.length} baris</span>
                  </div>
                  <div className="table-responsive page-table-scroll">
                    <table className="dcr-table">
                      <thead>
                        <tr>
                          <th>Department / PLU</th>
                          <th className="is-num">Qty</th>
                          <th className="is-num">Gross Sales</th>
                          <th className="is-num">Discount</th>
                          <th className="is-num">PP</th>
                          <th className="is-num">Net Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.length ? (
                          salesData.map((row, idx) => (
                            <tr key={`${row?.plu || "row"}-${idx}`}>
                              <td>{row?.plu || "—"}</td>
                              <td className="is-num">
                                <Money value={row?.qty} />
                              </td>
                              <td className="is-num">
                                <Money value={row?.price} />
                              </td>
                              <td className="is-num">
                                <Money value={row?.discount} />
                              </td>
                              <td className="is-num">
                                <Money value={row?.pp} />
                              </td>
                              <td className="is-num">
                                <Money value={row?.netSales} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="is-empty-cell">
                              Tidak ada data penjualan
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {salesData.length ? (
                        <tfoot>
                          <tr>
                            <td>Total</td>
                            <td className="is-num">
                              <Money value={salesTotals.qty} bold />
                            </td>
                            <td className="is-num">
                              <Money value={salesTotals.price} bold />
                            </td>
                            <td className="is-num">
                              <Money value={salesTotals.discount} bold />
                            </td>
                            <td className="is-num">
                              <Money value={salesTotals.pp} bold />
                            </td>
                            <td className="is-num">
                              <Money value={salesTotals.netSales} bold />
                            </td>
                          </tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>
                </section>

                <section className="dcr-panel">
                  <div className="dcr-panel-head">
                    <div className="dcr-panel-title">
                      <span className="dcr-panel-dot" aria-hidden="true" />
                      <h4>Payment Detail</h4>
                    </div>
                    <span className="dcr-total-chip">
                      Total <Money value={payment?.total} bold />
                    </span>
                  </div>
                  <div className="dcr-pay-grid">
                    {PAYMENT_COLS.map((col, colIdx) => (
                      <div key={`pay-col-${colIdx}`} className="dcr-pay-col">
                        <div className="dcr-pay-col-head">
                          <span>Payment</span>
                          <span>Amount</span>
                        </div>
                        <ul className="dcr-pay-list">
                          {col.map((item) => {
                            const amount = Number(payment?.[item.key]) || 0;
                            return (
                              <li
                                key={item.key}
                                className={amount > 0 ? "has-value" : ""}
                              >
                                <span className="dcr-pay-label">{item.label}</span>
                                <span className="dcr-pay-amount">
                                  <Money value={amount} />
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="dcr-panel dcr-no-print">
                  <div className="dcr-panel-head">
                    <div className="dcr-panel-title">
                      <span className="dcr-panel-dot" aria-hidden="true" />
                      <h4>Cash / Slip Detail</h4>
                    </div>
                    <span>{batches.length} batch</span>
                  </div>
                  {batches.length ? (
                    <div className="dcr-batch-grid">
                      {batches.map((batch, idx) => {
                        const tgl = batchTanggal(batch);
                        const mandiriCash = batchCash(batch, "mandiri");
                        const bniCash = batchCash(batch, "bni");
                        return (
                          <article
                            key={batch?.dcrId ?? `${tgl}-${idx}`}
                            className="dcr-batch-card"
                          >
                            <header className="dcr-batch-head">
                              <span className="dcr-batch-no">
                                {tgl ? formatDisplayDate(tgl) : "—"}
                              </span>
                              {batch?.dcrId != null ? (
                                <span className="dcr-batch-id">ID {batch.dcrId}</span>
                              ) : null}
                            </header>
                            <div className="dcr-batch-banks">
                              <div className="dcr-batch-bank">
                                <BatchThumb
                                  filename={batchImage(batch, "mandiri")}
                                  label="Mandiri"
                                />
                                <div className="dcr-batch-bank-meta">
                                  <span className="dcr-badge-label">Mandiri</span>
                                  <strong>
                                    Rp <Money value={mandiriCash} />
                                  </strong>
                                </div>
                              </div>
                              <div className="dcr-batch-bank">
                                <BatchThumb
                                  filename={batchImage(batch, "bni")}
                                  label="BNI"
                                />
                                <div className="dcr-batch-bank-meta">
                                  <span className="dcr-badge-label">BNI</span>
                                  <strong>
                                    Rp <Money value={bniCash} />
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="dcr-empty is-soft">
                      <Icon name="inbox" />
                      <p>Belum ada detail slip / cash batch</p>
                    </div>
                  )}
                </section>
              </>
            ) : null}

            {!error && !payload ? (
              <SalesEmptyState className="dcr-no-print" />
            ) : null}
          </Block>
        </div>
        </PageSmoothScroll>
      </Content>
    </React.Fragment>
  );
};

export default Dcr;
