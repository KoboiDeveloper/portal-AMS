import React, { useCallback, useState } from "react";
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
  Button,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { createRegionalService } from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import "./reg-reg-report.css";

const svc = createRegionalService("rpt/sales/koleksi", { crud: false });

const KOLEKSI_OPTS = [
  { value: "COCA COLA", label: "COCA COLA" },
  { value: "KEITH HARING", label: "KEITH HARING" },
  { value: "SPRITE", label: "SPRITE" },
  { value: "SQUID GAME", label: "SQUID GAME" },
  { value: "FANTA", label: "FANTA" },
  { value: "SHALOOM", label: "SHALOOM" },
  { value: "PLAYBOY", label: "PLAYBOY" },
  { value: "STRANGER THINGS", label: "STRANGER THINGS" },
];

const TIPE_OPTS = [
  { value: "ARTICLE", label: "ARTICLE" },
  { value: "STORE", label: "STORE" },
];

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
};

const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const RegKoleksiPage = () => {
  const [koleksi, setKoleksi] = useState("COCA COLA");
  const [fromDate, setFromDate] = useState(todayYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [tipe, setTipe] = useState("ARTICLE");
  const [article, setArticle] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const canExport = Boolean(koleksi && fromDate && toDate);
  const onExport = useCallback(async () => {
    if (!koleksi || !fromDate || !toDate) {
      setError("Koleksi dan tanggal wajib diisi");
      return;
    }
    setExporting(true);
    setError("");
    try {
      const res = await svc.list({
        kategori: koleksi,
        from_date: fromDate,
        to_date: toDate,
        tipe,
        article: String(article || "").trim(),
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal export");
        return;
      }
      const rows = extractRows(res);
      if (!rows.length) {
        setError("Tidak ada data");
        return;
      }
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("NILAI");
      const keys = Object.keys(rows[0] || {});
      ws.addRow(keys);
      rows.forEach((r) => ws.addRow(keys.map((k) => r[k])));
      ws.getRow(1).font = { bold: true };
      const buffer = await wb.xlsx.writeBuffer();
      saveXlsxFile(buffer, `${koleksi}_${fromDate}_${toDate}.xlsx`);
    } catch (e) {
      setError(e?.message || "Gagal export");
    } finally {
      setExporting(false);
    }
  }, [article, fromDate, koleksi, tipe, toDate]);

  return (
    <AccessGuard moduleCode="REG_RPT_KOLEKSI">
      <Head title="Koleksi" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Koleksi</BlockTitle>
              <BlockDes>
                <p>Export penjualan per koleksi (parity CocaCola.aspx).</p>
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>
          <div className="card rsa-card">
            <div className="card-inner">
              <div className="rsa-filters">
                <div className="rsa-filter rsa-filter--select">
                  <label className="form-label">Koleksi</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={KOLEKSI_OPTS}
                    value={KOLEKSI_OPTS.find((o) => o.value === koleksi)}
                    onChange={(o) => setKoleksi(o?.value || "COCA COLA")}
                  />
                </div>
                <div className="rsa-filter rsa-filter--select">
                  <label className="form-label">Tipe</label>
                  <RSelect
                    styles={filterSelectStyles}
                    options={TIPE_OPTS}
                    value={TIPE_OPTS.find((o) => o.value === tipe)}
                    onChange={(o) => setTipe(o?.value || "ARTICLE")}
                  />
                </div>
                <div className="rsa-filter rsa-filter--text">
                  <label className="form-label">Article</label>
                  <input
                    className="form-control form-control-sm"
                    value={article}
                    onChange={(e) => setArticle(e.target.value)}
                    placeholder="Filter article"
                  />
                </div>
                <div className="rsa-filter">
                  <label className="form-label">Tanggal</label>
                  <AppDateRangePicker
                    startDate={fromDate}
                    endDate={toDate}
                    className="form-control form-control-sm"
                    onChange={(f, t) => {
                      setFromDate(f || "");
                      setToDate(t || "");
                    }}
                  />
                </div>
                <div className="rsa-filter rsa-filter--action">
                  <label className="form-label">&nbsp;</label>
                  <Button
                    color="primary"
                    className="rsa-export-btn"
                    disabled={exporting || !canExport}
                    title={canExport ? "Export" : "Pilih filter dulu"}
                    onClick={onExport}
                  >
                    <Icon name="download" />
                    Export
                  </Button>
                </div>
              </div>
              {error ? <div className="rrd-msg err mt-2">{error}</div> : null}
            </div>
          </div>
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default RegKoleksiPage;
