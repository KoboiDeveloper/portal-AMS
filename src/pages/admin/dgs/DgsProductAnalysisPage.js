import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
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
import { exportStyledXlsx } from "../../../lib/exportStyledXlsx";
import { getDgsProductAnalysis } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { addDaysYmd, errMsg, fmtCompact, fmtDec, fmtNum, todayYmd } from "./dgsUtils";
import "../regional/reg-mp-ar-list.css";
import "./dgs.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

const MP_FILTER = [
  { value: "", label: "Semua Marketplace" },
  ...["SHOPEE", "TIKTOK", "TOKOPEDIA", "LAZADA", "ZALORA", "BLIBLI", "BUKALAPAK", "JD.ID", "ZILINGO", "DIRECT SELLING"].map(
    (m) => ({ value: m, label: m })
  ),
];
const LEVEL_OPTS = [
  { value: "artikel", label: "Per Artikel" },
  { value: "plu", label: "Per PLU (size/warna)" },
];

const selectStyles = {
  control: (base) => ({ ...base, minHeight: 38, height: 38, fontSize: "0.8125rem", borderColor: "#dbdfea", borderRadius: 0, background: "#eef2f8" }),
  valueContainer: (base) => ({ ...base, padding: "0 10px", height: 36 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem", borderRadius: 0 }),
};

const FLAG_META = {
  RETUR_TINGGI: { label: "Retur tinggi", tone: "is-bad" },
  MARGIN_TIPIS: { label: "Margin tipis", tone: "is-bad" },
  DISKON_DALAM: { label: "Diskon dalam", tone: "is-warn" },
  NAIK: { label: "Naik", tone: "is-ok" },
  TURUN: { label: "Turun", tone: "is-warn" },
  KOLEKSI_LAMA: { label: "Koleksi lama", tone: "is-new" },
  SATU_MP: { label: "1 marketplace", tone: "is-new" },
};

const COLS = [
  { k: "k", l: "Artikel", sort: "str" },
  { k: "brand", l: "Brand", sort: "str" },
  { k: "tahun", l: "Tahun", sort: "str" },
  { k: "qty", l: "Qty", num: true },
  { k: "prev_qty", l: "Qty Lalu", num: true },
  { k: "growth_pct", l: "Tren", num: true, pct: true, signed: true },
  { k: "value", l: "Nilai", num: true },
  { k: "retur_pct", l: "Retur", num: true, pct: true },
  { k: "margin_pct", l: "Margin", num: true, pct: true },
  { k: "disc_pct", l: "Diskon", num: true, pct: true },
  { k: "share_pct", l: "Share", num: true, pct: true },
  { k: "abc", l: "ABC", sort: "str" },
  { k: "top_mp", l: "MP Utama", sort: "str" },
];

const PAGE_SIZE = 50;

const delta = (cur, prev) => (Number(prev) > 0 ? ((Number(cur) - Number(prev)) / Number(prev)) * 100 : null);
const DeltaText = ({ cur, prev }) => {
  const d = delta(cur, prev);
  if (d == null) return <span className="dgs-asof">tanpa pembanding</span>;
  return (
    <span style={{ color: d >= 0 ? "#0b7a4b" : "#b42318", fontWeight: 600 }}>
      {d >= 0 ? "▲" : "▼"} {fmtDec(Math.abs(d), 1)}% vs periode lalu
    </span>
  );
};

const Kpi = ({ title, value, sub, tone }) => (
  <div className={`dgs-kpi${tone ? ` is-${tone}` : ""}`}>
    <div className="t">{title}</div>
    <div className="v">{value}</div>
    {sub ? <div className="s">{sub}</div> : null}
  </div>
);

const DimBar = ({ title, rows, prevLabel }) => {
  const d = rows || [];
  const data = {
    labels: d.map((x) => x.k),
    datasets: [
      { label: "Periode ini", data: d.map((x) => Number(x.qty)), backgroundColor: "#6576ff" },
      { label: prevLabel, data: d.map((x) => Number(x.prev_qty)), backgroundColor: "#cdd3ff" },
    ],
  };
  return (
    <div className="dgs-card">
      <h6>{title}</h6>
      <div className="dgs-chart dgs-chart--tall">
        <Bar
          data={data}
          options={{
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
          }}
        />
      </div>
    </div>
  );
};

const DgsProductAnalysisPage = () => {
  const [from, setFrom] = useState(addDaysYmd(todayYmd(), -29));
  const [to, setTo] = useState(todayYmd());
  const [mp, setMp] = useState("");
  const [level, setLevel] = useState("artikel");
  const [minQty, setMinQty] = useState("5");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [flag, setFlag] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "qty", dir: "desc" });
  const [page, setPage] = useState(1);
  const seq = useRef(0);

  const load = useCallback(
    async (refresh = false) => {
      if (!from || !to) return;
      const my = ++seq.current;
      setLoading(true);
      setError("");
      try {
        const res = await getDgsProductAnalysis({
          from_date: from,
          to_date: to,
          marketplace: mp,
          level,
          min_qty: Math.max(1, Number(minQty) || 5),
          ...(refresh ? { refresh: 1 } : {}),
        });
        if (my !== seq.current) return;
        if (!isSuccess(res)) {
          setError(res?.responseMessage || "Gagal memuat analisa barang");
          return;
        }
        setData(res.data || null);
        setFlag("");
        setPage(1);
      } catch (e) {
        if (my === seq.current) setError(errMsg(e, "Gagal memuat analisa barang"));
      } finally {
        if (my === seq.current) setLoading(false);
      }
    },
    [from, to, mp, level, minQty]
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, mp, level]);

  const kpi = useMemo(() => data?.kpi || {}, [data]);
  const prevLabel = data ? `${data.prev_from_date?.slice(5)} s/d ${data.prev_to_date?.slice(5)}` : "Periode lalu";

  const rows = useMemo(() => {
    let r = data?.articles || [];
    if (flag) r = r.filter((x) => (x.flags || []).includes(flag));
    const s = q.trim().toLowerCase();
    if (s) {
      r = r.filter((x) =>
        [x.k, x.deskripsi, x.brand, x.cls].some((v) => String(v ?? "").toLowerCase().includes(s))
      );
    }
    const col = COLS.find((c) => c.k === sort.key);
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (col?.sort === "str") return String(av ?? "").localeCompare(String(bv ?? "")) * mul;
      const an = av == null ? -Infinity : Number(av);
      const bn = bv == null ? -Infinity : Number(bv);
      return (an - bn) * mul;
    });
  }, [data, flag, q, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const shown = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const dailyChart = useMemo(() => {
    const d = data?.daily || [];
    return {
      labels: d.map((x) => String(x.d).slice(5)),
      datasets: [
        { label: "Qty terjual", data: d.map((x) => Number(x.qty)), backgroundColor: "#6576ff" },
        { label: "Qty retur", data: d.map((x) => Number(x.retur_qty)), backgroundColor: "#e5484d" },
      ],
    };
  }, [data]);

  const paretoChart = useMemo(() => {
    const c = data?.pareto_curve || [];
    return {
      labels: c.map((x) => `${fmtDec(x.pct_articles, 0)}%`),
      datasets: [
        {
          label: "% kumulatif qty",
          data: c.map((x) => Number(x.pct_qty)),
          borderColor: "#6576ff",
          backgroundColor: "rgba(101,118,255,.15)",
          fill: true,
          tension: 0.25,
          pointRadius: 2,
        },
      ],
    };
  }, [data]);

  const exportExcel = async () => {
    await exportStyledXlsx({
      fileName: `ANALISA_BARANG_${mp || "ALL"}_${from}_${to}.xlsx`,
      sheetName: "Analisa Barang",
      columns: [
        { key: "k", label: "Artikel", width: 18 },
        { key: "deskripsi", label: "Deskripsi", width: 34 },
        { key: "brand", label: "Brand", width: 16 },
        { key: "cls", label: "Class", width: 10 },
        { key: "tahun", label: "Tahun", width: 8 },
        { key: "qty", label: "Qty", width: 9, align: "right" },
        { key: "prev_qty", label: "Qty Periode Lalu", width: 14, align: "right" },
        { key: "growth_pct", label: "Tren %", width: 9, align: "right" },
        { key: "value", label: "Nilai", width: 16, align: "right", numFmt: "#,##0" },
        { key: "retur_pct", label: "Retur %", width: 9, align: "right" },
        { key: "margin_pct", label: "Margin %", width: 10, align: "right" },
        { key: "margin_basis", label: "Dasar Margin", width: 14 },
        { key: "disc_pct", label: "Diskon %", width: 10, align: "right" },
        { key: "share_pct", label: "Share %", width: 9, align: "right" },
        { key: "abc", label: "ABC", width: 6 },
        { key: "top_mp", label: "MP Utama", width: 14 },
        { key: "flags", label: "Catatan", width: 36 },
      ],
      rows: rows.map((r) => ({
        ...r,
        flags: (r.flags || []).map((f) => FLAG_META[f]?.label || f).join(", "),
      })),
    });
  };

  const cell = (c, r) => {
    const v = r[c.k];
    if (c.k === "k") {
      return (
        <>
          <strong>{v}</strong>
          <div className="dgs-asof">{r.deskripsi}</div>
        </>
      );
    }
    if (c.k === "abc") return <span className={`dgs-pill ${v === "A" ? "is-ok" : v === "B" ? "is-new" : ""}`}>{v}</span>;
    if (c.k === "top_mp") return v ? `${v} (${fmtDec(r.top_mp_share, 0)}%)` : "—";
    if (c.num) {
      if (v == null || v === "") return "—";
      if (c.pct) {
        const n = Number(v);
        const txt = `${c.signed && n > 0 ? "+" : ""}${fmtDec(n, 1)}%`;
        if (c.k === "growth_pct") return <span style={{ color: n >= 0 ? "#0b7a4b" : "#b42318" }}>{txt}</span>;
        if (c.k === "retur_pct" && n >= 15) return <span style={{ color: "#b42318", fontWeight: 700 }}>{txt}</span>;
        return txt;
      }
      return fmtNum(v);
    }
    return v === "" || v == null ? "—" : String(v);
  };

  return (
    <AccessGuard moduleCode="DGS_ANALISA_BARANG">
      <Head title="Analisa Barang" />
      <Content>
        <PageSmoothScroll revision={`${loading}-${data?.built_at || ""}-${rows.length}-${safePage}`} className="riv-page-scroll">
          <div className="reg-ar-wrap dgs-dash">
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    Analisa Barang
                  </BlockTitle>
                  <BlockDes className="text-soft">
                    Barang laku per marketplace · retur · margin · tren
                    {data?.built_at ? <span className="dgs-asof"> · data per {data.built_at} (cache 5 menit)</span> : null}
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
              <div className="reg-ar-f-item">
                <label>Level</label>
                <RSelect
                  styles={selectStyles}
                  options={LEVEL_OPTS}
                  value={LEVEL_OPTS.find((o) => o.value === level)}
                  onChange={(o) => setLevel(o?.value || "artikel")}
                />
              </div>
              <div className="reg-ar-f-item" style={{ minWidth: 110, maxWidth: 130 }}>
                <label>Minimal Qty</label>
                <input
                  className="form-control form-control-sm reg-ar-ctl"
                  inputMode="numeric"
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && load(false)}
                />
              </div>
              <button type="button" className="reg-ar-btn" disabled={loading} onClick={() => load(false)}>
                <Icon name="reload" /> {loading ? "Memuat…" : "Terapkan"}
              </button>
            </div>

            {error ? <div className="reg-ar-error">{error}</div> : null}
            {loading && !data ? <div className="dgs-hint">Menganalisa data… (pertama kali bisa 5–10 detik)</div> : null}

            {data ? (
              <>
                <div className="dgs-kpis">
                  <Kpi title="Qty Terjual" value={fmtNum(kpi.qty)} sub={<DeltaText cur={kpi.qty} prev={kpi.prev_qty} />} tone="info" />
                  <Kpi
                    title="Nilai Penjualan"
                    value={`Rp ${fmtCompact(kpi.value)}`}
                    sub={<DeltaText cur={kpi.value} prev={kpi.prev_value} />}
                    tone="info"
                  />
                  <Kpi
                    title={data.level === "plu" ? "PLU Unik" : "Artikel Unik"}
                    value={fmtNum(kpi.articles)}
                    sub={`Periode lalu ${fmtNum(kpi.prev_articles)}`}
                  />
                  <Kpi
                    title="Retur"
                    value={`${fmtDec(kpi.retur_pct, 1)}%`}
                    sub={`${fmtNum(kpi.retur_qty)} pcs`}
                    tone={Number(kpi.retur_pct) >= 10 ? "bad" : "ok"}
                  />
                  <Kpi
                    title="Margin (setelah komisi)"
                    value={kpi.margin_real_pct == null ? "—" : `${fmtDec(kpi.margin_real_pct, 1)}%`}
                    sub={`Harga master: ${kpi.margin_master_pct == null ? "—" : `${fmtDec(kpi.margin_master_pct, 1)}%`}`}
                    tone="ok"
                  />
                  <Kpi
                    title="Selisih Harga Realisasi"
                    value={kpi.disc_pct == null ? "—" : `${fmtDec(kpi.disc_pct, 1)}%`}
                    sub="di bawah harga master (negatif = di atas)"
                    tone="warn"
                  />
                  <Kpi
                    title="Cakupan Data AR"
                    value={`${fmtDec(kpi.ar_coverage_pct, 1)}%`}
                    sub="baris yang AR-nya sudah diinput"
                    tone={Number(kpi.ar_coverage_pct) < 50 ? "warn" : "ok"}
                  />
                  <Kpi
                    title="Pareto (ABC)"
                    value={`${fmtNum(kpi.abc_a)} A`}
                    sub={`${fmtNum(kpi.abc_a)} artikel = 80% qty · B ${fmtNum(kpi.abc_b)} · C ${fmtNum(kpi.abc_c)}`}
                  />
                </div>

                <div className="dgs-card" style={{ marginBottom: 12 }}>
                  <h6>
                    Perlu Tindakan <small>klik kartu untuk menyaring tabel di bawah</small>
                  </h6>
                  <div className="dgs-actions-grid">
                    {(data.cards || []).map((c) => (
                      <button
                        type="button"
                        key={c.key}
                        className={`dgs-insight${flag === c.key ? " is-active" : ""}${Number(c.count) === 0 ? " is-empty" : ""}`}
                        onClick={() => {
                          setFlag(flag === c.key ? "" : c.key);
                          setPage(1);
                        }}
                      >
                        <div className="top">
                          <span className={`dgs-pill ${FLAG_META[c.key]?.tone || ""}`}>{c.title}</span>
                          <strong>{fmtNum(c.count)}</strong>
                        </div>
                        <div className="rule">{c.rule}</div>
                        <div className="act">{c.action}</div>
                        <div className="qty">{fmtNum(c.qty)} pcs terdampak</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dgs-grid-2">
                  <div className="dgs-card">
                    <h6>Tren Harian</h6>
                    <div className="dgs-chart">
                      <Bar
                        data={dailyChart}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
                          scales: { x: { ticks: { maxTicksLimit: 16 } }, y: { beginAtZero: true } },
                        }}
                      />
                    </div>
                  </div>
                  <div className="dgs-card">
                    <h6>
                      Kurva Pareto <small>% artikel (terlaris dulu) vs % qty kumulatif</small>
                    </h6>
                    <div className="dgs-chart">
                      <Line
                        data={paretoChart}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: { y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } } },
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="dgs-grid-2">
                  <div className="dgs-card">
                    <h6>Per Marketplace</h6>
                    <div className="dgs-table-wrap">
                      <table className="dgs-table">
                        <thead>
                          <tr>
                            <th>Marketplace</th>
                            <th className="num">Qty</th>
                            <th className="num">Tren</th>
                            <th className="num">Nilai</th>
                            <th className="num">Retur</th>
                            <th className="num">Artikel</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.by_mp || []).map((x) => {
                            const d = delta(x.qty, x.prev_qty);
                            return (
                              <tr key={x.k}>
                                <td>{x.k}</td>
                                <td className="num">{fmtNum(x.qty)}</td>
                                <td className="num" style={{ color: d == null ? undefined : d >= 0 ? "#0b7a4b" : "#b42318" }}>
                                  {d == null ? "—" : `${d >= 0 ? "+" : ""}${fmtDec(d, 1)}%`}
                                </td>
                                <td className="num">{fmtNum(x.value)}</td>
                                <td className="num">{fmtDec((Number(x.retur_qty) / Math.max(Number(x.qty), 1)) * 100, 1)}%</td>
                                <td className="num">{fmtNum(x.articles)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="dgs-card">
                    <h6>Alasan Retur Gudang</h6>
                    <div className="dgs-table-wrap">
                      <table className="dgs-table">
                        <thead>
                          <tr>
                            <th>Kategori</th>
                            <th className="num">Qty</th>
                            <th className="num">% dari retur</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.retur_reason || []).length === 0 ? (
                            <tr>
                              <td colSpan={3} className="dgs-empty">
                                Tidak ada retur
                              </td>
                            </tr>
                          ) : (
                            data.retur_reason.map((x) => (
                              <tr key={x.k}>
                                <td>{x.k}</td>
                                <td className="num">{fmtNum(x.qty)}</td>
                                <td className="num">{fmtDec((Number(x.qty) / Math.max(Number(kpi.retur_qty), 1)) * 100, 1)}%</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {!mp && (data.matrix || []).length > 0 ? (
                  <div className="dgs-card" style={{ marginBottom: 12 }}>
                    <h6>
                      Top 15 Artikel x Marketplace <small>qty terjual per marketplace</small>
                    </h6>
                    <div className="dgs-table-wrap">
                      <table className="dgs-table">
                        <thead>
                          <tr>
                            <th>Artikel</th>
                            {(data.mp_list || []).map((m) => (
                              <th key={m} className="num">
                                {m}
                              </th>
                            ))}
                            <th className="num">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.matrix.map((x) => (
                            <tr key={x.k}>
                              <td>
                                <strong>{x.k}</strong>
                                <div className="dgs-asof">{x.deskripsi}</div>
                              </td>
                              {(data.mp_list || []).map((m) => (
                                <td key={m} className="num">
                                  {x.by_mp?.[m] ? fmtNum(x.by_mp[m]) : <span className="dgs-asof">0</span>}
                                </td>
                              ))}
                              <td className="num">
                                <strong>{fmtNum(x.qty)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <div className="dgs-grid-2">
                  <DimBar title="Per Brand (qty)" rows={data.by_brand} prevLabel={prevLabel} />
                  <DimBar title="Per Dept / Class (qty)" rows={data.by_class} prevLabel={prevLabel} />
                  <DimBar title="Per Warna (qty)" rows={data.by_warna} prevLabel={prevLabel} />
                  <DimBar title="Per Ukuran / Size Curve (qty)" rows={data.by_ukuran} prevLabel={prevLabel} />
                  <DimBar title="Per Tahun Koleksi (qty)" rows={data.by_tahun} prevLabel={prevLabel} />
                </div>

                <div className="dgs-card">
                  <h6>
                    Daftar {data.level === "plu" ? "PLU" : "Artikel"}
                    <small>
                      {fmtNum(rows.length)} dari {fmtNum(data.articles_total)} tampil
                      {flag ? ` · filter: ${FLAG_META[flag]?.label}` : ""}
                    </small>
                  </h6>
                  <div className="dgs-filters" style={{ marginBottom: 8 }}>
                    <div className="reg-ar-f-item" style={{ minWidth: 260 }}>
                      <input
                        className="form-control form-control-sm reg-ar-ctl"
                        placeholder="Cari artikel / deskripsi / brand"
                        value={q}
                        onChange={(e) => {
                          setQ(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                    {flag ? (
                      <button type="button" className="reg-ar-btn reg-ar-btn--ghost" onClick={() => setFlag("")}>
                        Hapus filter
                      </button>
                    ) : null}
                    <span className="dgs-spacer" />
                    <button type="button" className="reg-ar-btn reg-ar-btn--ghost" disabled={!rows.length} onClick={exportExcel}>
                      <Icon name="download" /> Excel
                    </button>
                  </div>
                  <div className="dgs-table-wrap" style={{ maxHeight: "none" }}>
                    <table className="dgs-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          {COLS.map((c) => (
                            <th
                              key={c.k}
                              className={c.num ? "num dgs-th-sort" : "dgs-th-sort"}
                              onClick={() => toggleSort(c.k)}
                              title="Klik untuk urutkan"
                            >
                              {c.l}
                              {sort.key === c.k ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                            </th>
                          ))}
                          <th>Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.length === 0 ? (
                          <tr>
                            <td colSpan={COLS.length + 2} className="dgs-empty">
                              Tidak ada data.
                            </td>
                          </tr>
                        ) : (
                          shown.map((r, i) => (
                            <tr key={r.k}>
                              <td>{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                              {COLS.map((c) => (
                                <td key={c.k} className={c.num ? "num" : undefined}>
                                  {cell(c, r)}
                                </td>
                              ))}
                              <td>
                                {(r.flags || []).map((f) => (
                                  <span
                                    key={f}
                                    className={`dgs-pill ${FLAG_META[f]?.tone || ""}`}
                                    style={{ marginRight: 4 }}
                                    title={(data.cards || []).find((c) => c.key === f)?.action}
                                  >
                                    {FLAG_META[f]?.label || f}
                                  </span>
                                ))}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > PAGE_SIZE ? (
                    <div className="reg-ar-pager">
                      <span className="reg-ar-pager-info">
                        Halaman {safePage} / {totalPages}
                      </span>
                      <div className="reg-ar-pager-btns">
                        <button type="button" className="reg-ar-pager-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                          Sebelumnya
                        </button>
                        <button
                          type="button"
                          className="reg-ar-pager-btn"
                          disabled={safePage >= totalPages}
                          onClick={() => setPage(safePage + 1)}
                        >
                          Berikutnya
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="dgs-hint" style={{ marginTop: 8 }}>
                    Margin dihitung dari harga realisasi AR (setelah komisi) bila sudah ada minimal 3 baris AR, selain itu dari harga master
                    dikurangi HPP. Transaksi yang ditolak tidak dihitung.
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default DgsProductAnalysisPage;
