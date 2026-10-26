/**
 * Peta nama warna produk (dari SP) ke hex untuk swatch di detail produk.
 * Nama warna ditulis apa adanya; pencocokan dilakukan case/spasi-insensitif.
 */
const COLOR_HEX: Record<string, string> = {
  // Netral
  black: "#1A1A1A",
  "black combo": "#1A1A1A",
  white: "#FFFFFF",
  "off white": "#F5F0E8",
  ivory: "#FFFFF0",
  cream: "#FFFDD0",
  chalk: "#E8E4DC",
  almond: "#EFDECD",
  oatmilk: "#EDE3D2",
  cashmere: "#E3C8A9",
  chasmere: "#E3C8A9",
  champaigne: "#F7E7CE",
  champagne: "#F7E7CE",
  beige: "#D2B48C",
  khaki: "#C3B091",
  "vintage khaki": "#A2957F",
  taupe: "#8B7D6B",
  "abbey stone": "#A99F92",
  "pumice stone": "#C7C3BB",
  "misty grey": "#B6B8B3",
  "whitecap grey": "#D4D6D3",
  "rainy day": "#8E8D8A",
  "ultimate gray": "#939597",
  silver: "#C0C0C0",
  grey: "#9CA3AF",
  gray: "#9CA3AF",
  "light grey": "#D1D5DB",
  "dark grey": "#4B5563",
  "iron gate": "#5B6069",
  charcoal: "#36454F",

  // Merah - pink
  red: "#DC2626",
  "russet red": "#8E3B2F",
  maroon: "#7F1D1D",
  wine: "#722F37",
  coral: "#FF7F50",
  pink: "#F472B6",
  "soft pink": "#F7CAD0",
  "dusty pink": "#DCAEA9",
  "pink clay": "#DCA79C",
  "bridal rose": "#C08081",
  mauve: "#B08699",
  peach: "#FFBE98",

  // Oranye - kuning - cokelat
  orange: "#F97316",
  "orange brick": "#B44A29",
  terracotta: "#C1613C",
  "butter scotch": "#E3963E",
  butterscotch: "#E3963E",
  mustard: "#C9A227",
  gold: "#D4AF37",
  yellow: "#FACC15",
  "light yellow": "#FAF3A0",
  brown: "#7B4B2A",
  "light brown": "#B98B5E",
  "dark brown": "#5C3317",
  "marble brown": "#7C6A58",
  mocca: "#8C6A50",
  mocha: "#8C6A50",
  peat: "#46392B",

  // Hijau
  green: "#16A34A",
  "light green": "#86EFAC",
  "pale green": "#C8E6C9",
  "dark green": "#14532D",
  "green olive": "#6B8E23",
  olive: "#708238",
  sage: "#9CAF88",
  mint: "#A8E6CF",
  "dark moss": "#4A5D23",
  "sea kelp": "#62654F",
  "garden topiary": "#55604A",
  "alpine forst": "#2F4F3E",
  "alpine forest": "#2F4F3E",

  // Biru - tosca
  blue: "#2563EB",
  "light blue": "#93C5FD",
  "dark blue": "#1E3A8A",
  "medium blue": "#2C6BC9",
  "baby blue": "#A6D8F1",
  "powder blue": "#B0E0E6",
  "ash blue": "#9FB4C7",
  "till blue": "#4A7FB5",
  tillblue: "#4A7FB5",
  "coronet blue": "#5D89A8",
  "surf the web": "#20458C",
  "surf spray": "#BCD9D3",
  "naval academy": "#223A5E",
  navy: "#1B2A4A",
  teal: "#008080",
  "teal blue": "#17697B",
  aqua: "#35C2C8",
  tosca: "#37B9A9",
  hydrangea: "#9AA5CD",

  // Ungu
  purple: "#7C3AED",
  lilac: "#C8A2C8",
  "dusty lilac": "#BFA3C4",
  lavender: "#E6E6FA",
  plum: "#8E4585",
  "plum berry": "#722F4E",
  "midnight plum": "#402639",

  // Motif / campuran
  "all color": "#B0B7C3",
  "all colour": "#B0B7C3",
  "stripe white": "#FFFFFF",
  "stripe creme": "#FFFDD0",
  "stripe grey": "#9CA3AF",
  "stripe blue": "#2563EB",
  "stripe green": "#16A34A",
  "stripe brown": "#7B4B2A",
};

const FALLBACK_HEX = "#8091A7";

/** Dipakai saat nama warna tidak ada di peta, tapi mengandung kata warna dasar. */
const KEYWORD_FALLBACK: Array<[string, string]> = [
  ["black", "#1A1A1A"],
  ["white", "#FFFFFF"],
  ["ivory", "#FFFFF0"],
  ["cream", "#FFFDD0"],
  ["creme", "#FFFDD0"],
  ["navy", "#1B2A4A"],
  ["blue", "#2563EB"],
  ["teal", "#17697B"],
  ["aqua", "#35C2C8"],
  ["mint", "#A8E6CF"],
  ["olive", "#708238"],
  ["moss", "#4A5D23"],
  ["sage", "#9CAF88"],
  ["green", "#16A34A"],
  ["maroon", "#7F1D1D"],
  ["wine", "#722F37"],
  ["rose", "#C08081"],
  ["pink", "#F472B6"],
  ["red", "#DC2626"],
  ["peach", "#FFBE98"],
  ["orange", "#F97316"],
  ["mustard", "#C9A227"],
  ["gold", "#D4AF37"],
  ["yellow", "#FACC15"],
  ["khaki", "#C3B091"],
  ["beige", "#D2B48C"],
  ["taupe", "#8B7D6B"],
  ["mocca", "#8C6A50"],
  ["mocha", "#8C6A50"],
  ["brown", "#7B4B2A"],
  ["stone", "#C7C3BB"],
  ["charcoal", "#36454F"],
  ["silver", "#C0C0C0"],
  ["grey", "#9CA3AF"],
  ["gray", "#9CA3AF"],
  ["lilac", "#C8A2C8"],
  ["lavender", "#E6E6FA"],
  ["plum", "#8E4585"],
  ["mauve", "#B08699"],
  ["purple", "#7C3AED"],
];

const LOOKUP = new Map<string, string>();
for (const [name, hex] of Object.entries(COLOR_HEX)) {
  LOOKUP.set(spacedKey(name), hex);
  LOOKUP.set(compactKey(name), hex);
}

function spacedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compactKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Hex swatch untuk sebuah nama warna. Selalu mengembalikan warna valid. */
export function colorHexFor(color: string): string {
  const raw = (color || "").trim();
  if (!raw) return FALLBACK_HEX;

  const spaced = spacedKey(raw);
  const compact = compactKey(raw);
  const direct = LOOKUP.get(spaced) || LOOKUP.get(compact);
  if (direct) return direct;

  for (const [keyword, hex] of KEYWORD_FALLBACK) {
    if (compact.includes(keyword)) return hex;
  }
  return FALLBACK_HEX;
}

/**
 * Background CSS swatch. Warna motif (stripe / all color) digambar sebagai
 * pola supaya tidak terlihat sama dengan warna polosnya.
 */
export function colorSwatchBackground(color: string): string {
  const hex = colorHexFor(color);
  const spaced = spacedKey(color || "");

  if (spaced === "all color" || spaced === "all colour") {
    return "conic-gradient(#DC2626, #FACC15, #16A34A, #2563EB, #7C3AED, #DC2626)";
  }
  if (spaced.startsWith("stripe")) {
    const base = isLightColor(hex) ? "#8091A7" : "#FFFFFF";
    return `repeating-linear-gradient(45deg, ${hex} 0 5px, ${base} 5px 8px)`;
  }
  if (spaced.includes("combo")) {
    return `linear-gradient(135deg, ${hex} 0 50%, #FFFFFF 50% 100%)`;
  }
  return hex;
}

/** Warna terang perlu border/checklist gelap agar tetap terbaca. */
export function isLightColor(hex: string): boolean {
  const value = hex.replace("#", "");
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72;
}
