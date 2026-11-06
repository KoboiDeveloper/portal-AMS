import React, { useCallback, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDatePicker from "../../../components/AppDatePicker";
import { parseAppDate, formatAppDateYmd } from "../../../components/AppDateRangePicker";
import { getTaxiPaymentAnalisa } from "../../../services/regional/regional.service";
import { extractRow, isSuccess } from "../../../lib/response";
import "./reg-ar-detail.css";
import "./reg-taxi-payment-analisa.css";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const todayYmd = () => formatAppDateYmd(new Date());
const monthStartYmd = () => {
  const d = new Date();
  return formatAppDateYmd(new Date(d.getFullYear(), d.getMonth(), 1));
};

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmt = (v) => nf0.format(Number(v || 0));

const daySpan = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000);
};

const METHOD_KEYS = [
  { key: "CASH", label: "CASH" },
  { key: "CARD", label: "CARD" },
  { key: "VOUCHER", label: "VOUCHER" },
  { key: "OVO", label: "OVO" },
  { key: "KQRIS", label: "KQRIS" },
  { key: "D_QRIS_BCA", label: "QRIS BCA" },
  { key: "D_QRIS_BNI", label: "QRIS BNI" },
  { key: "D_QRIS_BRI", label: "QRIS BRI" },
  { key: "D_QRIS_MDR", label: "QRIS MDR" },
  { key: "KATOME", label: "ATOME" },
  { key: "KINDODANA", label: "INDODANA" },
  { key: "SISA_VOUCHER", label: "SISA VOUCHER" },
  { key: "REFUND", label: "REFUND" },
];

const parseMaybeJson = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};

const RegTaxiPaymentDashPage = () => {
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analisa, setAnalisa] = useState(null);

  const runAnalisa = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError("Pilih tanggal dulu");
      return;
    }
    if (daySpan(fromDate, toDate) > 31) {
      setError("Range tanggal maksimal 31 hari");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getTaxiPaymentAnalisa({
        from_date: fromDate,
        to_date: toDate,
        id_brand: "ALL",
        id_store: "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal analisa");
        setAnalisa(null);
        return;
      }
      setAnalisa(extractRow(res) || null);
    } catch (e) {
      setError(e?.message || e?.responseMessage || "Gagal analisa");
      setAnalisa(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const methods = useMemo(() => {
    if (!analisa) return [];
    return METHOD_KEYS.map((m) => ({
      ...m,
      amount: Number(analisa[m.key] || 0),
    })).filter((m) => Math.abs(m.amount) > 0.009);
  }, [analisa]);

  const methodChart = useMemo(() => {
    if (!methods.length) return null;
    return {
      labels: methods.map((m) => m.label),
      datasets: [
        {
          label: "Payment",
          data: methods.map((m) => m.amount),
          backgroundColor: "#5b9bd5",
          borderRadius: 2,
        },
      ],
    };
  }, [methods]);

  const daily = useMemo(() => parseMaybeJson(analisa?.daily), [analisa]);
  const topStores = useMemo(() => parseMaybeJson(analisa?.top_stores), [analisa]);
  const selisihByStore = useMemo(() => parseMaybeJson(analisa?.selisih_by_store), [analisa]);
  const selisihByDay = useMemo(() => parseMaybeJson(analisa?.selisih_by_day), [analisa]);

  const dailyChart = useMemo(() => {
    if (!daily.length) return null;
    const sorted = [...daily].sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
    return {
      labels: sorted.map((d) => String(d.tanggal || "").slice(5)),
      datasets: [
        {
          label: "Total harian",
          data: sorted.map((d) => Number(d.total || 0)),
          borderColor: "#70ad47",
          backgroundColor: "rgba(112,173,71,0.15)",
          fill: true,
          tension: 0.25,
          pointRadius: 2,
        },
      ],
    };
  }, [daily]);

  const selisihDayChart = useMemo(() => {
    if (!selisihByDay.length) return null;
    const sorted = [...selisihByDay].sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
    return {
      labels: sorted.map((d) => String(d.tanggal || "").slice(5)),
      datasets: [
        {
          label: "Selisih",
          data: sorted.map((d) => Number(d.selisih || 0)),
          backgroundColor: sorted.map((d) =>
            Math.abs(Number(d.selisih || 0)) < 0.5
              ? "#1ee0ac"
              : Number(d.selisih || 0) < 0
                ? "#e85347"
                : "#f4bd0e"
          ),
          borderRadius: 2,
        },
      ],
    };
  }, [selisihByDay]);

  const selisih = Number(analisa?.selisih_payment_summary || 0);
  const selisihOk = Math.abs(selisih) < 0.5;

  return (
    <AccessGuard moduleCode="TAXI_PAYMENT_DASH">
      <Head title="Analisa Payment" />
      <Content>
        <div className="rad-report tap-page">
          <BlockHead size="sm">
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Analisa Payment
              </BlockTitle>
              <BlockDes className="text-soft">
                Filter sama AR REPORT — data lewat API, dianalisa di sini
              </BlockDes>
            </BlockHeadContent>
          </BlockHead>

          <Block>
            <div className="rad-toolbar">
              <div className="rad-dates">
                <div className="rad-date-field">
                  <AppDatePicker
                    selected={parseAppDate(fromDate)}
                    onChange={(d) => setFromDate(d ? formatAppDateYmd(d) : "")}
                    dateFormat="yyyy/MM/dd"
                    className="form-control rad-date-input"
                    placeholderText="From"
                  />
                  <div className="rad-date-hint">Select date range</div>
                </div>
                <div className="rad-date-to">To</div>
                <div className="rad-date-field">
                  <AppDatePicker
                    selected={parseAppDate(toDate)}
                    onChange={(d) => setToDate(d ? formatAppDateYmd(d) : "")}
                    dateFormat="yyyy/MM/dd"
                    className="form-control rad-date-input"
                    placeholderText="To"
                  />
                </div>
              </div>
              <div className="rad-actions">
                <button
                  type="button"
                  className="btn rad-btn-detail"
                  disabled={loading || !fromDate || !toDate}
                  onClick={runAnalisa}
                >
                  {loading ? "Analisa..." : "Analisa"}
                </button>
              </div>
            </div>

            {error ? <div className="rad-msg rad-msg--err">{error}</div> : null}

            {analisa ? (
              <>
                <div className="tap-selisih-hero card card-bordered">
                  <div className="card-inner">
                    <div className="tap-selisih-label">SELISIH PAYMENT – SUMMARY</div>
                    <div className={`tap-selisih-value${selisihOk ? " is-ok" : " is-bad"}`}>
                      {fmt(selisih)}
                    </div>
                    <div className="tap-selisih-formula text-soft">
                      Payment {fmt(analisa.total_payment)} − Summary {fmt(analisa.total_summary)}
                    </div>
                    {analisa.selisih_insight ? (
                      <div className="tap-selisih-insight">{analisa.selisih_insight}</div>
                    ) : null}
                    <div className="tap-selisih-meta">
                      <span>
                        Store bermasalah: <strong>{fmt(analisa.selisih_store_count)}</strong>
                      </span>
                      <span>
                        Hari/store gap: <strong>{fmt(analisa.selisih_day_count)}</strong>
                      </span>
                      <span>
                        Payment &gt; Summary: <strong>{fmt(analisa.selisih_payment_lebih_count)}</strong>
                      </span>
                      <span>
                        Summary &gt; Payment: <strong>{fmt(analisa.selisih_summary_lebih_count)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <table className="tap-kpi-strip" aria-label="Ringkasan payment">
                  <tbody>
                    <tr>
                      <td>
                        <div className="tap-kpi-label">Total Payment</div>
                        <div className="tap-kpi-value">{fmt(analisa.total_payment)}</div>
                      </td>
                      <td>
                        <div className="tap-kpi-label">Total Summary</div>
                        <div className="tap-kpi-value">{fmt(analisa.total_summary)}</div>
                      </td>
                      <td>
                        <div className="tap-kpi-label">Trx / Store</div>
                        <div className="tap-kpi-value">
                          {fmt(analisa.trx_count)} / {fmt(analisa.store_count)}
                        </div>
                      </td>
                      <td>
                        <div className="tap-kpi-label">PLU / ≠ Rumus</div>
                        <div className="tap-kpi-value">
                          {fmt(analisa.plu_rows)} / {fmt(analisa.plu_selisih_rows)}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="tap-grid tap-grid--selisih mt-3">
                  <div className="card card-bordered tap-card">
                    <div className="card-inner">
                      <div className="tap-card-head">
                        <h6 className="tap-card-title">Analisa selisih per store</h6>
                        <p className="tap-help text-soft">
                          Selisih = Payment − Summary. Negatif = payment kurang dari PLU summary.
                        </p>
                      </div>
                      {selisihByStore.length ? (
                        <div className="tap-method-table-wrap">
                          <table className="tap-table tap-table--gap">
                            <colgroup>
                              <col className="tap-col-key" />
                              <col className="tap-col-num" />
                              <col className="tap-col-num" />
                              <col className="tap-col-num" />
                            </colgroup>
                            <thead>
                              <tr>
                                <th>Store</th>
                                <th className="num">Payment</th>
                                <th className="num">Summary</th>
                                <th className="num">Selisih</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selisihByStore.map((r, i) => {
                                const g = Number(r.selisih || 0);
                                return (
                                  <tr key={`${r.store}-${i}`}>
                                    <td>{r.store}</td>
                                    <td className="num">{fmt(r.payment)}</td>
                                    <td className="num">{fmt(r.summary)}</td>
                                    <td className={`num${Math.abs(g) < 0.5 ? "" : g < 0 ? " is-bad" : " is-warn"}`}>
                                      {fmt(g)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-soft small">Tidak ada store dengan selisih</div>
                      )}
                    </div>
                  </div>

                  <div className="card card-bordered tap-card">
                    <div className="card-inner">
                      <div className="tap-card-head">
                        <h6 className="tap-card-title">Selisih per hari</h6>
                        <p className="tap-help text-soft">
                          Selisih = Payment − Summary per tanggal. Scroll bila data panjang.
                        </p>
                      </div>
                      {selisihByDay.length ? (
                        <div className="tap-method-table-wrap">
                          <table className="tap-table tap-table--gap">
                            <colgroup>
                              <col className="tap-col-key" />
                              <col className="tap-col-num" />
                              <col className="tap-col-num" />
                              <col className="tap-col-num" />
                            </colgroup>
                            <thead>
                              <tr>
                                <th>Tanggal</th>
                                <th className="num">Payment</th>
                                <th className="num">Summary</th>
                                <th className="num">Selisih</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selisihByDay.map((r, i) => {
                                const g = Number(r.selisih || 0);
                                return (
                                  <tr key={`${r.tanggal}-${i}`}>
                                    <td>{r.tanggal}</td>
                                    <td className="num">{fmt(r.payment)}</td>
                                    <td className="num">{fmt(r.summary)}</td>
                                    <td className={`num${Math.abs(g) < 0.5 ? "" : g < 0 ? " is-bad" : " is-warn"}`}>
                                      {fmt(g)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-soft small">Tidak ada data harian</div>
                      )}
                    </div>
                  </div>
                </div>

                {selisihDayChart ? (
                  <div className="card card-bordered tap-card mt-3">
                    <div className="card-inner">
                      <h6 className="tap-card-title">Chart selisih per hari</h6>
                      <div className="tap-chart tap-chart--wide">
                        <Bar
                          data={selisihDayChart}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: {
                                ticks: { callback: (v) => fmt(v) },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="tap-grid">
                  <div className="card card-bordered tap-card">
                    <div className="card-inner">
                      <h6 className="tap-card-title">Mix metode bayar</h6>
                      {methodChart ? (
                        <div className="tap-chart">
                          <Bar
                            data={methodChart}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { display: false } },
                              scales: {
                                y: {
                                  ticks: {
                                    callback: (v) => fmt(v),
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-soft small">Tidak ada payment</div>
                      )}
                      {methods.length ? (
                        <div className="tap-method-table-wrap">
                          <table className="tap-table">
                            <thead>
                              <tr>
                                <th>Metode</th>
                                <th className="num">Amount</th>
                                <th className="num">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {methods.map((m) => {
                                const pct =
                                  Number(analisa.total_payment) !== 0
                                    ? (m.amount / Number(analisa.total_payment)) * 100
                                    : 0;
                                return (
                                  <tr key={m.key}>
                                    <td>{m.label}</td>
                                    <td className="num">{fmt(m.amount)}</td>
                                    <td className="num">{pct.toFixed(1)}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="card card-bordered tap-card">
                    <div className="card-inner">
                      <h6 className="tap-card-title">Trend harian</h6>
                      {dailyChart ? (
                        <div className="tap-chart">
                          <Line
                            data={dailyChart}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { display: false } },
                              scales: {
                                y: {
                                  ticks: {
                                    callback: (v) => fmt(v),
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-soft small">Tidak ada data harian</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card card-bordered tap-card mt-3">
                  <div className="card-inner">
                    <h6 className="tap-card-title">Top store (by payment)</h6>
                    {topStores.length ? (
                      <div className="tap-method-table-wrap">
                        <table className="tap-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Store</th>
                              <th className="num">Total</th>
                              <th className="num">Trx</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topStores.map((s, i) => (
                              <tr key={`${s.store}-${i}`}>
                                <td>{i + 1}</td>
                                <td>{s.store}</td>
                                <td className="num">{fmt(s.total)}</td>
                                <td className="num">{fmt(s.trx)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-soft small">Tidak ada store</div>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {!analisa && !loading && !error ? (
              <div className="reg-rpt-empty mt-3">Pilih tanggal lalu klik Analisa</div>
            ) : null}
          </Block>
        </div>
      </Content>
    </AccessGuard>
  );
};

export default RegTaxiPaymentDashPage;
