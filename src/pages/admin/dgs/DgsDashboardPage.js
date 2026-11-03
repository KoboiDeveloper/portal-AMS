import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
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
import { getDgsDashboard } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { errMsg, fmtCompact, fmtNum, monthStartYmd, pct, todayYmd } from "./dgsUtils";
import "../regional/reg-mp-ar-list.css";
import "./dgs.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MP_FILTER = [
  { value: "", label: "Semua Marketplace" },
  ...["SHOPEE", "TOKOPEDIA", "TIKTOK", "LAZADA", "ZALORA", "BLIBLI", "BUKALAPAK", "JD.ID", "ZILINGO", "DIRECT SELLING"].map(
    (m) => ({ value: m, label: m })
  ),
];

const selectStyles = {
  control: (base) => ({ ...base, minHeight: 38, height: 38, fontSize: "0.8125rem", borderColor: "#dbdfea", borderRadius: 0, background: "#eef2f8" }),
  valueContainer: (base) => ({ ...base, padding: "0 10px", height: 36 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem", borderRadius: 0 }),
};

const AGE_BUCKETS = [
  { label: "0–3 hari", min: 0, max: 3 },
  { label: "4–7 hari", min: 4, max: 7 },
  { label: "8–14 hari", min: 8, max: 14 },
  { label: "15–30 hari", min: 15, max: 30, late: true },
  { label: "> 30 hari", min: 31, max: Infinity, late: true },
];

const bucketize = (rows) =>
  AGE_BUCKETS.map((b) => {
    let c = 0;
    let v = 0;
    (rows || []).forEach((r) => {
      const a = Number(r.age_days);
      if (a >= b.min && a <= b.max) {
        c += Number(r.c || 0);
        v += Number(r.value || 0);
      }
    });
    return { ...b, c, v };
  });

const COLORS = {
  pending: "#f4a417",
  approved: "#1ca36c",
  rejected: "#e5484d",
  gt: "#6576ff",
  mp: "#9aa7ff",
};

const baseOpts = (extra = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
  ...extra,
});

const Kpi = ({ title, value, sub, tone }) => (
  <div className={`dgs-kpi${tone ? ` is-${tone}` : ""}`}>
    <div className="t">{title}</div>
    <div className="v">{value}</div>
    {sub ? <div className="s">{sub}</div> : null}
  </div>
);

const AgeTable = ({ title, rows, cols, onRow }) => (
  <div className="dgs-card">
    <h6>
      {title}
      <small>{rows?.length || 0} teratas</small>
    </h6>
    <div className="dgs-table-wrap">
      <table className="dgs-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.k} className={c.num ? "num" : undefined}>
                {c.l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).length === 0 ? (
            <tr>
              <td className="dgs-empty" colSpan={cols.length}>
                Tidak ada data
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className={onRow ? "dgs-row-click" : undefined} onClick={onRow ? () => onRow(r) : undefined}>
                {cols.map((c) => (
                  <td key={c.k} className={c.num ? "num" : undefined}>
                    {c.age ? (
                      <span className={`dgs-pill ${Number(r[c.k]) > 14 ? "is-bad" : Number(r[c.k]) > 7 ? "is-warn" : ""}`}>
                        {fmtNum(r[c.k])} hr
                      </span>
                    ) : c.num ? (
                      fmtNum(r[c.k])
                    ) : (
                      r[c.k] ?? "—"
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const DgsDashboardPage = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState(monthStartYmd());
  const [to, setTo] = useState(todayYmd());
  const [mp, setMp] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const load = useCallback(
    async (refresh = false) => {
      if (!from || !to) return;
      const my = ++seq.current;
      setLoading(true);
      setError("");
      try {
        const res = await getDgsDashboard({ from_date: from, to_date: to, marketplace: mp, ...(refresh ? { refresh: 1 } : {}) });
        if (my !== seq.current) return;
        if (!isSuccess(res)) {
          setError(res?.responseMessage || "Gagal memuat dashboard");
          return;
        }
        setData(res.data || null);
      } catch (e) {
        if (my === seq.current) setError(errMsg(e, "Gagal memuat dashboard"));
      } finally {
        if (my === seq.current) setLoading(false);
      }
    },
    [from, to, mp]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const kp = data?.kpi_prasales || {};
  const ka = data?.kpi_ar || {};
  const kr = data?.kpi_retur || {};
  const fees = useMemo(() => data?.fees || {}, [data]);
  const fd = useMemo(() => data?.fees_detail || {}, [data]);

  const ageP = useMemo(() => bucketize(data?.aging_pending), [data]);
  const ageU = useMemo(() => bucketize(data?.aging_unpaid), [data]);

  const dailyChart = useMemo(() => {
    const d = data?.daily || [];
    return {
      labels: d.map((x) => String(x.d).slice(5)),
      datasets: [
        { label: "Pending", data: d.map((x) => Number(x.pending)), backgroundColor: COLORS.pending, stack: "s" },
        { label: "Approved", data: d.map((x) => Number(x.approved)), backgroundColor: COLORS.approved, stack: "s" },
        { label: "Rejected", data: d.map((x) => Number(x.rejected)), backgroundColor: COLORS.rejected, stack: "s" },
      ],
    };
  }, [data]);

  const mpChart = useMemo(() => {
    const d = data?.by_marketplace || [];
    return {
      labels: d.map((x) => x.marketplace),
      datasets: [
        { label: "Grand Total POS", data: d.map((x) => Number(x.value)), backgroundColor: COLORS.gt },
        { label: "Grand Total MP", data: d.map((x) => Number(x.value_mp)), backgroundColor: COLORS.mp },
      ],
    };
  }, [data]);

  const storeChart = useMemo(() => {
    const d = data?.by_store || [];
    return {
      labels: d.map((x) => x.store),
      datasets: [
        { label: "Pending", data: d.map((x) => Number(x.pending)), backgroundColor: COLORS.pending, stack: "s" },
        { label: "Approved", data: d.map((x) => Number(x.approved)), backgroundColor: COLORS.approved, stack: "s" },
        { label: "Rejected", data: d.map((x) => Number(x.rejected)), backgroundColor: COLORS.rejected, stack: "s" },
      ],
    };
  }, [data]);

  const feeRows = useMemo(
    () =>
      [
        ["Ongkir", fees.ongkir],
        ["Payment Gateway", fees.payment_gateway],
        ["Biaya Layanan", fees.biaya_layanan],
        ["Premi", fees.premi],
        ["Biaya Program", fees.biaya_program],
        ["Komisi Affiliate", fees.komisi_affiliate],
        ["Biaya Transaksi", fees.biaya_transaksi],
        ["Proses Pesanan", fees.biaya_proses_pesanan],
        ["Komisi Dinamis", fees.komisi_dinamis],
        ["Komisi Awal", fd.komisi_awal],
        ["PPN", fd.ppn],
        ["PPh 23", fd.pph23],
      ]
        .map(([l, v]) => ({ l, v: Number(v || 0) }))
        .filter((x) => x.v !== 0),
    [fees, fd]
  );
  const feeChart = {
    labels: feeRows.map((x) => x.l),
    datasets: [{ label: "Nominal", data: feeRows.map((x) => x.v), backgroundColor: "#6576ff" }],
  };

  const money = (v) => `Rp ${fmtCompact(v)}`;
  const approvalRate = pct(kp.approved, kp.total);
  const returRate = pct(kr.retur_qty, kr.sold_qty);
  const mismatchTotal = (data?.by_marketplace || []).reduce((s, x) => s + Number(x.mismatch_count || 0), 0);

  const goPrasales = (r) => navigate(`/dgs/prasales?kw=${encodeURIComponent(r.invoice || "")}`);

  return (
    <AccessGuard moduleCode="DGS_DASH">
      <Head title="Dashboard Analisa" />
      <Content>
        <PageSmoothScroll revision={`${loading}-${data?.built_at || ""}`} className="riv-page-scroll">
          <div className="reg-ar-wrap dgs-dash">
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    Dashboard Analisa
                  </BlockTitle>
                  <BlockDes className="text-soft">
                    Prasales · AR · Retur marketplace
                    {data?.built_at ? <span className="dgs-asof"> · data per {data.built_at} (cache 60 dtk)</span> : null}
                  </BlockDes>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>

            <div className="dgs-filters">
              <div className="reg-ar-f-item">
                <label>Periode Transaksi</label>
                <AppDateRangePicker
                  startDate={from}
                  endDate={to}
                  className="form-control form-control-sm reg-ar-ctl"
                  onChange={(f, t) => {
                    setFrom(f || "");
                    setTo(t || "");
                  }}
                />
              </div>
              <div className="reg-ar-f-item">
                <label>Marketplace</label>
                <RSelect
                  styles={selectStyles}
                  options={MP_FILTER}
                  value={MP_FILTER.find((o) => o.value === mp) || MP_FILTER[0]}
                  onChange={(o) => setMp(o?.value || "")}
                  isSearchable
                />
              </div>
              <button type="button" className="reg-ar-btn" disabled={loading} onClick={() => load(true)}>
                <Icon name="reload" /> {loading ? "Memuat…" : "Refresh"}
              </button>
            </div>

            {error ? <div className="reg-ar-error">{error}</div> : null}

            {data ? (
              <>
                <div className="dgs-kpis">
                  <Kpi title="Prasales" value={fmtNum(kp.total)} sub={`${money(kp.value)} · MP ${money(kp.value_mp)}`} tone="info" />
                  <Kpi title="Pending Confirm" value={fmtNum(kp.pending)} sub={money(kp.pending_value)} tone="warn" />
                  <Kpi title="Approved" value={fmtNum(kp.approved)} sub={`${approvalRate.toFixed(1)}% dari total`} tone="ok" />
                  <Kpi title="Rejected" value={fmtNum(kp.rejected)} sub={money(kp.rejected_value)} tone="bad" />
                  <Kpi title="AR Dalam Perjalanan" value={fmtNum(ka.in_transit)} sub={money(ka.in_transit_value)} tone="info" />
                  <Kpi title="AR Belum Cair" value={fmtNum(ka.unpaid)} sub={money(ka.unpaid_value)} tone="warn" />
                  <Kpi title="AR Sudah Cair" value={fmtNum(ka.paid)} sub={money(ka.paid_value)} tone="ok" />
                  <Kpi title="Total AR" value={money(ka.total_ar)} sub={`${fmtNum(ka.ar_total)} AR`} />
                  <Kpi
                    title="Retur"
                    value={fmtNum(kr.retur_qty)}
                    sub={`${returRate.toFixed(1)}% qty · ${money(kr.retur_value)}`}
                    tone="bad"
                  />
                  <Kpi
                    title="Retur Menunggu Barang"
                    value={fmtNum(kr.retur_waiting_qty)}
                    sub={`Diterima ${fmtNum(kr.retur_received_qty)} · Tdk sesuai ${fmtNum(kr.retur_mismatch_qty)}`}
                    tone="warn"
                  />
                  <Kpi title="Selisih Total POS vs MP" value={fmtNum(mismatchTotal)} sub="invoice dgn selisih > Rp 1" tone={mismatchTotal ? "bad" : "ok"} />
                </div>

                <div className="dgs-grid-2">
                  <div className="dgs-card">
                    <h6>Tren Harian Prasales</h6>
                    <div className="dgs-chart">
                      <Bar
                        data={dailyChart}
                        options={baseOpts({ scales: { x: { stacked: true, ticks: { maxTicksLimit: 16 } }, y: { stacked: true, beginAtZero: true } } })}
                      />
                    </div>
                  </div>
                  <div className="dgs-card">
                    <h6>
                      Nilai per Marketplace <small>POS vs MP</small>
                    </h6>
                    <div className="dgs-chart">
                      <Bar
                        data={mpChart}
                        options={baseOpts({
                          scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtCompact(v) } } },
                          plugins: {
                            legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
                            tooltip: { callbacks: { label: (c) => `${c.dataset.label}: Rp ${fmtNum(c.parsed.y)}` } },
                          },
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="dgs-grid-2">
                  <div className="dgs-card">
                    <h6>
                      Aging Pending Confirm <small>sejak tanggal transaksi</small>
                    </h6>
                    <div className="dgs-age-bar">
                      {ageP.map((b) => (
                        <div key={b.label} className={`dgs-age-cell${b.late && b.c ? " is-late" : ""}`}>
                          <div className="t">{b.label}</div>
                          <div className="v">{fmtNum(b.c)}</div>
                          <div className="s">{money(b.v)}</div>
                        </div>
                      ))}
                    </div>
                    <h6 className="mt-3">
                      Aging AR Belum Cair <small>sejak tgl sampai</small>
                    </h6>
                    <div className="dgs-age-bar">
                      {ageU.map((b) => (
                        <div key={b.label} className={`dgs-age-cell${b.late && b.c ? " is-late" : ""}`}>
                          <div className="t">{b.label}</div>
                          <div className="v">{fmtNum(b.c)}</div>
                          <div className="s">{money(b.v)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="dgs-card">
                    <h6>
                      Biaya & Potongan AR <small>total periode</small>
                    </h6>
                    <div className="dgs-chart">
                      <Bar
                        data={feeChart}
                        options={baseOpts({
                          indexAxis: "y",
                          plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: (c) => `Rp ${fmtNum(c.parsed.x)}` } },
                          },
                          scales: { x: { ticks: { callback: (v) => fmtCompact(v) } } },
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="dgs-grid-2">
                  <div className="dgs-card">
                    <h6>
                      Prasales per Store <small>20 teratas</small>
                    </h6>
                    <div className="dgs-chart dgs-chart--tall">
                      <Bar
                        data={storeChart}
                        options={baseOpts({ indexAxis: "y", scales: { x: { stacked: true }, y: { stacked: true } } })}
                      />
                    </div>
                  </div>
                  <div className="dgs-card">
                    <h6>
                      Per Marketplace <small>status & selisih</small>
                    </h6>
                    <div className="dgs-table-wrap">
                      <table className="dgs-table">
                        <thead>
                          <tr>
                            <th>Marketplace</th>
                            <th className="num">Total</th>
                            <th className="num">Pending</th>
                            <th className="num">Approved</th>
                            <th className="num">Reject</th>
                            <th className="num">Nilai POS</th>
                            <th className="num">Selisih</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.by_marketplace || []).map((x) => (
                            <tr key={x.marketplace}>
                              <td>{x.marketplace}</td>
                              <td className="num">{fmtNum(x.total)}</td>
                              <td className="num">{fmtNum(x.pending)}</td>
                              <td className="num">{fmtNum(x.approved)}</td>
                              <td className="num">{fmtNum(x.rejected)}</td>
                              <td className="num">{fmtNum(x.value)}</td>
                              <td className="num">
                                {Number(x.mismatch_count) > 0 ? <span className="dgs-pill is-bad">{fmtNum(x.mismatch_count)}</span> : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="dgs-grid-2">
                  <AgeTable
                    title="Pending Confirm Terlama"
                    rows={data.oldest_pending}
                    onRow={goPrasales}
                    cols={[
                      { k: "invoice", l: "Invoice" },
                      { k: "marketplace", l: "MP" },
                      { k: "store", l: "Store" },
                      { k: "tanggal", l: "Tanggal" },
                      { k: "total", l: "Total", num: true },
                      { k: "age_days", l: "Umur", age: true },
                    ]}
                  />
                  <AgeTable
                    title="AR Belum Cair Terlama"
                    rows={data.oldest_unpaid}
                    cols={[
                      { k: "invoice", l: "Invoice" },
                      { k: "marketplace", l: "MP" },
                      { k: "store", l: "Store" },
                      { k: "tgl_sampai", l: "Tgl Sampai" },
                      { k: "total", l: "Total AR", num: true },
                      { k: "age_days", l: "Umur", age: true },
                    ]}
                  />
                  <AgeTable
                    title="Paket Belum Sampai (Transit) Terlama"
                    rows={data.oldest_transit}
                    cols={[
                      { k: "invoice", l: "Invoice" },
                      { k: "marketplace", l: "MP" },
                      { k: "store", l: "Store" },
                      { k: "tgl_kirim", l: "Tgl Kirim" },
                      { k: "total", l: "Total", num: true },
                      { k: "age_days", l: "Umur", age: true },
                    ]}
                  />
                  <AgeTable
                    title="Top 10 Artikel"
                    rows={data.top_articles}
                    cols={[
                      { k: "plu", l: "PLU" },
                      { k: "article", l: "Artikel" },
                      { k: "qty", l: "Qty", num: true },
                      { k: "value", l: "Nilai", num: true },
                      { k: "retur_qty", l: "Retur", num: true },
                    ]}
                  />
                </div>
              </>
            ) : loading ? (
              <div className="dgs-hint">Memuat dashboard…</div>
            ) : null}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default DgsDashboardPage;
