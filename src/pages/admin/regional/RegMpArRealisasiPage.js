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
import { getRegMpArRealisasiList } from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import "./reg-mp-ar-list.css";

const MP_OPTS = [
  { value: "", label: "ALL" },
  { value: "TIKTOK", label: "TIKTOK" },
  { value: "SHOPEE", label: "SHOPEE" },
  { value: "TOKOPEDIA", label: "TOKOPEDIA" },
  { value: "LAZADA", label: "LAZADA" },
  { value: "BUKALAPAK", label: "BUKALAPAK" },
  { value: "BLIBLI", label: "BLIBLI" },
];

const BRAND_OPTS = [
  { value: "", label: "ALL Brand" },
  { value: "CELCIUS", label: "CELCIUS" },
  { value: "CELCIUS WOMAN", label: "CELCIUS WOMAN" },
  { value: "MISSISSIPPI", label: "MISSISSIPPI" },
  { value: "QUEENSLAND", label: "QUEENSLAND" },
  { value: "IWAN FASHION", label: "IWAN FASHION" },
  { value: "FLIES", label: "FLIES" },
  { value: "DIRECT SELLING", label: "DIRECT SELLING" },
];

const STATUS_OPTS = [
  { value: "belum", label: "Belum" },
  { value: "sudah", label: "Sudah" },
];

const COLS = [
  { key: "NAMA_MP", label: "Marketplace", alts: ["MARKETPLACE"] },
  { key: "BRAND", label: "Brand" },
  { key: "STORE", label: "Store" },
  { key: "NO_INVOICE", label: "No. Invoice", alts: ["INVOICE"] },
  { key: "TGL_TRANSAKSI", label: "Tgl Transaksi", alts: ["TANGGAL_TRANSAKSI"] },
  { key: "TGL_REALISASI", label: "Tgl Pelunasan", alts: ["TANGGAL_REALISASI"] },
  { key: "STATUS_REALISASI", label: "Status", alts: ["STATUS_PELUNASAN", "STATUS"] },
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

const cell = (row, key, alts = []) => {
  for (const k of [key, ...alts]) {
    if (row?.[k] != null && String(row[k]).trim() !== "") return row[k];
    const found = Object.keys(row || {}).find((x) => x.toLowerCase() === String(k).toLowerCase());
    if (found != null && row[found] != null && String(row[found]).trim() !== "") return row[found];
  }
  return "";
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

const RegMpArRealisasiPage = () => {
  const [status, setStatus] = useState("belum");
  const [marketplace, setMarketplace] = useState("");
  const [brand, setBrand] = useState("");
  const [invoice, setInvoice] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quick, setQuick] = useState("");

  const isSudah = status === "sudah";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        status,
        marketplace: marketplace || "",
        brand: brand || "",
        invoice: invoice.trim() || "",
      };
      if (isSudah) {
        params.from_date = fromDate;
        params.to_date = toDate;
      }
      const res = await getRegMpArRealisasiList(params);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat data");
        setRows([]);
        return;
      }
      setRows(extractRows(res) || []);
    } catch (e) {
      setError(e?.message || e?.responseMessage || "Gagal memuat data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, marketplace, brand, invoice, fromDate, toDate, isSudah]);

  const filtered = useMemo(() => {
    const q = quick.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      COLS.some((c) => String(cell(r, c.key, c.alts || [])).toLowerCase().includes(q))
    );
  }, [rows, quick]);

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("REALISASI");
    ws.addRow(["NO", ...COLS.map((c) => c.label)]);
    filtered.forEach((r, i) => {
      ws.addRow([i + 1, ...COLS.map((c) => cell(r, c.key, c.alts || []))]);
    });
    await saveXlsxFile(wb, `AR_REALISASI_${todayYmd()}.xlsx`);
  };

  return (
    <AccessGuard moduleCode="REG_MP_AR_REALISASI">
      <Head title="AR Realisasi" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>AR Realisasi</BlockTitle>
              <BlockDes>
                <p>View-only · pelunasan AR marketplace</p>
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <div className="reg-ar-page">
            <div className="reg-ar-toolbar">
              <div className="reg-ar-toolbar-grid">
                <div className="reg-ar-f-item">
                  <label>Status</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={STATUS_OPTS}
                    value={STATUS_OPTS.find((o) => o.value === status)}
                    onChange={(o) => setStatus(o?.value || "belum")}
                  />
                </div>
                <div className="reg-ar-f-item">
                  <label>Marketplace</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={MP_OPTS}
                    value={MP_OPTS.find((o) => o.value === marketplace) || MP_OPTS[0]}
                    onChange={(o) => setMarketplace(o?.value ?? "")}
                    isSearchable
                  />
                </div>
                <div className="reg-ar-f-item">
                  <label>Brand</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={BRAND_OPTS}
                    value={BRAND_OPTS.find((o) => o.value === brand) || BRAND_OPTS[0]}
                    onChange={(o) => setBrand(o?.value ?? "")}
                    isSearchable
                  />
                </div>
                <div className="reg-ar-f-item">
                  <label>No. Invoice</label>
                  <input
                    className="form-control form-control-sm reg-ar-ctl"
                    value={invoice}
                    onChange={(e) => setInvoice(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
                {isSudah ? (
                  <div className="reg-ar-f-item">
                    <label>Periode Pelunasan</label>
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
                ) : null}
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
              {loading ? "Memuat…" : `${filtered.length.toLocaleString("id-ID")} baris · status ${status}`}
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
                    filtered.map((r, i) => {
                      const st = String(cell(r, "STATUS_REALISASI", ["STATUS_PELUNASAN", "STATUS"])).toLowerCase();
                      return (
                        <tr key={i}>
                          <td className="col-no">{i + 1}</td>
                          {COLS.map((c) => {
                            const v = cell(r, c.key, c.alts || []);
                            if (c.key === "STATUS_REALISASI") {
                              return (
                                <td key={c.key}>
                                  <span className={`reg-ar-badge ${st.includes("sudah") ? "is-ok" : "is-warn"}`}>
                                    {v || st || "—"}
                                  </span>
                                </td>
                              );
                            }
                            return <td key={c.key}>{v === "" || v == null ? "—" : String(v)}</td>;
                          })}
                        </tr>
                      );
                    })
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

export default RegMpArRealisasiPage;
