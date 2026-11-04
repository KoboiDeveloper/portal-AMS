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
import { getDgsReturDashboard } from "../../../services/dgs/dgs.service";
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
  waiting: "#f4a417",
  received: "#1ca36c",
  mismatch: "#e5484d",
  retur: "#6576ff",
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

const DgsReturDashboardPage = () => {
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
        const res = await getDgsReturDashboard({
          from_date: from,
          to_date: to,
          marketplace: mp,
          ...(refresh ? { refresh: 1 } : {}),
        });
        if (my !== seq.current) return;
        if (!isSuccess(res)) {
          setError(res?.responseMessage || "Gagal memuat dashboard retur");
          return;
        }
        setData(res.data || null);
      } catch (e) {
        if (my === seq.current) setError(errMsg(e, "Gagal memuat dashboard retur"));
      } finally {
        if (my === seq.current) setLoading(false);
      }
    },
    [from, to, mp]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const kr = data?.kpi_retur || {};
  const ageW = useMemo(() => bucketize(data?.aging_waiting), [data]);
  const money = (v) => `Rp ${fmtCompact(v)}`;
  const returRate = pct(kr.retur_qty, kr.sold_qty);

  const dailyChart = useMemo(() => {
    const d = data?.daily_retur || [];
    return {
      labels: d.map((x) => String(x.d).slice(5)),
      datasets: [
        { label: "Menunggu", data: d.map((x) => Number(x.waiting_qty)), backgroundColor: COLORS.waiting, stack: "s" },
        { label: "Diterima", data: d.map((x) => Number(x.received_qty)), backgroundColor: COLORS.received, stack: "s" },
        { label: "Tidak sesuai", data: d.map((x) => Number(x.mismatch_qty)), backgroundColor: COLORS.mismatch, stack: "s" },
      ],
    };
  }, [data]);

  const mpChart = useMemo(() => {
    const d = data?.by_marketplace || [];
    return {
      labels: d.map((x) => x.marketplace),
      datasets: [{ label: "Nilai Retur", data: d.map((x) => Number(x.retur_value)), backgroundColor: COLORS.retur }],
    };
  }, [data]);

  const storeChart = useMemo(() => {
    const d = data?.by_store || [];
    return {
      labels: d.map((x) => x.store),
      datasets: [
        { label: "Menunggu", data: d.map((x) => Number(x.waiting_qty)), backgroundColor: COLORS.waiting, stack: "s" },
        { label: "Diterima", data: d.map((x) => Number(x.received_qty)), backgroundColor: COLORS.received, stack: "s" },
        { label: "Tidak sesuai", data: d.map((x) => Number(x.mismatch_qty)), backgroundColor: COLORS.mismatch, stack: "s" },
      ],
    };
  }, [data]);

  const katChart = useMemo(() => {
    const d = data?.by_kategori || [];
    return {
      labels: d.map((x) => x.kategori),
      datasets: [{ label: "Nilai", data: d.map((x) => Number(x.value)), backgroundColor: "#9aa7ff" }],
    };
  }, [data]);

  const goReturList = (r) => {
    const kw = encodeURIComponent(r.invoice || "");
    navigate(`/dgs/retur-list?kw=${kw}`);
  };
  const goGudang = (r) => {
    const kw = encodeURIComponent(r.invoice || "");
    navigate(`/dgs/retur?kw=${kw}`);
  };

  return (
    <AccessGuard moduleCode="DGS_RETUR_DASH">
      <Head title="Dashboard Retur" />
      <Content>
        <PageSmoothScroll revision={`${loading}-${data?.built_at || ""}`} className="riv-page-scroll">
          <div className="reg-ar-wrap dgs-dash">
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    Dashboard Retur
                  </BlockTitle>
                  <BlockDes className="text-soft">
                    Monitor qty & nilai retur · menunggu barang · konfirmasi gudang
                    {data?.built_at ? <span className="dgs-asof"> · data per {data.built_at}</span> : null}
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
                  <Kpi
                    title="Qty Retur"
                    value={fmtNum(kr.retur_qty)}
                    sub={`${returRate.toFixed(1)}% dari qty sold · ${fmtNum(kr.retur_invoice_count)} invoice`}
                    tone="bad"
                  />
                  <Kpi title="Nilai Retur" value={money(kr.retur_value)} sub={`Sold qty ${fmtNum(kr.sold_qty)}`} />
                  <Kpi
                    title="Menunggu Barang"
                    value={fmtNum(kr.retur_waiting_qty)}
                    sub="Status 9 — belum dikonfirmasi gudang"
                    tone="warn"
                  />
                  <Kpi
                    title="Diterima Gudang"
                    value={fmtNum(kr.retur_received_qty)}
                    sub="Status 2 — barang kembali sesuai"
                    tone="ok"
                  />
                  <Kpi
                    title="Tidak Sesuai"
                    value={fmtNum(kr.retur_mismatch_qty)}
                    sub="Status 8 — mismatch / tidak layak"
                    tone="bad"
                  />
                </div>

                <div className="dgs-grid-2">
                  <div className="dgs-card">
                    <h6>Tren Harian Retur (qty)</h6>
                    <div className="dgs-chart">
                      <Bar
                        data={dailyChart}
                        options={baseOpts({
                          scales: { x: { stacked: true, ticks: { maxTicksLimit: 16 } }, y: { stacked: true, beginAtZero: true } },
                        })}
                      />
                    </div>
                  </div>
                  <div className="dgs-card">
                    <h6>
                      Nilai Retur per Marketplace
                    </h6>
                    <div className="dgs-chart">
                      <Bar
                        data={mpChart}
                        options={baseOpts({
                          scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtCompact(v) } } },
                          plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: (c) => `Rp ${fmtNum(c.parsed.y)}` } },
                          },
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="dgs-grid-2">
                  <div className="dgs-card">
                    <h6>
                      Aging Menunggu Barang <small>sejak tgl retur / transaksi</small>
                    </h6>
                    <div className="dgs-age-bar">
                      {ageW.map((b) => (
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
                      Kategori Gudang <small>hasil konfirmasi</small>
                    </h6>
                    <div className="dgs-chart">
                      <Bar
                        data={katChart}
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
                      Retur per Store <small>20 teratas</small>
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
                      Per Marketplace <small>breakdown status</small>
                    </h6>
                    <div className="dgs-table-wrap">
                      <table className="dgs-table">
                        <thead>
                          <tr>
                            <th>Marketplace</th>
                            <th className="num">Qty</th>
                            <th className="num">Menunggu</th>
                            <th className="num">Diterima</th>
                            <th className="num">Mismatch</th>
                            <th className="num">Nilai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.by_marketplace || []).map((x) => (
                            <tr key={x.marketplace}>
                              <td>{x.marketplace}</td>
                              <td className="num">{fmtNum(x.retur_qty)}</td>
                              <td className="num">{fmtNum(x.waiting_qty)}</td>
                              <td className="num">{fmtNum(x.received_qty)}</td>
                              <td className="num">{fmtNum(x.mismatch_qty)}</td>
                              <td className="num">{fmtNum(x.retur_value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="dgs-grid-2">
                  <AgeTable
                    title="Menunggu Barang Terlama"
                    rows={data.oldest_waiting}
                    onRow={goGudang}
                    cols={[
                      { k: "invoice", l: "Invoice" },
                      { k: "marketplace", l: "MP" },
                      { k: "store", l: "Store" },
                      { k: "plu", l: "PLU" },
                      { k: "qty", l: "Qty", num: true },
                      { k: "age_days", l: "Umur", age: true },
                    ]}
                  />
                  <AgeTable
                    title="Top Artikel Retur"
                    rows={data.top_retur_articles}
                    onRow={goReturList}
                    cols={[
                      { k: "plu", l: "PLU" },
                      { k: "article", l: "Artikel" },
                      { k: "retur_qty", l: "Qty", num: true },
                      { k: "waiting_qty", l: "Menunggu", num: true },
                      { k: "retur_value", l: "Nilai", num: true },
                    ]}
                  />
                </div>
              </>
            ) : loading ? (
              <div className="dgs-hint">Memuat dashboard retur…</div>
            ) : null}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default DgsReturDashboardPage;
