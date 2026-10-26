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
  { value: "TIKTOK - CELCIUSMEN 08E", label: "TIKTOK - CELCIUSMEN 08E" },
  { value: "TIKTOK - CELCIUS WOMAN 09E", label: "TIKTOK - CELCIUS WOMAN 09E" },
  { value: "TIKTOK - MISSISSIPPI 10E", label: "TIKTOK - MISSISSIPPI 10E" },
  { value: "TIKTOK - QUEENSLAND 11E", label: "TIKTOK - QUEENSLAND 11E" },
];

const DATE_BY_OPTS = [
  { value: "Tanggal Transaksi", label: "Tanggal Transaksi" },
  { value: "Tanggal Retur", label: "Tanggal Retur" },
  { value: "Tanggal Kembali", label: "Tanggal Kembali" },
];

const KET_GUDANG_OPTS = [
  { value: "Semua Barang", label: "Semua Barang" },
  { value: "Outstanding", label: "Outstanding" },
  { value: "Barang Layak Jual", label: "Siap Dijual Kembali" },
  { value: "Barang Tidak Layak Jual", label: "Tidak Layak Jual" },
  { value: "Barang Tidak Sesuai", label: "Barang Tidak Sesuai" },
  { value: "Barang Tidak Kembali", label: "Barang Tidak Kembali" },
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
    minHeight: 32,
    height: 32,
    fontSize: "0.8125rem",
    borderColor: "#dbdfea",
    borderRadius: 0,
  }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem", borderRadius: 0 }),
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
    } catch (e) {
      setError(e?.message || e?.responseMessage || "Gagal memuat data");
      setRows([]);
      setBadge(null);
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

  const b = (k, alts = []) => {
    for (const key of [k, ...alts]) {
      const v = badge?.[key] ?? badge?.[String(key).toLowerCase()];
      if (v != null && String(v).trim() !== "") return v;
    }
    return "—";
  };

  return (
    <AccessGuard moduleCode="REG_MP_RETUR">
      <Head title="MP Retur" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>MP Retur</BlockTitle>
              <BlockDes>
                <p>View-only · retur gudang marketplace</p>
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <div className="reg-ar-page">
            {badge ? (
              <div className="reg-ar-toolbar" style={{ marginBottom: 12 }}>
                <div className="reg-ar-toolbar-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                  <div className="reg-ar-f-item">
                    <label>Retur (periode)</label>
                    <strong>{b("retur_total", ["retur_Total"])}</strong>
                  </div>
                  <div className="reg-ar-f-item">
                    <label>Retur all-time</label>
                    <strong>{b("retur_all_time_total", ["retur_all_time_total"])}</strong>
                  </div>
                  <div className="reg-ar-f-item">
                    <label>Barang balik</label>
                    <strong>
                      {b("barang_balik_total", ["barang_balik_Total"])}{" "}
                      <span className="text-soft">({b("prev_barang_balik_total_presentase")})</span>
                    </strong>
                  </div>
                  <div className="reg-ar-f-item">
                    <label>Belum balik</label>
                    <strong>
                      {b("barang_belum_balik_total", ["barang_belum_balik_Total"])}{" "}
                      <span className="text-soft">({b("prev_barang_belum_balik_total_presentase")})</span>
                    </strong>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="reg-ar-toolbar">
              <div className="reg-ar-toolbar-grid">
                <div className="reg-ar-f-item">
                  <label>Marketplace</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={MP_OPTS}
                    value={MP_OPTS.find((o) => o.value === marketplace) || MP_OPTS[0]}
                    onChange={(o) => setMarketplace(o?.value || "0")}
                    isSearchable
                  />
                </div>
                <div className="reg-ar-f-item">
                  <label>Brand</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={BRAND_OPTS}
                    value={BRAND_OPTS.find((o) => o.value === brand) || BRAND_OPTS[0]}
                    onChange={(o) => setBrand(o?.value || "ALL")}
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
                    }}
                  />
                </div>
                <div className="reg-ar-f-item">
                  <label>Date By</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={DATE_BY_OPTS}
                    value={DATE_BY_OPTS.find((o) => o.value === dateBy)}
                    onChange={(o) => setDateBy(o?.value || "Tanggal Transaksi")}
                  />
                </div>
                <div className="reg-ar-f-item">
                  <label>Ket. Gudang</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={KET_GUDANG_OPTS}
                    value={KET_GUDANG_OPTS.find((o) => o.value === ketGudang)}
                    onChange={(o) => setKetGudang(o?.value || "Semua Barang")}
                  />
                </div>
                <div className="reg-ar-f-item">
                  <label>Invoice / PLU</label>
                  <input
                    className="form-control form-control-sm reg-ar-ctl"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Search by Invoice/PLU"
                  />
                </div>
              </div>

              <div className="reg-ar-toolbar-row">
                <div className="reg-ar-quick">
                  <input
                    className="reg-ar-quick-input"
                    value={quick}
                    onChange={(e) => setQuick(e.target.value)}
                    placeholder="Cari cepat di hasil…"
                  />
                </div>
                <div className="reg-ar-actions">
                  <button type="button" className="reg-ar-btn reg-ar-btn--ghost" disabled={loading} onClick={loadData}>
                    <Icon name="search" /> Cari
                  </button>
                  <button
                    type="button"
                    className="reg-ar-btn reg-ar-btn--ghost"
                    disabled={!filtered.length}
                    onClick={exportExcel}
                  >
                    <Icon name="download" /> Excel
                  </button>
                </div>
              </div>
            </div>

            {error ? <div className="reg-ar-error">{error}</div> : null}

            <div className="reg-ar-meta">
              {loading ? "Memuat…" : `${filtered.length.toLocaleString("id-ID")} baris`}
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
                        Belum ada data. Atur filter lalu Cari.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr key={i}>
                        <td className="col-no">{i + 1}</td>
                        {COLS.map((c) => {
                          const v = cell(r, c.key);
                          return (
                            <td key={c.key} className={c.num ? "num" : undefined}>
                              {c.num ? fmtNum(v) : v === "" || v == null ? "—" : String(v)}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default RegMpReturPage;
