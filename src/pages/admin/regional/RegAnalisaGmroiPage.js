import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
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
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import api from "../../../lib/api";
import { isSuccess } from "../../../lib/response";
import { loadGmroiCache, saveGmroiCache } from "../../../lib/gmroiCache";
import {
  agingLabel,
  aggregateArticles,
  buildArticleMetrics,
  classNettoRanking,
  compact,
  evaluationDue,
  filterGmroiRows,
  fmt,
  fmt1,
  formatDateID,
  monthlyTrend,
  treatmentStatus,
  uniqValues,
} from "../../../lib/gmroiLogic";
import "./reg-analisa-gmroi.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const emptyFilters = () => ({
  TOKO: "",
  CLASS: "",
  TAGLINE: "",
  KAT: "",
  THEMA: "",
  treatment: "",
  sellThrough: "",
  q: "",
});

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, color: "#8094ae" }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { font: { size: 10 }, color: "#8094ae" }, grid: { color: "#eef2f7" } },
  },
};

const RegAnalisaGmroiPage = () => {
  const [rows, setRows] = useState([]);
  const [pictures, setPictures] = useState({});
  const [meta, setMeta] = useState({ refreshedAt: "", cachedAt: "", totalArts: 0, artsWithPictures: 0 });
  const [filters, setFilters] = useState(emptyFilters);
  const [view, setView] = useState("PLU"); // PLU | ART
  const [loadingCache, setLoadingCache] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const artMetrics = useMemo(() => buildArticleMetrics(rows), [rows]);
  const filtered = useMemo(
    () => filterGmroiRows(rows, artMetrics, filters),
    [rows, artMetrics, filters]
  );

  const applySnapshot = useCallback((snap) => {
    if (!snap) return;
    setRows(Array.isArray(snap.rows) ? snap.rows : []);
    setPictures(snap.pictures && typeof snap.pictures === "object" ? snap.pictures : {});
    setMeta({
      refreshedAt: snap.refreshedAt || "",
      cachedAt: snap.cachedAt || "",
      totalArts: Number(snap.totalArts) || 0,
      artsWithPictures: Number(snap.artsWithPictures) || 0,
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingCache(true);
      try {
        const cached = await loadGmroiCache();
        if (alive && cached) {
          applySnapshot(cached);
          setMsg("Menampilkan data dari cache browser");
        }
      } catch (e) {
        if (alive) setError(e?.message || "Gagal baca cache");
      } finally {
        if (alive) setLoadingCache(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [applySnapshot]);

  const onSync = async () => {
    setSyncing(true);
    setError("");
    setMsg("");
    try {
      const res = await api.get("/regional/analist/gmroi/sync");
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Sync gagal");
        return;
      }
      const data = res.data || {};
      const snap = await saveGmroiCache(data);
      applySnapshot(snap);
      setMsg(
        `Sync OK · ${fmt(data.rowCount || (data.rows || []).length)} baris · ` +
          `${fmt(data.artsWithPictures || 0)}/${fmt(data.totalArts || 0)} ART berfoto`
      );
    } catch (e) {
      setError(e?.responseMessage || e?.message || "Sync gagal");
    } finally {
      setSyncing(false);
    }
  };

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const kpis = useMemo(() => {
    const inn = filtered.reduce((s, r) => s + (Number(r.IN) || 0), 0);
    const out = filtered.reduce((s, r) => s + (Number(r.OUT) || 0), 0);
    const stock = filtered.reduce((s, r) => s + (Number(r.STOCK) || 0), 0);
    const hpp = filtered.reduce((s, r) => s + (Number(r.HPP) || 0), 0);
    const netto = filtered.reduce((s, r) => s + (Number(r.NETTO) || 0), 0);
    const arts = new Set(filtered.map((r) => String(r.ART || "").trim()).filter(Boolean)).size;
    return {
      arts,
      inn,
      out,
      stock,
      st: inn ? (out / inn) * 100 : 0,
      netto,
      recovery: hpp ? netto / hpp : 0,
    };
  }, [filtered]);

  const trend = useMemo(() => monthlyTrend(filtered), [filtered]);
  const ranking = useMemo(() => classNettoRanking(filtered), [filtered]);
  const topBest = ranking.slice(0, 8);
  const topWorst = [...ranking].reverse().slice(0, 8).reverse();

  const lineData = useMemo(
    () => ({
      labels: trend.map((t) => t.month),
      datasets: [
        {
          label: "Barang Masuk",
          data: trend.map((t) => t.IN),
          borderColor: "#2f6df6",
          backgroundColor: "rgba(47,109,246,.12)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Barang Terjual",
          data: trend.map((t) => t.OUT),
          borderColor: "#e5484d",
          backgroundColor: "rgba(229,72,77,.08)",
          tension: 0.3,
          fill: true,
        },
      ],
    }),
    [trend]
  );

  const barBest = useMemo(
    () => ({
      labels: topBest.map((x) => x[0]),
      datasets: [
        {
          label: "Netto",
          data: topBest.map((x) => x[1]),
          backgroundColor: "#2f6df6aa",
          borderRadius: 8,
          maxBarThickness: 28,
        },
      ],
    }),
    [topBest]
  );

  const barWorst = useMemo(
    () => ({
      labels: topWorst.map((x) => x[0]),
      datasets: [
        {
          label: "Netto",
          data: topWorst.map((x) => x[1]),
          backgroundColor: "#e5484daa",
          borderRadius: 8,
          maxBarThickness: 28,
        },
      ],
    }),
    [topWorst]
  );

  const tableRows = useMemo(() => {
    if (view === "ART") return aggregateArticles(filtered, artMetrics).slice(0, 500);
    return filtered.slice(0, 500);
  }, [view, filtered, artMetrics]);

  const opts = useMemo(
    () => ({
      toko: uniqValues(rows, "TOKO"),
      className: uniqValues(rows, "CLASS"),
      tagline: uniqValues(rows, "TAGLINE"),
      kat: uniqValues(rows, "KAT"),
      thema: uniqValues(rows, "THEMA"),
    }),
    [rows]
  );

  const statusBadge = (r) => {
    const t = treatmentStatus(r, artMetrics);
    const cls = t === "Balik Modal" ? "good" : t === "Masa Evaluasi" ? "warn" : "bad";
    return <span className={`gmroi-badge ${cls}`}>{t}</span>;
  };

  const fmtWhen = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  };

  const exportCsv = () => {
    const headers =
      view === "PLU"
        ? [
            "ART",
            "PLU",
            "TOKO",
            "CLASS",
            "TAGLINE",
            "KAT",
            "THEMA",
            "IN",
            "OUT",
            "STOCK",
            "HPP",
            "NETTO",
            "SELL_THROUGH_ART",
            "RECOVERY_ART",
            "STATUS",
            "AGING",
            "BATAS_EVALUASI",
          ]
        : [
            "ART",
            "TOKO",
            "CLASS",
            "TAGLINE",
            "KAT",
            "THEMA",
            "IN",
            "OUT",
            "STOCK",
            "HPP",
            "NETTO",
            "SELL_THROUGH",
            "RECOVERY",
            "STATUS",
            "AGING",
            "BATAS_EVALUASI",
          ];
    const lines = [headers.join(",")];
    tableRows.forEach((r) => {
      const m = artMetrics[String(r.ART || "").trim()] || r;
      const vals =
        view === "PLU"
          ? [
              r.ART,
              r.PLU,
              r.TOKO,
              r.CLASS,
              r.TAGLINE,
              r.KAT,
              r.THEMA,
              r.IN,
              r.OUT,
              r.STOCK,
              r.HPP,
              r.NETTO,
              m.SELL_THROUGH,
              m.RECOVERY,
              treatmentStatus(r, artMetrics),
              agingLabel(r, artMetrics),
              formatDateID(evaluationDue(r, artMetrics)),
            ]
          : [
              r.ART,
              r.TOKO,
              r.CLASS,
              r.TAGLINE,
              r.KAT,
              r.THEMA,
              r.IN,
              r.OUT,
              r.STOCK,
              r.HPP,
              r.NETTO,
              r.SELL_THROUGH,
              r.RECOVERY,
              treatmentStatus(r, artMetrics),
              agingLabel(r, artMetrics),
              formatDateID(evaluationDue(r, artMetrics)),
            ];
      lines.push(
        vals
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gmroi_${view.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const scrollRevision = `${rows.length}-${filtered.length}-${view}-${loadingCache ? "c" : "r"}`;

  return (
    <AccessGuard moduleCode="REG_ANALIST_GMROI">
      <Head title="Analisa GMROI" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll gmroi-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Analisa GMROI
                </BlockTitle>
                <BlockDes className="text-soft">Analist · Dashboard · cache browser + sync manual</BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <div className="gmroi-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={onSync}
                    disabled={syncing}
                    title="Ambil ulang dari Google Sheet (sekali, lalu disimpan di browser)"
                  >
                    <Icon name="reload" />
                    <span>{syncing ? "Sync..." : "Sync dari Sheet"}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => setFilters(emptyFilters())}
                  >
                    Reset Filter
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={exportCsv}
                    disabled={!tableRows.length}
                  >
                    <Icon name="download" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="gmroi-meta mb-2">
              <div className="gmroi-chip">
                Sync sheet: <b>{fmtWhen(meta.refreshedAt)}</b>
              </div>
              <div className="gmroi-chip">
                Cache browser: <b>{fmtWhen(meta.cachedAt)}</b>
              </div>
              <div className="gmroi-chip">
                Foto ART:{" "}
                <b>
                  {fmt(meta.artsWithPictures)}/{fmt(meta.totalArts)}
                </b>
              </div>
            </div>

            {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
            {msg ? <div className="rrd-msg ok mb-2">{msg}</div> : null}
            {loadingCache ? <div className="text-soft small mb-2">Memuat cache...</div> : null}
            {!loadingCache && !rows.length ? (
              <div className="gmroi-empty card card-bordered">
                Belum ada data di cache. Klik <b>Sync dari Sheet</b> untuk ambil dari Google Spreadsheet.
              </div>
            ) : null}

            {rows.length ? (
              <>
                <div className="gmroi-filters">
                  {[
                    ["TOKO", "TOKO", opts.toko],
                    ["CLASS", "CLASS", opts.className],
                    ["TAGLINE", "TAGLINE", opts.tagline],
                    ["KAT", "KAT", opts.kat],
                    ["THEMA", "THEMA", opts.thema],
                  ].map(([label, key, list]) => (
                    <div key={key}>
                      <label>{label}</label>
                      <select
                        className="form-select form-select-sm"
                        value={filters[key]}
                        onChange={(e) => setFilter(key, e.target.value)}
                      >
                        <option value="">Semua</option>
                        {list.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label>TREATMENT</label>
                    <select
                      className="form-select form-select-sm"
                      value={filters.treatment}
                      onChange={(e) => setFilter("treatment", e.target.value)}
                    >
                      <option value="">Semua</option>
                      <option value="Balik Modal">Balik Modal</option>
                      <option value="Masa Evaluasi">Masa Evaluasi</option>
                      <option value="Treatment">Treatment</option>
                    </select>
                  </div>
                  <div>
                    <label>SELL THROUGH</label>
                    <select
                      className="form-select form-select-sm"
                      value={filters.sellThrough}
                      onChange={(e) => setFilter("sellThrough", e.target.value)}
                    >
                      <option value="">Semua</option>
                      <option value="lt30">&lt; 30%</option>
                      <option value="30to50">30% – &lt; 50%</option>
                      <option value="50to70">50% – &lt; 70%</option>
                      <option value="gte70">≥ 70%</option>
                    </select>
                  </div>
                </div>

                <div className="gmroi-kpis">
                  <div className="gmroi-kpi">
                    <div className="t">Jumlah ART</div>
                    <div className="v">{fmt(kpis.arts)}</div>
                  </div>
                  <div className="gmroi-kpi">
                    <div className="t">Barang Masuk</div>
                    <div className="v">{compact(kpis.inn)} Pcs</div>
                  </div>
                  <div className="gmroi-kpi">
                    <div className="t">Barang Terjual</div>
                    <div className="v">{compact(kpis.out)} Pcs</div>
                  </div>
                  <div className="gmroi-kpi">
                    <div className="t">Stok Tersisa</div>
                    <div className="v">{compact(kpis.stock)} Pcs</div>
                  </div>
                  <div className="gmroi-kpi">
                    <div className="t">Sell-Through</div>
                    <div className="v">{fmt1(kpis.st)}%</div>
                  </div>
                  <div className="gmroi-kpi">
                    <div className="t">Total Revenue</div>
                    <div className="v">IDR {compact(kpis.netto)}</div>
                  </div>
                  <div className="gmroi-kpi">
                    <div className="t">Recovery</div>
                    <div className="v">{fmt1(kpis.recovery)}x</div>
                  </div>
                </div>

                <div className="gmroi-charts">
                  <div className="gmroi-card">
                    <h6>Tren Bulanan</h6>
                    <p>Barang masuk vs terjual</p>
                    <div className="gmroi-chart-box">
                      <Line data={lineData} options={chartOpts} />
                    </div>
                  </div>
                  <div className="gmroi-card">
                    <h6>Top Class Terbaik</h6>
                    <p>Penjualan netto terbesar</p>
                    <div className="gmroi-chart-box">
                      <Bar
                        data={barBest}
                        options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } }, indexAxis: "y" }}
                      />
                    </div>
                  </div>
                  <div className="gmroi-card">
                    <h6>Top Class Terendah</h6>
                    <p>Penjualan netto terendah</p>
                    <div className="gmroi-chart-box">
                      <Bar
                        data={barWorst}
                        options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } }, indexAxis: "y" }}
                      />
                    </div>
                  </div>
                </div>

                <div className="gmroi-card gmroi-table-card">
                  <div className="gmroi-table-toolbar">
                    <div>
                      <h6>{view === "PLU" ? "Detail Revenue per PLU" : "Ringkasan Revenue per ART"}</h6>
                      <p>
                        {view === "PLU"
                          ? `${fmt(filtered.length)} PLU · tampil max 500`
                          : `${fmt(tableRows.length)} ART · tampil max 500`}
                        {filters.treatment ? ` · Status: ${filters.treatment}` : ""}
                      </p>
                    </div>
                    <div className="gmroi-actions">
                      <button
                        type="button"
                        className={`btn btn-sm ${view === "PLU" ? "btn-primary" : "btn-outline-light"}`}
                        onClick={() => setView("PLU")}
                      >
                        Detail PLU
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${view === "ART" ? "btn-primary" : "btn-outline-light"}`}
                        onClick={() => setView("ART")}
                      >
                        Ringkasan ART
                      </button>
                      <input
                        className="form-control form-control-sm"
                        style={{ width: 220 }}
                        placeholder="Cari ART, PLU, toko, class..."
                        value={filters.q}
                        onChange={(e) => setFilter("q", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="gmroi-table-scroll">
                    <table className={`gmroi-table ${view === "ART" ? "art" : ""}`}>
                      <thead>
                        {view === "PLU" ? (
                          <tr>
                            <th>ART</th>
                            <th>PLU</th>
                            <th>TOKO</th>
                            <th>CLASS</th>
                            <th>IN</th>
                            <th>OUT</th>
                            <th>STOCK</th>
                            <th>ACH</th>
                            <th>HPP</th>
                            <th>REVENUE</th>
                            <th>ST ART</th>
                            <th>REC ART</th>
                            <th>STATUS</th>
                            <th>AGING</th>
                            <th>BATAS EVAL</th>
                          </tr>
                        ) : (
                          <tr>
                            <th>ART</th>
                            <th>TOKO</th>
                            <th>CLASS</th>
                            <th>IN</th>
                            <th>OUT</th>
                            <th>STOCK</th>
                            <th>ACH</th>
                            <th>HPP</th>
                            <th>REVENUE</th>
                            <th>ST</th>
                            <th>REC</th>
                            <th>STATUS</th>
                            <th>AGING</th>
                            <th>BATAS EVAL</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {!tableRows.length ? (
                          <tr>
                            <td colSpan={15} className="gmroi-empty">
                              Tidak ada data sesuai filter
                            </td>
                          </tr>
                        ) : view === "PLU" ? (
                          tableRows.map((r, i) => {
                            const m = artMetrics[String(r.ART || "").trim()] || r;
                            const photo = pictures[r.ART];
                            return (
                              <tr key={`${r.PLU}-${i}`}>
                                <td>
                                  <span className="gmroi-art" title={photo ? "Ada foto" : "Tanpa foto"}>
                                    {r.ART}
                                  </span>
                                </td>
                                <td>{r.PLU}</td>
                                <td>{r.TOKO}</td>
                                <td>{r.CLASS}</td>
                                <td>{fmt(r.IN)}</td>
                                <td>{fmt(r.OUT)}</td>
                                <td>{fmt(r.STOCK)}</td>
                                <td>{fmt1(r.IN ? (r.OUT / r.IN) * 100 : 0)}%</td>
                                <td>{fmt(r.HPP)}</td>
                                <td>{fmt(r.NETTO)}</td>
                                <td>{fmt1(m.SELL_THROUGH)}%</td>
                                <td>{fmt1(m.RECOVERY)}x</td>
                                <td>{statusBadge(r)}</td>
                                <td>{agingLabel(r, artMetrics)}</td>
                                <td>{formatDateID(evaluationDue(r, artMetrics))}</td>
                              </tr>
                            );
                          })
                        ) : (
                          tableRows.map((r) => (
                            <tr key={r.ART}>
                              <td>
                                <span className="gmroi-art">{r.ART}</span>
                              </td>
                              <td>{r.TOKO}</td>
                              <td>{r.CLASS}</td>
                              <td>{fmt(r.IN)}</td>
                              <td>{fmt(r.OUT)}</td>
                              <td>{fmt(r.STOCK)}</td>
                              <td>{fmt1(r.IN ? (r.OUT / r.IN) * 100 : 0)}%</td>
                              <td>{fmt(r.HPP)}</td>
                              <td>{fmt(r.NETTO)}</td>
                              <td>{fmt1(r.SELL_THROUGH)}%</td>
                              <td>{fmt1(r.RECOVERY)}x</td>
                              <td>{statusBadge(r)}</td>
                              <td>{agingLabel(r, artMetrics)}</td>
                              <td>{formatDateID(evaluationDue(r, artMetrics))}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="gmroi-note">
                    <b>Logika evaluasi per ART:</b> Recovery ≥ 1,00x = Balik Modal. Belum 1,00x dan &lt; 3 bulan = Masa
                    Evaluasi. Lewat 3 bulan + Recovery &lt; 1,00x = Treatment. Aging dihitung dari AGING/BLN. Data sheet
                    tidak di-poll otomatis — hanya saat Sync manual, lalu dipakai dari IndexedDB browser.
                  </div>
                </div>
              </>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegAnalisaGmroiPage;
