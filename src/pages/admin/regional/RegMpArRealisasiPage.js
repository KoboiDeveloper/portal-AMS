import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getRegMpArRealisasiList } from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import { RivStickyThead } from "./RivStickyThead";
import DgsRealisasiModal from "../dgs/DgsRealisasiModal";
import "./reg-mp-ar-list.css";

const MP_OPTS = [
  { value: "", label: "ALL" },
  { value: "TIKTOK", label: "TIKTOK" },
  { value: "SHOPEE", label: "SHOPEE" },
  { value: "TOKOPEDIA", label: "TOKOPEDIA" },
  { value: "LAZADA", label: "LAZADA" },
  { value: "BUKALAPAK", label: "BUKALAPAK" },
  { value: "BLIBLI", label: "BLIBLI" },
  { value: "ZALORA", label: "ZALORA" },
  { value: "JD.ID", label: "JD.ID" },
  { value: "ZILINGO", label: "ZILINGO" },
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

const PAGE_SIZE = 50;

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

const RegMpArRealisasiPage = ({ dgs = false }) => {
  const [realRow, setRealRow] = useState(null);
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
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [wide, setWide] = useState(false);
  const tableRef = useRef(null);
  const wrapRef = useRef(null);

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

  const isSudah = status === "sudah";

  const clearResult = () => {
    setRows([]);
    setLoaded(false);
    setError("");
    setPage(1);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setPage(1);
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
        setLoaded(true);
        return;
      }
      setRows(extractRows(res) || []);
      setLoaded(true);
    } catch (e) {
      setError(e?.message || e?.responseMessage || "Gagal memuat data");
      setRows([]);
      setLoaded(true);
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

  useEffect(() => {
    setPage(1);
  }, [quick]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, totalPages);
  const shown = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);
  const rowOffset = (safePage - 1) * PAGE_SIZE;
  const recordFrom = filtered.length ? rowOffset + 1 : 0;
  const recordTo = filtered.length ? rowOffset + shown.length : 0;
  const recordInfo = filtered.length
    ? `${recordFrom.toLocaleString("id-ID")}–${recordTo.toLocaleString("id-ID")} dari ${filtered.length.toLocaleString("id-ID")} baris`
    : "0 baris";
  const scrollRevision = `${loading ? "loading" : "ready"}-${filtered.length}-${safePage}-${wide ? "w" : "n"}-${error || "ok"}`;

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("REALISASI");
    ws.addRow(["NO", ...COLS.map((c) => c.label)]);
    filtered.forEach((r, i) => {
      ws.addRow([i + 1, ...COLS.map((c) => cell(r, c.key, c.alts || []))]);
    });
    await saveXlsxFile(wb, `AR_REALISASI_${todayYmd()}.xlsx`);
  };

  const tableMessage = loading
    ? "Memuat…"
    : !loaded
      ? "Belum ada data. Atur filter lalu Cari."
      : filtered.length === 0
        ? "Tidak ada data untuk filter ini."
        : "";

  return (
    <AccessGuard moduleCode={dgs ? "DGS_AR_REALISASI" : "REG_MP_AR_REALISASI"}>
      <Head title="AR Realisasi" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <div ref={wrapRef} className={`reg-ar-wrap${wide ? " is-wide" : ""}`}>
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    AR Realisasi
                  </BlockTitle>
                  <BlockDes className="text-soft">
                    {dgs ? "Pelunasan AR marketplace · klik baris 'Belum' untuk simpan realisasi" : "View-only · pelunasan AR marketplace"}
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
                <div className={`reg-ar-toolbar-grid reg-ar-toolbar-grid--rz ${isSudah ? "reg-ar-toolbar-grid--rz-sudah" : ""}`}>
                  <div className="reg-ar-f-item">
                    <label>Status</label>
                    <RSelect
                      styles={filterSelectStyles}
                      options={STATUS_OPTS}
                      value={STATUS_OPTS.find((o) => o.value === status)}
                      onChange={(o) => {
                        setStatus(o?.value || "belum");
                        clearResult();
                      }}
                    />
                  </div>
                  <div className="reg-ar-f-item">
                    <label>Marketplace</label>
                    <RSelect
                      styles={filterSelectStyles}
                      options={MP_OPTS}
                      value={MP_OPTS.find((o) => o.value === marketplace) || MP_OPTS[0]}
                      onChange={(o) => {
                        setMarketplace(o?.value ?? "");
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
                        setBrand(o?.value ?? "");
                        clearResult();
                      }}
                      isSearchable
                    />
                  </div>
                  <div className="reg-ar-f-item">
                    <label>No. Invoice</label>
                    <input
                      className="form-control form-control-sm reg-ar-ctl"
                      value={invoice}
                      onChange={(e) => {
                        setInvoice(e.target.value);
                        clearResult();
                      }}
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
                          clearResult();
                        }}
                      />
                    </div>
                  ) : null}
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
              </div>

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
                <table ref={tableRef} className="reg-ar-table">
                  <thead>
                    <tr>
                      <th className="col-no">No.</th>
                      {COLS.map((c) => (
                        <th key={c.key}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableMessage ? (
                      <tr>
                        <td colSpan={COLS.length + 1} className="reg-ar-empty">
                          {tableMessage}
                        </td>
                      </tr>
                    ) : (
                      shown.map((r, i) => {
                        const st = String(cell(r, "STATUS_REALISASI", ["STATUS_PELUNASAN", "STATUS"])).toLowerCase();
                        return (
                          <tr
                            key={rowOffset + i}
                            className={dgs && !st.includes("sudah") ? "dgs-row-click" : undefined}
                            title={dgs && !st.includes("sudah") ? "Klik untuk simpan realisasi" : undefined}
                            onClick={
                              dgs && !st.includes("sudah")
                                ? () => setRealRow({ invoice: String(cell(r, "NO_INVOICE", ["INVOICE"])), mp: String(cell(r, "NAMA_MP", ["MARKETPLACE"])) })
                                : undefined
                            }
                          >
                            <td className="col-no">{rowOffset + i + 1}</td>
                            {COLS.map((c) => {
                              const v = cell(r, c.key, c.alts || []);
                              if (c.key === "STATUS_REALISASI") {
                                return (
                                  <td key={c.key}>
                                    <span className={`reg-ar-badge ${st.includes("sudah") ? "is-ok" : "is-warn"}`}>
                                      {v || "—"}
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

              <RivStickyThead
                tableRef={tableRef}
                enabled={Boolean(loaded && shown.length)}
                tableClassName="reg-ar-table"
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
          <DgsRealisasiModal
            isOpen={Boolean(realRow)}
            invoice={realRow?.invoice}
            marketplace={realRow?.mp}
            onClose={() => setRealRow(null)}
            onSaved={loadData}
          />
        ) : null}
      </Content>
    </AccessGuard>
  );
};

export default RegMpArRealisasiPage;
