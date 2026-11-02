import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bar, Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
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
import api from "../../../lib/api";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import "./reg-reg-report.css";
import "./reg-member-list.css";
import "./reg-member-info.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  Tooltip,
  Legend,
  Filler
);

const BRAND_COLORS = ["#845EC2", "#D65DB1", "#00b7eb", "#63bdbd", "#FF9671", "#ff5750", "#8094ae", "#364a63"];

const chartOptionsBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "bottom",
      labels: { boxWidth: 10, padding: 12, font: { size: 11 }, color: "#526484" },
    },
    tooltip: {
      backgroundColor: "#fff",
      titleColor: "#364a63",
      bodyColor: "#526484",
      borderColor: "#e5e9f2",
      borderWidth: 1,
      displayColors: true,
      padding: 8,
    },
  },
  scales: {
    x: {
      ticks: { color: "#8094ae", font: { size: 11 }, maxRotation: 0 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: "#8094ae", font: { size: 11 } },
      grid: { color: "#eef2f7" },
    },
  },
};

/** Legacy module/rpt/member_Info.aspx — drill-down from member list (?mem=) */
const BASE = "/regional/rpt/member/info";
const LIST_BASE = "/regional/rpt/member/list";

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: "0.8125rem" }),
};

const pad = (n) => String(n).padStart(2, "0");
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const firstOfMonth = () => {
  const d = new Date();
  return toIso(new Date(d.getFullYear(), d.getMonth(), 1));
};
const toInputDate = (v) => {
  const s = String(v || "").trim();
  const m = s.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
};

const emptyForm = () => ({
  id_member: "",
  member_id: "",
  nama: "",
  alamat: "",
  provinsi: "0",
  kota: "0",
  tgl_lahir: "",
  no_telpon: "",
  email: "",
  password: "",
  tgl_member: "",
  jenis_kelamin: "",
  tier: "",
});

/** Flatten SQL `Jun\\n2025` / real newlines for Chart.js multiline ticks */
const chartLabel = (v) =>
  String(v ?? "-")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .trim() || "-";

const normalizeChartRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** Legacy Frequency By Brands — column (trx) + line (qty) */
const FrequencyBrandChart = ({ rows }) => {
  const data = useMemo(() => {
    const labels = rows.map((r) => chartLabel(r.brand ?? r.category).replace(/\n/g, " "));
    return {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Total Transaction",
          data: rows.map((r) => Number(r.total_transaction) || 0),
          backgroundColor: rows.map((_, i) => BRAND_COLORS[i % BRAND_COLORS.length]),
          borderWidth: 0,
          borderRadius: 3,
          maxBarThickness: 40,
          order: 2,
        },
        {
          type: "line",
          label: "Total Qty",
          data: rows.map((r) => Number(r.total_qty) || 0),
          borderColor: "#fdd400",
          backgroundColor: "#fdd400",
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#fdd400",
          pointBorderWidth: 2,
          tension: 0.3,
          order: 1,
        },
      ],
    };
  }, [rows]);

  const options = useMemo(
    () => ({
      ...chartOptionsBase,
      interaction: { mode: "index", intersect: false },
    }),
    []
  );

  return (
    <div className="rmi-card rmi-chart-card">
      <h6 className="rmi-card-title">Frequency By Brands</h6>
      <div className="rmi-chart-box">
        {!rows.length ? (
          <div className="rmi-chart-empty">There Is No Data</div>
        ) : (
          <Chart type="bar" data={data} options={options} />
        )}
      </div>
    </div>
  );
};

/** Legacy Purchasing All Brand — CurvedColumnSeries → rounded bar by month */
const PurchasingBrandChart = ({ rows }) => {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ya = Number(a.tahun) || 0;
      const yb = Number(b.tahun) || 0;
      if (ya !== yb) return ya - yb;
      return (Number(a.bulan) || 0) - (Number(b.bulan) || 0);
    });
  }, [rows]);

  const data = useMemo(() => {
    const labels = sorted.map((r) => {
      if (r.category) return chartLabel(r.category);
      if (r.tahun && r.bulan) {
        const d = new Date(Number(r.tahun), Number(r.bulan) - 1, 1);
        return `${d.toLocaleString("en", { month: "short" })}\n${r.tahun}`;
      }
      return chartLabel(r.brand);
    });
    return {
      labels,
      datasets: [
        {
          label: "Total Bayar",
          data: sorted.map((r) => Number(r.total_bayar ?? r.total_transaction) || 0),
          backgroundColor: sorted.map((_, i) => `${BRAND_COLORS[i % BRAND_COLORS.length]}bf`),
          borderWidth: 0,
          borderRadius: { topLeft: 18, topRight: 18, bottomLeft: 18, bottomRight: 18 },
          borderSkipped: false,
          maxBarThickness: 48,
          categoryPercentage: 0.65,
          barPercentage: 0.85,
        },
      ],
    };
  }, [sorted]);

  const options = useMemo(
    () => ({
      ...chartOptionsBase,
      plugins: {
        ...chartOptionsBase.plugins,
        legend: { display: false },
        tooltip: {
          ...chartOptionsBase.plugins.tooltip,
          callbacks: {
            title: (items) => String(items?.[0]?.label || "").replace(/\n/g, " "),
            label: (ctx) =>
              ` ${Number(ctx.raw || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`,
          },
        },
      },
      scales: {
        ...chartOptionsBase.scales,
        x: {
          ...chartOptionsBase.scales.x,
          ticks: {
            ...chartOptionsBase.scales.x.ticks,
            autoSkip: true,
            maxRotation: 0,
          },
        },
        y: {
          ...chartOptionsBase.scales.y,
          ticks: {
            ...chartOptionsBase.scales.y.ticks,
            callback: (v) => Number(v).toLocaleString("id-ID"),
          },
        },
      },
    }),
    []
  );

  return (
    <div className="rmi-card rmi-chart-card">
      <h6 className="rmi-card-title">Purchasing All Brand</h6>
      <div className="rmi-chart-box">
        {!sorted.length ? (
          <div className="rmi-chart-empty">There Is No Data</div>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  );
};

const RegMemberInfoPage = () => {
  const [params] = useSearchParams();
  const mem = params.get("mem") || params.get("id_member") || "";

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(() => toIso(new Date()));
  /** Only Search / initial mem apply dates — avoid race while date-picker selects start-only */
  const [applied, setApplied] = useState(() => ({
    from_date: firstOfMonth(),
    to_date: toIso(new Date()),
  }));
  const [form, setForm] = useState(emptyForm);
  const [points, setPoints] = useState({ total_point: "0", point_used: "0", sisa_point: "0" });
  const [txRows, setTxRows] = useState([]);
  const [freqRows, setFreqRows] = useState([]);
  const [brandRows, setBrandRows] = useState([]);
  const [provOpts, setProvOpts] = useState([]);
  const [kotaOpts, setKotaOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const allProv = useMemo(() => [{ value: "0", label: "Pilih Provinsi" }, ...provOpts], [provOpts]);
  const allKota = useMemo(() => [{ value: "0", label: "Pilih Kota" }, ...kotaOpts], [kotaOpts]);

  useEffect(() => {
    api
      .get(`${LIST_BASE}/provinsi`)
      .then((res) => setProvOpts(isSuccess(res) ? extractRows(res) : []))
      .catch(() => setProvOpts([]));
  }, []);

  useEffect(() => {
    const prov = form.provinsi;
    if (!prov || prov === "0") {
      setKotaOpts([]);
      return;
    }
    api
      .get(`${LIST_BASE}/kota`, { params: { provinsi: prov } })
      .then((res) => setKotaOpts(isSuccess(res) ? extractRows(res) : []))
      .catch(() => setKotaOpts([]));
  }, [form.provinsi]);

  const onSearch = () => {
    if (!fromDate || !toDate) {
      setError("Pilih date range lengkap dulu");
      return;
    }
    setApplied({ from_date: fromDate, to_date: toDate });
  };

  useEffect(() => {
    if (!mem) {
      setError("Parameter mem wajib (dari Member List)");
      return undefined;
    }
    let alive = true;
    const q = { id_member: mem, mem, from_date: applied.from_date, to_date: applied.to_date };

    const load = async () => {
      setLoading(true);
      setError("");
      setMsg("");
      try {
        const settled = await Promise.allSettled([
          api.get(`${BASE}/profile`, { params: q }),
          api.get(`${BASE}/points`, { params: q }),
          api.get(`${BASE}/tx`, { params: q }),
          api.get(`${BASE}/chart-freq`, { params: q }),
          api.get(`${BASE}/chart-brand`, { params: q }),
        ]);
        if (!alive) return;

        const take = (i) => (settled[i].status === "fulfilled" ? settled[i].value : null);
        const failMsg = (i) =>
          settled[i].status === "rejected"
            ? settled[i].reason?.responseMessage || settled[i].reason?.message || ""
            : "";

        const prof = take(0);
        const pts = take(1);
        const tx = take(2);
        const freq = take(3);
        const brand = take(4);

        if (!prof || !isSuccess(prof)) {
          setError(prof?.responseMessage || failMsg(0) || "Gagal memuat profil");
          setForm(emptyForm());
        } else {
          const row = extractRow(prof) || {};
          setForm({
            id_member: row.id_member || mem,
            member_id: row.member_id || "",
            nama: row.nama || "",
            alamat: row.alamat || "",
            provinsi: String(row.provinsi || "0"),
            kota: String(row.kota || "0"),
            tgl_lahir: toInputDate(row.tgl_lahir),
            no_telpon: row.no_telpon || "",
            email: row.email || "",
            password: row.password || "",
            tgl_member: row.tgl_member || "",
            jenis_kelamin: String(row.jenis_kelamin || "").toUpperCase(),
            tier: row.tier || "",
          });
        }

        if (pts && isSuccess(pts)) {
          setPoints(extractRow(pts) || { total_point: "0", point_used: "0", sisa_point: "0" });
        }
        setTxRows(tx && isSuccess(tx) ? extractRows(tx) : []);
        const freqData = freq && isSuccess(freq) ? extractRows(freq) : [];
        setFreqRows(normalizeChartRows(freqData.length ? freqData : freq?.data));
        const brandData = brand && isSuccess(brand) ? extractRows(brand) : [];
        setBrandRows(normalizeChartRows(brandData.length ? brandData : brand?.data));

        const partErr = [failMsg(2), failMsg(3), failMsg(4)].filter(Boolean).join("; ");
        if (partErr && (!tx || !freq || !brand)) {
          setError((prev) => prev || partErr);
        }
      } catch (e) {
        if (alive) setError(e?.responseMessage || e?.message || "Gagal memuat data");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [mem, applied]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    if (!mem) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await api.put(`${BASE}/${encodeURIComponent(mem)}`, {
        ...form,
        id_member: mem,
        tgl_lahir: form.tgl_lahir ? form.tgl_lahir.replace(/-/g, "/") : "",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal simpan");
        return;
      }
      setMsg("Data berhasil diubah");
      setApplied((a) => ({ ...a }));
    } catch (e) {
      setError(e?.responseMessage || e?.message || "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  const scrollRevision = `${loading ? "l" : "r"}-${mem}-${txRows.length}-${freqRows.length}-${brandRows.length}`;

  return (
    <AccessGuard moduleCode="REG_RPT_MEMBER">
      <Head title="Member Info" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rml-page rmi-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Member Info
                </BlockTitle>
                <BlockDes className="text-soft">
                  {form.nama ? form.nama : mem ? `ID: ${mem}` : "Detail member"}
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <Link to="/admin/regional/rpt/member/list" className="btn btn-sm btn-outline-light">
                  <Icon name="arrow-left" />
                  <span>Member List</span>
                </Link>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          {!mem ? (
            <div className="rrd-msg err">Buka dari Member List (klik Member ID).</div>
          ) : (
            <div className="rmi-body">
              <div className="rmi-toolbar">
                <ul className="nk-block-tools g-3 align-items-center rmi-toolbar-tools">
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
                        onChange={(f, t) => {
                          if (f) setFromDate(f);
                          if (t) setToDate(t);
                          if (!f && !t) {
                            setFromDate("");
                            setToDate("");
                          }
                        }}
                      />
                    </div>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="btn btn-icon btn-trigger admin-filter-premium-btn"
                      onClick={onSearch}
                      disabled={loading || !fromDate || !toDate}
                      title={fromDate && toDate ? "Cari" : "Pilih date range dulu"}
                      aria-label="Cari"
                    >
                      <Icon pack="premium" name="pencarian" size={32} />
                    </button>
                  </li>
                </ul>
              </div>

              {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
              {msg ? <div className="rrd-msg ok mb-2">{msg}</div> : null}
              {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

              <div className="rmi-points">
                <div>
                  <span>Total Point</span>
                  <strong>{points.total_point ?? "0"}</strong>
                </div>
                <div>
                  <span>Total Redeem</span>
                  <strong>{points.point_used ?? "0"}</strong>
                </div>
                <div>
                  <span>Sisa Point</span>
                  <strong>{points.sisa_point ?? "0"}</strong>
                </div>
              </div>

              <div className="rmi-charts">
                <FrequencyBrandChart rows={freqRows} />
                <PurchasingBrandChart rows={brandRows} />
              </div>

              <div className="rmi-main">
                <section className="rmi-panel">
                  <div className="rmi-panel__head">
                    <h6>Member Information</h6>
                    <button type="button" className="rmi-btn" onClick={onSave} disabled={saving}>
                      <Icon name="save" />
                      <span>{saving ? "Saving..." : "Ubah Data"}</span>
                    </button>
                  </div>
                  <div className="rmi-form">
                    <div className="rmi-field">
                      <label>Member ID</label>
                      <input className="form-control form-control-sm" value={form.member_id} readOnly />
                    </div>
                    <div className="rmi-field">
                      <label>Tier</label>
                      <input className="form-control form-control-sm" value={form.tier} readOnly />
                    </div>
                    <div className="rmi-field">
                      <label>Tgl Member</label>
                      <input className="form-control form-control-sm" value={form.tgl_member} readOnly />
                    </div>
                    <div className="rmi-field">
                      <label>Gender</label>
                      <div className="rmi-gender">
                        <label>
                          <input
                            type="radio"
                            name="jk"
                            checked={form.jenis_kelamin === "L"}
                            onChange={() => setField("jenis_kelamin", "L")}
                          />
                          Male
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="jk"
                            checked={form.jenis_kelamin === "P"}
                            onChange={() => setField("jenis_kelamin", "P")}
                          />
                          Female
                        </label>
                      </div>
                    </div>
                    <div className="rmi-field rmi-field--full">
                      <label>Nama</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.nama}
                        onChange={(e) => setField("nama", e.target.value)}
                      />
                    </div>
                    <div className="rmi-field">
                      <label>Tgl Lahir</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={form.tgl_lahir}
                        onChange={(e) => setField("tgl_lahir", e.target.value)}
                      />
                    </div>
                    <div className="rmi-field">
                      <label>No. Telpon</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.no_telpon}
                        onChange={(e) => setField("no_telpon", e.target.value)}
                      />
                    </div>
                    <div className="rmi-field">
                      <label>Email</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                      />
                    </div>
                    <div className="rmi-field">
                      <label>Password</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                      />
                    </div>
                    <div className="rmi-field">
                      <label>Provinsi</label>
                      <RSelect
                        styles={filterSelectStyles}
                        isSearchable
                        options={allProv}
                        value={allProv.find((o) => String(o.value) === String(form.provinsi)) || allProv[0]}
                        onChange={(o) => {
                          setField("provinsi", o?.value || "0");
                          setField("kota", "0");
                        }}
                      />
                    </div>
                    <div className="rmi-field">
                      <label>Kota</label>
                      <RSelect
                        styles={filterSelectStyles}
                        isSearchable
                        options={allKota}
                        value={allKota.find((o) => String(o.value) === String(form.kota)) || allKota[0]}
                        onChange={(o) => setField("kota", o?.value || "0")}
                      />
                    </div>
                    <div className="rmi-field rmi-field--full">
                      <label>Alamat</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.alamat}
                        onChange={(e) => setField("alamat", e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <section className="rmi-panel">
                  <div className="rmi-panel__head">
                    <h6>History Transactions</h6>
                  </div>
                  <div className="rmi-table-scroll">
                    <table className="rmi-table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Category</th>
                          <th className="num">Awal</th>
                          <th className="num">Reward</th>
                          <th className="num">Birthday</th>
                          <th className="num">Bigday</th>
                          <th className="num">Akhir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!txRows.length ? (
                          <tr>
                            <td colSpan={7} className="ctr">
                              There Is No Data
                            </td>
                          </tr>
                        ) : (
                          txRows.map((r, i) => (
                            <tr key={`${r.tanggal}-${i}`}>
                              <td>{r.tanggal}</td>
                              <td>{r.category}</td>
                              <td className="num">{r.awal}</td>
                              <td className="num">{r.reward}</td>
                              <td className="num">{r.birthday}</td>
                              <td className="num">{r.bigday}</td>
                              <td className="num">{r.akhir}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          )}
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegMemberInfoPage;
