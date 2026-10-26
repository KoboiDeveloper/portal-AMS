import React, { useCallback, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { Modal, ModalBody } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import {
  getRegMpArListByStore,
  getRegMpArListTotal,
  getRegMpArListDetailRealisasi,
  getRegMpArListPluSummary,
  getRegMpArListTransaksiDetail,
  getRegMpArListDetail,
} from "../../../services/regional/regional.service";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import "./reg-mp-ar-list.css";
import "./reg-sales-detail.css";

const AR_DETAIL_FIELDS = [
  { key: "NOMOR_RESI", label: "No. Resi" },
  { key: "TGL_PO", label: "Tgl PO" },
  { key: "TGL_KIRIM", label: "Tgl Kirim" },
  { key: "TGL_SAMPAI", label: "Tgl Sampai" },
  { key: "ONGKIR", label: "Ongkir", num: true },
  { key: "TIPE_ONGKIR", label: "Tipe Ongkir" },
  { key: "PAYMENT_GATEWAY", label: "Payment Gateway", num: true },
  { key: "BIAYA_LAYANAN", label: "Biaya Layanan", num: true },
  { key: "PREMI", label: "Premi", num: true },
  { key: "BIAYA_PROGRAM", label: "Biaya Program", num: true },
  { key: "KOMISI_AFFILIATE", label: "Komisi Affiliate", num: true },
  { key: "BIAYA_TRANSAKSI", label: "Biaya Transaksi", num: true },
  { key: "BIAYA_PROSES_PESANAN", label: "Biaya Proses Pesanan", num: true },
  { key: "KOMISI_DINAMIS", label: "Komisi Dinamis", num: true },
  { key: "TOTALAR", label: "Total AR", num: true },
  { key: "STATUS_CHECKING", label: "Status Checking" },
];

const STORE_CHIPS = [
  { id: "01E", label: "01E · IWAN" },
  { id: "02E", label: "02E · MISSISSIPPI" },
  { id: "03E", label: "03E · CELCIUS" },
  { id: "04E", label: "04E · QUEENSLAND" },
  { id: "06E", label: "06E · CELCIUS WOMAN" },
  { id: "07E", label: "07E · DIRECT SELLING" },
];

const TIKTOK_CHIPS = [
  { id: "08E", label: "08E · CELCIUSMEN" },
  { id: "09E", label: "09E · CELCIUS WOMAN" },
  { id: "10E", label: "10E · MISSISSIPPI" },
  { id: "11E", label: "11E · QUEENSLAND" },
];

const REPORT_MODES = [
  { id: "total", label: "TOTAL" },
  { id: "detail", label: "DETAIL REALISASI" },
  { id: "plu", label: "PLU SUMMARY" },
  { id: "transaksi", label: "TRANSAKSI DETAIL" },
];

const STATUS_OPTS = [
  { value: "ALL", label: "Semua Status" },
  { value: "NEW", label: "NEW" },
  { value: "APPROVED", label: "APPROVED" },
  { value: "REJECTED", label: "REJECTED" },
  { value: "REALISASI", label: "REALISASI" },
];

const MP_OPTS = [
  { value: "ALL", label: "ALL" },
  { value: "TIKTOK", label: "TIKTOK" },
  { value: "SHOPEE", label: "SHOPEE" },
  { value: "TOKOPEDIA", label: "TOKOPEDIA" },
  { value: "LAZADA", label: "LAZADA" },
  { value: "BUKALAPAK", label: "BUKALAPAK" },
  { value: "BLIBLI", label: "BLIBLI" },
];

const CHANNEL_OPTS = [
  {
    label: "Store",
    options: STORE_CHIPS.map((s) => ({
      value: s.id,
      label: `${s.id} - ${String(s.label).split("·")[1]?.trim() || s.id}`,
      tiktok: false,
    })),
  },
  {
    label: "TikTok",
    options: TIKTOK_CHIPS.map((s) => ({
      value: s.id,
      label: `${s.id} - ${String(s.label).split("·")[1]?.trim() || s.id}`,
      tiktok: true,
    })),
  },
];

const CHANNEL_OPTS_REPORT = [
  { label: "Semua", options: [{ value: "ALL", label: "ALL Store", tiktok: false }] },
  ...CHANNEL_OPTS,
];

const PRESETS = [
  { id: "today", label: "Hari Ini" },
  { id: "month", label: "Bulan Ini" },
  { id: "3m", label: "3 Bulan" },
  { id: "ytd", label: "YTD" },
];

const flatChannelOpts = (grouped) =>
  grouped.flatMap((g) => (Array.isArray(g.options) ? g.options : [g]));

const findChannelOpt = (grouped, value) =>
  flatChannelOpts(grouped).find((o) => String(o.value) === String(value)) || null;

const yearStartYmd = () => `${new Date().getFullYear()}-01-01`;

const addMonthsYmd = (ymd, delta) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, d || 1);
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};

const fmtChipRange = (from, to) => {
  if (!from || !to) return "";
  const fmt = (s) => {
    const [y, m, d] = String(s).slice(0, 10).split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${d} ${months[Number(m) - 1] || m} ${y}`;
  };
  return `${fmt(from)} - ${fmt(to)}`;
};

const TIPE_OPTS = [
  { value: "tgl_sampai", label: "Tgl. Sampai" },
  { value: "tgl_realisasi", label: "Tgl. Realisasi" },
  { value: "tgl_konfirmasi_sales", label: "Tgl. Konfirmasi Sales" },
];

const STORE_COLS = [
  { key: "NAMA_MP", label: "Marketplace", alts: ["marketplace", "MARKETPLACE"] },
  { key: "BRAND", label: "Brand", alts: ["brand"] },
  { key: "STORE", label: "Store", alts: ["store"] },
  { key: "NO_INVOICE", label: "No. Invoice", alts: ["no_invoice", "INVOICE"] },
  { key: "TGL_TRANSAKSI", label: "Tgl Transaksi", alts: ["tgl_transaksi"] },
  { key: "GRAND_TOTAL", label: "Total", alts: ["grand_total", "TOTAL"], num: true },
  { key: "RETUR", label: "Status", alts: ["status", "STATUS"] },
];

const PLU_PREFERRED = [
  "BRAND",
  "MARKETPLACE",
  "PLU",
  "QTY",
  "HARGA_BARCODE",
  "TOTAL_HARGA_BARCODE",
  "HARGA_MARKETPLACE",
  "TOTAL_HARGA_MARKETPLACE",
];

const filterSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 38,
    height: 38,
    fontSize: "0.8125rem",
    borderRadius: 0,
    backgroundColor: "#eef2f8",
    borderColor: "#dbdfea",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 36 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem" }),
  groupHeading: (base) => ({
    ...base,
    fontSize: "0.6875rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#8094ae",
  }),
};

const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const monthStartYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
};

const cell = (r, key, alts = []) => {
  const keys = [key, ...alts];
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const toSortable = (value) => {
  if (value == null || value === "") return { kind: "empty", raw: "" };
  if (typeof value === "number" && Number.isFinite(value)) return { kind: "num", raw: value };
  const s = String(value).trim();
  const iso = Date.parse(s.length >= 10 ? s.slice(0, 10) : s);
  if (!Number.isNaN(iso) && /\d{4}[-/]\d{2}[-/]\d{2}/.test(s)) return { kind: "num", raw: iso };
  const asId = s.replace(/\./g, "").replace(/,/g, "");
  if (asId !== "" && /^-?\d+(\.\d+)?$/.test(asId)) {
    const n = Number(asId);
    if (Number.isFinite(n)) return { kind: "num", raw: n };
  }
  return { kind: "str", raw: s.toLowerCase() };
};

const compareCell = (a, b, direction) => {
  const left = toSortable(a);
  const right = toSortable(b);
  let cmp = 0;
  if (left.kind === "empty" && right.kind !== "empty") cmp = 1;
  else if (right.kind === "empty" && left.kind !== "empty") cmp = -1;
  else if (left.kind === "num" && right.kind === "num") cmp = left.raw - right.raw;
  else cmp = String(left.raw).localeCompare(String(right.raw), "id", { numeric: true });
  return direction === "desc" ? -cmp : cmp;
};

const fmtNum = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtDate = (v) => {
  if (v == null || v === "") return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  return s;
};

const isNumericLike = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return true;
  const s = String(v ?? "").trim().replace(/\./g, "").replace(/,/g, "");
  return s !== "" && /^-?\d+(\.\d+)?$/.test(s);
};

const isSummaryRow = (row) => {
  const keys = ["BRAND", "STORE", "MARKETPLACE", "INVOICE", "PLU", "NAMA_MP"];
  for (const key of keys) {
    const val = String(cell(row, key) || "")
      .trim()
      .toUpperCase();
    if (
      val === "TOTAL" ||
      val === "GRAND TOTAL" ||
      val === "GRANDTOTAL" ||
      val.startsWith("TOTAL ") ||
      val.startsWith("GRAND TOTAL")
    ) {
      return true;
    }
  }
  return false;
};

const RegMpArListPage = () => {
  const [mode, setMode] = useState("store"); // store | total | detail | plu | transaksi
  const [storeId, setStoreId] = useState("02E");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [marketplace, setMarketplace] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [invoice, setInvoice] = useState("");
  const [reportStore, setReportStore] = useState("ALL");
  const [tipe, setTipe] = useState("tgl_sampai");
  const [presetId, setPresetId] = useState("month");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState(""); // ar | sales
  const [modalRow, setModalRow] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const isStoreMode = mode === "store";
  const canSearch = Boolean(fromDate && toDate && (isStoreMode ? storeId : true));
  const channelGrouped = isStoreMode ? CHANNEL_OPTS : CHANNEL_OPTS_REPORT;
  const channelValue = isStoreMode ? storeId : reportStore;
  const channelOpt = findChannelOpt(channelGrouped, channelValue);
  const isTikTokChannel = Boolean(channelOpt?.tiktok);
  const marketplaceValue = isTikTokChannel ? "TIKTOK" : marketplace?.trim() || "ALL";

  const clearResult = () => {
    setRows([]);
    setLoaded(false);
    setError("");
    setSortConfig({ key: "", direction: "asc" });
  };

  const selectReport = (id) => {
    if (mode === "store" && storeId) setReportStore(storeId);
    setMode(id);
    clearResult();
  };

  const onChannelChange = (opt) => {
    const val = opt?.value != null ? String(opt.value) : "";
    if (isStoreMode) {
      if (!val) return;
      setStoreId(val);
    } else {
      setReportStore(val || "ALL");
    }
    if (opt?.tiktok) {
      setMarketplace("TIKTOK");
    } else if (marketplace === "TIKTOK") {
      setMarketplace("ALL");
    }
    clearResult();
  };

  const applyPreset = (id) => {
    const today = todayYmd();
    setPresetId(id);
    if (id === "today") {
      setFromDate(today);
      setToDate(today);
    } else if (id === "month") {
      setFromDate(monthStartYmd());
      setToDate(today);
    } else if (id === "3m") {
      setFromDate(addMonthsYmd(today, -3));
      setToDate(today);
    } else if (id === "ytd") {
      setFromDate(yearStartYmd());
      setToDate(today);
    }
    clearResult();
  };

  const resetFilters = () => {
    setMode("store");
    setStoreId("02E");
    setReportStore("ALL");
    setMarketplace("ALL");
    setStatus("ALL");
    setInvoice("");
    setTipe("tgl_sampai");
    applyPreset("month");
    clearResult();
  };

  const loadData = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError("Pilih periode dulu.");
      return;
    }
    if (isStoreMode && !storeId) {
      setError("Pilih store dulu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const base = {
        from_date: fromDate,
        to_date: toDate,
        marketplace: isTikTokChannel ? "TIKTOK" : marketplace?.trim() || "ALL",
      };
      let res;
      if (isStoreMode) {
        res = await getRegMpArListByStore({
          ...base,
          id_store: storeId,
          status: status || "ALL",
          invoice: String(invoice || "").trim() || "-",
        });
      } else if (mode === "total") {
        res = await getRegMpArListTotal(base);
      } else if (mode === "detail") {
        res = await getRegMpArListDetailRealisasi({
          ...base,
          id_store: reportStore || "ALL",
          tipe: tipe || "tgl_sampai",
          invoice: String(invoice || "").trim(),
        });
      } else if (mode === "plu") {
        res = await getRegMpArListPluSummary({
          ...base,
          id_store: reportStore || "ALL",
          tipe: tipe || "tgl_sampai",
        });
      } else {
        res = await getRegMpArListTransaksiDetail({
          ...base,
          id_store: reportStore || "ALL",
        });
      }
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat data");
        setRows([]);
        setLoaded(true);
        return;
      }
      let list = extractRows(res);
      if (!isStoreMode) {
        list = list.filter((r) => !isSummaryRow(r));
      }
      setRows(list);
      setLoaded(true);
      setSortConfig({ key: "", direction: "asc" });
    } catch (e) {
      setError(e?.message || "Gagal memuat data");
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [
    fromDate,
    toDate,
    isStoreMode,
    storeId,
    marketplace,
    isTikTokChannel,
    status,
    invoice,
    mode,
    reportStore,
    tipe,
  ]);

  const columns = useMemo(() => {
    if (isStoreMode) return STORE_COLS;
    if (!rows.length) return [];
    const keys = Object.keys(rows[0] || {});
    if (mode === "plu") {
      const preferred = PLU_PREFERRED.filter((k) =>
        keys.some((x) => String(x).toUpperCase() === k)
      );
      const rest = keys.filter((k) => !preferred.some((p) => p === String(k).toUpperCase()));
      return [...preferred, ...rest].map((k) => {
        const real = keys.find((x) => String(x).toUpperCase() === String(k).toUpperCase()) || k;
        const sample = rows.find((r) => cell(r, real) !== "");
        const num = sample ? isNumericLike(cell(sample, real)) && !["BRAND", "MARKETPLACE", "PLU", "STORE"].includes(String(real).toUpperCase()) : false;
        return { key: real, label: String(real).replace(/_/g, " "), num };
      });
    }
    if (mode === "total") {
      const brandKey = keys.find((k) => String(k).toUpperCase() === "BRAND") || keys[0];
      const others = keys.filter((k) => k !== brandKey);
      const visible = [brandKey];
      others.forEach((k) => {
        const allZero = rows.every((r) => {
          const v = cell(r, k);
          return v === "" || v == null || Number(v) === 0;
        });
        const sample = rows.find((r) => cell(r, k) !== "");
        const looksNum = sample ? isNumericLike(cell(sample, k)) : false;
        if (looksNum && allZero) return;
        visible.push(k);
      });
      return visible.map((k) => ({
        key: k,
        label: String(k).replace(/_/g, " "),
        num: k !== brandKey && rows.some((r) => isNumericLike(cell(r, k))),
      }));
    }
    return keys.map((k) => {
      const sample = rows.find((r) => cell(r, k) !== "");
      const num =
        sample &&
        isNumericLike(cell(sample, k)) &&
        !["BRAND", "STORE", "MARKETPLACE", "INVOICE", "NAMA_MP", "NO_INVOICE", "PLU"].includes(
          String(k).toUpperCase()
        );
      return { key: k, label: String(k).replace(/_/g, " "), num: Boolean(num) };
    });
  }, [isStoreMode, rows, mode]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;
    const next = [...rows];
    next.sort((a, b) =>
      compareCell(cell(a, sortConfig.key), cell(b, sortConfig.key), sortConfig.direction)
    );
    return next;
  }, [rows, sortConfig]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }, []);

  const footerSums = useMemo(() => {
    if (!columns.length || !rows.length) return null;
    const sums = {};
    let any = false;
    columns.forEach((col) => {
      if (!col.num) return;
      let sum = 0;
      rows.forEach((r) => {
        const v = Number(cell(r, col.key, col.alts || []));
        if (Number.isFinite(v)) sum += v;
      });
      sums[col.key] = sum;
      any = true;
    });
    return any ? sums : null;
  }, [columns, rows]);

  const titleMeta = useMemo(() => {
    if (!loaded) return "Pilih store / report, filter periode, lalu cari";
    if (isStoreMode) return `${rows.length.toLocaleString("id-ID")} baris · ${storeId} · ${fromDate} s/d ${toDate}`;
    const label = REPORT_MODES.find((m) => m.id === mode)?.label || mode;
    return `${rows.length.toLocaleString("id-ID")} baris · ${label} · ${fromDate} s/d ${toDate}`;
  }, [loaded, isStoreMode, rows.length, storeId, fromDate, toDate, mode]);

  const exportExcel = useCallback(async () => {
    if (!sortedRows.length || !columns.length) return;
    const wb = new ExcelJS.Workbook();
    const sheetName = isStoreMode ? storeId : mode.toUpperCase();
    const ws = wb.addWorksheet(sheetName.slice(0, 31));
    ws.addRow(["No.", ...columns.map((c) => c.label)]);
    sortedRows.forEach((r, idx) => {
      ws.addRow([
        idx + 1,
        ...columns.map((c) => {
          const v = cell(r, c.key, c.alts || []);
          if (c.num) return Number(v) || 0;
          if (String(c.key).toUpperCase().includes("TGL") || String(c.key).toUpperCase().includes("DATE")) {
            return fmtDate(v);
          }
          return v;
        }),
      ]);
    });
    ws.getRow(1).font = { bold: true };
    const buffer = await wb.xlsx.writeBuffer();
    const tag = isStoreMode ? storeId : mode;
    saveXlsxFile(buffer, `AR_List_${tag}_${fromDate}_${toDate}.xlsx`);
  }, [sortedRows, columns, isStoreMode, storeId, mode, fromDate, toDate]);

  const renderCell = (row, col) => {
    const v = cell(row, col.key, col.alts || []);
    if (col.num) return fmtNum(v);
    if (String(col.key).toUpperCase().includes("TGL") || String(col.key).toUpperCase().includes("DATE")) {
      return fmtDate(v);
    }
    return v === "" || v == null ? "—" : String(v);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalKind("");
    setModalRow(null);
    setModalDetail(null);
    setModalError("");
    setModalLoading(false);
  }, []);

  const openSalesInfo = useCallback((row) => {
    setModalKind("sales");
    setModalRow(row);
    setModalDetail(null);
    setModalError("");
    setModalLoading(false);
    setModalOpen(true);
  }, []);

  const openArDetail = useCallback(async (row) => {
    const id = String(
      cell(row, "ID_TR_SALES_HEADER", ["id_tr_sales_header", "ID_PRASALES_HEADER", "id_prasales_header"]) || ""
    ).trim();
    const trId = String(cell(row, "ID_TR_SALES_HEADER", ["id_tr_sales_header"]) || "").trim();
    setModalKind("ar");
    setModalRow(row);
    setModalDetail(null);
    setModalError("");
    setModalOpen(true);
    if (!trId) {
      setModalError("AR belum diinput untuk invoice ini (ID_TR_SALES_HEADER kosong).");
      setModalLoading(false);
      return;
    }
    setModalLoading(true);
    try {
      const res = await getRegMpArListDetail(trId || id);
      if (!isSuccess(res)) {
        setModalError(res?.responseMessage || "Gagal memuat AR Detail");
        return;
      }
      setModalDetail(extractRow(res) || {});
    } catch (e) {
      setModalError(e?.message || "Gagal memuat AR Detail");
    } finally {
      setModalLoading(false);
    }
  }, []);

  /** View-only action strip — opens info modal (no confirm/approve). */
  const renderActionInfo = (row) => {
    const salesStatus = String(cell(row, "PRA_SALES_STATUS", ["pra_sales_status"]) || "Confirm Sales");
    const arStatus = String(cell(row, "AR_STATUS", ["ar_status"]) || "");
    const salesIcon = String(cell(row, "PRA_SALES_ICON", ["pra_sales_icon"]) || "");
    const salesTone = /approv|done|green/i.test(`${salesStatus} ${salesIcon}`)
      ? "is-ok"
      : /reject|ban/i.test(salesStatus)
        ? "is-bad"
        : "is-info";
    return (
      <div className="reg-ar-act">
        <button
          type="button"
          className={`reg-ar-act-btn ${salesTone}`}
          title={`${salesStatus} — lihat info`}
          onClick={() => openSalesInfo(row)}
        >
          <Icon name="setting" />
          <span>{salesStatus}</span>
        </button>
        <button
          type="button"
          className="reg-ar-act-btn is-info"
          title={arStatus || "AR Detail"}
          onClick={() => openArDetail(row)}
        >
          <Icon name="check-round-cut" />
          <span>AR Detail</span>
        </button>
      </div>
    );
  };

  const statusLabel = STATUS_OPTS.find((o) => o.value === status)?.label || status;
  const channelChipLabel = channelOpt
    ? `${channelOpt.value}${channelOpt.tiktok ? " · TikTok" : ""} · ${String(channelOpt.label).split(" - ")[1] || channelOpt.label}`
    : channelValue;

  return (
    <AccessGuard moduleCode="REG_MP_AR_LIST">
      <Head title="AR List" />
      <Content>
        <div className="reg-ar-wrap">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  AR List
                </BlockTitle>
                <BlockDes className="text-soft">{titleMeta}</BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="reg-ar-report">
              <span className="reg-ar-nav-label">Report</span>
              <div className="reg-ar-chips">
                <button
                  type="button"
                  className={`reg-ar-chip ${isStoreMode ? "is-active" : ""}`}
                  onClick={() => {
                    setMode("store");
                    if (reportStore && reportStore !== "ALL") setStoreId(reportStore);
                    clearResult();
                  }}
                >
                  Per Store
                </button>
                {REPORT_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`reg-ar-chip ${mode === m.id ? "is-active" : ""}`}
                    onClick={() => selectReport(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="reg-ar-toolbar">
              <div className="reg-ar-toolbar-grid">
                <div className="reg-ar-f-item">
                  <label>Store / Channel Group</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={channelGrouped}
                    value={channelOpt}
                    onChange={onChannelChange}
                    isSearchable
                    formatOptionLabel={(opt) => (
                      <span className="reg-ar-store-meta">
                        <span>{opt.label}</span>
                        {opt.tiktok ? <span className="reg-ar-badge reg-ar-badge--tt">TikTok</span> : null}
                      </span>
                    )}
                  />
                </div>
                <div className="reg-ar-f-item">
                  <label>Marketplace</label>
                  {isTikTokChannel ? (
                    <div className="reg-ar-mp-fixed">
                      <span className="reg-ar-badge reg-ar-badge--tt">TikTok</span>
                      <strong>TIKTOK</strong>
                    </div>
                  ) : (
                    <RSelect
                      styles={filterSelectStyles}
                      options={MP_OPTS}
                      value={MP_OPTS.find((o) => o.value === marketplaceValue) || MP_OPTS[0]}
                      onChange={(o) => {
                        setMarketplace(o?.value || "ALL");
                        clearResult();
                      }}
                      isSearchable
                    />
                  )}
                </div>
                <div className="reg-ar-f-item">
                  <label>Periode Transaksi</label>
                  <AppDateRangePicker
                    startDate={fromDate}
                    endDate={toDate}
                    className="form-control form-control-sm reg-ar-ctl"
                    onChange={(f, t) => {
                      setFromDate(f || "");
                      setToDate(t || "");
                      setPresetId("");
                      clearResult();
                    }}
                  />
                </div>
                <div className="reg-ar-f-item">
                  <label>Status AR</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={STATUS_OPTS}
                    value={STATUS_OPTS.find((o) => o.value === status) || STATUS_OPTS[0]}
                    onChange={(o) => {
                      setStatus(o?.value || "ALL");
                      clearResult();
                    }}
                    isDisabled={!isStoreMode && mode === "total"}
                  />
                </div>
              </div>

              {(mode === "detail" || mode === "plu") && (
                <div className="reg-ar-toolbar-grid" style={{ marginTop: 12, gridTemplateColumns: "1fr" }}>
                  <div className="reg-ar-f-item">
                    <label>Tipe Tanggal</label>
                    <RSelect
                      styles={filterSelectStyles}
                      options={TIPE_OPTS}
                      value={TIPE_OPTS.find((o) => o.value === tipe) || TIPE_OPTS[0]}
                      onChange={(o) => setTipe(o?.value || "tgl_sampai")}
                    />
                  </div>
                </div>
              )}

              <div className="reg-ar-toolbar-row">
                <div className="reg-ar-presets">
                  <span className="reg-ar-presets-label">Preset</span>
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`reg-ar-preset ${presetId === p.id ? "is-active" : ""}`}
                      onClick={() => applyPreset(p.id)}
                    >
                      {p.id === "ytd" ? `YTD ${new Date().getFullYear()}` : p.label}
                    </button>
                  ))}
                </div>
                <div className="reg-ar-actions">
                  <button
                    type="button"
                    className="reg-ar-btn reg-ar-btn--ghost reg-ar-btn--icon"
                    title="Refresh"
                    disabled={loading || !canSearch}
                    onClick={loadData}
                  >
                    <Icon name="reload" />
                  </button>
                  <button
                    type="button"
                    className="reg-ar-btn reg-ar-btn--ghost"
                    disabled={!sortedRows.length}
                    onClick={exportExcel}
                  >
                    <Icon name="download" />
                    Export Excel
                  </button>
                  <button
                    type="button"
                    className="reg-ar-btn"
                    disabled={loading || !canSearch}
                    onClick={loadData}
                  >
                    <Icon name="filter" />
                    {loading ? "Memuat…" : "Terapkan Filter"}
                  </button>
                </div>
              </div>

              <div className="reg-ar-chips-active">
                <span className="reg-ar-chips-active-label">Filters aktif:</span>
                <span className="reg-ar-tag">
                  Channel: {channelChipLabel || "—"}
                  {!isStoreMode && channelValue !== "ALL" ? (
                    <button type="button" aria-label="Clear channel" onClick={() => onChannelChange({ value: "ALL" })}>
                      ×
                    </button>
                  ) : null}
                </span>
                <span className="reg-ar-tag">
                  Marketplace: {marketplaceValue}
                  {!isTikTokChannel && marketplaceValue !== "ALL" ? (
                    <button type="button" aria-label="Clear marketplace" onClick={() => setMarketplace("ALL")}>
                      ×
                    </button>
                  ) : null}
                </span>
                <span className="reg-ar-tag">
                  Periode: {fmtChipRange(fromDate, toDate) || "—"}
                </span>
                {(isStoreMode || mode !== "total") && (
                  <span className="reg-ar-tag">
                    Status: {statusLabel}
                    {status !== "ALL" ? (
                      <button type="button" aria-label="Clear status" onClick={() => setStatus("ALL")}>
                        ×
                      </button>
                    ) : null}
                  </span>
                )}
                {String(invoice || "").trim() ? (
                  <span className="reg-ar-tag">
                    Invoice: {invoice}
                    <button type="button" aria-label="Clear invoice" onClick={() => setInvoice("")}>
                      ×
                    </button>
                  </span>
                ) : null}
                <button type="button" className="reg-ar-reset" onClick={resetFilters}>
                  Reset Semua
                </button>
              </div>
            </div>

            {error ? <div className="reg-ar-err">{error}</div> : null}

            <div className="reg-ar-quick">
              <Icon name="search" className="reg-ar-quick-ico" />
              <input
                className="reg-ar-quick-input"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadData();
                }}
                placeholder="Pencarian cepat No. Invoice / Order ID"
              />
              {String(invoice || "").trim() ? (
                <button
                  type="button"
                  className="reg-ar-quick-clear"
                  aria-label="Clear search"
                  onClick={() => setInvoice("")}
                >
                  ×
                </button>
              ) : null}
            </div>

            {!loaded && !loading ? (
              <div className="reg-ar-empty">Belum ada data. Atur filter lalu klik Cari.</div>
            ) : null}

            {loaded && !loading && !sortedRows.length ? (
              <div className="reg-ar-empty">Tidak ada data untuk filter ini.</div>
            ) : null}

            {sortedRows.length > 0 && columns.length > 0 ? (
              <div className="reg-ar-table-wrap">
                <table className="reg-ar-table">
                  <thead>
                    <tr>
                      <th className="num reg-ar-no">No.</th>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className={col.num ? "num" : ""}
                          onClick={() => handleSort(col.key)}
                        >
                          {col.label}
                          <span
                            className={`reg-ar-sort-ico ${sortConfig.key === col.key ? "is-on" : ""}`}
                          >
                            {sortConfig.key === col.key
                              ? sortConfig.direction === "asc"
                                ? "▲"
                                : "▼"
                              : "↕"}
                          </span>
                        </th>
                      ))}
                      {mode === "total" ? (
                        <th className="num" onClick={() => handleSort("__rowtotal")}>
                          Row Total
                          <span
                            className={`reg-ar-sort-ico ${sortConfig.key === "__rowtotal" ? "is-on" : ""}`}
                          >
                            {sortConfig.key === "__rowtotal"
                              ? sortConfig.direction === "asc"
                                ? "▲"
                                : "▼"
                              : "↕"}
                          </span>
                        </th>
                      ) : null}
                      {isStoreMode ? (
                        <th className="reg-ar-act-th" style={{ cursor: "default" }}>
                          Action
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {(sortConfig.key === "__rowtotal" && mode === "total"
                      ? [...sortedRows].sort((a, b) => {
                          const sumA = columns
                            .filter((c) => c.num)
                            .reduce((s, c) => s + (Number(cell(a, c.key)) || 0), 0);
                          const sumB = columns
                            .filter((c) => c.num)
                            .reduce((s, c) => s + (Number(cell(b, c.key)) || 0), 0);
                          return compareCell(sumA, sumB, sortConfig.direction);
                        })
                      : sortedRows
                    ).map((row, idx) => {
                      const rowTotal =
                        mode === "total"
                          ? columns
                              .filter((c) => c.num)
                              .reduce((s, c) => s + (Number(cell(row, c.key)) || 0), 0)
                          : 0;
                      return (
                        <tr key={idx}>
                          <td className="num reg-ar-no">{idx + 1}</td>
                          {columns.map((col) => (
                            <td key={col.key} className={col.num ? "num" : ""}>
                              {renderCell(row, col)}
                            </td>
                          ))}
                          {mode === "total" ? <td className="num">{fmtNum(rowTotal)}</td> : null}
                          {isStoreMode ? <td className="reg-ar-act-td">{renderActionInfo(row)}</td> : null}
                        </tr>
                      );
                    })}
                  </tbody>
                  {footerSums ? (
                    <tfoot>
                      <tr>
                        <td className="num reg-ar-no" />
                        {columns.map((col, i) => (
                          <td key={col.key} className={col.num ? "num" : ""}>
                            {i === 0 ? "GRAND TOTAL" : col.num ? fmtNum(footerSums[col.key]) : ""}
                          </td>
                        ))}
                        {mode === "total" ? (
                          <td className="num">
                            {fmtNum(
                              Object.values(footerSums).reduce((a, b) => a + (Number(b) || 0), 0)
                            )}
                          </td>
                        ) : null}
                        {isStoreMode ? <td /> : null}
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            ) : null}
          </Block>

          <Modal
            isOpen={modalOpen}
            toggle={closeModal}
            size="lg"
            className="modal-dialog-centered rsd-detail-modal"
          >
            <div className="rsd-detail-hero">
              <div>
                <h5 className="rsd-detail-title">
                  {modalKind === "sales" ? "Sales Status" : "AR Detail"}
                </h5>
                <p className="rsd-detail-sub">
                  {modalRow
                    ? [
                        cell(modalRow, "NO_INVOICE", ["no_invoice"]),
                        cell(modalRow, "NAMA_MP", ["marketplace"]),
                        cell(modalRow, "STORE", ["store"]),
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : null}
                </p>
              </div>
              <button type="button" className="btn btn-icon btn-trigger" onClick={closeModal} aria-label="Tutup">
                <Icon name="cross" />
              </button>
            </div>
            <ModalBody className="rsd-detail-body">
              {modalError ? <div className="reg-ar-err">{modalError}</div> : null}
              {modalLoading ? <div className="text-soft small mb-2">Memuat…</div> : null}

              {modalKind === "sales" && modalRow ? (
                <div className="reg-ar-modal-grid">
                  {[
                    ["Status Sales", cell(modalRow, "PRA_SALES_STATUS", ["pra_sales_status"])],
                    ["Confirm Status", cell(modalRow, "CONFIRM_STATUS", ["confirm_status"])],
                    ["Realisasi", cell(modalRow, "REALISASI_STATUS", ["realisasi_status"])],
                    ["AR Status", cell(modalRow, "AR_STATUS", ["ar_status"])],
                    ["Marketplace", cell(modalRow, "NAMA_MP", ["marketplace"])],
                    ["Brand", cell(modalRow, "BRAND", ["brand"])],
                    ["Store", cell(modalRow, "STORE", ["store"])],
                    ["Invoice", cell(modalRow, "NO_INVOICE", ["no_invoice"])],
                    ["Tgl Transaksi", fmtDate(cell(modalRow, "TGL_TRANSAKSI", ["tgl_transaksi"]))],
                    ["Total", fmtNum(cell(modalRow, "GRAND_TOTAL", ["grand_total"]))],
                    [
                      "ID Sales",
                      cell(modalRow, "ID_TR_SALES_HEADER", ["id_tr_sales_header"]) || "—",
                    ],
                    [
                      "ID Prasales",
                      cell(modalRow, "ID_PRASALES_HEADER", ["id_prasales_header"]) || "—",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="reg-ar-modal-item">
                      <span className="reg-ar-modal-label">{label}</span>
                      <span className="reg-ar-modal-value">{value || "—"}</span>
                    </div>
                  ))}
                  <p className="reg-ar-modal-note">
                    Info saja — confirm / approve / reject tidak tersedia di halaman ini.
                  </p>
                </div>
              ) : null}

              {modalKind === "ar" && !modalLoading ? (
                <div className="reg-ar-modal-grid">
                  {AR_DETAIL_FIELDS.map((f) => {
                    const raw = modalDetail ? cell(modalDetail, f.key) : "";
                    const value =
                      raw === "" || raw == null
                        ? "—"
                        : f.num
                          ? fmtNum(raw)
                          : String(raw);
                    return (
                      <div key={f.key} className="reg-ar-modal-item">
                        <span className="reg-ar-modal-label">{f.label}</span>
                        <span className="reg-ar-modal-value">{value}</span>
                      </div>
                    );
                  })}
                  {modalDetail && (modalDetail.DPP_CHECK != null || modalDetail.PPN_CHECK != null) ? (
                    <>
                      <div className="reg-ar-modal-item">
                        <span className="reg-ar-modal-label">DPP</span>
                        <span className="reg-ar-modal-value">
                          {String(modalDetail.DPP_CHECK) === "true" ||
                          String(modalDetail.DPP_CHECK) === "1"
                            ? "Ya"
                            : "Tidak"}
                        </span>
                      </div>
                      <div className="reg-ar-modal-item">
                        <span className="reg-ar-modal-label">PPN</span>
                        <span className="reg-ar-modal-value">
                          {String(modalDetail.PPN_CHECK) === "true" ||
                          String(modalDetail.PPN_CHECK) === "1"
                            ? "Ya"
                            : "Tidak"}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </ModalBody>
          </Modal>
        </div>
      </Content>
    </AccessGuard>
  );
};

export default RegMpArListPage;
