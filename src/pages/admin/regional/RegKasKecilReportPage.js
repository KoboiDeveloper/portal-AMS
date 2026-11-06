import React, { useCallback, useMemo, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { createRegionalService } from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { exportStyledXlsx } from "../../../lib/exportStyledXlsx";
import "./reg-ar-detail.css";

const svc = createRegionalService("rpt/sales/kas-kecil-report", { crud: false });

const n = (r, k) => Number(r?.[k] ?? 0) || 0;

const COLS = [
  { key: "STORE_ID", label: "STORE_ID", width: 12 },
  { key: "DESKRIPSI", label: "DESKRIPSI", width: 28 },
  { key: "COA", label: "COA", width: 12 },
  { key: "TGL_PENGAJUAN", label: "TGL_PENGAJUAN", width: 14 },
  { key: "REMARKS", label: "REMARKS", width: 32 },
  { key: "AMOUNT_OUT", label: "AMOUNT_OUT", num: true, width: 14 },
  { key: "status", label: "status", width: 10 },
  { key: "keterangan", label: "keterangan", width: 14 },
];

const yearOptions = () => {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2].map(String);
};

const RegKasKecilReportPage = () => {
  const years = useMemo(() => yearOptions(), []);
  const [year, setYear] = useState(years[0]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const exportExcel = useCallback(async () => {
    if (exporting) return;
    if (!year) {
      setError("Pilih tahun dulu");
      return;
    }
    setExporting(true);
    setError("");
    setStatus("Menyiapkan export...");
    try {
      const res = await svc.list({ year, tahun: year });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal export");
        setStatus("");
        return;
      }
      const data = extractRows(res);
      if (!data.length) {
        setError("Tidak ada data untuk tahun " + year);
        setStatus("");
        return;
      }
      await exportStyledXlsx({
        fileName: `Kas_Kecil_${year}`,
        sheetName: "Kas Kecil",
        columns: COLS.map((c) => ({
          key: c.key,
          label: c.label,
          width: c.width,
          align: c.num ? "right" : "left",
          numFmt: c.num ? "#,##0.00" : undefined,
        })),
        rows: data.map((r) => {
          const out = {};
          COLS.forEach((c) => {
            out[c.key] = c.num ? n(r, c.key) : r?.[c.key] ?? "";
          });
          return out;
        }),
      });
      setStatus(`Export selesai (${data.length} baris · tahun ${year})`);
    } catch (e) {
      setError(e?.message || "Gagal export");
      setStatus("");
    } finally {
      setExporting(false);
    }
  }, [exporting, year]);

  return (
    <AccessGuard moduleCode="REG_RPT_KAS_KECIL">
      <Head title="Report Kas Kecil" />
      <Content>
        <div className="rad-report">
          <BlockHead size="sm">
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Report Kas Kecil
              </BlockTitle>
            </BlockHeadContent>
          </BlockHead>

          <Block>
            <div className="rad-toolbar rad-toolbar--inline">
              <div className="rad-dates">
                <select
                  id="kas-kecil-year"
                  className="form-control rad-date-input"
                  style={{ width: 120 }}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  aria-label="Year"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rad-actions">
                <button
                  type="button"
                  className="btn btn-primary rad-btn-detail"
                  disabled={exporting || !year}
                  onClick={exportExcel}
                >
                  {exporting ? "Exporting..." : "Export Excel"}
                </button>
              </div>
            </div>

            {error ? <div className="rad-msg rad-msg--err">{error}</div> : null}
            {!error && status ? <div className="rad-msg rad-msg--ok">{status}</div> : null}
          </Block>
        </div>
      </Content>
    </AccessGuard>
  );
};

export default RegKasKecilReportPage;
