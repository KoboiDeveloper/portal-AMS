/** Client-side STOUT print (parity Crystal STOUT.rpt → PDF via browser print). */

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmt = (v) => nf.format(Number(v || 0));

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Must run synchronously inside click handler (before any await). */
export function openStOutPrintWindow() {
  // Do NOT use noopener — we need to write document after fetch.
  const w = window.open("about:blank", "_blank", "width=960,height=720");
  if (!w) return null;
  try {
    w.document.open();
    w.document.write(
      `<!DOCTYPE html><html><head><title>STORE TRANSFER OUT</title></head>` +
        `<body style="font-family:Arial,sans-serif;padding:24px;color:#364a63">Memuat laporan...</body></html>`
    );
    w.document.close();
  } catch {
    /* ignore */
  }
  return w;
}

export function writeStOutPrintWindow(w, html) {
  if (!w || w.closed) throw new Error("Jendela print sudah ditutup");
  w.document.open();
  w.document.write(html);
  w.document.close();
  try {
    w.focus();
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ brand, stockDept, date, receiver, noStOut }} header
 * @param {Array<{ PLU, DESKRIPSI, ARTICLE, QTY_OUT, PRICE_OUT, TOTAL_PRICE_OUT }>} items
 */
export function buildStOutPrintHtml(header, items) {
  const rows = Array.isArray(items) ? items : [];
  let qty = 0;
  let priceSum = 0;
  let totalSum = 0;
  rows.forEach((r) => {
    qty += Number(r.QTY_OUT || 0);
    priceSum += Number(r.PRICE_OUT || r.Price_OUT || 0);
    totalSum += Number(r.TOTAL_PRICE_OUT || r.Total_Price_OUT || 0);
  });

  const bodyRows = rows
    .map(
      (r) => `<tr>
      <td>${esc(r.PLU)}</td>
      <td>${esc(r.DESKRIPSI || "")}</td>
      <td>${esc(r.ARTICLE || "")}</td>
      <td class="num">${fmt(r.QTY_OUT)}</td>
      <td class="num">${fmt(r.PRICE_OUT || r.Price_OUT)}</td>
      <td class="num">${fmt(r.TOTAL_PRICE_OUT || r.Total_Price_OUT)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>STORE TRANSFER OUT - ${esc(header.noStOut || "")}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11px; margin: 0; padding: 8px; }
  h1 { font-size: 20px; margin: 0 0 14px; font-weight: 700; letter-spacing: 0.02em; }
  .meta { width: 100%; margin-bottom: 8px; }
  .meta td { padding: 2px 6px 2px 0; vertical-align: top; }
  .meta .lbl { font-weight: 700; width: 110px; }
  .meta .right { text-align: right; white-space: nowrap; }
  .rule { border: 0; border-top: 2px solid #000; margin: 8px 0 12px; }
  table.grid { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
  table.grid th, table.grid td { border: 1px solid #000; padding: 4px 6px; }
  table.grid thead th { font-weight: 700; text-align: center; background: #fff; }
  table.grid td.num, table.grid th.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.grid tfoot td { font-weight: 700; }
  .signs { display: flex; justify-content: space-between; margin-top: 36px; gap: 12px; }
  .sign { flex: 1; text-align: center; }
  .sign .title { font-weight: 700; margin-bottom: 48px; }
  .sign .line { border-top: 1px solid #000; margin: 0 10px; padding-top: 4px; min-height: 18px; }
  .sign .sub { font-size: 10px; margin-top: 2px; }
  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>
  <h1>STORE TRANSFER OUT</h1>
  <table class="meta">
    <tr>
      <td class="lbl">BRAND</td><td>: ${esc(header.brand || "")}</td>
      <td class="right"><b>DATE</b> : ${esc(header.date || "")}</td>
    </tr>
    <tr>
      <td class="lbl">STOCK DEPT</td><td>: ${esc(header.stockDept || "")}</td>
      <td></td>
    </tr>
  </table>
  <hr class="rule"/>
  <table class="meta">
    <tr>
      <td class="lbl">RECEIVER</td><td>: ${esc(header.receiver || "")}</td>
    </tr>
    <tr>
      <td class="lbl">NO.ST OUT</td><td>: ${esc(header.noStOut || "")}</td>
    </tr>
  </table>
  <table class="grid">
    <thead>
      <tr>
        <th rowspan="2">PLU</th>
        <th rowspan="2">DESKRIPSI</th>
        <th rowspan="2">ARTICLE</th>
        <th>QTY</th>
        <th colspan="2">LABEL PRICE</th>
      </tr>
      <tr>
        <th>DIST</th>
        <th>@PRICES</th>
        <th>TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || `<tr><td colspan="6" style="text-align:center">There Is No Data</td></tr>`}
    </tbody>
    <tfoot>
      <tr>
        <td></td>
        <td></td>
        <td class="num">TOTAL:</td>
        <td class="num">${fmt(qty)}</td>
        <td class="num">${fmt(priceSum)}</td>
        <td class="num">${fmt(totalSum)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="signs">
    <div class="sign">
      <div class="title">PENGIRIM</div>
      <div class="sub">${esc(header.date || "")}</div>
      <div class="line">Distribution</div>
    </div>
    <div class="sign">
      <div class="title">DI CEK OLEH</div>
      <div class="line">&nbsp;</div>
    </div>
    <div class="sign">
      <div class="title">EXPEDISI</div>
      <div class="line">&nbsp;</div>
    </div>
    <div class="sign">
      <div class="title">PENERIMA</div>
      <div class="line">&nbsp;</div>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 250);
    };
  </script>
</body>
</html>`;
}
