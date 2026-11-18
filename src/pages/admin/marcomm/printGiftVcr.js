/** Client print for gift reward — parity Crystal RPT_VCR / PENGAJUAN CETAK VOUCHER. */

const money = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return String(value ?? "");
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return raw;
};

/** Resolve PENERIMA from Tempat Penukaran + Brand/Store. */
export function resolveGiftPenerima({ tipe_penerima, brand, store, storeLabel }) {
  const tipe = String(tipe_penerima || "").trim().toUpperCase();
  const b = String(brand || "").trim();
  const s = String(storeLabel || store || "").trim();
  if (tipe === "ALL" || !tipe) return "ALL";
  if (tipe === "BRAND") return b || "BRAND";
  if (tipe === "STORE") {
    if (b && s) return `${b} / ${s}`;
    return s || b || "STORE";
  }
  return [tipe, b, s].filter(Boolean).join(" ");
}

export function openGiftPrintWindow() {
  const w = window.open("about:blank", "_blank", "width=900,height=720");
  if (!w) return null;
  try {
    w.document.open();
    w.document.write(
      `<!DOCTYPE html><html><head><title>PENGAJUAN CETAK VOUCHER</title></head>` +
        `<body style="font-family:Arial,sans-serif;padding:24px">Memuat...</body></html>`
    );
    w.document.close();
  } catch {
    /* ignore */
  }
  return w;
}

export function writeGiftPrintWindow(w, html) {
  if (!w || w.closed) throw new Error("Jendela print sudah ditutup");
  w.document.open();
  w.document.write(html);
  w.document.close();
  try {
    w.focus();
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    try {
      w.print();
    } catch {
      /* ignore */
    }
  }, 300);
}

/**
 * @param {{ nominal, qty, penerima, brand, store, from_date, to_date, id_voucher }} header
 * @param {Array<{ NO_VOUCHER, BRAND, STORE, nominal }>} details
 */
export function buildGiftVcrPrintHtml(header, details) {
  const rows = Array.isArray(details) ? details : [];
  const total = rows.reduce((sum, r) => {
    const n = Number(String(r.nominal ?? r.NOMINAL ?? "").replace(/[^\d.-]/g, ""));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const perVoucher = header.nominal || (rows[0] && (rows[0].nominal ?? rows[0].NOMINAL)) || total;
  const brand = header.brand || rows[0]?.BRAND || rows[0]?.brand || "";
  const store = header.store || rows[0]?.STORE || rows[0]?.store || "";
  const penerima = String(header.penerima || "").trim() || brand || "ALL";

  const bodyRows = rows.length
    ? rows
        .map(
          (r, idx) => `<tr>
      <td class="c">${idx + 1}</td>
      <td class="c">${esc(r.NO_VOUCHER || r.no_voucher || "")}</td>
      <td class="c">${esc(r.BRAND || r.brand || brand)}</td>
      <td class="c">${esc(r.STORE || r.store || store)}</td>
      <td class="r">${esc(money(r.nominal ?? r.NOMINAL))}</td>
    </tr>`
        )
        .join("")
    : `<tr>
      <td class="c">1</td>
      <td class="c">${esc(header.id_voucher || "")}</td>
      <td class="c">${esc(brand)}</td>
      <td class="c">${esc(store)}</td>
      <td class="r">${esc(money(perVoucher))}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>PENGAJUAN CETAK VOUCHER</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; margin: 0; padding: 12px; }
  h1 { text-align: center; font-size: 18px; margin: 0 0 22px; letter-spacing: 0.04em; }
  .meta { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 18px; }
  .meta table { border-collapse: collapse; }
  .meta td { padding: 2px 8px 2px 0; vertical-align: top; }
  .meta td.k { font-weight: 700; width: 130px; }
  table.grid { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.grid th, table.grid td { border: 1px solid #222; padding: 6px 8px; }
  table.grid th { background: #f3f3f3; font-weight: 700; text-align: center; }
  .c { text-align: center; }
  .r { text-align: right; }
  .total-row td { font-weight: 700; }
  .signs { display: flex; justify-content: space-between; margin-top: 56px; padding: 0 24px; }
  .sign { width: 42%; text-align: center; }
  .sign .role { margin-top: 6px; font-weight: 700; }
  .sign .line { margin-top: 72px; }
  .toolbar { margin-bottom: 12px; }
  .toolbar button { padding: 8px 14px; cursor: pointer; }
  @media print { .toolbar { display: none; } }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print</button>
  </div>
  <h1>PENGAJUAN CETAK VOUCHER</h1>
  <div class="meta">
    <table>
      <tr><td class="k">NILAI VOUCHER</td><td>: ${esc(money(perVoucher))}</td></tr>
      <tr><td class="k">QTY</td><td>: ${esc(header.qty || rows.length || "")}</td></tr>
      <tr><td class="k">PENERIMA</td><td>: ${esc(penerima)}</td></tr>
    </table>
    <table>
      <tr><td class="k">START DATE</td><td>: ${esc(fmtDate(header.from_date))}</td></tr>
      <tr><td class="k">END DATE</td><td>: ${esc(fmtDate(header.to_date))}</td></tr>
    </table>
  </div>
  <table class="grid">
    <thead>
      <tr>
        <th style="width:8%">NO.</th>
        <th style="width:28%">NO VOUCHER</th>
        <th style="width:22%">BRAND</th>
        <th style="width:22%">STORE ID</th>
        <th style="width:20%">NOMINAL</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
      <tr class="total-row">
        <td colspan="3"></td>
        <td class="c">TOTAL</td>
        <td class="r">${esc(money(total || Number(header.qty || 0) * Number(perVoucher || 0)))}</td>
      </tr>
    </tbody>
  </table>
  <div class="signs">
    <div class="sign">
      <div>Mengajukan</div>
      <div class="role">Marketing</div>
      <div class="line">(........................................)</div>
    </div>
    <div class="sign">
      <div>Menyetujui</div>
      <div class="role">Operation</div>
      <div class="line">(........................................)</div>
    </div>
  </div>
</body>
</html>`;
}
