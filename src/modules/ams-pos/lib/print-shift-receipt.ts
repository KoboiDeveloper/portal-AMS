import { groupShiftPayments } from "./shift-payment-groups";
import type { CashierSession, CashierShiftSummary } from "../types/pos";

function esc(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtRp(n: number) {
  return `Rp${Math.max(0, n).toLocaleString("id-ID")}`;
}

function fmtTime(ts: number | null) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(from: number | null) {
  if (!from) return "-";
  const mins = Math.max(0, Math.floor((Date.now() - from) / 60000));
  if (mins < 60) return `${mins} mnt`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
}

function row(label: string, value: string, strong = false) {
  return `<div class="r ${strong ? "strong" : ""}"><span>${esc(label)}</span><span>${esc(
    value
  )}</span></div>`;
}

export type ShiftReceiptInput = {
  cashier: CashierSession;
  summary: CashierShiftSummary;
  signedInAt: number | null;
  storeName?: string;
};

function buildReceiptHtml(input: ShiftReceiptInput): string {
  const { cashier, summary, signedInAt, storeName } = input;
  const groups = groupShiftPayments(summary.byMethod);
  const paidTotal = groups.reduce((s, g) => s + g.total, 0);
  const printedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const paymentBlocks = groups
    .map((g) => {
      const lines =
        g.kind === "bank"
          ? g.lines
          : g.lines.filter((l) => l.amount > 0).length
            ? g.lines.filter((l) => l.amount > 0)
            : g.lines;

      const body = lines.map((l) => row(`  ${l.label}`, fmtRp(l.amount))).join("");

      return `
        <div class="block">
          <div class="bank">${esc(g.label)}</div>
          ${body}
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Ringkasan Shift</title>
  <style>
    @page { margin: 4mm; size: 80mm auto; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #000;
      background: #fff;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip {
      width: 72mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 2mm 1mm 4mm;
    }
    .center { text-align: center; }
    .title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .sub { margin: 2px 0 0; font-size: 11px; }
    .muted { margin: 2px 0 0; font-size: 10px; }
    .line {
      border: 0;
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .line-dbl {
      border: 0;
      border-top: 2px solid #000;
      margin: 8px 0 6px;
    }
    .sec {
      margin: 0 0 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .r {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: baseline;
    }
    .r span:first-child {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .r span:last-child {
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .r.strong span { font-weight: 700; }
    .block { margin: 0 0 5px; }
    .bank {
      font-weight: 700;
      margin: 0 0 1px;
      text-transform: uppercase;
    }
    .total {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
    }
    .foot {
      margin-top: 10px;
      text-align: center;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="slip">
    <div class="center">
      <p class="title">Ringkasan Shift</p>
      ${storeName ? `<p class="sub">${esc(storeName)}</p>` : ""}
      <p class="muted">Dicetak ${esc(printedAt)}</p>
    </div>

    <hr class="line" />

    ${row("Kasir", cashier.name)}
    ${row("ID", cashier.id)}
    ${row("Shift", String(cashier.shift))}
    ${row("Mulai", fmtTime(signedInAt))}
    ${row("Durasi", fmtDuration(signedInAt))}
    ${row("Transaksi", String(summary.txCount))}

    <hr class="line" />
    <p class="sec">Rincian pembayaran</p>
    ${paymentBlocks || `<p class="muted">Belum ada transaksi</p>`}

    <hr class="line-dbl" />
    <div class="total">
      <span>TOTAL</span>
      <span>${esc(fmtRp(paidTotal || summary.totalAmount))}</span>
    </div>
    ${
      summary.totalAmount !== paidTotal
        ? `<div class="r" style="margin-top:4px"><span>Total penjualan</span><span>${esc(
            fmtRp(summary.totalAmount)
          )}</span></div>`
        : ""
    }

    <p class="foot">— tutup shift —</p>
  </div>
</body>
</html>`;
}

/** Print struk thermal via iframe (tanpa popup window).
 * Setelah print: trigger cash drawer + cut (Electron raw ESC/POS).
 */
export function printShiftPaymentReceipt(input: ShiftReceiptInput) {
  const html = buildReceiptHtml(input);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print ringkasan shift");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:420px;height:900px;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    window.alert("Gagal menyiapkan print. Coba lagi.");
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      // ignore
    }
  };

  const runPrint = () => {
    try {
      win.focus();
      win.print();
      // Teman: saat cut/print → sekalian buka cash drawer (ESC/POS raw ke thermal)
      void import("./cash-drawer").then(({ openCashDrawer }) => {
        // jeda sebentar biar job print masuk spooler dulu
        window.setTimeout(() => {
          void openCashDrawer();
        }, 400);
      });
    } catch {
      window.alert("Gagal membuka dialog print.");
    } finally {
      window.setTimeout(cleanup, 1200);
    }
  };

  if (doc.readyState === "complete") {
    window.setTimeout(runPrint, 50);
  } else {
    iframe.onload = () => window.setTimeout(runPrint, 50);
    window.setTimeout(runPrint, 300);
  }
}
