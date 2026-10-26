import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
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
  Button,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import {
  getRegionalDashboardSummary,
  regionalDashboardStreamUrl,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRow, isSuccess } from "../../../lib/response";
import { storage } from "../../../lib/storage";
import { VectorMap } from "@react-jvectormap/core";
import { idnMerc } from "@react-jvectormap/indonesia";
import $ from "jquery";
import "./reg-dashboard-live.css";

/** Viewport fullscreen map — zoom + posisi tengah (idn mercator) */
/* zoom fullscreen: turun 3 step dari 2.05 (zoomStep 1.6) → ~1.0 */
const MAP_FOCUS_WIDE = { scale: 1, x: 0.56, y: 0.36, animate: true };
const MAP_FOCUS_NORM = { scale: 1, x: 0.5, y: 0.5, animate: false };

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const fmt = (n) =>
  Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const filterSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 32,
    height: 32,
    fontSize: "0.8125rem",
    borderColor: "#dbdfea",
    borderRadius: 0,
  }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 6px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 4px" }),
  menu: (base) => ({
    ...base,
    zIndex: 30,
    fontSize: "0.8125rem",
    borderRadius: 0,
  }),
  option: (base) => ({
    ...base,
    fontSize: "0.8125rem",
    padding: "6px 12px",
  }),
};

/** Province code (idnMerc) → pulau bucket (DT_Store.STORE_PULAU) */
const PROVINCE_TO_PULAU = {
  1: "SUMATERA",
  3: "SUMATERA",
  5: "SUMATERA",
  9: "SUMATERA",
  18: "SUMATERA",
  19: "SUMATERA",
  25: "SUMATERA",
  31: "SUMATERA",
  32: "SUMATERA",
  33: "SUMATERA",
  4: "JAWA",
  8: "JAWA",
  10: "JAWA",
  11: "JAWA",
  12: "JAWA",
  34: "JAWA",
  2: "BALI NUSA TENGGARA",
  22: "BALI NUSA TENGGARA",
  23: "BALI NUSA TENGGARA",
  13: "KALIMANTAN",
  14: "KALIMANTAN",
  15: "KALIMANTAN",
  16: "KALIMANTAN",
  17: "KALIMANTAN",
  6: "SULAWESI",
  26: "SULAWESI",
  27: "SULAWESI",
  28: "SULAWESI",
  29: "SULAWESI",
  30: "SULAWESI",
  20: "MALUKU",
  21: "MALUKU",
  7: "PAPUA",
  24: "PAPUA",
};

const normalizePulau = (p) => {
  const s = String(p || "")
    .trim()
    .toUpperCase();
  if (!s) return "UNKNOWN";
  if (s.includes("LOMBOK")) return "BALI NUSA TENGGARA";
  if (s.includes("BALI") || s.includes("NUSA")) return "BALI NUSA TENGGARA";
  if (s.includes("SUMATER")) return "SUMATERA";
  if (s.includes("JAWA")) return "JAWA";
  if (s.includes("KALIMANT")) return "KALIMANTAN";
  if (s.includes("SULAWESI")) return "SULAWESI";
  if (s.includes("MALUKU")) return "MALUKU";
  if (s.includes("PAPUA") || s.includes("IRIAN")) return "PAPUA";
  if (s.includes("ONLINE")) return "ONLINE";
  return s;
};

const pulauSales = (byKey, pulau) => {
  const key = normalizePulau(pulau);
  const row = byKey[key];
  if (row) return Number(row.sales || 0);
  // merge legacy LOMBOK bucket into Bali-Nusa for painting
  if (key === "BALI NUSA TENGGARA" && byKey.LOMBOK) return Number(byKey.LOMBOK.sales || 0);
  return 0;
};

/** Posisi radar overlay di canvas map (persen) */
const PULAU_RADAR_POS = {
  SUMATERA: { left: "18%", top: "48%" },
  JAWA: { left: "40%", top: "74%" },
  "BALI NUSA TENGGARA": { left: "54%", top: "76%" },
  KALIMANTAN: { left: "44%", top: "42%" },
  SULAWESI: { left: "60%", top: "44%" },
  MALUKU: { left: "72%", top: "50%" },
  PAPUA: { left: "86%", top: "46%" },
};

const tickerSig = (ticker) => {
  const rows = Array.isArray(ticker) ? ticker : [];
  if (!rows.length) return "";
  const head = rows.slice(0, 3);
  return head.map((r) => `${r.ts}|${r.store_id}|${r.amount}`).join(";");
};

const Skel = ({ w = "60%", h = 14 }) => (
  <span className="reg-skel" style={{ width: w, height: h, display: "inline-block" }} aria-hidden />
);

const PctText = ({ value }) => {
  const n = Number(value || 0);
  if (!n) return <span>~</span>;
  const down = n < 0;
  return (
    <span className={down ? "down" : "up"}>
      {down ? "▼" : "▲"} {Math.abs(n)}%
    </span>
  );
};

const HIDDEN_TOP_STORES = new Set([
  "01E",
  "02E",
  "03E",
  "04E",
  "05E",
  "06E",
  "07E",
  "08E",
  "09E",
  "10E",
  "11E",
]);

const hideMapTips = () => {
  document.querySelectorAll(".jvectormap-tip").forEach((el) => {
    el.style.display = "none";
  });
};

const LiveMap = ({
  mapPulau,
  mapKota,
  ticker,
  selected,
  onSelect,
  mapFs,
  onToggleMapFs,
  mapWrapRef,
}) => {
  const [hovered, setHovered] = useState("");
  const [radarPulau, setRadarPulau] = useState("");
  const [radarKey, setRadarKey] = useState(0);
  const byKeyRef = useRef({});
  const mapObjRef = useRef(null);
  const prevTickerSigRef = useRef("");
  const prevMapFsRef = useRef(mapFs);
  const activePulau = selected || hovered;

  /* Saat mapFs berubah (tombol / Escape), kosongkan ref SEBELUM VectorMap layout
     supaya library re-bind mapObject — tanpa ini setFocus/zoom no-op */
  if (prevMapFsRef.current !== mapFs) {
    mapObjRef.current = null;
    prevMapFsRef.current = mapFs;
  }

  const resolveMap = useCallback(() => {
    try {
      if (mapObjRef.current?.setFocus) return mapObjRef.current;
      const node = mapWrapRef?.current?.querySelector?.(".reg-jvector-map");
      if (!node) return null;
      const map = $(node).vectorMap("get", "mapObject");
      if (map) mapObjRef.current = map;
      return map || null;
    } catch {
      return null;
    }
  }, [mapWrapRef]);

  /* Setelah expand/collapse: rebind mapObject + zoom/center */
  useEffect(() => {
    hideMapTips();
    const sync = (animate) => {
      try {
        const map = resolveMap();
        if (!map) return;
        map.updateSize?.();
        if (typeof map.setFocus !== "function") return;
        const focus = mapFs
          ? { ...MAP_FOCUS_WIDE, animate: !!animate }
          : MAP_FOCUS_NORM;
        map.setFocus(focus);
      } catch {
        /* ignore */
      }
    };
    const t0 = window.setTimeout(() => sync(false), 30);
    const t1 = window.setTimeout(() => sync(false), 120);
    const t2 = window.setTimeout(() => sync(true), 560);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [mapFs, resolveMap]);

  const byKey = useMemo(() => {
    const m = {};
    (Array.isArray(mapPulau) ? mapPulau : []).forEach((r) => {
      const k = normalizePulau(r.pulau);
      if (!m[k]) {
        m[k] = { ...r, pulau: k, sales: 0, trx: 0 };
      }
      m[k].sales += Number(r.sales || 0);
      m[k].trx += Number(r.trx || 0);
    });
    return m;
  }, [mapPulau]);

  byKeyRef.current = byKey;

  const regionValues = useMemo(() => {
    const values = {};
    Object.entries(PROVINCE_TO_PULAU).forEach(([code, pulau]) => {
      values[String(code)] = pulauSales(byKey, pulau);
    });
    return values;
  }, [byKey]);

  /** Pulau sales tertinggi (realtime) */
  const topPulau = useMemo(() => {
    const rows = Object.values(byKey).filter((r) => {
      const k = normalizePulau(r.pulau);
      return k && k !== "ONLINE" && k !== "UNKNOWN";
    });
    if (!rows.length) return "";
    rows.sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0));
    return normalizePulau(rows[0].pulau);
  }, [byKey]);

  const topRegionCodes = useMemo(
    () =>
      Object.entries(PROVINCE_TO_PULAU)
        .filter(([, p]) => p === topPulau)
        .map(([c]) => String(c)),
    [topPulau]
  );

  /** Sales baru dari ticker → radar pulse di pulau terkait */
  useEffect(() => {
    const sig = tickerSig(ticker);
    if (!sig) return;
    if (!prevTickerSigRef.current) {
      prevTickerSigRef.current = sig;
      return;
    }
    if (sig === prevTickerSigRef.current) return;
    prevTickerSigRef.current = sig;
    const newest = Array.isArray(ticker) ? ticker[0] : null;
    const pulau = normalizePulau(newest?.pulau);
    if (!pulau || pulau === "ONLINE" || pulau === "UNKNOWN" || !PULAU_RADAR_POS[pulau]) return;
    setRadarPulau(pulau);
    setRadarKey((k) => k + 1);
    const t = window.setTimeout(() => setRadarPulau(""), 3200);
    return () => window.clearTimeout(t);
  }, [ticker]);

  useEffect(() => () => hideMapTips(), []);

  /* Sync highlight pulau top saat ranking berubah (realtime) */
  useEffect(() => {
    try {
      const map = mapObjRef.current;
      if (!map?.setSelectedRegions) return;
      map.clearSelectedRegions?.();
      if (topRegionCodes.length) map.setSelectedRegions(topRegionCodes);
    } catch {
      /* ignore */
    }
  }, [topRegionCodes]);

  const tip = activePulau
    ? byKey[activePulau]
    : topPulau
      ? byKey[topPulau]
      : Object.values(byKey)
          .filter((r) => normalizePulau(r.pulau) !== "ONLINE")
          .sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))[0];

  const tipPulau = tip ? normalizePulau(tip.pulau) : "";

  const kotaFiltered = useMemo(() => {
    const rows = Array.isArray(mapKota) ? mapKota : [];
    const sel = activePulau || tipPulau;
    const filtered = rows.filter((r) => !sel || normalizePulau(r.pulau) === sel);
    /* normal: max 20 (viewport 5 row + scroll); fullscreen: semua + scroll */
    return mapFs ? filtered : filtered.slice(0, 20);
  }, [mapKota, activePulau, tipPulau, mapFs]);

  const onlineRow = byKey.ONLINE;
  const topPos = topPulau ? PULAU_RADAR_POS[topPulau] : null;
  const hitPos = radarPulau ? PULAU_RADAR_POS[radarPulau] : null;

  return (
    <div className="reg-map-wrap" ref={mapWrapRef}>
      <div className="reg-map-canvas">
        <button
          type="button"
          className="reg-map-fs-btn"
          onClick={() => {
            hideMapTips();
            mapObjRef.current = null;
            onToggleMapFs();
          }}
          title={mapFs ? "Kecilkan map" : "Perbesar Live Map"}
          aria-label={mapFs ? "Kecilkan map" : "Perbesar Live Map"}
        >
          <Icon name={mapFs ? "minimize" : "maximize"} />
        </button>
        <VectorMap
          key={mapFs ? "reg-live-idn-map-wide" : "reg-live-idn-map"}
          mapRef={mapObjRef}
          map={idnMerc}
          backgroundColor="transparent"
          className="reg-jvector-map"
          style={{ width: "100%", height: "100%" }}
          zoomOnScroll
          zoomButtons
          focusOn={mapFs ? MAP_FOCUS_WIDE : MAP_FOCUS_NORM}
          selectedRegions={topRegionCodes}
          regionStyle={{
            initial: {
              fill: "#d7dde8",
              fillOpacity: 1,
              stroke: "#ffffff",
              strokeWidth: 0.6,
              strokeOpacity: 1,
            },
            hover: {
              fill: "#0f2e57",
              fillOpacity: 0.92,
              cursor: "pointer",
            },
            selected: {
              fill: "#0a2345",
              stroke: "#1ee0ac",
              strokeWidth: 1.4,
            },
            selectedHover: {
              fill: "#0f2e57",
              stroke: "#1ee0ac",
              strokeWidth: 1.4,
            },
          }}
          series={{
            regions: [
              {
                attribute: "fill",
                values: regionValues,
                scale: ["#e8ecf2", "#0f2e57"],
                normalizeFunction: "polynomial",
              },
            ],
          }}
          onRegionOver={(e, code) => {
            const pulau = PROVINCE_TO_PULAU[String(code)] || PROVINCE_TO_PULAU[Number(code)];
            if (pulau) setHovered(pulau);
          }}
          onRegionOut={() => {
            setHovered("");
          }}
          onRegionTipShow={(e, el, code) => {
            const pulau = PROVINCE_TO_PULAU[String(code)] || PROVINCE_TO_PULAU[Number(code)];
            const row = pulau ? byKeyRef.current[pulau] : null;
            const name = typeof el.html === "function" ? el.html() : String(el.textContent || "");
            const crown = pulau && pulau === topPulau ? " ★ TOP" : "";
            const html = row
              ? `${name}<br/><strong>${pulau}${crown}</strong><br/>${fmt(row.sales)} · ${fmt(row.trx)} trx · ${Number(
                  row.share_pct || 0
                )}%`
              : `${name}<br/>${pulau || "—"} · belum ada sales`;
            if (typeof el.html === "function") el.html(html);
            else el.innerHTML = html;
            if (typeof el.css === "function") el.css({ display: "block", opacity: 1 });
            else {
              el.style.display = "block";
              el.style.opacity = "1";
            }
          }}
          onRegionClick={(e, code) => {
            hideMapTips();
            const pulau = PROVINCE_TO_PULAU[String(code)] || PROVINCE_TO_PULAU[Number(code)];
            if (!pulau) return;
            onSelect(selected === pulau ? "" : pulau);
          }}
        />

        {topPos ? (
          <span
            className="reg-map-radar is-top"
            style={{ left: topPos.left, top: topPos.top }}
            title={`Top sales · ${topPulau}`}
          >
            <span className="reg-map-radar-ring" />
            <span className="reg-map-radar-ring is-delay" />
            <span className="reg-map-radar-core" />
          </span>
        ) : null}

        {hitPos && radarPulau !== topPulau ? (
          <span
            key={`hit-${radarKey}`}
            className="reg-map-radar is-hit"
            style={{ left: hitPos.left, top: hitPos.top }}
            title={`Sales baru · ${radarPulau}`}
          >
            <span className="reg-map-radar-ring" />
            <span className="reg-map-radar-ring is-delay" />
            <span className="reg-map-radar-core" />
          </span>
        ) : null}
        {hitPos && radarPulau === topPulau ? (
          <span
            key={`hit-top-${radarKey}`}
            className="reg-map-radar is-hit is-on-top"
            style={{ left: hitPos.left, top: hitPos.top }}
            title={`Sales baru · ${radarPulau}`}
          >
            <span className="reg-map-radar-ring is-hit-ring" />
          </span>
        ) : null}
      </div>

      <div className="reg-map-tip">
        {tip ? (
          <>
            <strong>{tipPulau}</strong>
            {tipPulau && tipPulau === topPulau ? " · TOP" : ""}
            {radarPulau === tipPulau ? " · LIVE" : ""} · {fmt(tip.sales)} · {fmt(tip.trx)} trx
            {tip.share_pct != null ? ` · ${Number(tip.share_pct || 0)}%` : ""}
            {onlineRow ? ` · Online ${fmt(onlineRow.sales)}` : ""}
          </>
        ) : (
          "Hover / klik provinsi untuk filter pulau"
        )}
      </div>

      <ul className="reg-kota-list">
        {kotaFiltered.length === 0 ? (
          <li>
            <span>Belum ada kota</span>
            <span>—</span>
          </li>
        ) : (
          kotaFiltered.map((r, i) => (
            <li key={`${r.kota}-${i}`}>
              <span>
                {r.kota}
                {r.pulau ? ` · ${r.pulau}` : ""}
              </span>
              <span>{fmt(r.sales)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

const RegDashboardPage = () => {
  const [brandId, setBrandId] = useState("ALL");
  const [brandOpts, setBrandOpts] = useState([{ value: "ALL", label: "ALL BRAND" }]);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** connecting | live | stale — CONNECTING only before SSE opens */
  const [conn, setConn] = useState("connecting");
  const [updatedAgo, setUpdatedAgo] = useState(0);
  const [selectedPulau, setSelectedPulau] = useState("");
  const [tickFlash, setTickFlash] = useState(0);
  const [warming, setWarming] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapFs, setIsMapFs] = useState(false);
  const esRef = useRef(null);
  const lastRefreshRef = useRef(null);
  const boardRef = useRef(null);
  const mapWrapRef = useRef(null);
  const asof = todayYmd();

  useEffect(() => {
    const onFs = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(Boolean(el && boardRef.current && el === boardRef.current));
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  const requestFs = useCallback(async (el) => {
    if (!el) return;
    try {
      const active = document.fullscreenElement || document.webkitFullscreenElement;
      if (active && active === el) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        return;
      }
      if (active) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {
      /* browser blocked fullscreen */
    }
  }, []);

  /* Header = whole board FS; map icon = Live Map saja melebar di bawah KPI */
  const toggleFullscreen = useCallback(() => requestFs(boardRef.current), [requestFs]);
  const toggleMapFs = useCallback(() => setIsMapFs((v) => !v), []);

  useEffect(() => {
    if (!isMapFs) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setIsMapFs(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMapFs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opts = await regionalLookupOptions("brand");
      if (!cancelled) {
        const withAll = [{ value: "ALL", label: "ALL BRAND" }, ...opts.filter((o) => o.value !== "ALL")];
        setBrandOpts(withAll);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const brandValue = useMemo(
    () => brandOpts.find((o) => String(o.value) === String(brandId)) || brandOpts[0],
    [brandOpts, brandId]
  );

  const applyPayload = useCallback((row, m) => {
    const metaRow = m || row?._meta || null;
    setData(row || {});
    setMeta(metaRow);
    setError("");
    setTickFlash((n) => n + 1);
    const refreshed = metaRow?.refreshed_at;
    if (refreshed) {
      lastRefreshRef.current = new Date(refreshed).getTime();
    } else {
      lastRefreshRef.current = Date.now();
    }
    const isWarming = metaRow?.cache === "warming";
    setWarming(Boolean(isWarming));
    if (!isWarming) setConn((c) => (c === "stale" ? "live" : c === "connecting" ? "live" : c));
  }, []);

  const loadWarm = useCallback(async () => {
    setLoading(true);
    setError("");
    setWarming(true);
    try {
      const res = await getRegionalDashboardSummary({
        from_date: asof,
        to_date: asof,
        id_brand: !brandId || brandId === "ALL" ? "" : brandId,
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat dashboard");
        setData(null);
        return;
      }
      const row = extractRow(res) || {};
      applyPayload(row, row._meta || { cache: "warm" });
    } catch (e) {
      setError(e?.message || e?.responseMessage || "Gagal memuat dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [asof, brandId, applyPayload]);

  useEffect(() => {
    loadWarm();
  }, [loadWarm]);

  /* SSE live stream — keep LIVE while socket open; warming ≠ disconnect */
  useEffect(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    const token = storage.getToken();
    if (!token) {
      setConn("stale");
      return undefined;
    }

    setConn("connecting");
    const url = regionalDashboardStreamUrl({
      from_date: asof,
      to_date: asof,
      id_brand: !brandId || brandId === "ALL" ? "" : brandId,
      access_token: token,
    });

    let es;
    let retryTimer;
    let closed = false;
    const connect = () => {
      if (closed) return;
      es = new EventSource(url);
      esRef.current = es;
      es.addEventListener("snapshot", (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          applyPayload(payload.data || {}, payload.meta || {});
          setWarming(false);
          setConn("live");
          setLoading(false);
        } catch {
          /* ignore parse */
        }
      });
      es.addEventListener("status", (ev) => {
        try {
          const payload = JSON.parse(ev.data || "{}");
          if (payload.state === "warming") {
            setWarming(true);
            // still connected — do not flip to CONNECTING
            setConn((c) => (c === "connecting" ? "live" : c));
          } else if (payload.state === "no_redis") {
            setConn("stale");
          }
        } catch {
          /* ignore */
        }
      });
      es.onopen = () => setConn("live");
      es.onerror = () => {
        // Browser auto-reconnects unless CLOSED; only mark stale + manual retry then.
        if (!es || es.readyState === EventSource.CLOSED) {
          setConn("stale");
          if (!closed) retryTimer = setTimeout(connect, 4000);
        } else {
          setConn((c) => (c === "live" ? "connecting" : c));
        }
      };
    };
    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (esRef.current) esRef.current.close();
      esRef.current = null;
    };
  }, [asof, brandId, applyPayload]);

  /* updated Xs ago clock */
  useEffect(() => {
    const id = setInterval(() => {
      if (!lastRefreshRef.current) return;
      const sec = Math.max(0, Math.floor((Date.now() - lastRefreshRef.current) / 1000));
      setUpdatedAgo(sec);
      if (sec > 90) setConn((c) => (c === "live" ? "stale" : c));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const series7 = Array.isArray(data?.sales_7d) ? data.sales_7d : [];
  const topStores = (Array.isArray(data?.stores_top) ? data.stores_top : []).filter(
    (r) => !HIDDEN_TOP_STORES.has(String(r.store || "").trim().toUpperCase())
  );
  const mapPulau = Array.isArray(data?.map_pulau) ? data.map_pulau : [];
  const mapKota = Array.isArray(data?.map_kota) ? data.map_kota : [];
  const ticker = Array.isArray(data?.ticker) ? data.ticker : [];

  const topPulauToday = useMemo(() => {
    const rows = mapPulau
      .map((r) => ({ ...r, pulau: normalizePulau(r.pulau), sales: Number(r.sales || 0) }))
      .filter((r) => r.pulau && r.pulau !== "ONLINE" && r.pulau !== "UNKNOWN");
    if (!rows.length) return null;
    rows.sort((a, b) => b.sales - a.sales);
    return rows[0];
  }, [mapPulau]);

  const topKotaToday = useMemo(() => {
    const rows = mapKota
      .map((r) => ({
        ...r,
        kota: String(r.kota || "").trim().toUpperCase(),
        pulau: normalizePulau(r.pulau),
        sales: Number(r.sales || 0),
      }))
      .filter((r) => r.kota && r.kota !== "UNKNOWN" && r.pulau !== "ONLINE");
    if (!rows.length) return null;
    rows.sort((a, b) => b.sales - a.sales);
    return rows[0];
  }, [mapKota]);

  const lineData = useMemo(
    () => ({
      labels: series7.map((r) => String(r.date || "").slice(5) || r.date),
      datasets: [
        {
          label: "Offline",
          data: series7.map((r) => Number(r.offline || 0)),
          borderColor: "#0f2e57",
          backgroundColor: "rgba(15, 46, 87, 0.1)",
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.3,
          fill: true,
        },
        {
          label: "Online",
          data: series7.map((r) => Number(r.online || 0)),
          borderColor: "#526484",
          backgroundColor: "rgba(82, 100, 132, 0.1)",
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.3,
          fill: true,
        },
      ],
    }),
    [series7]
  );

  const chartOptions = useMemo(
    () => ({
      plugins: {
        legend: { position: "top", labels: { boxWidth: 10, font: { size: 10 }, color: "#526484" } },
        tooltip: {
          backgroundColor: "#0f2e57",
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.raw)}` },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(219, 223, 234, 0.8)" },
          ticks: {
            color: "#8094ae",
            font: { size: 10 },
            callback: (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}Jt` : fmt(v)),
          },
        },
        x: { grid: { display: false }, ticks: { color: "#8094ae", font: { size: 10 } } },
      },
      maintainAspectRatio: false,
    }),
    []
  );

  const badgeClass = `reg-live-badge${conn === "live" ? " is-live" : ""}${conn === "stale" ? " is-stale" : ""}`;
  const badgeLabel =
    conn === "live"
      ? warming
        ? "LIVE · WARMING"
        : "LIVE"
      : conn === "stale"
        ? "STALE"
        : "CONNECTING";

  return (
    <AccessGuard moduleCode="REG_DASHBOARD" permission="VIEW">
      <Head title="Regional Live Board" />
      <Content>
        <div
          className={`reg-live${isFullscreen ? " is-fullscreen" : ""}`}
          ref={boardRef}
        >
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3" className="reg-live-brand">
                  AMS Regional Live
                </BlockTitle>
                <BlockDes className="reg-live-sub">
                  Papan operasi penjualan · {data?.as_of || asof}
                  {meta?.cache ? ` · cache ${meta.cache}` : ""}
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <div className="reg-filters">
                  <span className={badgeClass}>
                    {badgeLabel} · updated {updatedAgo}s ago
                  </span>
                  <div style={{ minWidth: 160 }}>
                    <RSelect
                      styles={filterSelectStyles}
                      isSearchable
                      placeholder="Brand"
                      options={brandOpts}
                      value={brandValue}
                      onChange={(opt) => setBrandId(opt?.value != null ? String(opt.value) : "ALL")}
                    />
                  </div>
                  <Button
                    color="primary"
                    size="sm"
                    outline
                    onClick={loadWarm}
                    disabled={loading}
                    style={{ borderRadius: 0, borderColor: "#0f2e57", color: "#0f2e57" }}
                    title="Refresh"
                    aria-label="Refresh"
                  >
                    <Icon name="reload" />
                  </Button>
                  <Button
                    color="primary"
                    size="sm"
                    outline
                    onClick={toggleFullscreen}
                    style={{ borderRadius: 0, borderColor: "#0f2e57", color: "#0f2e57" }}
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    <Icon name={isFullscreen ? "minimize" : "maximize"} />
                  </Button>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          {error && !data ? (
            <Block>
              <div className="reg-panel">
                <div className="reg-empty">
                  <p className="text-danger mb-2">{error}</p>
                  <Button color="primary" size="sm" onClick={loadWarm}>
                    Coba lagi
                  </Button>
                </div>
              </div>
            </Block>
          ) : (
            <Block>
              {/* Area fullscreen map: KPI → WTD/MTD → trend/map/top store (sampai sebelum live sales) */}
              <div className={`reg-live-ops${isMapFs ? " is-map-wide" : ""}`}>
                <div className="reg-kpi-strip">
                  <div className="reg-kpi">
                    <div className="reg-kpi-label">Sales hari ini</div>
                    <div className={`reg-kpi-value${tickFlash ? " tick" : ""}`} key={`s-${tickFlash}`}>
                      {loading && !data ? <Skel w="70%" h={22} /> : fmt(data?.sales_today)}
                    </div>
                    <div className="reg-kpi-meta">
                      <PctText value={data?.sales_today_pct} /> vs kemarin
                    </div>
                  </div>
                  <div className="reg-kpi">
                    <div className="reg-kpi-label">Offline</div>
                    <div className="reg-kpi-value">
                      {loading && !data ? <Skel /> : fmt(data?.sales_offline_today)}
                    </div>
                    <div className="reg-kpi-meta">
                      <PctText value={data?.sales_offline_pct} />
                    </div>
                  </div>
                  <div className="reg-kpi">
                    <div className="reg-kpi-label">Online</div>
                    <div className="reg-kpi-value">
                      {loading && !data ? <Skel /> : fmt(data?.sales_online_today)}
                    </div>
                    <div className="reg-kpi-meta">
                      <PctText value={data?.sales_online_pct} />
                    </div>
                  </div>
                  <div className="reg-kpi">
                    <div className="reg-kpi-label">Trx</div>
                    <div className="reg-kpi-value">{loading && !data ? <Skel /> : fmt(data?.trx_today)}</div>
                    <div className="reg-kpi-meta">
                      <PctText value={data?.trx_today_pct} />
                    </div>
                  </div>
                  <div className="reg-kpi">
                    <div className="reg-kpi-label">Store aktif</div>
                    <div className="reg-kpi-value">
                      {loading && !data ? <Skel /> : fmt(data?.active_store_count)}
                    </div>
                    <div className="reg-kpi-meta">scoped brand</div>
                  </div>
                </div>

                <div className="reg-spark-row">
                  <div className="reg-spark">
                    <div className="reg-spark-label">WTD</div>
                    <div className="reg-spark-value">{fmt(data?.sales_week)}</div>
                  </div>
                  <div className="reg-spark">
                    <div className="reg-spark-label">MTD</div>
                    <div className="reg-spark-value">{fmt(data?.sales_month)}</div>
                  </div>
                  <div className="reg-spark">
                    <div className="reg-spark-label">Pulau tertinggi</div>
                    <div className="reg-spark-value reg-spark-name">
                      {loading && !data ? <Skel w="60%" /> : topPulauToday?.pulau || "—"}
                    </div>
                    <div className="reg-spark-meta">
                      {topPulauToday ? fmt(topPulauToday.sales) : "—"}
                      {topPulauToday?.share_pct != null ? ` · ${Number(topPulauToday.share_pct)}%` : ""}
                    </div>
                  </div>
                  <div className="reg-spark">
                    <div className="reg-spark-label">Kota tertinggi</div>
                    <div className="reg-spark-value reg-spark-name">
                      {loading && !data ? <Skel w="60%" /> : topKotaToday?.kota || "—"}
                    </div>
                    <div className="reg-spark-meta">
                      {topKotaToday ? fmt(topKotaToday.sales) : "—"}
                      {topKotaToday?.pulau ? ` · ${topKotaToday.pulau}` : ""}
                    </div>
                  </div>
                </div>

                <div className="reg-stage">
                  <div className="reg-panel">
                    <h6 className="reg-panel-title">Trend Offline vs Online</h6>
                    <div className="reg-panel-body reg-panel-body-fill">
                      {loading && !series7.length ? (
                        <div className="reg-empty">
                          <Skel w="100%" h={180} />
                        </div>
                      ) : series7.length ? (
                        <div className="reg-chart-fill">
                          <Line data={lineData} options={chartOptions} />
                        </div>
                      ) : (
                        <div className="reg-empty">Belum ada tren 7 hari</div>
                      )}
                    </div>
                  </div>

                  <div className="reg-panel reg-panel-map">
                    <h6 className="reg-panel-title">Live Map Sales</h6>
                    <div className="reg-panel-body">
                      <LiveMap
                        mapPulau={mapPulau}
                        mapKota={mapKota}
                        ticker={ticker}
                        selected={selectedPulau}
                        onSelect={setSelectedPulau}
                        mapFs={isMapFs}
                        onToggleMapFs={toggleMapFs}
                        mapWrapRef={mapWrapRef}
                      />
                    </div>
                  </div>

                  <div className="reg-panel">
                    <h6 className="reg-panel-title">Top store hari ini</h6>
                    <div className="reg-panel-body reg-panel-body-fill">
                      {!topStores.length ? (
                        <div className="reg-empty">{loading ? <Skel w="80%" /> : "Belum ada ranking"}</div>
                      ) : (
                        <ol className="reg-rank">
                          {topStores.map((r, i) => {
                            const code = r.store || r.store_name || "—";
                            const kota = r.kota && r.kota !== "UNKNOWN" ? String(r.kota).toUpperCase() : "";
                            const label = kota ? `${code} · ${kota}` : code;
                            return (
                              <li key={r.store || i}>
                                <span className="rk">{i + 1}</span>
                                <span className="nm" title={r.store_name || label}>
                                  {label}
                                </span>
                                <span className="amt">{fmt(r.total)}</span>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="reg-ticker">
                <div className="reg-ticker-head">
                  <h6 className="reg-panel-title" style={{ margin: 0, border: 0, padding: 0 }}>
                    Live sales penjualan
                  </h6>
                  <span style={{ fontSize: "0.7rem", color: "#8094ae" }}>{ticker.length} baris</span>
                </div>
                <div className="reg-ticker-feed">
                  {!ticker.length ? (
                    <div className="reg-empty" style={{ padding: 16 }}>
                      Menunggu transaksi…
                    </div>
                  ) : (
                    ticker.map((row, i) => {
                      const ts = String(row.ts || "").replace("T", " ").slice(11, 19);
                      return (
                        <div className="reg-ticker-row" key={`${row.store_id}-${row.ts}-${i}`}>
                          <span className="ts">{ts || "—"}</span>
                          <span className="store" title={row.store_name}>
                            {row.store_name || row.store_id}
                            {row.kota ? ` · ${row.kota}` : ""}
                          </span>
                          <span className="ch">{row.channel || "—"}</span>
                          <span className="amt">{fmt(row.amount)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Block>
          )}
        </div>
      </Content>
    </AccessGuard>
  );
};

export default RegDashboardPage;
