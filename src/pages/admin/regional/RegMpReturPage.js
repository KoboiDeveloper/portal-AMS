import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ExcelJS from "exceljs";
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
import { getRegMpReturBadge, getRegMpReturList } from "../../../services/regional/regional.service";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import { RivStickyThead } from "./RivStickyThead";
import DgsReturConfirmModal from "../dgs/DgsReturConfirmModal";
import "./reg-mp-ar-list.css";
import "./reg-mp-retur.css";

const MP_OPTS = [
  { value: "0", label: "All Marketplace" },
  { value: "BLANJA.COM", label: "BLANJA.COM" },
  { value: "BLIBLI", label: "BLIBLI" },
  { value: "BUKALAPAK", label: "BUKALAPAK" },
  { value: "DIRECT SELLING", label: "DIRECT SELLING" },
  { value: "JD.ID", label: "JD.ID" },
  { value: "LAZADA", label: "LAZADA" },
  { value: "SHOPEE", label: "SHOPEE" },
  { value: "TIKTOK", label: "TIKTOK" },
  { value: "TOKOPEDIA", label: "TOKOPEDIA" },
  { value: "ZALORA", label: "ZALORA" },
  { value: "ZILINGO", label: "ZILINGO" },
];

const BRAND_OPTS = [
  { value: "ALL", label: "All Brand" },
  { value: "CELCIUS", label: "CELCIUS" },
  { value: "CELCIUS WOMAN", label: "CELCIUS WOMAN" },
  { value: "MISSISSIPPI", label: "MISSISSIPPI" },
  { value: "QUEENSLAND", label: "QUEENSLAND" },
  { value: "IWAN FASHION", label: "IWAN FASHION" },
  { value: "FLIES", label: "FLIES" },
  { value: "DIRECT SELLING", label: "DIRECT SELLING" },
  { value: "TIKTOK - CELCIUSMEN 08E", label: "TIKTOK · 08E" },
  { value: "TIKTOK - CELCIUS WOMAN 09E", label: "TIKTOK · 09E" },
  { value: "TIKTOK - MISSISSIPPI 10E", label: "TIKTOK · 10E" },
  { value: "TIKTOK - QUEENSLAND 11E", label: "TIKTOK · 11E" },
];

const DATE_BY_OPTS = [
  { value: "Tanggal Transaksi", label: "Tgl Transaksi" },
  { value: "Tanggal Retur", label: "Tgl Retur" },
  { value: "Tanggal Kembali", label: "Tgl Kembali" },
];

const KET_GUDANG_OPTS = [
  { value: "Semua Barang", label: "Semua Barang" },
  { value: "Outstanding", label: "Outstanding" },
  { value: "Barang Layak Jual", label: "Siap Dijual Kembali" },
  { value: "Barang Tidak Layak Jual", label: "Tidak Layak Jual" },
  { value: "Barang Tidak Sesuai", label: "Tidak Sesuai" },
  { value: "Barang Tidak Kembali", label: "Tidak Kembali" },
];

/** Satu baris per item (seperti tabel biasa) — PLU + Deskripsi digabung 1 kolom bertumpuk agar tidak mepet. */
const COLS = [
  { key: "TANGGAL_TRANSAKSI", label: "Tgl Transaksi", date: true, cls: "col-date" },
  { key: "MARKETPLACE", label: "MP", cls: "col-mp" },
  { key: "NO_INVOICE", label: "No Invoice", cls: "col-inv" },
  { key: "PLU", subKey: "DESKRIPSI", label: "PLU / Deskripsi", cls: "col-plu-desc", wrap: true },
  { key: "PRICE_POS", label: "Price POS", num: true, cls: "col-price" },
  { key: "TANGGAL_RETUR", label: "Tgl Retur", date: true, cls: "col-dt" },
  { key: "KETERANGAN_ADMIN", label: "Ket. Admin", cls: "col-note", wrap: true },
  { key: "RETUR_BY", label: "Retur Oleh", cls: "col-by" },
  { key: "TANGGAL_KEMBALI", label: "Tgl Kembali", date: true, cls: "col-dt" },
  { key: "KETERANGAN_GUDANG", label: "Ket. Gudang", cls: "col-gudang", wrap: true },
  { key: "SISA_HARI_RETUR", label: "Sisa", sortNum: true, cls: "col-sisa" },
];

const EXPORT_COLS = [
  { key: "TANGGAL_TRANSAKSI", label: "Tgl Transaksi" },
  { key: "MARKETPLACE", label: "MP" },
  { key: "NO_INVOICE", label: "No Invoice" },
  { key: "PLU", label: "PLU" },
  { key: "DESKRIPSI", label: "Deskripsi" },
  { key: "PRICE_POS", label: "Price POS" },
  { key: "TANGGAL_RETUR", label: "Tgl Retur" },
  { key: "KETERANGAN_ADMIN", label: "Ket. Admin" },
  { key: "RETUR_BY", label: "Retur Oleh" },
  { key: "TANGGAL_KEMBALI", label: "Tgl Kembali" },
  { key: "KETERANGAN_GUDANG", label: "Ket. Gudang" },
  { key: "SISA_HARI_RETUR", label: "Sisa" },
];

const fmtCell = (c, v) => {
  if (c.num) return fmtNum(v);
  if (v === "" || v == null || v === "-") return "—";
  return String(v);
};

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, agu: 8, agt: 8,
  sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12,
};

const dateSortKey = (v) => {
  const s = String(v ?? "").trim();
  if (!s || s === "—" || s === "-") return null;
  let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return Number(m[1]) * 1e8 + Number(m[2]) * 1e6 + Number(m[3]) * 1e4 + Number(m[4] || 0) * 100 + Number(m[5] || 0);
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return Number(m[3]) * 1e8 + Number(m[2]) * 1e6 + Number(m[1]) * 1e4 + Number(m[4] || 0) * 100 + Number(m[5] || 0);
  m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3})[A-Za-z]*[\s-]+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return Number(m[3]) * 1e8 + MONTHS[m[2].toLowerCase()] * 1e6 + Number(m[1]) * 1e4;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
};

const numSortKey = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

const sortValue = (row, col) => {
  const v = cell(row, col.key);
  if (col.date) return dateSortKey(v);
  if (col.num || col.sortNum) return numSortKey(v);
  const s = String(v ?? "").trim();
  return s === "" || s === "—" ? null : s;
};

const PAGE_SIZE = 50;

const PRESETS = [
  { id: "today", label: "Hari Ini" },
  { id: "month", label: "Bulan Ini" },
  { id: "3m", label: "3 Bulan" },
  { id: "ytd", label: "YTD" },
];

const yearStartYmd = () => `${new Date().getFullYear()}-01-01`;

const addMonthsYmd = (ymd, delta) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, d || 1);
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};

const filterSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 38,
    height: 38,
    fontSize: "0.8125rem",
    borderColor: "#dbdfea",
    borderRadius: 0,
    background: "#eef2f8",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px", height: 36 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 8px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 4px" }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem", borderRadius: 0 }),
  option: (base) => ({ ...base, fontSize: "0.8125rem", padding: "8px 12px" }),
};

const cell = (row, key) => {
  if (row?.[key] != null && String(row[key]).trim() !== "") return row[key];
  const found = Object.keys(row || {}).find((x) => x.toLowerCase() === String(key).toLowerCase());
  return found != null ? row[found] : "";
};

const fmtNum = (n) =>
  n === "" || n == null || Number.isNaN(Number(n))
    ? "—"
    : Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const monthStartYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
};

const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const pickBadge = (badge, keys) => {
  for (const key of keys) {
    if (badge?.[key] != null && String(badge[key]).trim() !== "") return badge[key];
    const found = Object.keys(badge || {}).find((x) => x.toLowerCase() === String(key).toLowerCase());
    if (found != null && badge[found] != null && String(badge[found]).trim() !== "") return badge[found];
  }
  return "—";
};

const deltaTone = (v) => {
  const s = String(v ?? "");
  if (!s || s === "—") return "";
  return s.includes("-") ? "is-down" : "is-up";
};

const RegMpReturPage = ({ dgs = false }) => {
  const accessModules = useMemo(
    () => (dgs ? ["DGS_RETUR", "DGS_RETUR_GUDANG"] : ["REG_MP_RETUR"]),
    [dgs]
  );
  const pageTitle = dgs ? "Gudang Retur" : "MP Retur";
  const [searchParams] = useSearchParams();
  const [confirmRow, setConfirmRow] = useState(null);
  const [marketplace, setMarketplace] = useState("0");
  const [brand, setBrand] = useState("ALL");
  const [dateBy, setDateBy] = useState("Tanggal Transaksi");
  const [ketGudang, setKetGudang] = useState("Semua Barang");
  const [keywords, setKeywords] = useState(() => String(searchParams.get("kw") || "").trim());
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [rows, setRows] = useState([]);
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quick, setQuick] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [wide, setWide] = useState(false);
  const [presetId, setPresetId] = useState("month");
  const [sort, setSort] = useState({ key: "", dir: "asc" });
  const tableRef = useRef(null);
  const wrapRef = useRef(null);
  const autoLoaded = useRef(false);
  const tableCols = useMemo(
    () => (dgs ? COLS : COLS.filter((c) => c.key !== "RETUR_BY")),
    [dgs]
  );
  const searchCols = useMemo(
    () => (dgs ? EXPORT_COLS : EXPORT_COLS.filter((c) => c.key !== "RETUR_BY")),
    [dgs]
  );

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

  const clearResult = () => {
    setRows([]);
    setBadge(null);
    setLoaded(false);
    setError("");
    setPage(1);
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

  const baseParams = useCallback(
    () => ({
      from_date: fromDate,
      to_date: toDate,
      marketplace,
      brand,
      tipe: dateBy,
      kategori: ketGudang,
      /* ASP MP_gudang: empty search → "-" */
      keywords: keywords.trim() || "-",
    }),
    [fromDate, toDate, marketplace, brand, dateBy, ketGudang, keywords]
  );

  const loadData = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError("Periode wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    setPage(1);
    try {
      const params = baseParams();
      const [listRes, badgeRes] = await Promise.all([getRegMpReturList(params), getRegMpReturBadge(params)]);
      if (!isSuccess(listRes)) {
        setError(listRes?.responseMessage || "Gagal memuat list retur");
        setRows([]);
      } else {
        setRows(extractRows(listRes) || []);
      }
      if (isSuccess(badgeRes)) {
        setBadge(extractRow(badgeRes) || null);
      } else {
        setBadge(null);
      }
      setLoaded(true);
    } catch (e) {
      setError(e?.message || e?.responseMessage || "Gagal memuat data");
      setRows([]);
      setBadge(null);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [baseParams, fromDate, toDate]);

  useEffect(() => {
    if (!dgs || autoLoaded.current) return undefined;
    if (!fromDate || !toDate) return undefined;
    autoLoaded.current = true;
    loadData();
    return undefined;
  }, [dgs, fromDate, toDate, loadData]);

  const filtered = useMemo(() => {
    const q = quick.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => searchCols.some((c) => String(cell(r, c.key)).toLowerCase().includes(q)));
  }, [rows, quick, searchCols]);

  const sorted = useMemo(() => {
    const col = searchCols.find((c) => c.key === sort.key) || tableCols.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const mul = sort.dir === "desc" ? -1 : 1;
    const numeric = Boolean(col.date || col.num || col.sortNum);
    return filtered
      .map((r, i) => ({ r, i, v: sortValue(r, col) }))
      .sort((a, b) => {
        const an = a.v == null;
        const bn = b.v == null;
        if (an || bn) return an === bn ? a.i - b.i : an ? 1 : -1;
        const c = numeric ? a.v - b.v : String(a.v).localeCompare(String(b.v), "id", { numeric: true, sensitivity: "base" });
        return c !== 0 ? c * mul : a.i - b.i;
      })
      .map((x) => x.r);
  }, [filtered, sort, searchCols, tableCols]);

  useEffect(() => {
    setPage(1);
  }, [quick, sort]);

  const toggleSort = (key) =>
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: "", dir: "asc" };
    });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, totalPages);
  const shown = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, safePage]);
  const rowOffset = (safePage - 1) * PAGE_SIZE;
  const recordFrom = filtered.length ? rowOffset + 1 : 0;
  const recordTo = filtered.length ? rowOffset + shown.length : 0;
  const recordInfo = filtered.length
    ? `${recordFrom.toLocaleString("id-ID")}–${recordTo.toLocaleString("id-ID")} dari ${filtered.length.toLocaleString("id-ID")} baris`
    : "0 baris";
  const scrollRevision = `${loading ? "loading" : "ready"}-${filtered.length}-${safePage}-${wide ? "w" : "n"}-${error || "ok"}`;

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Retur");
    ws.addRow(["NO", ...searchCols.map((c) => c.label)]);
    sorted.forEach((r, i) => {
      ws.addRow([i + 1, ...searchCols.map((c) => cell(r, c.key))]);
    });
    await saveXlsxFile(wb, `MP_RETUR_${todayYmd()}.xlsx`);
  };

  const openConfirm = (r) =>
    setConfirmRow({
      invoice: String(cell(r, "NO_INVOICE")),
      plu: String(cell(r, "PLU")),
      deskripsi: String(cell(r, "DESKRIPSI")),
    });

  const colSpan = tableCols.length + 1 + (dgs ? 1 : 0);

  const tableMessage = loading
    ? "Memuat…"
    : !loaded
      ? "Belum ada data. Atur filter lalu Cari."
      : filtered.length === 0
        ? "Tidak ada data untuk filter ini."
        : "";

  return (
    <AccessGuard moduleCodes={accessModules}>
      <Head title={pageTitle} />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
        <div ref={wrapRef} className={`reg-ar-wrap${wide ? " is-wide" : ""}`}>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  {pageTitle}
                </BlockTitle>
                <BlockDes className="text-soft">
                    {dgs
                      ? "Retur List · konfirmasi gudang (referensi MP_gudang) · tombol Edit per baris"
                      : "View-only · retur gudang marketplace"}
                  </BlockDes>
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

            <Block>
              <div className="reg-ar-toolbar">
                <div className="reg-ar-toolbar-grid reg-ar-toolbar-grid--4">
                  <div className="reg-ar-f-item">
                    <label>Marketplace</label>
                    <RSelect
                      styles={filterSelectStyles}
                      options={MP_OPTS}
                      value={MP_OPTS.find((o) => o.value === marketplace) || MP_OPTS[0]}
                      onChange={(o) => {
                        setMarketplace(o?.value || "0");
                        clearResult();
                      }}
                      isSearchable
                    />
                  </div>
                  <div className="reg-ar-f-item">
                    <label>Brand</label>
                    <RSelect
                      styles={filterSelectStyles}
                      options={BRAND_OPTS}
                      value={BRAND_OPTS.find((o) => o.value === brand) || BRAND_OPTS[0]}
                      onChange={(o) => {
                        setBrand(o?.value || "ALL");
                        clearResult();
                      }}
                      isSearchable
                    />
                  </div>
                  <div className="reg-ar-f-item">
                    <label>Periode</label>
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
                    <label>Date By</label>
                    <RSelect
                      styles={filterSelectStyles}
                      options={DATE_BY_OPTS}
                      value={DATE_BY_OPTS.find((o) => o.value === dateBy)}
                      onChange={(o) => {
                        setDateBy(o?.value || "Tanggal Transaksi");
                        clearResult();
                      }}
                    />
                  </div>
                </div>

                <div className="reg-ar-toolbar-grid reg-ar-toolbar-grid--3">
                  <div className="reg-ar-f-item">
                    <label>Ket. Gudang</label>
                    <RSelect
                      styles={filterSelectStyles}
                      options={KET_GUDANG_OPTS}
                      value={KET_GUDANG_OPTS.find((o) => o.value === ketGudang)}
                      onChange={(o) => {
                        setKetGudang(o?.value || "Semua Barang");
                        clearResult();
                      }}
                    />
                  </div>
                  <div className="reg-ar-f-item">
                    <label>Invoice / PLU</label>
                    <input
                      className="form-control form-control-sm reg-ar-ctl"
                      value={keywords}
                      onChange={(e) => {
                        setKeywords(e.target.value);
                        clearResult();
                      }}
                      placeholder="Search invoice / PLU"
                    />
                  </div>
                  <div className="reg-ar-f-item reg-ar-f-actions">
                    <label className="reg-ar-f-actions-label">&nbsp;</label>
                    <div className="reg-ar-actions">
                      <button type="button" className="reg-ar-btn" disabled={loading} onClick={loadData}>
                        <Icon name="search" />
                        Cari
                      </button>
                      <button
                        type="button"
                        className="reg-ar-btn reg-ar-btn--ghost"
                        disabled={!filtered.length}
                        onClick={exportExcel}
                      >
                        <Icon name="download" />
                        Excel
                      </button>
                    </div>
                  </div>
                </div>

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
                </div>
              </div>

              {badge ? (
                <div className="reg-ar-stats reg-mp-retur-stats">
                  <div className="reg-ar-stat">
                    <span className="reg-ar-stat-label">Total Retur</span>
                    <span className="reg-ar-stat-val">{pickBadge(badge, ["retur_all_time_total"])}</span>
                    <span className="reg-ar-stat-sub">all time</span>
                  </div>
                  <div className="reg-ar-stat">
                    <span className="reg-ar-stat-label">Total Retur by Periode</span>
                    <span className="reg-ar-stat-val">{pickBadge(badge, ["retur_total", "retur_Total"])}</span>
                    <span className={`reg-ar-stat-sub ${deltaTone(pickBadge(badge, ["prev_retur_total_presentase", "prev_retur_Total_presentase"]))}`}>
                      {pickBadge(badge, ["prev_retur_total_presentase", "prev_retur_Total_presentase"])} from last periode
                    </span>
                  </div>
                  <div className="reg-ar-stat">
                    <span className="reg-ar-stat-label">Barang Diterima</span>
                    <span className="reg-ar-stat-val">{pickBadge(badge, ["barang_balik_total", "barang_balik_Total"])}</span>
                    <span className={`reg-ar-stat-sub ${deltaTone(pickBadge(badge, ["prev_barang_balik_total_presentase", "prev_barang_balik_Total_presentase"]))}`}>
                      {pickBadge(badge, ["prev_barang_balik_total_presentase", "prev_barang_balik_Total_presentase"])} from last periode
                    </span>
                  </div>
                  <div className="reg-ar-stat">
                    <span className="reg-ar-stat-label">Belum Diterima</span>
                    <span className="reg-ar-stat-val">
                      {pickBadge(badge, ["barang_belum_balik_total", "barang_belum_balik_Total"])}
                    </span>
                    <span className={`reg-ar-stat-sub ${deltaTone(pickBadge(badge, ["prev_barang_belum_balik_total_presentase", "prev_barang_belum_balik_Total_presentase"]))}`}>
                      {pickBadge(badge, ["prev_barang_belum_balik_total_presentase", "prev_barang_belum_balik_Total_presentase"])} from last periode
                    </span>
                  </div>
                </div>
              ) : null}

              {loaded ? (
                <div className="reg-ar-quick-row">
                  <div className="reg-ar-quick">
                    <Icon name="search" className="reg-ar-quick-ico" />
                    <input
                      className="reg-ar-quick-input"
                      value={quick}
                      onChange={(e) => setQuick(e.target.value)}
                      placeholder="Cari cepat di hasil…"
                    />
                    {quick ? (
                      <button type="button" className="reg-ar-quick-clear" onClick={() => setQuick("")} aria-label="Clear">
                        ×
                      </button>
                    ) : null}
                  </div>
                  <div className="reg-ar-record-info">{recordInfo}</div>
                </div>
              ) : null}

              {error ? <div className="reg-ar-error">{error}</div> : null}

              <div className="reg-ar-table-wrap">
                <table ref={tableRef} className="reg-ar-table reg-mp-retur-table">
                  <thead>
                    <tr>
                      <th className="col-no">No.</th>
                      {tableCols.map((c) => {
                        const active = sort.key === c.key;
                        return (
                          <th
                            key={c.key}
                            className={[
                              "reg-ar-sortable",
                              active ? "is-sorted" : "",
                              c.num ? "num" : "",
                              c.cls || "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => toggleSort(c.key)}
                            aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                            title="Klik untuk urutkan"
                          >
                            <span className="reg-ar-th-inner">
                              {c.label}
                              <Icon
                                name={active ? (sort.dir === "asc" ? "caret-up-fill" : "caret-down-fill") : "sort"}
                                className="reg-ar-sort-ic"
                              />
                            </span>
                          </th>
                        );
                      })}
                      {dgs ? <th className="reg-mp-retur-action-th">Action</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {tableMessage ? (
                      <tr>
                        <td colSpan={colSpan} className="reg-ar-empty">
                          {tableMessage}
                        </td>
                      </tr>
                    ) : (
                      shown.map((r, i) => (
                        <tr key={rowOffset + i}>
                          <td className="col-no">{rowOffset + i + 1}</td>
                          {tableCols.map((c) => (
                            <td
                              key={c.key}
                              className={[c.num ? "num" : "", c.wrap ? "is-wrap" : "", c.cls || ""]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {c.subKey ? (
                                <>
                                  <div className="reg-mp-retur-plu">{fmtCell(c, cell(r, c.key))}</div>
                                  <div className="reg-mp-retur-desc">{fmtCell(c, cell(r, c.subKey))}</div>
                                </>
                              ) : (
                                fmtCell(c, cell(r, c.key))
                              )}
                            </td>
                          ))}
                          {dgs ? (
                            <td className="reg-mp-retur-action">
                              <button
                                type="button"
                                className="reg-ar-btn reg-ar-btn--ghost reg-mp-retur-edit"
                                onClick={() => openConfirm(r)}
                              >
                                Edit
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <RivStickyThead
                tableRef={tableRef}
                enabled={Boolean(loaded && shown.length)}
                tableClassName="reg-ar-table"
                interactive
              />

              {loaded && filtered.length > PAGE_SIZE ? (
                <div className="reg-ar-pager">
                  <span className="reg-ar-pager-info">
                    Halaman {safePage} / {totalPages}
                  </span>
                  <div className="reg-ar-pager-btns">
                    <button
                      type="button"
                      className="reg-ar-pager-btn"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      className="reg-ar-pager-btn"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              ) : null}
            </Block>
          </div>
        </PageSmoothScroll>
        {dgs ? (
          <DgsReturConfirmModal
            isOpen={Boolean(confirmRow)}
            invoice={confirmRow?.invoice}
            plu={confirmRow?.plu}
            deskripsi={confirmRow?.deskripsi}
            onClose={() => setConfirmRow(null)}
            onSaved={loadData}
          />
        ) : null}
      </Content>
    </AccessGuard>
  );
};

export default RegMpReturPage;
