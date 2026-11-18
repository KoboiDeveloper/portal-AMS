import React, { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "reactstrap";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import ErrorState from "../../../../components/admin/common/ErrorState";
import { getMarcommMemberAnalytics } from "../../../../services/marcomm/marcomm.service";
import { extractRow, isSuccess } from "../../../../lib/response";

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export const TOTAL_BRAND = "SEMUA BRAND";
export const NO_TX_BRAND = "TANPA TRANSAKSI";

/* ------------------------------------------------------------------ */
/* format angka (mengikuti format kalimat kesimpulan dari API)          */
/* ------------------------------------------------------------------ */

export const num = (v) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const dec = (v, d) =>
  num(v).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fInt = (v) => num(v).toLocaleString("id-ID", { maximumFractionDigits: 0 });
export const fPct = (v, d = 1) => `${dec(v, d)}%`;
export const fMult = (v) => `${dec(v, 1)} kali`;
export const fRpFull = (v) => `Rp${fInt(v)}`;

export const fRp = (v) => {
  const n = num(v);
  const a = Math.abs(n);
  if (a >= 1e12) return `Rp${dec(n / 1e12, 2)} triliun`;
  if (a >= 1e9) return `Rp${dec(n / 1e9, 2)} miliar`;
  if (a >= 1e6) return `Rp${dec(n / 1e6, 2)} juta`;
  if (a >= 1e3) return `Rp${dec(n / 1e3, 0)} ribu`;
  return `Rp${fInt(n)}`;
};

export const fSigned = (v) => (num(v) > 0 ? `+${fPct(v)}` : fPct(v));

const MONTHS_ID = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "2026-11-17" → "17 Nov 2026" */
export const fDate = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  if (!m) return ymd ? String(ymd) : "—";
  return `${Number(m[3])} ${MONTHS_ID[Number(m[2])]} ${m[1]}`;
};

/** "2026-11-18 15:36:53" → "18 Nov 2026 15:36" */
export const fDateTime = (ts) => {
  const s = String(ts || "");
  const time = s.length >= 16 ? ` ${s.slice(11, 16)}` : "";
  return s ? `${fDate(s)}${time}` : "—";
};

const pad = (n) => String(n).padStart(2, "0");
export const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* ------------------------------------------------------------------ */
/* warna                                                               */
/* ------------------------------------------------------------------ */

const BRAND_PALETTE = ["#1d49a7", "#eb473d", "#e0a526", "#2f9e5b", "#7c3aed", "#0891b2", "#be185d", "#57534e"];
export const TOTAL_COLOR = "#64748b";

/** Warna tetap per brand, mengikuti urutan brand dari API supaya sama di semua grafik. */
export const brandColorMap = (brandNames = []) => {
  const map = { [TOTAL_BRAND]: TOTAL_COLOR, [NO_TX_BRAND]: "#94a3b8" };
  brandNames.forEach((name, i) => {
    map[name] = BRAND_PALETTE[i % BRAND_PALETTE.length];
  });
  return map;
};

export const SEGMENT_COLORS = {
  A: "#7c3aed",
  B: "#15803d",
  C: "#4ade80",
  D: "#0ea5e9",
  E: "#93c5fd",
  F: "#f59e0b",
  G: "#fcd34d",
  H: "#ef4444",
  I: "#cbd5e1",
};

/** Lencana kode segmen: latar warna segmen, teks putih untuk warna gelap. */
const SEGMENT_DARK = new Set(["A", "B", "D", "H"]);

export const SegmentBadge = ({ code }) => (
  <span
    className="ma-seg__code"
    style={{
      background: SEGMENT_COLORS[code] || TOTAL_COLOR,
      color: SEGMENT_DARK.has(code) ? "#fff" : "#0f172a",
    }}
  >
    {code}
  </span>
);

/* ------------------------------------------------------------------ */
/* grafik                                                              */
/* ------------------------------------------------------------------ */

export const chartOptions = ({ yFmt = fInt, stacked = false, max, legend = true } = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: legend, position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: {
      backgroundColor: "#0f172a",
      titleFont: { size: 11 },
      bodyFont: { size: 12 },
      padding: 10,
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${yFmt(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      stacked,
      max,
      grid: { color: "rgba(148, 163, 184, 0.2)" },
      ticks: { color: "#64748b", callback: (v) => yFmt(v) },
    },
    x: {
      stacked,
      grid: { display: false },
      ticks: { color: "#64748b", maxRotation: 45, minRotation: 0, autoSkip: true },
    },
  },
});

/* ------------------------------------------------------------------ */
/* pengambilan data per bagian                                         */
/* ------------------------------------------------------------------ */

/** Cache tampilan: pindah tab tidak memuat ulang selama filter dan nonce sama. */
const viewCache = new Map();
const VIEW_CACHE_MAX = 80;

const viewKey = (section, q) =>
  [section, q?.from || "", q?.to || "", q?.brand || "", q?.nonce || 0].join("|");

const remember = (key, data) => {
  if (viewCache.size >= VIEW_CACHE_MAX) viewCache.delete(viewCache.keys().next().value);
  viewCache.set(key, data);
};

/**
 * Memuat satu bagian analisa. `query` = { from, to, brand, nonce }.
 * `nonce` naik tiap kali pengguna menekan "Hitung ulang".
 */
export const useSection = (section, query, enabled = true) => {
  const key = viewKey(section, query);
  const [state, setState] = useState(() => {
    const hit = viewCache.get(key);
    return { key, data: hit || null, loading: enabled && !hit, error: "" };
  });
  const seq = useRef(0);
  const from = query?.from || "";
  const to = query?.to || "";
  const brand = query?.brand || "";

  const load = useCallback(
    async (force = false) => {
      const hit = force ? null : viewCache.get(key);
      const mySeq = ++seq.current;
      if (hit) {
        setState({ key, data: hit, loading: false, error: "" });
        return;
      }
      setState((prev) => ({
        key,
        data: prev.key === key ? prev.data : null,
        loading: true,
        error: "",
      }));
      try {
        const params = {};
        if (from) params.from_date = from;
        if (to) params.to_date = to;
        if (brand) params.brand = brand;
        const res = await getMarcommMemberAnalytics(section, params);
        if (mySeq !== seq.current) return;
        if (!isSuccess(res)) {
          setState({ key, data: null, loading: false, error: res?.responseMessage || "Gagal memuat data" });
          return;
        }
        const data = extractRow(res) || {};
        remember(key, data);
        setState({ key, data, loading: false, error: "" });
      } catch (err) {
        if (mySeq !== seq.current) return;
        setState({
          key,
          data: null,
          loading: false,
          error: err?.responseMessage || err?.message || "Gagal memuat data",
        });
      }
    },
    [key, section, from, to, brand]
  );

  useEffect(() => {
    if (enabled) load(false);
  }, [enabled, load]);

  const current = state.key === key ? state : { data: null, loading: enabled, error: "" };
  return { data: current.data, loading: current.loading, error: current.error, reload: () => load(true) };
};

/* ------------------------------------------------------------------ */
/* komponen tampilan                                                   */
/* ------------------------------------------------------------------ */

const TONE_LABEL = { good: "Kekuatan", warn: "Perlu perhatian", info: "Catatan" };

export const InsightList = ({ insights }) => {
  const list = Array.isArray(insights) ? insights : [];
  if (!list.length) return null;
  return (
    <div className="ma-insights">
      {list.map((it, i) => (
        <div key={`${it.title}-${i}`} className={`ma-insight ma-insight--${it.tone || "info"}`}>
          <div className="ma-insight__head">
            <span className="ma-insight__tone">{TONE_LABEL[it.tone] || TONE_LABEL.info}</span>
            <span className="ma-insight__title">{it.title}</span>
          </div>
          <p className="ma-insight__text">{it.text}</p>
        </div>
      ))}
    </div>
  );
};

/**
 * Bingkai satu bagian: judul, dasar hitung, kesimpulan, isi, catatan.
 * `state` = hasil useSection.
 */
export const SectionPanel = ({ title, state, children, actions }) => {
  const { data, loading, error, reload } = state;
  return (
    <section className="ma-panel">
      <div className="ma-panel__head">
        <div>
          <h5 className="ma-panel__title">{title}</h5>
          {data?.basis ? <div className="ma-panel__basis">Dasar hitung: {data.basis}</div> : null}
        </div>
        <div className="ma-panel__tools">
          {actions}
          {loading && data ? <Spinner size="sm" color="primary" /> : null}
        </div>
      </div>

      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <div className="ma-panel__loading">
          <Spinner color="primary" />
          <span>Menghitung dari data transaksi…</span>
        </div>
      ) : null}

      {data ? (
        <div className={loading ? "ma-panel__body is-stale" : "ma-panel__body"}>
          <InsightList insights={data.insights} />
          {typeof children === "function" ? children(data) : children}
          {Array.isArray(data.notes) && data.notes.length ? (
            <ul className="ma-notes">
              {data.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export const SubTitle = ({ children, hint }) => (
  <div className="ma-subtitle">
    <h6>{children}</h6>
    {hint ? <span>{hint}</span> : null}
  </div>
);

export const ChartBox = ({ children, tall }) => (
  <div className={tall ? "ma-chart ma-chart--tall" : "ma-chart"}>{children}</div>
);

/** Perubahan persen: null → "—"; naik hijau, turun merah. */
export const Delta = ({ value }) => {
  if (value === null || value === undefined || value === "") return <span className="text-soft">—</span>;
  const n = num(value);
  const cls = n > 0 ? "ma-delta is-up" : n < 0 ? "ma-delta is-down" : "ma-delta";
  return <span className={cls}>{fSigned(n)}</span>;
};

const isTotalRow = (row) => num(row?.is_total) === 1 || row?.brand === TOTAL_BRAND;

const cellClass = (c, focus) =>
  [c.align === "right" ? "text-end" : "", focus && c.brand === focus ? "is-focus-col" : ""]
    .filter(Boolean)
    .join(" ") || undefined;

/**
 * Tabel per brand. columns: [{ key, label, align, render(row), title, brand }].
 * Baris (atau kolom, lewat `brand` di kolom) brand yang sedang difokuskan diberi tanda;
 * baris "SEMUA BRAND" ditebalkan.
 */
export const DataTable = ({ columns, rows, focus, rowKey, emptyText = "Tidak ada data", rowClass }) => {
  const list = Array.isArray(rows) ? rows : [];
  return (
    <div className="table-responsive ma-table-wrap">
      <table className="table table-sm ma-table mb-0">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cellClass(c, focus)} title={c.title || undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-soft text-center py-4">
                {emptyText}
              </td>
            </tr>
          ) : (
            list.map((row, idx) => {
              const cls = [
                isTotalRow(row) ? "is-total" : "",
                focus && row?.brand === focus ? "is-focus" : "",
                rowClass ? rowClass(row) : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <tr key={rowKey ? rowKey(row, idx) : `${row?.brand || ""}-${idx}`} className={cls || undefined}>
                  {columns.map((c) => (
                    <td key={c.key} className={cellClass(c, focus)}>
                      {c.render ? c.render(row, idx) : row?.[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

/** Sel nama brand dengan titik warna brand. */
export const BrandCell = ({ name, colors }) => (
  <span className="ma-brand">
    <span className="ma-brand__dot" style={{ background: colors?.[name] || TOTAL_COLOR }} />
    {name}
  </span>
);

/** Tombol pilihan kecil (mis. memilih metrik grafik). */
export const Pills = ({ options, value, onChange }) => (
  <div className="btn-group ma-pills" role="group">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        className={`btn btn-sm btn-light${value === o.value ? " is-active" : ""}`}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);
