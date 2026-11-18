import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Spinner } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Col,
  Row,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import ErrorState from "../../../components/admin/common/ErrorState";
import { buildImageStorageUrl } from "../../../lib/imageStorage";
import { getMarcommDashboardSummary } from "../../../services/marcomm/marcomm.service";
import { extractRow, isSuccess } from "../../../lib/response";
import "./marcomm-dashboard.css";


Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const pad = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthStartYmd = () => toYmd(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const todayYmd = () => toYmd(new Date());

/** Parse "2,684" / "2.684" / 2684 → number */
const toNum = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/\s/g, "");
  if (!s) return 0;
  // "2,684" (thousands) or "2.684,50" EU — strip grouping commas/dots carefully
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, "")) || 0;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n) => toNum(n).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const pickField = (row, keys, fallback = "") => {
  if (!row) return fallback;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      const v = row[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    const found = Object.keys(row).find((rk) => rk.toLowerCase() === String(k).toLowerCase());
    if (found != null) {
      const v = row[found];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return fallback;
};

const normalizeChartRows = (raw) => {
  if (!raw) return [];
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.rows)) return data.rows;
  const nested = Object.values(data).find(Array.isArray);
  return nested || [];
};

const categoryLabel = (row) =>
  pickField(row, ["category", "Category", "CATEGORY", "week", "WEEK", "label", "LABEL"], "");

const SERIES_DEFS = [
  {
    keys: ["Dashboard_Visit", "dashboard_visit", "DashboardVisit"],
    label: "Dashboard Visit",
    color: "#eb473d",
  },
  {
    keys: ["total_Transaction", "total_transaction", "Total_Transaction"],
    label: "Transaction",
    color: "#68e15f",
  },
  {
    keys: ["Point_Redeemtion", "Point_Redemption", "point_redeemtion", "point_redemption"],
    label: "Point Redemption",
    color: "#f3ba49",
  },
];

const seriesValue = (row, keys) => toNum(pickField(row, keys, 0));

/** ASP Marketing.aspx uses ColumnSeries (grouped bars), not lines */
const buildBarChartData = (rows) => ({
  labels: rows.map(categoryLabel),
  datasets: SERIES_DEFS.map((def) => ({
    label: def.label,
    data: rows.map((r) => seriesValue(r, def.keys)),
    backgroundColor: def.color,
    borderColor: def.color,
    borderWidth: 0,
    borderRadius: 2,
    maxBarThickness: 28,
  })),
});

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: {
      backgroundColor: "#0f172a",
      titleFont: { size: 11 },
      bodyFont: { size: 12 },
      padding: 10,
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "rgba(148, 163, 184, 0.2)" },
      ticks: {
        color: "#64748b",
        callback: (v) => fmt(v),
      },
    },
    x: {
      grid: { display: false },
      ticks: { color: "#64748b", maxRotation: 45, minRotation: 0, autoSkip: true },
    },
  },
};

const PIE_COLORS = [
  "#eb473d",
  "#1d49a7",
  "#fadf70",
  "#56bc6c",
  "#ee7a76",
  "#6283ba",
  "#fceda8",
  "#8bbfa1",
  "#922b22",
  "#133270",
  "#ecc542",
  "#327242",
];

const wrapSliceLabel = (text, max = 16) => {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let cur = "";
  words.forEach((w) => {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  });
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
};

/** Labels di sekeliling donat: "PROVINSI: 13.4%" seperti Marketing.aspx */
const locationSliceLabels = {
  id: "locationSliceLabels",
  afterDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets?.[0];
    if (!meta?.data?.length || !dataset) return;
    const total = dataset.data.reduce((sum, n) => sum + Number(n || 0), 0) || 1;
    meta.data.forEach((arc, i) => {
      const value = Number(dataset.data[i] || 0);
      if (!value) return;
      const pct = ((value / total) * 100).toFixed(1);
      const name = chart.data.labels?.[i] || "";
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x1 = arc.x + cos * arc.outerRadius;
      const y1 = arc.y + sin * arc.outerRadius;
      const x2 = arc.x + cos * (arc.outerRadius + 16);
      const y2 = arc.y + sin * (arc.outerRadius + 16);
      ctx.save();
      ctx.strokeStyle = "#b0b8c4";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.fillStyle = "#2a3542";
      ctx.font = "11px sans-serif";
      ctx.textAlign = cos >= 0 ? "left" : "right";
      ctx.textBaseline = "middle";
      ctx.font = "10px sans-serif";
      const lines = wrapSliceLabel(`${name}: ${pct}%`, 18);
      const lineH = 11;
      const widths = lines.map((line) => ctx.measureText(line).width);
      const maxW = Math.max(8, ...widths);
      const blockH = lines.length * lineH;
      const edge = 4;
      let tx = x2 + (cos >= 0 ? 3 : -3);
      let ty = y2;
      if (cos >= 0) tx = Math.min(tx, chart.width - edge - maxW);
      else tx = Math.max(tx, edge + maxW);
      const half = blockH / 2;
      if (ty - half < edge) ty = edge + half;
      if (ty + half > chart.height - edge) ty = chart.height - edge - half;
      lines.forEach((line, li) => {
        ctx.fillText(line, tx, ty + (li - (lines.length - 1) / 2) * lineH);
      });
      ctx.restore();
    });
  },
};

const PeriodToggle = ({ value, onChange }) => (
  <div className="btn-group marcomm-dash-toggle" role="group">
    <button
      type="button"
      className={`btn btn-sm btn-light${value === "weekly" ? " is-active" : ""}`}
      onClick={() => onChange("weekly")}
    >
      Weekly
    </button>
    <button
      type="button"
      className={`btn btn-sm btn-light${value === "daily" ? " is-active" : ""}`}
      onClick={() => onChange("daily")}
    >
      Daily
    </button>
  </div>
);

const KPI_PHOTOS = {
  members: "/images/marcomm/members.jpg",
  active: "/images/marcomm/active.jpg",
  inactive: "/images/marcomm/inactive.jpg",
  sold: "/images/marcomm/sold.jpg",
};

const KpiCard = ({ label, value, change, kind }) => {
  const pct = String(change ?? "").trim();
  const isDown = pct.includes("-");
  const photo = KPI_PHOTOS[kind] || KPI_PHOTOS.members;
  return (
    <div className="marcomm-dash-card marcomm-dash-card--kpi">
      <span className="marcomm-dash-card__mark" aria-hidden="true">
        <img src={photo} alt="" />
      </span>
      <p className="marcomm-dash-card__label">{label}</p>
      <p className="marcomm-dash-card__value">{fmt(value)}</p>
      {pct ? (
        <p className={`marcomm-dash-card__delta${isDown ? " is-down" : " is-up"}`}>{pct}</p>
      ) : (
        <p className="marcomm-dash-card__delta text-muted">—</p>
      )}
      <p className="marcomm-dash-card__sub">from last periode</p>
    </div>
  );
};

const MarcommDashboardPage = () => {
  const [fromDate, setFromDate] = useState(monthStartYmd);
  const [toDate, setToDate] = useState(todayYmd);
  const [draftFrom, setDraftFrom] = useState(monthStartYmd);
  const [draftTo, setDraftTo] = useState(todayYmd);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityMode, setActivityMode] = useState("weekly");
  const [growthMode, setGrowthMode] = useState("weekly");
  const reqSeq = useRef(0);

  const load = useCallback(async (from = fromDate, to = toDate) => {
    const f = from || monthStartYmd();
    const t = to || todayYmd();
    if (!f || !t) {
      setError("Pilih rentang tanggal terlebih dahulu");
      return;
    }
    const seq = ++reqSeq.current;
    setLoading(true);
    setError("");
    try {
      const res = await getMarcommDashboardSummary({ from_date: f, to_date: t });
      if (seq !== reqSeq.current) return;
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat dashboard");
        setData(null);
        return;
      }
      setError("");
      setData(extractRow(res) || {});
    } catch (err) {
      if (seq !== reqSeq.current) return;
      setError(err?.responseMessage || err?.message || "Gagal memuat dashboard");
      setData(null);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load(fromDate, toDate);
  }, [fromDate, toDate, load]);

  const badge = data?.badge || {};

  const kpis = useMemo(
    () => [
      {
        label: "Members",
        kind: "members",
        value: pickField(badge, ["member_total", "Member_Total"]),
        change: pickField(badge, ["prev_member_total_presentase"]),
      },
      {
        label: "Active",
        kind: "active",
        value: pickField(badge, ["active_member_total", "Active_Member_Total"]),
        change: pickField(badge, ["prev_active_member_total_presentase"]),
      },
      {
        label: "Inactive",
        kind: "inactive",
        value: pickField(badge, ["inactive_member_total", "Inactive_Member_Total"]),
        change: pickField(badge, ["prev_inactive_member_total_presentase"]),
      },
      {
        label: "Product Sold",
        kind: "sold",
        value: pickField(badge, ["total_product_sold", "Product_Sold"]),
        change: pickField(badge, ["prev_total_product_sold_presentase"]),
      },
    ],
    [badge]
  );

  const charts = data?.charts || {};
  const activityRows = useMemo(() => {
    const key = activityMode === "daily" ? "member_activity_daily" : "member_activity";
    return normalizeChartRows(charts[key]);
  }, [charts, activityMode]);

  const growthRows = useMemo(() => {
    const key = growthMode === "daily" ? "member_growth_daily" : "member_growth";
    return normalizeChartRows(charts[key]);
  }, [charts, growthMode]);

  const activityChart = useMemo(() => buildBarChartData(activityRows), [activityRows]);
  const growthChart = useMemo(() => buildBarChartData(growthRows), [growthRows]);

  const locationRows = useMemo(() => normalizeChartRows(charts.member_location), [charts]);

  const locationItems = useMemo(() => {
    const items = locationRows
      .map((r) => ({
        name: String(pickField(r, ["PROVINSI", "provinsi", "Provinsi", "category"], "—")),
        value: toNum(pickField(r, ["TOTAL_MEMBER", "total_member", "Total_Member"], 0)),
      }))
      .filter((it) => it.value > 0)
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((sum, it) => sum + it.value, 0) || 1;
    return items.map((it, i) => ({
      ...it,
      color: PIE_COLORS[i % PIE_COLORS.length],
      pct: ((it.value / total) * 100).toFixed(1),
    }));
  }, [locationRows]);

  const doughnutData = useMemo(
    () => ({
      labels: locationItems.map((it) => it.name),
      datasets: [
        {
          data: locationItems.map((it) => it.value),
          backgroundColor: locationItems.map((it) => it.color),
          borderWidth: 1,
          borderColor: "#fff",
        },
      ],
    }),
    [locationItems]
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "18%",
      layout: { padding: { top: 56, right: 78, bottom: 56, left: 78 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const it = locationItems[ctx.dataIndex];
              return it ? `${it.name}: ${fmt(it.value)} (${it.pct}%)` : "";
            },
          },
        },
      },
    }),
    [locationItems]
  );

  const topBrands = useMemo(() => {
    const raw = data?.top_brand_contributors ?? data?.topBrandContributors ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const onFilter = () => {
    const f = draftFrom || monthStartYmd();
    const t = draftTo || todayYmd();
    setDraftFrom(f);
    setDraftTo(t);
    if (f === fromDate && t === toDate) {
      load(f, t);
      return;
    }
    setFromDate(f);
    setToDate(t);
  };

  return (
    <AccessGuard moduleCode="MAR_DASHBOARD" permission="VIEW">
      <>
        <Head title="Dashboard" />
        <Content>
          <div className="marcomm-dash">
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3" className="marcomm-dash__head-title">
                    Dashboard
                  </BlockTitle>
                </BlockHeadContent>
                <BlockHeadContent>
                  <div className="marcomm-dash__period">
                    <span className="marcomm-dash__period-label">Select Periode</span>
                    <div className="marcomm-dash__period-controls">
                      <AppDateRangePicker
                        startDate={draftFrom}
                        endDate={draftTo}
                        className="form-control form-control-sm"
                        onChange={(f, t) => {
                          setDraftFrom(f || "");
                          setDraftTo(t || "");
                        }}
                      />
                      <Button color="primary" size="sm" onClick={onFilter} disabled={loading}>
                        {loading ? "Loading…" : "Filter"}
                      </Button>
                    </div>
                  </div>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>

            {error && !data ? (
              <Block>
                <ErrorState message={error} onRetry={() => load(fromDate, toDate)} />
              </Block>
            ) : null}

            {loading && !data ? (
              <Block>
                <div className="text-center py-5">
                  <Spinner color="primary" />
                </div>
              </Block>
            ) : null}

            {data ? (
              <>
                <Block>
                  <Row className="g-gs marcomm-dash-row">
                    {kpis.map((k) => (
                      <Col key={k.label} xxl="3" sm="6">
                        <KpiCard {...k} />
                      </Col>
                    ))}
                  </Row>
                </Block>

                <Block>
                  <Row className="g-gs marcomm-dash-row">
                    <Col lg="7">
                      <BlockBetween className="mb-2">
                        <BlockHeadContent>
                          <h5 className="marcomm-dash-section-title">Member Activity</h5>
                        </BlockHeadContent>
                        <BlockHeadContent>
                          <PeriodToggle value={activityMode} onChange={setActivityMode} />
                        </BlockHeadContent>
                      </BlockBetween>
                      <div className="marcomm-dash-card marcomm-dash-panel">
                        <div className="marcomm-dash-chart-wrap">
                          {activityRows.length ? (
                            <Bar data={activityChart} options={barChartOptions} />
                          ) : (
                            <p className="text-soft text-center py-5 mb-0">Tidak ada data aktivitas</p>
                          )}
                        </div>
                      </div>

                      <BlockBetween className="mb-2 mt-4">
                        <BlockHeadContent>
                          <h5 className="marcomm-dash-section-title">Member Growth and Transaction</h5>
                        </BlockHeadContent>
                        <BlockHeadContent>
                          <PeriodToggle value={growthMode} onChange={setGrowthMode} />
                        </BlockHeadContent>
                      </BlockBetween>
                      <div className="marcomm-dash-card marcomm-dash-panel">
                        <div className="marcomm-dash-chart-wrap">
                          {growthRows.length ? (
                            <Bar data={growthChart} options={barChartOptions} />
                          ) : (
                            <p className="text-soft text-center py-5 mb-0">Tidak ada data growth</p>
                          )}
                        </div>
                      </div>

                      <h5 className="marcomm-dash-section-title mt-4">Top Brand Contributors</h5>
                      <div className="marcomm-dash-card marcomm-dash-panel">
                        <div className="table-responsive">
                          <table className="table table-hover marcomm-dash-table mb-0">
                            <thead>
                              <tr>
                                <th style={{ width: "8%" }}>No</th>
                                <th style={{ width: "28%" }}>Brand</th>
                                <th>Total Transaction (Qty)</th>
                                <th>Total Member</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topBrands.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="text-soft text-center py-4">
                                    There is no data
                                  </td>
                                </tr>
                              ) : (
                                topBrands.map((row, idx) => {
                                  const logo = pickField(row, ["logo", "LOGO", "brand_logo"]);
                                  const brand = String(pickField(row, ["brand", "BRAND", "Brand"], ""));
                                  const src = logo ? buildImageStorageUrl(`brand/${logo}`) : "";
                                  return (
                                    <tr key={`${brand}-${idx}`}>
                                      <td>{idx + 1}</td>
                                      <td>
                                        <div className="marcomm-dash-brand-cell">
                                          {src ? (
                                            <img
                                              src={src}
                                              alt={brand || "Brand"}
                                              className="marcomm-dash-brand-logo"
                                              onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                              }}
                                            />
                                          ) : (
                                            <span className="marcomm-dash-brand-fallback" title={brand}>
                                              {(brand || "?").slice(0, 2).toUpperCase()}
                                            </span>
                                          )}
                                          <span>{brand || "—"}</span>
                                        </div>
                                      </td>
                                      <td>{fmt(pickField(row, ["qty", "QTY"]))}</td>
                                      <td>{fmt(pickField(row, ["member", "MEMBER"]))}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </Col>

                    <Col lg="5">
                      <h5 className="marcomm-dash-section-title">Member Location</h5>
                      <div className="marcomm-dash-card marcomm-dash-panel">
                        <div className="marcomm-dash-chart-wrap marcomm-dash-chart-wrap--pie">
                          {locationItems.length ? (
                            <Doughnut
                              data={doughnutData}
                              options={doughnutOptions}
                              plugins={[locationSliceLabels]}
                            />
                          ) : (
                            <p className="text-soft text-center py-5 mb-0">Tidak ada data lokasi</p>
                          )}
                        </div>
                        {locationItems.length ? (
                          <ul className="marcomm-loc-legend">
                            {locationItems.map((it) => (
                              <li key={it.name}>
                                <span className="marcomm-loc-swatch" style={{ background: it.color }} />
                                <strong>{fmt(it.value)}</strong>
                                <span className="marcomm-loc-arrow">→</span>
                                <span className="marcomm-loc-name">{it.name}</span>
                                <span className="marcomm-loc-pct">{it.pct}%</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </Col>
                  </Row>
                </Block>
              </>
            ) : null}
          </div>
        </Content>
      </>
    </AccessGuard>
  );
};

export default MarcommDashboardPage;
