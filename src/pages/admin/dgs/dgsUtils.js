import ExcelJS from "exceljs";

export const fmtNum = (n) =>
  Number(n || 0).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const fmtDec = (n, d = 2) =>
  Number(n || 0).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: d });

export const fmtCompact = (n) => {
  const v = Number(n || 0);
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2).replace(/\.?0+$/, "")} M`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, "")} jt`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1).replace(/\.0$/, "")} rb`;
  return fmtNum(v);
};

export const pct = (a, b) => (Number(b) > 0 ? (Number(a || 0) / Number(b)) * 100 : 0);

export const fmtYmd = (v) => {
  if (v == null || v === "") return "";
  const s = String(v);
  const m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
};

const p2 = (n) => String(n).padStart(2, "0");
export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
export const monthStartYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-01`;
};
export const addDaysYmd = (ymd, delta) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${p2(dt.getMonth() + 1)}-${p2(dt.getDate())}`;
};

export const errMsg = (e, fallback = "Terjadi kesalahan") =>
  e?.responseMessage || e?.message || fallback;

export const cellOf = (row, key) => {
  if (!row) return "";
  if (row[key] != null && row[key] !== "") return row[key];
  const up = String(key).toUpperCase();
  const hit = Object.keys(row).find((k) => k.toUpperCase() === up);
  return hit != null && row[hit] != null ? row[hit] : "";
};

export const MP_OPTS = [
  "SHOPEE",
  "TOKOPEDIA",
  "TIKTOK",
  "LAZADA",
  "ZALORA",
  "BLIBLI",
  "BUKALAPAK",
  "JD.ID",
  "ZILINGO",
  "DIRECT SELLING",
  "BLANJA.COM",
];

/** Mirrors cart.aspx per-marketplace commission formulas (same rounding as the API). */
export const calcItem = (mp, qty, hargaJual, diskon, subsidi, komisi) => {
  const base = Number(qty || 0) * Number(hargaJual || 0) - Number(diskon || 0) + Number(subsidi || 0);
  const awal = (base * Number(komisi || 0)) / 100;
  let nilai;
  switch (String(mp || "").toUpperCase()) {
    case "TOKOPEDIA":
      nilai = awal;
      break;
    case "SHOPEE":
    case "BLIBLI":
      nilai = (100 / 108) * awal;
      break;
    case "TIKTOK":
    case "JD.ID":
    case "LAZADA":
    case "BUKALAPAK":
    case "ZALORA":
    case "BLANJA":
    case "BLANJA.COM":
    case "DIRECT SELLING":
    case "ZILINGO":
    case "ZILLINGO":
      nilai = (awal * 100) / 110;
      break;
    default:
      return null;
  }
  const komisiNilai = Math.round(nilai);
  return {
    TOTAL_SALES: Math.round(base * 100) / 100,
    KOMISI_AWAL: Math.floor(awal),
    KOMISI_NILAI: komisiNilai,
    PPN: Math.round((komisiNilai * 10) / 100),
    PPH23: Math.round((komisiNilai * 2) / 100),
    TOTAL: Math.floor(base - awal),
  };
};

/* ───────────────────────── AR template (xlsx) ───────────────────────── */

export const AR_HEADERS = [
  "ACTION",
  "MARKETPLACE",
  "ID_TR_SALES_DETAIL",
  "NO_INVOICE",
  "PLU",
  "DEKSRIPSI",
  "QTY",
  "PRICE POS",
  "PRICE MP",
  "DISKON",
  "SUBSIDI",
  "TOTAL_SALES",
  "KOMISI_PERSEN",
  "KOMISI",
  "DPP_KOMISI",
  "PPN",
  "PPH23",
  "TOTAL",
];

export const DETAIL_HEADERS = [
  "NO_INVOICE",
  "NOMOR_RESI",
  "TGL_PO",
  "TGL_KIRIM",
  "TGL_SAMPAI",
  "TIPE_ONGKIR",
  "NILAI_ONGKIR",
  "PAYMENT_GATEWAY",
  "BIAYA_LAYANAN",
  "PREMI",
  "BIAYA_PROGRAM",
  "KOMISI_AFFILIATE",
  "BIAYA_TRANSAKSI",
  "BIAYA_PROSES_PESANAN",
  "KOMISI_DINAMIS",
  "TOTAL_AR_PLUS_ONGKIR",
  "ID_TR_SALES_HEADER",
  "TGL_REALISASI",
];

const DATE_HEADERS = new Set(["TGL_PO", "TGL_KIRIM", "TGL_SAMPAI", "TGL_REALISASI"]);
const num = (v) => {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Template formula for DPP_KOMISI (column O) — same rules as the legacy Excel template. */
const dppOf = (mp, komisi) => {
  switch (String(mp || "").toUpperCase()) {
    case "SHOPEE":
    case "BLIBLI":
      return Math.round((100 / (10800 / 100)) * komisi);
    case "TOKOPEDIA":
      return Math.round(komisi);
    case "DIRECT SELLING":
    case "ZILINGO":
    case "LAZADA":
    case "ZALORA":
    case "BUKALAPAK":
    case "JD.ID":
    case "TIKTOK":
      return Math.round(komisi / 1.1);
    default:
      return null;
  }
};

const arFormulaValues = (r) => {
  const totalSales = num(r["PRICE MP"]) - num(r.DISKON) + num(r.SUBSIDI);
  const komisi = (totalSales * num(r.KOMISI_PERSEN)) / 100;
  const dpp = dppOf(r.MARKETPLACE, komisi);
  const dppVal = dpp == null ? num(r.DPP_KOMISI) : dpp;
  return {
    TOTAL_SALES: totalSales,
    KOMISI: komisi,
    DPP_KOMISI: dppVal,
    PPN: Math.round(dppVal * 0.1),
    PPH23: Math.round(dppVal * 0.02),
    TOTAL: totalSales - komisi,
  };
};

const detailTotal = (d, arTotalByInvoice) => {
  const normal = String(d.TIPE_ONGKIR || "").toUpperCase() === "NORMAL";
  const sgn = normal ? 1 : -1;
  return (
    (arTotalByInvoice[String(d.NO_INVOICE || "").toUpperCase()] || 0) +
    sgn * num(d.NILAI_ONGKIR) +
    sgn * num(d.PAYMENT_GATEWAY) -
    num(d.BIAYA_LAYANAN) -
    num(d.PREMI) -
    num(d.BIAYA_PROGRAM) -
    num(d.KOMISI_AFFILIATE) -
    num(d.BIAYA_TRANSAKSI) -
    num(d.BIAYA_PROSES_PESANAN) -
    num(d.KOMISI_DINAMIS)
  );
};

const toDateObj = (ymd) => {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
};

export const buildArTemplateWorkbook = ({ ar, detail }) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("AR");
  const ws2 = wb.addWorksheet("DETAIL");
  ws.addRow(AR_HEADERS);
  ws2.addRow(DETAIL_HEADERS);

  const head = (sheet, color, from, to) => {
    const row = sheet.getRow(1);
    row.font = { bold: true };
    for (let c = from; c <= to; c += 1) {
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    }
  };
  head(ws, "FFF8CBAD", 3, 18);
  head(ws, "FFFFFF00", 1, 2);
  head(ws2, "FFF8CBAD", 1, 18);

  const arTotals = {};
  ar.forEach((r, i) => {
    const n = i + 2;
    const calc = arFormulaValues(r);
    ws.addRow(AR_HEADERS.map((h) => (h === "ACTION" ? "" : r[h] ?? "")));
    const link = {
      formula: `HYPERLINK("#"&CELL("address",INDEX(DETAIL!A2:A1000,MATCH(D${n},DETAIL!A2:A1000,0))),"Detail")`,
      result: "Detail",
    };
    ws.getCell(`A${n}`).value = link;
    ws.getCell(`L${n}`).value = { formula: `SUM(I${n}-J${n}+K${n})`, result: calc.TOTAL_SALES };
    ws.getCell(`N${n}`).value = { formula: `SUM(L${n}*M${n}/100)`, result: calc.KOMISI };
    const mp = String(r.MARKETPLACE || "").toUpperCase();
    let f = null;
    if (mp === "SHOPEE" || mp === "BLIBLI") f = `ROUND((100/(10800/100))*N${n},0)`;
    else if (mp === "TOKOPEDIA") f = `ROUND(N${n},0)`;
    else if (dppOf(mp, 1) != null) f = `ROUND(N${n}/1.1,0)`;
    if (f) ws.getCell(`O${n}`).value = { formula: f, result: calc.DPP_KOMISI };
    ws.getCell(`P${n}`).value = { formula: `ROUND(O${n}*10%,0)`, result: calc.PPN };
    ws.getCell(`Q${n}`).value = { formula: `ROUND(O${n}*2%,0)`, result: calc.PPH23 };
    ws.getCell(`R${n}`).value = { formula: `SUM(L${n}-N${n})`, result: calc.TOTAL };
    const inv = String(r.NO_INVOICE || "").toUpperCase();
    arTotals[inv] = (arTotals[inv] || 0) + calc.TOTAL;
    [9, 10, 11].forEach((c) => {
      ws.getRow(n).getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE699" } };
    });
  });

  detail.forEach((d, i) => {
    const n = i + 2;
    ws2.addRow(
      DETAIL_HEADERS.map((h) => {
        if (DATE_HEADERS.has(h)) return toDateObj(d[h]);
        return d[h] ?? "";
      })
    );
    ["C", "D", "E", "R"].forEach((col) => {
      ws2.getCell(`${col}${n}`).numFmt = "yyyy/mm/dd";
    });
    const total = detailTotal(d, arTotals);
    ws2.getCell(`P${n}`).value = {
      formula:
        `SUMIF(AR!D2:D1000,A${n},AR!R2:R1000)+IF(F${n}="NORMAL",G${n},-(G${n}))+IF(F${n}="NORMAL",H${n},-(H${n}))` +
        `-(I${n})-(J${n})-(K${n})-(L${n})-(M${n})-(N${n})-(O${n})`,
      result: total,
    };
    ws2.getCell(`F${n}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"NORMAL,SUBSIDI"'],
    };
  });

  ws.getColumn(3).hidden = true;
  ws2.getColumn(17).hidden = true;
  [ws, ws2].forEach((sheet) => {
    sheet.columns.forEach((col) => {
      col.width = Math.max(12, Math.min(34, String(col.header || "").length + 4));
    });
  });
  return wb;
};

/* ───────────────────────── AR upload (xlsx → JSON) ───────────────────────── */

const cellValue = (cell) => {
  let v = cell?.value;
  if (v == null) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return v.result == null ? undefined : v.result;
    if ("formula" in v || "sharedFormula" in v) return undefined;
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return v.text;
    return undefined;
  }
  return v;
};

const ymdFromAny = (v) => {
  if (v == null || v === "") return "";
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${p2(v.getUTCMonth() + 1)}-${p2(v.getUTCDate())}`;
  }
  return fmtYmd(String(v).trim());
};

const readSheet = (wb, name, headers) => {
  const ws = wb.worksheets.find((s) => String(s.name).trim().toUpperCase() === name);
  if (!ws) throw new Error(`Sheet "${name}" tidak ditemukan di file`);
  const headerRow = ws.getRow(1);
  const idx = {};
  headerRow.eachCell({ includeEmpty: false }, (c, col) => {
    idx[String(cellValue(c) ?? "").trim().toUpperCase()] = col;
  });
  const missing = headers.filter((h) => h !== "ACTION" && idx[h] == null);
  if (missing.length) throw new Error(`Sheet ${name}: kolom tidak ada: ${missing.join(", ")}`);
  const out = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const o = {};
    headers.forEach((h) => {
      if (h === "ACTION") return;
      o[h] = cellValue(row.getCell(idx[h]));
    });
    const allEmpty = Object.values(o).every((v) => v === undefined || String(v).trim() === "");
    if (!allEmpty) out.push(o);
  });
  return out;
};

export const parseArUploadFile = async (file) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const arRaw = readSheet(wb, "AR", AR_HEADERS);
  const detRaw = readSheet(wb, "DETAIL", DETAIL_HEADERS);

  const arTotals = {};
  const ar = arRaw.map((r) => {
    const calc = arFormulaValues({ ...r, MARKETPLACE: r.MARKETPLACE });
    const pick = (k) => (r[k] === undefined || r[k] === "" ? calc[k] : num(r[k]));
    const row = {
      MARKETPLACE: r.MARKETPLACE,
      ID_TR_SALES_DETAIL: String(r.ID_TR_SALES_DETAIL ?? "").trim(),
      NO_INVOICE: String(r.NO_INVOICE ?? "").trim(),
      PLU: String(r.PLU ?? "").trim(),
      DEKSRIPSI: String(r.DEKSRIPSI ?? "").trim(),
      QTY: num(r.QTY),
      "PRICE POS": num(r["PRICE POS"]),
      "PRICE MP": num(r["PRICE MP"]),
      DISKON: num(r.DISKON),
      SUBSIDI: num(r.SUBSIDI),
      TOTAL_SALES: pick("TOTAL_SALES"),
      KOMISI_PERSEN: num(r.KOMISI_PERSEN),
      KOMISI: pick("KOMISI"),
      DPP_KOMISI: pick("DPP_KOMISI"),
      PPN: pick("PPN"),
      PPH23: pick("PPH23"),
      TOTAL: pick("TOTAL"),
    };
    const inv = row.NO_INVOICE.toUpperCase();
    arTotals[inv] = (arTotals[inv] || 0) + row.TOTAL;
    return row;
  });

  const detail = detRaw.map((r) => {
    const d = {
      NO_INVOICE: String(r.NO_INVOICE ?? "").trim(),
      NOMOR_RESI: String(r.NOMOR_RESI ?? "").trim(),
      TIPE_ONGKIR: String(r.TIPE_ONGKIR ?? "").trim().toUpperCase(),
      ID_TR_SALES_HEADER: String(r.ID_TR_SALES_HEADER ?? "").trim(),
    };
    ["NILAI_ONGKIR", "PAYMENT_GATEWAY", "BIAYA_LAYANAN", "PREMI", "BIAYA_PROGRAM", "KOMISI_AFFILIATE", "BIAYA_TRANSAKSI", "BIAYA_PROSES_PESANAN", "KOMISI_DINAMIS"].forEach((k) => {
      d[k] = num(r[k]);
    });
    DATE_HEADERS.forEach((k) => {
      d[k] = ymdFromAny(r[k]);
    });
    d.TOTAL_AR_PLUS_ONGKIR =
      r.TOTAL_AR_PLUS_ONGKIR === undefined || r.TOTAL_AR_PLUS_ONGKIR === ""
        ? detailTotal(d, arTotals)
        : num(r.TOTAL_AR_PLUS_ONGKIR);
    return d;
  });
  return { ar, detail };
};

/** Read invoice numbers from csv/xlsx (header INVOICE or first column) or plain text. */
export const parseInvoiceText = (text) =>
  Array.from(
    new Set(
      String(text || "")
        .split(/[\s,;]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .filter((s) => s !== "INVOICE" && s !== "NO_INVOICE")
    )
  );

export const parseInvoiceFile = async (file) => {
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseInvoiceText(await file.text());
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  const out = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const v = cellValue(row.getCell(1));
    if (v != null && String(v).trim()) out.push(String(v).trim().toUpperCase());
  });
  return parseInvoiceText(out.join("\n"));
};

export const downloadWorkbook = async (wb, fileName) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
};
