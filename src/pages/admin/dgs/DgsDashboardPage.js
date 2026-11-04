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
import { Icon, RSelect } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { getDgsDashboard } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { errMsg, fmtCompact, fmtNum, monthStartYmd, pct, todayYmd } from "./dgsUtils";
import {
  ScAttentionBar,
  ScBtn,
  ScCard,
  ScDashboardSkeleton,
  ScEmptyState,
  ScError,
  ScPageHeader,
} from "./sc";
import DgsContentShell from "./shell/DgsContentShell";
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
  control: (base) => ({
    ...base,
    minHeight: 34,
    height: 34,
    fontSize: "0.8125rem",
    borderColor: "var(--sc-border, #e3e5e7)",
    borderRadius: 4,
    background: "#fff",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px", height: 32 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 32 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem", borderRadius: 6 }),
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
  pending: "#e39a20",
  approved: "#159d79",
  rejected: "#dc4c57",
  gt: "#0f2e57",
  mp: "#3d84c9",
};

const baseOpts = (extra = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
  ...extra,
});

const AgeTable = ({ title, rows, cols, onRow }) => (
  <ScCard title={title} hint={`${rows?.length || 0} teratas`}>
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
  </ScCard>
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
    datasets: [{ label: "Nominal", data: feeRows.map((x) => x.v), backgroundColor: "#0f2e57" }],
  };

  const money = (v) => `Rp ${fmtCompact(v)}`;
  const approvalRate = pct(kp.approved, kp.total);
  const returRate = pct(kr.retur_qty, kr.sold_qty);
  const mismatchTotal = (data?.by_marketplace || []).reduce((s, x) => s + Number(x.mismatch_count || 0), 0);

  const goPrasales = (r) => navigate(`/dgs/prasales?kw=${encodeURIComponent(r.invoice || "")}`);

  const attentionItems = useMemo(
    () => [
      {
        id: "pending",
        label: "Pesanan perlu confirm",
        value: fmtNum(kp.pending),
        sub: Number(kp.pending) > 0 ? `Mendesak: ${fmtNum(kp.pending)}` : null,
        tone: Number(kp.pending) > 0 ? "warn" : "ok",
        onClick: () => navigate("/dgs/prasales?status=0"),
      },
      {
        id: "ar-unpaid",
        label: "AR belum cair",
        value: fmtNum(ka.unpaid),
        tone: Number(ka.unpaid) > 0 ? "warn" : "ok",
        onClick: () => navigate("/dgs/ar-list"),
      },
      {
        id: "retur-wait",
        label: "Pengembalian tertunda",
        value: fmtNum(kr.retur_waiting_qty),
        tone: Number(kr.retur_waiting_qty) > 0 ? "warn" : "ok",
        onClick: () => navigate("/dgs/retur-list"),
      },
      {
        id: "rejected",
        label: "Prasales ditolak",
        value: fmtNum(kp.rejected),
        tone: Number(kp.rejected) > 0 ? "bad" : "ok",
        onClick: () => navigate("/dgs/prasales?status=2"),
      },
      {
        id: "mismatch",
        label: "Selisih POS vs MP",
        value: fmtNum(mismatchTotal),
        tone: mismatchTotal ? "bad" : "ok",
        onClick: () => navigate("/dgs/retur-dashboard"),
      },
    ],
    [navigate, kp.pending, kp.rejected, ka.unpaid, kr.retur_waiting_qty, mismatchTotal]
  );

  return (
    <AccessGuard moduleCode="DGS_DASH">
      <Head title="Ringkasan Marketplace" />
      <Content>
        <PageSmoothScroll revision={`${loading}-${data?.built_at || ""}`} className="riv-page-scroll">
          <DgsContentShell>
          <div className="reg-ar-wrap dgs-dash sc-scope">
            <div className="sc-welcome">
              <div>
                <h2 className="sc-welcome__title">Digital Sales</h2>
                <p className="sc-welcome__sub">
                  Ringkasan prasales, AR, dan retur marketplace
                  {data?.built_at ? ` · data per ${data.built_at}` : ""}
                </p>
              </div>
              <ScBtn variant="soft" className="sc-welcome__btn" disabled={loading} onClick={() => load(true)}>
                <Icon name="reload" /> {loading ? "Memuat…" : "Refresh"}
              </ScBtn>
            </div>

            <ScPageHeader
              title="Beranda"
              description="Performa & yang perlu ditindaklanjuti"
            />

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
              <ScBtn disabled={loading} onClick={() => load(true)}>
                <Icon name="reload" /> {loading ? "Memuat…" : "Terapkan"}
              </ScBtn>
            </div>

            {error ? <ScError message={error} onRetry={() => load(true)} /> : null}

            {data ? (
              <>
                <section className="sc-section">
                  <div className="sc-section__head">
                    <h2 className="sc-section__title">Perlu ditindaklanjuti</h2>
                  </div>
                  <ScAttentionBar items={attentionItems} />
                </section>

                <section className="sc-panel sc-panel--metrics">
                  <div className="sc-section__head sc-panel__head">
                    <h2 className="sc-section__title">Tinjau performa toko Anda</h2>
                    <span className="sc-section__meta">
                      Approved {approvalRate.toFixed(1)}% · Retur {returRate.toFixed(1)}% qty · Total AR {money(ka.total_ar)}
                    </span>
                  </div>
                  <ScAttentionBar
                    className="sc-attn--inpanel"
                    items={[
                      { id: "ps", label: "Prasales", value: fmtNum(kp.total), onClick: () => navigate("/dgs/prasales") },
                      { id: "ap", label: "Approved", value: fmtNum(kp.approved), tone: "ok", onClick: () => navigate("/dgs/prasales?status=1") },
                      { id: "ar", label: "AR transit", value: fmtNum(ka.in_transit), onClick: () => navigate("/dgs/ar-list") },
                      { id: "paid", label: "AR sudah cair", value: fmtNum(ka.paid), tone: "ok", onClick: () => navigate("/dgs/ar-list") },
                      { id: "rt", label: "Qty retur", value: fmtNum(kr.retur_qty), tone: "bad", onClick: () => navigate("/dgs/retur-list") },
                    ]}
                  />
                </section>

                <div className="dgs-grid-2">
                  <ScCard title="Tren Harian Prasales">
                    <div className="dgs-chart">
                      <Bar
                        data={dailyChart}
                        options={baseOpts({ scales: { x: { stacked: true, ticks: { maxTicksLimit: 16 } }, y: { stacked: true, beginAtZero: true } } })}
                      />
                    </div>
                  </ScCard>
                  <ScCard title="Nilai per Marketplace" hint="POS vs MP">
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
                  </ScCard>
                </div>

                <div className="dgs-grid-2">
                  <ScCard title="Aging Pending Confirm" hint="sejak tanggal transaksi">
                    <div className="dgs-age-bar">
                      {ageP.map((b) => (
                        <div key={b.label} className={`dgs-age-cell${b.late && b.c ? " is-late" : ""}`}>
                          <div className="t">{b.label}</div>
                          <div className="v">{fmtNum(b.c)}</div>
                          <div className="s">{money(b.v)}</div>
                        </div>
                      ))}
                    </div>
                    <h6 className="sc-card__title mt-3">
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
                  </ScCard>
                  <ScCard title="Biaya & Potongan AR" hint="total periode">
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
                  </ScCard>
                </div>

                <div className="dgs-grid-2">
                  <ScCard title="Prasales per Store" hint="20 teratas">
                    <div className="dgs-chart dgs-chart--tall">
                      <Bar
                        data={storeChart}
                        options={baseOpts({ indexAxis: "y", scales: { x: { stacked: true }, y: { stacked: true } } })}
                      />
                    </div>
                  </ScCard>
                  <ScCard title="Per Marketplace" hint="status & selisih">
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
                  </ScCard>
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
              <ScDashboardSkeleton />
            ) : error ? null : (
              <ScEmptyState
                icon="growth"
                title="Belum ada data ringkasan"
                hint="Atur periode transaksi dan marketplace, lalu klik Terapkan."
                action={
                  <ScBtn onClick={() => load(false)}>
                    Muat dashboard
                  </ScBtn>
                }
              />
            )}
          </div>
          </DgsContentShell>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default DgsDashboardPage;
