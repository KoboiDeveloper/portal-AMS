/**
 * Premium icon pack (100 PNG) — registry + helpers.
 * Usage: <PremiumIcon name="dashboard" /> or <Icon pack="premium" name="absensi" />
 *
 * Name aliases accepted:
 * - slug judul: "dashboard", "kata-sandi", "alur-kerja"
 * - nomor: "001", "072"
 * - filename stem: "001_Dashboard"
 */

const ctx = require.context("./premium", false, /\.png$/);

const bySlug = {};
const byNomor = {};
const byStem = {};
const catalog = [];

const toSlug = (text) =>
  String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

ctx.keys().forEach((key) => {
  const file = key.replace("./", "");
  const stem = file.replace(/\.png$/i, "");
  const match = stem.match(/^(\d{3})_(.+)$/);
  if (!match) return;
  const nomor = match[1];
  const judulFromFile = match[2].replace(/_/g, " ");
  const slug = toSlug(judulFromFile);
  const src = ctx(key);

  const entry = {
    nomor,
    judul: judulFromFile,
    slug,
    file,
    src,
  };

  catalog.push(entry);
  bySlug[slug] = entry;
  byNomor[nomor] = entry;
  byNomor[String(Number(nomor))] = entry;
  byStem[stem.toLowerCase()] = entry;
  byStem[stem] = entry;
});

catalog.sort((a, b) => a.nomor.localeCompare(b.nomor));

/** English / common aliases → slug */
const ALIASES = {
  home: "beranda",
  settings: "pengaturan",
  profile: "profil",
  users: "pengguna",
  user: "pengguna",
  department: "departemen",
  company: "perusahaan",
  notification: "notifikasi",
  notifications: "notifikasi",
  message: "pesan",
  messages: "pesan",
  mail: "email",
  calendar: "kalender",
  search: "pencarian",
  document: "dokumen",
  documents: "dokumen",
  archive: "arsip",
  upload: "unggah",
  download: "unduh",
  add: "tambah",
  create: "tambah",
  delete: "hapus",
  remove: "hapus",
  save: "simpan",
  print: "cetak",
  reload: "refresh",
  sync: "sinkronisasi",
  sort: "urutkan",
  share: "bagikan",
  link: "tautan",
  lock: "kunci",
  security: "keamanan",
  password: "kata-sandi",
  access: "akses",
  logout: "keluar",
  login: "masuk",
  help: "bantuan",
  info: "informasi",
  warning: "peringatan",
  finance: "keuangan",
  cash: "kas",
  payment: "pembayaran",
  invoice: "tagihan",
  budget: "anggaran",
  tax: "pajak",
  "profit-loss": "laba-rugi",
  sales: "penjualan",
  purchase: "pembelian",
  product: "produk",
  stock: "stok",
  warehouse: "gudang",
  customer: "pelanggan",
  store: "toko",
  price: "harga",
  discount: "diskon",
  shipping: "pengiriman",
  courier: "kurir",
  location: "lokasi",
  map: "peta",
  route: "rute",
  tracking: "pelacakan",
  employee: "karyawan",
  employees: "karyawan",
  attendance: "absensi",
  leave: "cuti",
  overtime: "lembur",
  recruitment: "rekrutmen",
  training: "pelatihan",
  performance: "kinerja",
  team: "tim",
  checklist: "checklist",
  finding: "temuan",
  risk: "risiko",
  workflow: "alur-kerja",
  task: "tugas",
  project: "proyek",
  analytics: "analitik",
  target: "target",
  growth: "pertumbuhan",
  compare: "perbandingan",
  integration: "integrasi",
  report: "laporan",
  reports: "laporan",
  approval: "approval",
  request: "pengajuan",
  printer: "cetak",
  "user-add": "tambah",
  "file-docs": "dokumen",
  "file-text": "dokumen",
  "check-circle": "absensi",
  inbox: "pengajuan",
  "map-pin": "lokasi",
  clock: "lembur",
  activity: "peringatan",
};

export const resolvePremiumIcon = (name) => {
  if (!name) return null;
  const raw = String(name).trim();
  const lower = raw.toLowerCase();
  const slug = toSlug(raw);

  return (
    bySlug[slug] ||
    bySlug[ALIASES[slug]] ||
    bySlug[ALIASES[lower]] ||
    byNomor[raw] ||
    byNomor[lower] ||
    byStem[raw] ||
    byStem[lower] ||
    null
  );
};

export const listPremiumIcons = () => catalog.slice();

export const premiumIconSrc = (name) => resolvePremiumIcon(name)?.src || null;

export default {
  resolvePremiumIcon,
  listPremiumIcons,
  premiumIconSrc,
};
