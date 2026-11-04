import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
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
import { RivStickyThead } from "./RivStickyThead";
import DgsConfirmSalesModal from "../dgs/DgsConfirmSalesModal";
import DgsArEditModal from "../dgs/DgsArEditModal";
import { DgsKomisiStrip, DgsArUploadPanel, AR_UPLOAD_STORES } from "../dgs/DgsArTools";
import {
  ScCaseCard,
  ScCaseList,
  ScEmptyState,
  ScNotice,
  ScPageHeader,
  ScSettlementStrip,
  ScViewToggle,
} from "../dgs/sc";
import DgsContentShell from "../dgs/shell/DgsContentShell";
import "../dgs/dgs.css";
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
  { value: "ZALORA", label: "ZALORA" },
  { value: "JD.ID", label: "JD.ID" },
  { value: "ZILINGO", label: "ZILINGO" },
  { value: "DIRECT SELLING", label: "DIRECT SELLING" },
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

const PAGE_SIZE = 50;

const SimplePager = ({ page, total, size, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / size) || 1);
  if (total <= size) return null;
  return (
    <div className="reg-ar-pager">
      <span className="reg-ar-pager-info">
        {(page - 1) * size + 1}–{Math.min(page * size, total)} dari {total.toLocaleString("id-ID")} ·
        Halaman {page}/{pages}
      </span>
      <div className="reg-ar-pager-btns">
        <button
          type="button"
          className="reg-ar-pager-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          className="reg-ar-pager-btn"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
};

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
  { key: "REALISASI_STATUS", label: "Realisasi", alts: ["realisasi_status"], realisasi: true },
  { key: "RETUR", label: "Status", alts: ["status", "STATUS"] },
];

/** Info realisasi AR: SUDAH (pelunasan masuk) / BELUM (AR sudah diinput) / BELUM AR. */
const realisasiInfo = (row) => {
  const done = /done|sudah/i.test(String(cell(row, "REALISASI_STATUS", ["realisasi_status"]) || ""));
  if (done) return { text: "SUDAH", tone: "is-ok" };
  const arStatus = String(cell(row, "AR_STATUS", ["ar_status"]) || "");
  if (/sudah/i.test(arStatus)) return { text: "BELUM", tone: "is-warn" };
  return { text: "BELUM AR", tone: "is-muted" };
};

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

const addDaysYmd = (ymd, days) => {
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + Number(days || 0));
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

/** Match pencarian cepat ke kolom invoice / order id. */
const rowMatchesQuick = (row, q) => {
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return true;
  const keys = [
    "NO_INVOICE",
    "INVOICE",
    "NO_ORDER",
    "ORDER_ID",
    "NO_RESI",
    "ID_TR_SALES_HEADER",
    "TR_ID",
  ];
  return keys.some((k) => String(cell(row, k) || "").toLowerCase().includes(needle));
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
  const keys = [
    "BRAND",
    "STORE",
    "MARKETPLACE",
    "INVOICE",
    "PLU",
    "NAMA_MP",
    "TANGGAL_REALISASI",
    "TGL_REALISASI",
    "NO_INVOICE",
  ];
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

/** Parse "65.28%" / "65,28" → number for margin display/footer. */
const parseMarginPct = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const m = String(v).replace(/%/g, "").replace(/\s/g, "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

const isMarginKey = (k) => String(k || "").toUpperCase() === "MARGIN";

/**
 * `dgs` = DigitalSales penuh (/dgs/ar-list): Confirm Sales, edit AR, upload.
 * `dgsReturOnly` = DigitalSalesRetur (/dgs/retur-list): per-store + retur item saja.
 */
const RegMpArListPage = ({ dgs = false, dgsReturOnly = false }) => {
  const dgsFull = Boolean(dgs) && !dgsReturOnly;
  const dgsAny = dgsFull || dgsReturOnly;
  const [confirmId, setConfirmId] = useState("");
  const [arEditId, setArEditId] = useState("");
  const [mode, setMode] = useState("store"); // store | total | detail | plu | transaksi
  const [storeId, setStoreId] = useState("02E");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [marketplace, setMarketplace] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [invoice, setInvoice] = useState("");
  /** Filter lokal di atas list yang sudah ter-load (bukan param API). */
  const [listQuery, setListQuery] = useState("");
  const [hideRetur, setHideRetur] = useState(!dgsReturOnly);
  const [returView, setReturView] = useState(dgsReturOnly ? "cards" : "table"); // table | cards
  const [reportStore, setReportStore] = useState("ALL");
  const [tipe, setTipe] = useState("tgl_sampai");
  const [rows, setRows] = useState([]);
  /** TOTAL row dari API detail realisasi (MARGIN %, HPP, dll) — dipakai footer. */
  const [totalsRow, setTotalsRow] = useState(null);
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
  const [presetId, setPresetId] = useState("month");
  const [wide, setWide] = useState(false);
  const [page, setPage] = useState(1);
  const wrapRef = useRef(null);
  const tableRef = useRef(null);
  const loadedRef = useRef(false);
  const rowsLenRef = useRef(0);
  const lastQuickFetchRef = useRef("");
  const quickTimerRef = useRef(null);

  loadedRef.current = loaded;
  rowsLenRef.current = rows.length;

  useEffect(() => {
    const wrap = wrapRef.current;
    const container = wrap?.closest(".container-xl");
    if (!container) return undefined;
    container.classList.toggle("reg-ar-container-wide", wide);
    const t = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 520);
    return () => {
      container.classList.remove("reg-ar-container-wide");
      window.clearTimeout(t);
    };
  }, [wide]);

  const isStoreMode = mode === "store";
  const canSearch = Boolean(fromDate && toDate && (isStoreMode ? storeId : true));
  const channelGrouped = isStoreMode ? CHANNEL_OPTS : CHANNEL_OPTS_REPORT;
  const channelValue = isStoreMode ? storeId : reportStore;
  const channelOpt = findChannelOpt(channelGrouped, channelValue);
  const isTikTokChannel = Boolean(channelOpt?.tiktok);
  const marketplaceValue = isTikTokChannel ? "TIKTOK" : marketplace?.trim() || "ALL";

  const clearResult = () => {
    setRows([]);
    setTotalsRow(null);
    setLoaded(false);
    setError("");
    setListQuery("");
    lastQuickFetchRef.current = "";
    setSortConfig({ key: "", direction: "asc" });
    setPage(1);
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

  /**
   * opts.invoiceOverride — pakai invoice ini (pencarian cepat).
   * opts.ignoreInvoice — Terapkan Filter: jangan kirim invoice ke API.
   * opts.relaxFilters — pencarian cepat sebelum list: abaikan status/MP/periode ketat.
   */
  const loadData = useCallback(
    async (opts = {}) => {
      const relax = Boolean(opts.relaxFilters);
      const from = relax ? addDaysYmd(todayYmd(), -730) : fromDate;
      const to = relax ? todayYmd() : toDate;
      if (!from || !to) {
        setError("Pilih periode dulu.");
        return;
      }
      if (isStoreMode && !storeId) {
        setError("Pilih store dulu.");
        return;
      }

      let invParam = "-";
      if (opts.invoiceOverride !== undefined) {
        invParam = String(opts.invoiceOverride || "").trim() || "-";
      } else if (!opts.ignoreInvoice) {
        invParam = String(invoice || "").trim() || "-";
      }

      setLoading(true);
      setError("");
      setListQuery("");
      try {
        const base = {
          from_date: from,
          to_date: to,
          marketplace: relax
            ? "ALL"
            : isTikTokChannel
              ? "TIKTOK"
              : marketplace?.trim() || "ALL",
        };
        let res;
        if (isStoreMode) {
          res = await getRegMpArListByStore({
            ...base,
            id_store: storeId,
            status: relax ? "ALL" : status || "ALL",
            invoice: invParam,
          });
        } else if (mode === "total") {
          res = await getRegMpArListTotal(base);
        } else if (mode === "detail") {
          res = await getRegMpArListDetailRealisasi({
            ...base,
            id_store: reportStore || "ALL",
            tipe: tipe || "tgl_sampai",
            invoice: invParam === "-" ? "" : invParam,
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
          setTotalsRow(null);
          setLoaded(true);
          return;
        }
        let list = extractRows(res);
        let totals = null;
        if (!isStoreMode) {
          const summary = list.find((r) => isSummaryRow(r));
          if (summary) totals = summary;
          list = list.filter((r) => !isSummaryRow(r));
        }
        setTotalsRow(totals);
        setRows(list);
        setLoaded(true);
        setSortConfig({ key: "", direction: "asc" });
        setPage(1);
        if (relax && invParam && invParam !== "-") {
          lastQuickFetchRef.current = invParam;
        } else if (opts.ignoreInvoice) {
          lastQuickFetchRef.current = "";
        }
      } catch (e) {
        setError(e?.message || "Gagal memuat data");
        setRows([]);
        setTotalsRow(null);
        setLoaded(true);
        setPage(1);
      } finally {
        setLoading(false);
      }
    },
    [
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
    ]
  );

  /**
   * Pencarian cepat:
   * - list dari Terapkan Filter (>1 baris) → filter lokal
   * - belum load / cuma 0–1 baris → fetch API (biar ganti invoice xxx→zzz tetap jalan)
   */
  const runQuickSearch = useCallback(
    (raw, { immediate = false } = {}) => {
      const q = String(raw || "").trim();
      if (quickTimerRef.current) {
        window.clearTimeout(quickTimerRef.current);
        quickTimerRef.current = null;
      }
      const exec = () => {
        if (!q) {
          setListQuery("");
          lastQuickFetchRef.current = "";
          setPage(1);
          return;
        }
        const canFilterLocal = loadedRef.current && rowsLenRef.current > 1;
        if (canFilterLocal) {
          setListQuery(q);
          setPage(1);
          return;
        }
        if (lastQuickFetchRef.current === q && loadedRef.current) return;
        loadData({ invoiceOverride: q, relaxFilters: true });
      };
      if (immediate) {
        exec();
        return;
      }
      quickTimerRef.current = window.setTimeout(exec, 450);
    },
    [loadData]
  );

  useEffect(() => {
    runQuickSearch(invoice);
    return () => {
      if (quickTimerRef.current) window.clearTimeout(quickTimerRef.current);
    };
  }, [invoice, runQuickSearch]);

  const columns = useMemo(() => {
    if (isStoreMode) {
      if (dgsReturOnly) return STORE_COLS.filter((c) => !c.realisasi);
      return STORE_COLS;
    }
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
      if (isMarginKey(k)) {
        return { key: k, label: "Margin", percent: true };
      }
      const sample = rows.find((r) => cell(r, k) !== "");
      const num =
        sample &&
        isNumericLike(cell(sample, k)) &&
        !["BRAND", "STORE", "MARKETPLACE", "INVOICE", "NAMA_MP", "NO_INVOICE", "PLU"].includes(
          String(k).toUpperCase()
        );
      return { key: k, label: String(k).replace(/_/g, " "), num: Boolean(num) };
    });
  }, [isStoreMode, rows, mode, dgsReturOnly]);

  const isReturRow = (row) => {
    const st = String(cell(row, "RETUR", ["status", "STATUS"]) || "").trim();
    if (!st || st === "-" || st === "—") return false;
    return /retur/i.test(st) || Number(cell(row, "TOTAL_RETUR", ["total_retur"])) > 0;
  };

  const sortedRows = useMemo(() => {
    let base = isStoreMode && hideRetur ? rows.filter((r) => !isReturRow(r)) : rows;
    if (listQuery.trim()) {
      base = base.filter((r) => rowMatchesQuick(r, listQuery));
    }
    if (!sortConfig.key) return base;
    if (sortConfig.key === "__rowtotal" && mode === "total") {
      const numKeys = columns.filter((c) => c.num).map((c) => c.key);
      const next = [...base];
      next.sort((a, b) => {
        const sumA = numKeys.reduce((s, k) => s + (Number(cell(a, k)) || 0), 0);
        const sumB = numKeys.reduce((s, k) => s + (Number(cell(b, k)) || 0), 0);
        return compareCell(sumA, sumB, sortConfig.direction);
      });
      return next;
    }
    const next = [...base];
    next.sort((a, b) =>
      compareCell(cell(a, sortConfig.key), cell(b, sortConfig.key), sortConfig.direction)
    );
    return next;
  }, [rows, sortConfig, mode, columns, isStoreMode, hideRetur, listQuery]);

  const displayRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE) || 1);
    if (page > pages) setPage(pages);
  }, [sortedRows.length, page]);

  useEffect(() => {
    setPage(1);
  }, [hideRetur]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setPage(1);
  }, []);

  const footerSums = useMemo(() => {
    if (!columns.length || (!sortedRows.length && !totalsRow)) return null;
    const sums = {};
    let any = false;
    columns.forEach((col) => {
      if (col.percent) {
        // Prefer TOTAL row dari API (margin % keseluruhan), fallback weighted (net-hpp)/net
        const fromApi = parseMarginPct(cell(totalsRow, col.key, col.alts || []));
        if (fromApi != null) {
          sums[col.key] = fromApi;
          any = true;
          return;
        }
        let net = 0;
        let hpp = 0;
        sortedRows.forEach((r) => {
          net += Number(cell(r, "total_net", ["TOTAL_NET", "NET"])) || 0;
          hpp += Number(cell(r, "HPP", ["hpp"])) || 0;
        });
        if (net > 0) {
          sums[col.key] = Math.round(((net - hpp) / net) * 10000) / 100;
          any = true;
        }
        return;
      }
      if (!col.num) return;
      if (totalsRow && cell(totalsRow, col.key, col.alts || []) !== "") {
        const tv = Number(cell(totalsRow, col.key, col.alts || []));
        if (Number.isFinite(tv)) {
          sums[col.key] = tv;
          any = true;
          return;
        }
      }
      let sum = 0;
      sortedRows.forEach((r) => {
        const v = Number(cell(r, col.key, col.alts || []));
        if (Number.isFinite(v)) sum += v;
      });
      sums[col.key] = sum;
      any = true;
    });
    return any ? sums : null;
  }, [columns, sortedRows, totalsRow]);

  const titleMeta = useMemo(() => {
    if (!loaded) return "Pilih store / report, filter periode, lalu cari";
    const n = sortedRows.length.toLocaleString("id-ID");
    const pageInfo =
      sortedRows.length > PAGE_SIZE
        ? ` · halaman ${page}/${Math.ceil(sortedRows.length / PAGE_SIZE)}`
        : "";
    const hidden =
      isStoreMode && hideRetur && rows.length > sortedRows.length
        ? ` · hide retur ${rows.length - sortedRows.length}`
        : "";
    if (isStoreMode) return `${n} baris${pageInfo}${hidden} · ${storeId} · ${fromDate} s/d ${toDate}`;
    const label = REPORT_MODES.find((m) => m.id === mode)?.label || mode;
    return `${n} baris${pageInfo} · ${label} · ${fromDate} s/d ${toDate}`;
  }, [loaded, isStoreMode, sortedRows.length, rows.length, hideRetur, storeId, fromDate, toDate, mode, page]);

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
          if (c.realisasi) return realisasiInfo(r).text;
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
    if (col.realisasi) {
      const info = realisasiInfo(row);
      return <span className={`reg-ar-real ${info.tone}`}>{info.text}</span>;
    }
    const v = cell(row, col.key, col.alts || []);
    if (col.percent) {
      const p = parseMarginPct(v);
      return p == null ? "—" : `${p.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
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

  const openDgsConfirm = (row) => {
    const id = String(cell(row, "ID_PRASALES_HEADER", ["id_prasales_header"]) || "").trim();
    if (!id) {
      setError("ID prasales tidak ditemukan pada baris ini.");
      return;
    }
    setConfirmId(id);
  };

  const openDgsAr = (row) => {
    const id = String(cell(row, "ID_TR_SALES_HEADER", ["id_tr_sales_header"]) || "").trim();
    if (!id) {
      setError("Transaksi belum diproses — lakukan Confirm Sales (PROSES) dulu sebelum input AR.");
      return;
    }
    setError("");
    setArEditId(id);
  };

  /** Action strip: REG view-only; DGS full; DGS retur = retur item only. */
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
          title={
            dgsReturOnly
              ? `${salesStatus} — retur item`
              : dgsFull
                ? `${salesStatus} — buka Confirm Sales`
                : `${salesStatus} — lihat info`
          }
          onClick={() => (dgsAny ? openDgsConfirm(row) : openSalesInfo(row))}
        >
          <Icon name="setting" />
          <span>{dgsReturOnly ? "Retur" : salesStatus}</span>
        </button>
        {!dgsReturOnly ? (
          <button
            type="button"
            className="reg-ar-act-btn is-info"
            title={arStatus || (dgsFull ? "Input / Edit AR" : "AR Detail")}
            onClick={() => (dgsFull ? openDgsAr(row) : openArDetail(row))}
          >
            <Icon name="check-round-cut" />
            <span>{dgsFull ? "AR" : "AR Detail"}</span>
          </button>
        ) : null}
      </div>
    );
  };

  const scrollRevision = `${loading ? "loading" : "ready"}-${sortedRows.length}-${mode}-${wide ? "w" : "n"}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode={dgsReturOnly ? "DGS_RETUR_LIST" : dgsFull ? "DGS_AR_LIST" : "REG_MP_AR_LIST"}>
      <Head title={dgsReturOnly ? "Retur" : "AR List"} />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
        {(() => {
          const Shell = dgsAny ? DgsContentShell : React.Fragment;
          return (
        <Shell>
        <div
          ref={wrapRef}
          className={`reg-ar-wrap${wide ? " is-wide" : ""}${dgsAny ? " dgs-dash sc-scope" : ""}`}
        >
          {dgsAny ? (
            <ScPageHeader
              title={dgsReturOnly ? "Kelola pengembalian" : "Transaksi AR"}
              description={
                dgsReturOnly
                  ? "Per store · retur item saja (tanpa AR / approve / upload)"
                  : titleMeta
              }
              actions={
                <button
                  type="button"
                  className={`reg-ar-wide-btn${wide ? " is-on" : ""}`}
                  title={wide ? "Lebar normal" : "Lebar penuh"}
                  aria-label={wide ? "Lebar normal" : "Lebar penuh"}
                  aria-pressed={wide}
                  onClick={() => setWide((w) => !w)}
                >
                  <Icon name={wide ? "minimize" : "maximize"} />
                </button>
              }
            />
          ) : (
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    AR List
                  </BlockTitle>
                  <BlockDes className="text-soft">{titleMeta}</BlockDes>
                </BlockHeadContent>
                <BlockHeadContent>
                  <button
                    type="button"
                    className={`reg-ar-wide-btn${wide ? " is-on" : ""}`}
                    title={wide ? "Lebar normal" : "Lebar penuh"}
                    aria-label={wide ? "Lebar normal" : "Lebar penuh"}
                    aria-pressed={wide}
                    onClick={() => setWide((w) => !w)}
                  >
                    <Icon name={wide ? "minimize" : "maximize"} />
                  </button>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>
          )}

          <Block>
            {dgsFull ? (
              <ScNotice tone="info">
                Input & edit AR, confirm sales, dan upload invoice tersedia di mode store. Gunakan tab Report untuk ringkasan.
              </ScNotice>
            ) : null}
            {dgsReturOnly ? (
              <ScNotice tone="warn">
                Mode pengembalian: fokus ke item retur. Default tampilan Kartu seperti Seller Center.
              </ScNotice>
            ) : null}
            {dgsFull && loaded && sortedRows.length > 0 ? (
              <ScSettlementStrip
                items={[
                  { id: "rows", label: "Baris tampil", value: fmtNum(sortedRows.length) },
                  { id: "total", label: "Filter aktif", value: status === "ALL" ? "Semua status" : status },
                  { id: "mp", label: "Marketplace", value: marketplaceValue || "ALL" },
                  { id: "store", label: "Store", value: isStoreMode ? storeId : reportStore || "—" },
                ]}
                operators={["·", "·", "·"]}
              />
            ) : null}
            {dgsFull ? <DgsKomisiStrip /> : null}
            {!dgsReturOnly ? (
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
            ) : null}

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
                    className="reg-ar-btn reg-ar-btn--ghost"
                    onClick={resetFilters}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="reg-ar-btn reg-ar-btn--ghost reg-ar-btn--icon"
                    title="Refresh"
                    disabled={loading || !canSearch}
                    onClick={() => loadData({ ignoreInvoice: true })}
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
                    onClick={() => loadData({ ignoreInvoice: true })}
                  >
                    <Icon name="filter" />
                    {loading ? "Memuat…" : "Terapkan Filter"}
                  </button>
                </div>
              </div>
            </div>

            {dgsFull && isStoreMode && AR_UPLOAD_STORES.includes(storeId) ? (
              <DgsArUploadPanel store={storeId} onDone={() => loadData({ ignoreInvoice: true })} />
            ) : null}

            {error ? <div className="reg-ar-err">{error}</div> : null}

            <div className="reg-ar-quick-row">
              <div className="reg-ar-quick">
                <Icon name="search" className="reg-ar-quick-ico" />
                <input
                  className="reg-ar-quick-input"
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runQuickSearch(invoice, { immediate: true });
                  }}
                  placeholder="Pencarian cepat No. Invoice / Order ID (otomatis)"
                />
                {String(invoice || "").trim() ? (
                  <button
                    type="button"
                    className="reg-ar-quick-clear"
                    aria-label="Clear search"
                    onClick={() => {
                      setInvoice("");
                      setListQuery("");
                      lastQuickFetchRef.current = "";
                      setPage(1);
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>

              {isStoreMode ? (
                <div className="reg-ar-retur-toggle" role="radiogroup" aria-label="Tampilkan status retur">
                  <label className={hideRetur ? "is-on" : ""}>
                    <input
                      type="radio"
                      name="ar-retur-vis"
                      checked={hideRetur}
                      onChange={() => setHideRetur(true)}
                    />
                    Hide Retur
                  </label>
                  <label className={!hideRetur ? "is-on" : ""}>
                    <input
                      type="radio"
                      name="ar-retur-vis"
                      checked={!hideRetur}
                      onChange={() => setHideRetur(false)}
                    />
                    Tampilkan Retur
                  </label>
                </div>
              ) : (
                <span className="reg-ar-quick-spacer" />
              )}

              {sortedRows.length > PAGE_SIZE ? (
                <SimplePager page={page} total={sortedRows.length} size={PAGE_SIZE} onChange={setPage} />
              ) : loaded && sortedRows.length > 0 ? (
                <span className="reg-ar-record-info">
                  {sortedRows.length.toLocaleString("id-ID")} baris
                  {isStoreMode && hideRetur && rows.length !== sortedRows.length
                    ? ` · retur disembunyikan (${(rows.length - sortedRows.length).toLocaleString("id-ID")})`
                    : ""}
                </span>
              ) : null}
            </div>

            {dgsReturOnly && loaded && sortedRows.length > 0 ? (
              <div className="sc-toolbar-row">
                <span className="sc-section__meta">{sortedRows.length.toLocaleString("id-ID")} kasus</span>
                <ScViewToggle
                  value={returView}
                  onChange={setReturView}
                  options={[
                    { id: "table", label: "Tabel" },
                    { id: "cards", label: "Kartu" },
                  ]}
                />
              </div>
            ) : null}

            {!loaded && !loading ? (
              dgsAny ? (
                <ScEmptyState
                  icon="file-docs"
                  title="Belum ada data"
                  hint="Atur filter store / periode lalu klik Cari."
                />
              ) : (
                <div className="reg-ar-empty">Belum ada data. Atur filter lalu klik Cari.</div>
              )
            ) : null}

            {loaded && !loading && !sortedRows.length ? (
              dgsAny ? (
                <ScEmptyState
                  icon="search"
                  title="Tidak ada data untuk filter ini"
                  hint={
                    isStoreMode && hideRetur && rows.length
                      ? "Semua baris tersembunyi (Hide Retur aktif). Pilih Tampilkan Retur."
                      : "Ubah filter atau periode, lalu cari lagi."
                  }
                />
              ) : (
                <div className="reg-ar-empty">
                  {isStoreMode && hideRetur && rows.length
                    ? "Semua baris tersembunyi (Hide Retur aktif). Pilih Tampilkan Retur untuk melihat data retur."
                    : "Tidak ada data untuk filter ini."}
                </div>
              )
            ) : null}

            {dgsReturOnly && returView === "cards" && sortedRows.length > 0 ? (
              <ScCaseList>
                {displayRows.map((row, idx) => {
                  const inv = cell(row, "NO_INVOICE", ["no_invoice", "INVOICE"]);
                  const st = String(cell(row, "RETUR", ["status", "STATUS"]) || "—");
                  const tone = /tidak|mismatch|tolak|reject/i.test(st)
                    ? "bad"
                    : /tunggu|wait|pending|9/i.test(st)
                      ? "warn"
                      : /terima|ok|sesuai|2/i.test(st)
                        ? "ok"
                        : "info";
                  return (
                    <ScCaseCard
                      key={`${inv}-${idx}`}
                      title={inv || `Baris ${(page - 1) * PAGE_SIZE + idx + 1}`}
                      meta={`${cell(row, "NAMA_MP", ["marketplace"]) || "—"} · ${cell(row, "STORE", ["store"]) || "—"} · ${cell(row, "TGL_TRANSAKSI", ["tgl_transaksi"]) || "—"}`}
                      status={st}
                      statusTone={tone}
                      reason={cell(row, "BRAND", ["brand"]) ? `Brand ${cell(row, "BRAND", ["brand"])}` : null}
                      amount={`Rp ${fmtNum(cell(row, "GRAND_TOTAL", ["grand_total", "TOTAL"]))}`}
                      onClick={() => openDgsConfirm(row)}
                    />
                  );
                })}
              </ScCaseList>
            ) : null}

            {sortedRows.length > 0 && columns.length > 0 && !(dgsReturOnly && returView === "cards") ? (
              <>
                <div className="reg-ar-table-wrap">
                  <table ref={tableRef} className="reg-ar-table">
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
                      {displayRows.map((row, idx) => {
                        const rowTotal =
                          mode === "total"
                            ? columns
                                .filter((c) => c.num)
                                .reduce((s, c) => s + (Number(cell(row, c.key)) || 0), 0)
                            : 0;
                        const no = (page - 1) * PAGE_SIZE + idx + 1;
                        return (
                          <tr key={no}>
                            <td className="num reg-ar-no">{no}</td>
                            {columns.map((col) => (
                              <td key={col.key} className={col.num ? "num" : ""}>
                                {renderCell(row, col)}
                              </td>
                            ))}
                            {mode === "total" ? <td className="num">{fmtNum(rowTotal)}</td> : null}
                            {isStoreMode ? (
                              <td className="reg-ar-act-td">{renderActionInfo(row)}</td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                    {footerSums ? (
                      <tfoot>
                        <tr>
                          <td className="num reg-ar-no" />
                          {columns.map((col, i) => (
                            <td key={col.key} className={col.num || col.percent ? "num" : ""}>
                              {i === 0
                                ? "GRAND TOTAL"
                                : col.percent && footerSums[col.key] != null
                                  ? `${Number(footerSums[col.key]).toLocaleString("id-ID", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}%`
                                  : col.num
                                    ? fmtNum(footerSums[col.key])
                                    : ""}
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
                <SimplePager
                  page={page}
                  total={sortedRows.length}
                  size={PAGE_SIZE}
                  onChange={setPage}
                />
              </>
            ) : null}

            <RivStickyThead
              tableRef={tableRef}
              enabled={Boolean(loaded && sortedRows.length)}
              tableClassName="reg-ar-table"
            />
          </Block>
        </div>
        </Shell>
          );
        })()}
        </PageSmoothScroll>

          {dgsAny ? (
            <>
              <DgsConfirmSalesModal
                isOpen={Boolean(confirmId)}
                idPrasales={confirmId}
                onClose={() => setConfirmId("")}
                onChanged={() => loadData({ ignoreInvoice: true })}
                returOnly={dgsReturOnly}
              />
              {dgsFull ? (
                <DgsArEditModal
                  isOpen={Boolean(arEditId)}
                  trId={arEditId}
                  onClose={() => setArEditId("")}
                  onSaved={() => loadData({ ignoreInvoice: true })}
                />
              ) : null}
            </>
          ) : null}

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
      </Content>
    </AccessGuard>
  );
};

export default RegMpArListPage;
