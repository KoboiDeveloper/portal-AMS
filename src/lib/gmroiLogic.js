const MONTH_MAP = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  mei: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  agu: 8,
  sep: 9,
  oct: 10,
  okt: 10,
  nov: 11,
  dec: 12,
  des: 12,
};

export const fmt = (n) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(n) || 0);
export const fmt1 = (n) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    Number(n) || 0
  );
export const compact = (n) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(
    Number(n) || 0
  );

export const monthNumber = (value) => {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 3);
  return MONTH_MAP[key] || 0;
};

export const parseArrival = (value, monthHint) => {
  if (!value) return null;
  const text = String(value).trim();
  const hint = monthNumber(monthHint);
  let y;
  let mo;
  let d;

  let m = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    y = Number(m[1]);
    mo = Number(m[2]);
    d = Number(m[3]);
    if (hint && mo !== hint && d === hint && mo <= 31) {
      const originalMonth = mo;
      mo = hint;
      d = originalMonth;
    }
    const dt = new Date(y, mo - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  m = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const first = Number(m[1]);
    const second = Number(m[2]);
    y = Number(m[3]);
    if (hint && first === hint && second <= 31) {
      mo = first;
      d = second;
    } else if (hint && second === hint && first <= 31) {
      mo = second;
      d = first;
    } else {
      mo = second;
      d = first;
    }
    const dt = new Date(y, mo - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const addThreeMonths = (date) => {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + 3);
  return d;
};

export const buildArticleMetrics = (rows) => {
  const map = {};
  rows.forEach((r) => {
    const art = String(r.ART || "").trim();
    if (!art) return;
    if (!map[art]) map[art] = { ART: art, IN: 0, OUT: 0, HPP: 0, NETTO: 0, AGING: null };
    const m = map[art];
    m.IN += Number(r.IN) || 0;
    m.OUT += Number(r.OUT) || 0;
    m.HPP += Number(r.HPP) || 0;
    m.NETTO += Number(r.NETTO) || 0;
    const d = parseArrival(r.AGING, r.BLN);
    if (d && (!m.AGING || d < m.AGING)) m.AGING = d;
  });
  Object.values(map).forEach((m) => {
    m.SELL_THROUGH = m.IN ? (m.OUT / m.IN) * 100 : 0;
    m.RECOVERY = m.HPP ? m.NETTO / m.HPP : 0;
  });
  return map;
};

export const arrivalDateFor = (r, artMetrics) => {
  const m = artMetrics?.[String(r.ART || "").trim()];
  if (m?.AGING) return m.AGING;
  return parseArrival(r.AGING, r.BLN);
};

export const ageDays = (r, artMetrics) => {
  const d = arrivalDateFor(r, artMetrics);
  if (!d) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - d) / 86400000));
};

export const evaluationDue = (r, artMetrics) => {
  const d = arrivalDateFor(r, artMetrics);
  return d ? addThreeMonths(d) : null;
};

export const treatmentStatus = (r, artMetrics) => {
  const m = artMetrics?.[String(r.ART || "").trim()] || r;
  const recovery = Number(m.RECOVERY) || 0;
  const due = evaluationDue(r, artMetrics);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (recovery >= 1) return "Balik Modal";
  if (due && today < due) return "Masa Evaluasi";
  return "Treatment";
};

export const sellThroughMatch = (st, bucket) => {
  const v = Number(st) || 0;
  if (!bucket) return true;
  if (bucket === "lt30") return v < 30;
  if (bucket === "30to50") return v >= 30 && v < 50;
  if (bucket === "50to70") return v >= 50 && v < 70;
  if (bucket === "gte70") return v >= 70;
  return true;
};

export const filterGmroiRows = (rows, artMetrics, filters) => {
  const {
    TOKO = "",
    CLASS = "",
    TAGLINE = "",
    KAT = "",
    THEMA = "",
    treatment = "",
    sellThrough = "",
    q = "",
  } = filters || {};
  const treatmentNorm = String(treatment || "")
    .trim()
    .toLowerCase();
  const query = String(q || "")
    .trim()
    .toLowerCase();

  return (rows || []).filter((r) => {
    if (TOKO && String(r.TOKO) !== TOKO) return false;
    if (CLASS && String(r.CLASS) !== CLASS) return false;
    if (TAGLINE && String(r.TAGLINE) !== TAGLINE) return false;
    if (KAT && String(r.KAT) !== KAT) return false;
    if (THEMA && String(r.THEMA) !== THEMA) return false;
    const m = artMetrics[String(r.ART || "").trim()] || r;
    if (treatmentNorm && String(treatmentStatus(r, artMetrics)).toLowerCase() !== treatmentNorm) {
      return false;
    }
    if (!sellThroughMatch(m.SELL_THROUGH, sellThrough)) return false;
    if (query) {
      const hay = [r.ART, r.PLU, r.TOKO, r.CLASS, r.TAGLINE, r.KAT, r.THEMA]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      if (!hay.includes(query)) return false;
    }
    return true;
  });
};

export const uniqValues = (rows, key) =>
  [...new Set((rows || []).map((x) => String(x[key] ?? "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "id")
  );

export const aggregateArticles = (rows, artMetrics) => {
  const map = {};
  rows.forEach((r) => {
    const art = String(r.ART || "").trim();
    if (!art) return;
    if (!map[art]) {
      map[art] = {
        ART: art,
        CLASS: r.CLASS || "",
        TAGLINE: r.TAGLINE || "",
        KAT: r.KAT || "",
        THEMA: r.THEMA || "",
        TOKO: new Set(),
        IN: 0,
        OUT: 0,
        STOCK: 0,
        HPP: 0,
        NETTO: 0,
        AGING: null,
      };
    }
    const m = map[art];
    if (r.TOKO) m.TOKO.add(String(r.TOKO));
    m.IN += Number(r.IN) || 0;
    m.OUT += Number(r.OUT) || 0;
    m.STOCK += Number(r.STOCK) || 0;
    m.HPP += Number(r.HPP) || 0;
    m.NETTO += Number(r.NETTO) || 0;
    const d = parseArrival(r.AGING, r.BLN);
    if (d && (!m.AGING || d < m.AGING)) m.AGING = d;
  });
  return Object.values(map).map((m) => {
    m.TOKO = [...m.TOKO].join(", ");
    m.SELL_THROUGH = m.IN ? (m.OUT / m.IN) * 100 : 0;
    m.RECOVERY = m.HPP ? m.NETTO / m.HPP : 0;
    return m;
  });
};

export const monthlyTrend = (rows) => {
  const order = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const normalize = {
    Jan: "Jan",
    Feb: "Feb",
    Mar: "Mar",
    Apr: "Apr",
    May: "Mei",
    Mei: "Mei",
    Jun: "Jun",
    Jul: "Jul",
    Aug: "Agu",
    Agu: "Agu",
    Sep: "Sep",
    Oct: "Okt",
    Okt: "Okt",
    Nov: "Nov",
    Dec: "Des",
    Des: "Des",
  };
  const data = Object.fromEntries(order.map((m) => [m, { IN: 0, OUT: 0 }]));
  rows.forEach((r) => {
    const key = normalize[String(r.BLN || "").slice(0, 3)] || String(r.BLN || "");
    if (data[key]) {
      data[key].IN += Number(r.IN) || 0;
      data[key].OUT += Number(r.OUT) || 0;
    }
  });
  return order.map((m) => ({ month: m, IN: data[m].IN, OUT: data[m].OUT }));
};

export const classNettoRanking = (rows) => {
  const map = {};
  rows.forEach((r) => {
    const k = String(r.CLASS || "Tidak diketahui").trim() || "Tidak diketahui";
    map[k] = (map[k] || 0) + (Number(r.NETTO) || 0);
  });
  return Object.entries(map)
    .filter(([k]) => k)
    .sort((a, b) => b[1] - a[1]);
};

export const formatDateID = (d) =>
  d
    ? d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

export const agingLabel = (r, artMetrics) => {
  const days = ageDays(r, artMetrics);
  const months = Math.floor(days / 30);
  return `${days} hari (${months} bln)`;
};
