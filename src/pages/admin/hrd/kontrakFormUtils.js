import { parseAppDate, formatAppDateYmd } from "../../../components/AppDateRangePicker";

const SATUAN_ID = [
  "",
  "SATU",
  "DUA",
  "TIGA",
  "EMPAT",
  "LIMA",
  "ENAM",
  "TUJUH",
  "DELAPAN",
  "SEMBILAN",
  "SEPULUH",
  "SEBELAS",
];

/** 2 → "DUA BULAN" */
export const terbilangBulan = (raw) => {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return "";
  let words = "";
  if (n < 12) words = SATUAN_ID[n];
  else if (n < 20) words = `${SATUAN_ID[n - 10]} BELAS`;
  else if (n < 100) {
    const puluh = Math.floor(n / 10);
    const sisa = n % 10;
    words = `${SATUAN_ID[puluh]} PULUH${sisa ? ` ${SATUAN_ID[sisa]}` : ""}`;
  } else {
    words = String(n);
  }
  return `${words} BULAN`;
};

/** tgl_mulai + N bulan → yyyy-mm-dd */
export const endDateFromStart = (startRaw, monthsRaw) => {
  const start = parseAppDate(startRaw);
  const months = Math.floor(Number(monthsRaw));
  if (!start || !Number.isFinite(months) || months <= 0) return "";
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return formatAppDateYmd(end);
};

/** Auto-isi terbilang + tanggal_berakhir saat lama_bulan / tgl_mulai berubah. */
export const applyKontrakAutoFields = (prev, name, value) => {
  const next = { ...prev, [name]: value };
  if (name === "lama_bulan") {
    next.terbilang = terbilangBulan(value);
    const end = endDateFromStart(next.tgl_mulai, value);
    if (end) next.tanggal_berakhir = end;
  } else if (name === "tgl_mulai") {
    const end = endDateFromStart(value, next.lama_bulan);
    if (end) next.tanggal_berakhir = end;
  }
  return next;
};
