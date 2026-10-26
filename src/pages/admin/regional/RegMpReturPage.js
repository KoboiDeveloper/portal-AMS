import React, { useCallback, useMemo, useState } from "react";
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
import { getRegMpReturBadge, getRegMpReturList } from "../../../services/regional/regional.service";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import "./reg-mp-ar-list.css";

const MP_OPTS = [
  { value: "0", label: "All Marketplace" },
  { value: "TIKTOK", label: "TIKTOK" },
  { value: "SHOPEE", label: "SHOPEE" },
  { value: "TOKOPEDIA", label: "TOKOPEDIA" },
  { value: "LAZADA", label: "LAZADA" },
  { value: "BUKALAPAK", label: "BUKALAPAK" },
  { value: "BLIBLI", label: "BLIBLI" },
  { value: "ZALORA", label: "ZALORA" },
  { value: "DIRECT SELLING", label: "DIRECT SELLING" },
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

const COLS = [
  { key: "TANGGAL_TRANSAKSI", label: "Tgl Transaksi" },
  { key: "MARKETPLACE", label: "Marketplace" },
  { key: "NO_INVOICE", label: "No Invoice" },
  { key: "PLU", label: "PLU" },
  { key: "DESKRIPSI", label: "Deskripsi" },
  { key: "PRICE_POS", label: "Price POS", num: true },
  { key: "TANGGAL_RETUR", label: "Tgl Retur" },
  { key: "KETERANGAN_ADMIN", label: "Ket. Admin" },
  { key: "TANGGAL_KEMBALI", label: "Tgl Kembali" },
  { key: "KETERANGAN_GUDANG", label: "Ket. Gudang" },
  { key: "SISA_HARI_RETUR", label: "Sisa Hari" },
];

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

const ADMIN_NOTE_LIMIT = 40;

const ExpandableNote = ({ text, expanded, onToggle }) => {
  const full = String(text ?? "");
  if (!full) return "—";
  if (full.length <= ADMIN_NOTE_LIMIT) return full;
  return (
    <span className="reg-ar-expand-note">
      {expanded ? full : `${full.slice(0, ADMIN_NOTE_LIMIT)}…`}{" "}
      <button type="button" className="reg-ar-expand-btn" onClick={onToggle}>
        {expanded ? "Sembunyikan" : "Selengkapnya"}
      </button>
    </span>
  );
};

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

const RegMpReturPage = () => {
  const [marketplace, setMarketplace] = useState("0");
  const [brand, setBrand] = useState("ALL");
  const [dateBy, setDateBy] = useState("Tanggal Transaksi");
  const [ketGudang, setKetGudang] = useState("Semua Barang");
  const [keywords, setKeywords] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [rows, setRows] = useState([]);
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quick, setQuick] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [expandedAdmin, setExpandedAdmin] = useState(() => new Set());

  const clearResult = () => {
    setRows([]);
    setBadge(null);
    setLoaded(false);
    setError("");
    setExpandedAdmin(new Set());
  };

  const toggleAdminNote = (rowKey) => {
    setExpandedAdmin((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const baseParams = useCallback(
    () => ({
      from_date: fromDate,
      to_date: toDate,
      marketplace,
      brand,
      tipe: dateBy,
      kategori: ketGudang,
      keywords: keywords.trim(),
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

  const filtered = useMemo(() => {
    const q = quick.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => COLS.some((c) => String(cell(r, c.key)).toLowerCase().includes(q)));
  }, [rows, quick]);

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Retur");
    ws.addRow(["NO", ...COLS.map((c) => c.label)]);
    filtered.forEach((r, i) => {
      ws.addRow([i + 1, ...COLS.map((c) => cell(r, c.key))]);
    });
    await saveXlsxFile(wb, `MP_RETUR_${todayYmd()}.xlsx`);
  };

  return (
    <AccessGuard moduleCode="REG_MP_RETUR">
      <Head title="MP Retur" />
      <Content>
        <div className="reg-ar-wrap">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  MP Retur
                </BlockTitle>
                <BlockDes className="text-soft">View-only · retur gudang marketplace</BlockDes>
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
              </div>

              <div className="reg-ar-toolbar-row">
                <div className="reg-ar-chips-active">
                  <span className="reg-ar-chips-active-label">Filter</span>
                  <span className="reg-ar-chip is-active">
                    {MP_OPTS.find((o) => o.value === marketplace)?.label || marketplace}
                  </span>
                  <span className="reg-ar-chip">{BRAND_OPTS.find((o) => o.value === brand)?.label || brand}</span>
                  <span className="reg-ar-chip">{DATE_BY_OPTS.find((o) => o.value === dateBy)?.label || dateBy}</span>
                </div>
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

            {badge ? (
              <div className="reg-ar-stats">
                <div className="reg-ar-stat">
                  <span className="reg-ar-stat-label">Retur periode</span>
                  <span className="reg-ar-stat-val">{pickBadge(badge, ["retur_total", "retur_Total"])}</span>
                  <span className="reg-ar-stat-sub">{pickBadge(badge, ["prev_retur_total_presentase"])}</span>
                </div>
                <div className="reg-ar-stat">
                  <span className="reg-ar-stat-label">Retur all-time</span>
                  <span className="reg-ar-stat-val">{pickBadge(badge, ["retur_all_time_total"])}</span>
                </div>
                <div className="reg-ar-stat">
                  <span className="reg-ar-stat-label">Barang balik</span>
                  <span className="reg-ar-stat-val">{pickBadge(badge, ["barang_balik_total", "barang_balik_Total"])}</span>
                  <span className="reg-ar-stat-sub">{pickBadge(badge, ["prev_barang_balik_total_presentase"])}</span>
                </div>
                <div className="reg-ar-stat">
                  <span className="reg-ar-stat-label">Belum balik</span>
                  <span className="reg-ar-stat-val">
                    {pickBadge(badge, ["barang_belum_balik_total", "barang_belum_balik_Total"])}
                  </span>
                  <span className="reg-ar-stat-sub">{pickBadge(badge, ["prev_barang_belum_balik_total_presentase"])}</span>
                </div>
              </div>
            ) : null}

            {loaded ? (
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
            ) : null}

            {error ? <div className="reg-ar-error">{error}</div> : null}

            <div className="reg-ar-meta">
              {loading ? "Memuat…" : loaded ? `${filtered.length.toLocaleString("id-ID")} baris` : "Atur filter lalu Cari"}
            </div>

            <div className="reg-ar-table-wrap">
              <table className="reg-ar-table">
                <thead>
                  <tr>
                    <th className="col-no">No.</th>
                    {COLS.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!loading && filtered.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length + 1} className="reg-ar-empty">
                        {loaded ? "Tidak ada data untuk filter ini." : "Belum ada data. Atur filter lalu Cari."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => {
                      const rowKey = `${cell(r, "NO_INVOICE")}|${cell(r, "PLU")}|${i}`;
                      return (
                        <tr key={rowKey}>
                          <td className="col-no">{i + 1}</td>
                          {COLS.map((c) => {
                            const v = cell(r, c.key);
                            if (c.key === "KETERANGAN_ADMIN") {
                              return (
                                <td key={c.key} className="reg-ar-note-cell">
                                  <ExpandableNote
                                    text={v}
                                    expanded={expandedAdmin.has(rowKey)}
                                    onToggle={() => toggleAdminNote(rowKey)}
                                  />
                                </td>
                              );
                            }
                            return (
                              <td key={c.key} className={c.num ? "num" : undefined}>
                                {c.num ? fmtNum(v) : v === "" || v == null ? "—" : String(v)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Block>
        </div>
      </Content>
    </AccessGuard>
  );
};

export default RegMpReturPage;
