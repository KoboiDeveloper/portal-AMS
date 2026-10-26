const COA_CACHE_KEY = "store-kas-coa-by-id";

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(COA_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const normalizeCoaCode = (value) => {
  if (value == null) return "";
  return String(value).trim();
};

export const rememberKasCoa = (id, coaCode) => {
  const key = String(id ?? "").trim();
  const code = normalizeCoaCode(coaCode);
  if (!key || !code) return;
  const cache = readCache();
  cache[key] = code;
  try {
    sessionStorage.setItem(COA_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota */
  }
};

export const getCachedKasCoa = (id) => {
  const key = String(id ?? "").trim();
  if (!key) return "";
  return normalizeCoaCode(readCache()[key]);
};

/** Ambil kode COA dari object row / form item (scan key yang mengandung "coa"). */
export const resolveCoaCode = (source) => {
  if (!source || typeof source !== "object") return "";

  const bags = [source];
  if (source.raw && typeof source.raw === "object") bags.push(source.raw);

  const preferred = [
    "coa",
    "COA",
    "Coa",
    "coaCode",
    "COA_CODE",
    "coa_code",
    "codeCoa",
    "CodeCoa",
    "p_coa",
  ];

  for (const bag of bags) {
    for (const key of preferred) {
      const text = normalizeCoaCode(bag[key]);
      if (text) return text;
    }
  }

  for (const bag of bags) {
    for (const [key, val] of Object.entries(bag)) {
      if (key === "raw" || val == null || typeof val === "object") continue;
      if (!/coa/i.test(key)) continue;
      const text = normalizeCoaCode(val);
      if (text) return text;
    }
  }

  return getCachedKasCoa(source.id ?? source.raw?.id);
};

export const findCoaOption = (options, coaCode) => {
  const key = normalizeCoaCode(coaCode).toLowerCase();
  if (!key) return null;
  const list = Array.isArray(options) ? options : [];

  const exact =
    list.find((opt) => normalizeCoaCode(opt.value).toLowerCase() === key) ||
    list.find((opt) => normalizeCoaCode(opt.deskripsi).toLowerCase() === key);
  if (exact) return exact;

  // fallback: cocokkan tanpa leading zero / bandingkan numeric
  const keyNum = Number(key);
  if (!Number.isFinite(keyNum) || keyNum <= 0) return null;
  return (
    list.find((opt) => Number(normalizeCoaCode(opt.value)) === keyNum) || null
  );
};
