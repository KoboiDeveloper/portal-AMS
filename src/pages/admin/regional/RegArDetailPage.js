import React, { useCallback, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDatePicker from "../../../components/AppDatePicker";
import { parseAppDate, formatAppDateYmd } from "../../../components/AppDateRangePicker";
import { createRegionalService } from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { exportStyledXlsx } from "../../../lib/exportStyledXlsx";
import "./reg-ar-detail.css";

const detailSvc = createRegionalService("rpt/sales/ar-detail", { crud: false });
const summarySvc = createRegionalService("rpt/sales/ar-detail/summary", { crud: false });

const todayYmd = () => formatAppDateYmd(new Date());
const monthStartYmd = () => {
  const d = new Date();
  return formatAppDateYmd(new Date(d.getFullYear(), d.getMonth(), 1));
};

const n = (r, k) => Number(r?.[k] ?? 0) || 0;

/** Export Detail — parity XSP_RPT_sales_ar_GETROWS_print_POS_SERVER / gambar 1 */
const DETAIL_COLS = [
  { key: "STORE", label: "STORE", width: 10 },
  { key: "tanggal_transaksi", label: "tanggal_transaksi", width: 14 },
  { key: "CASH", label: "CASH", num: true, width: 12 },
  { key: "CARD", label: "CARD", num: true, width: 12 },
  { key: "VOUCHER", label: "VOUCHER", num: true, width: 12 },
  { key: "OVO", label: "OVO", num: true, width: 12 },
  { key: "KQRIS", label: "KQRIS", num: true, width: 12 },
  { key: "D_QRIS_BCA", label: "D_QRIS_BCA", num: true, width: 12 },
  { key: "D_QRIS_BNI", label: "D_QRIS_BNI", num: true, width: 12 },
  { key: "D_QRIS_BRI", label: "D_QRIS_BRI", num: true, width: 12 },
  { key: "D_QRIS_MDR", label: "D_QRIS_MDR", num: true, width: 12 },
  { key: "KATOME", label: "KATOME", num: true, width: 12 },
  { key: "KINDODANA", label: "KINDODANA", num: true, width: 12 },
  { key: "SISA_VOUCHER", label: "SISA_VOUCHER", num: true, width: 12 },
  { key: "REFUND", label: "REFUND", num: true, width: 12 },
  { key: "TOTAL", label: "TOTAL", num: true, width: 12 },
];

/** Export Summary — parity XSP_TARIKAN_AR_DETAIL_RICO_print_POS_SERVER / gambar 2 */
const SUMMARY_COLS = [
  { key: "STORE", label: "STORE", width: 10 },
  { key: "TANGGAL_TRANSAKSI", label: "TANGGAL_TRANSAKSI", width: 14 },
  { key: "PLU", label: "PLU", width: 16 },
  { key: "QTY", label: "QTY", num: true, width: 8 },
  { key: "HPP", label: "HPP", num: true, width: 12 },
  { key: "PRICE", label: "PRICE", num: true, width: 12 },
  { key: "DISKON", label: "DISKON", num: true, width: 12 },
  { key: "TOTAL", label: "TOTAL", num: true, width: 12 },
  { key: "RUMUS", label: "RUMUS", num: true, width: 12 },
  { key: "SELISIH", label: "SELISIH", num: true, width: 12 },
  { key: "REFUND", label: "REFUND", num: true, width: 12 },
];

const daySpan = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000);
};

const RegArDetailPage = () => {
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const exportExcel = useCallback(
    async (which) => {
      if (exporting) return;
      if (!fromDate || !toDate) {
        setError("Pilih tanggal dulu");
        return;
      }
      if (daySpan(fromDate, toDate) > 31) {
        setError("Range tanggal maksimal 31 hari");
        return;
      }

      setExporting(which);
      setError("");
      setStatus(which === "detail" ? "Menyiapkan Export Detail..." : "Menyiapkan Export Summary...");

      try {
        const params = {
          from_date: fromDate,
          to_date: toDate,
          id_brand: "ALL",
          id_store: "ALL",
        };
        const svc = which === "detail" ? detailSvc : summarySvc;
        const columns = which === "detail" ? DETAIL_COLS : SUMMARY_COLS;
        const res = await svc.list(params);
        if (!isSuccess(res)) {
          setError(res?.responseMessage || "Gagal export");
          setStatus("");
          return;
        }
        const data = extractRows(res);
        if (!data.length) {
          setError("Tidak ada data untuk di-export");
          setStatus("");
          return;
        }

        await exportStyledXlsx({
          fileName: `AR_${which}_${fromDate}_${toDate}`,
          sheetName: which === "detail" ? "Detail" : "Summary",
          columns: columns.map((c) => ({
            key: c.key,
            label: c.label,
            width: c.width,
            align: c.num ? "right" : "left",
            numFmt: c.num ? "#,##0.00" : undefined,
          })),
          rows: data.map((r) => {
            const out = {};
            columns.forEach((c) => {
              out[c.key] = c.num ? n(r, c.key) : r?.[c.key] ?? "";
            });
            return out;
          }),
        });
        setStatus(`Export ${which === "detail" ? "Detail" : "Summary"} selesai (${data.length} baris)`);
      } catch (e) {
        setError(e?.message || "Gagal export");
        setStatus("");
      } finally {
        setExporting("");
      }
    },
    [exporting, fromDate, toDate]
  );

  return (
    <AccessGuard moduleCode="REG_RPT_AR_DETAIL">
      <Head title="AR REPORT" />
      <Content>
        <div className="rad-report">
          <BlockHead size="sm">
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                AR REPORT
              </BlockTitle>
            </BlockHeadContent>
          </BlockHead>

          <Block>
            <div className="rad-toolbar">
              <div className="rad-dates">
                <div className="rad-date-field">
                  <AppDatePicker
                    selected={parseAppDate(fromDate)}
                    onChange={(d) => setFromDate(d ? formatAppDateYmd(d) : "")}
                    dateFormat="yyyy/MM/dd"
                    className="form-control rad-date-input"
                    placeholderText="From"
                  />
                  <div className="rad-date-hint">Select date range</div>
                </div>
                <div className="rad-date-to">To</div>
                <div className="rad-date-field">
                  <AppDatePicker
                    selected={parseAppDate(toDate)}
                    onChange={(d) => setToDate(d ? formatAppDateYmd(d) : "")}
                    dateFormat="yyyy/MM/dd"
                    className="form-control rad-date-input"
                    placeholderText="To"
                  />
                </div>
              </div>

              <div className="rad-actions">
                <button
                  type="button"
                  className="btn rad-btn-detail"
                  disabled={Boolean(exporting) || !fromDate || !toDate}
                  onClick={() => exportExcel("detail")}
                >
                  {exporting === "detail" ? "Exporting..." : "Export Detail"}
                </button>
                <button
                  type="button"
                  className="btn rad-btn-summary"
                  disabled={Boolean(exporting) || !fromDate || !toDate}
                  onClick={() => exportExcel("summary")}
                >
                  {exporting === "summary" ? "Exporting..." : "Export Summary"}
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

export default RegArDetailPage;
