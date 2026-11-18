import React, { useCallback, useState } from "react";
import ExcelJS from "exceljs";
import { toast } from "react-toastify";
import { Spinner } from "reactstrap";
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
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { exportDataMember } from "../../../services/marcomm/marcomm.service";
import { isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import "../hrd/hrd-personel.css";
import "../dgs/dgs.css";

const pad = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ymdCompact = (ymd) => String(ymd || "").replace(/-/g, "");
const firstOfMonth = () => toYmd(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const todayYmd = () => toYmd(new Date());

const BORDER = { style: "thin", color: { argb: "FFDDE0E6" } };

const collectKeys = (rows) => {
  const keys = new Set();
  (rows || []).forEach((row) => {
    if (row && typeof row === "object") Object.keys(row).forEach((k) => keys.add(k));
  });
  return [...keys];
};

const cellValue = (value) => {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value;
};

const fillSheet = (worksheet, rows, sheetLabel) => {
  const keys = collectKeys(rows);
  if (!keys.length) {
    worksheet.addRow([`Tidak ada data ${sheetLabel}`]);
    return;
  }
  worksheet.addRow(keys);
  const headerRow = worksheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF526484" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F6FA" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
  });
  (rows || []).forEach((row) => {
    const line = worksheet.addRow(keys.map((k) => cellValue(row[k])));
    line.eachCell((cell) => {
      cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
      cell.alignment = { vertical: "middle" };
    });
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: keys.length },
  };
  keys.forEach((key, i) => {
    worksheet.getColumn(i + 1).width = Math.min(36, Math.max(14, String(key).length + 4));
  });
};

const buildWorkbook = async (member, sales) => {
  const wb = new ExcelJS.Workbook();
  const wsMember = wb.addWorksheet("Member");
  const wsSales = wb.addWorksheet("Sales");
  fillSheet(wsMember, member, "Member");
  fillSheet(wsSales, sales, "Sales");
  return wb.xlsx.writeBuffer();
};

const pickExportPayload = (res) => {
  if (!res || typeof res !== "object") return { member: [], sales: [] };
  const bag = res.data && typeof res.data === "object" && !Array.isArray(res.data) ? res.data : res;
  return {
    member: Array.isArray(bag.member) ? bag.member : [],
    sales: Array.isArray(bag.sales) ? bag.sales : [],
  };
};

const MarcommExportDataMemberPage = () => {
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(todayYmd);
  const [loading, setLoading] = useState(false);

  const onExport = useCallback(async () => {
    if (!fromDate || !toDate) {
      toast.error("Pilih rentang tanggal terlebih dahulu");
      return;
    }
    if (fromDate > toDate) {
      toast.error("Tanggal awal tidak boleh setelah tanggal akhir");
      return;
    }

    setLoading(true);
    try {
      const res = await exportDataMember({ from_date: fromDate, to_date: toDate });
      if (res?.responseCode && !isSuccess(res)) {
        toast.error(res?.responseMessage || "Gagal mengambil data export");
        return;
      }
      const { member, sales } = pickExportPayload(res);
      if (!member.length && !sales.length) {
        toast.warning("Tidak ada data untuk rentang tanggal ini");
        return;
      }
      const buffer = await buildWorkbook(member, sales);
      const fileName = `export_data_member_${ymdCompact(fromDate)}_${ymdCompact(toDate)}.xlsx`;
      const saved = saveXlsxFile(buffer, fileName);
      if (saved) {
        toast.success(
          `Excel diunduh · Member ${member.length.toLocaleString("id-ID")} baris · Sales ${sales.length.toLocaleString("id-ID")} baris`
        );
      }
    } catch (err) {
      toast.error(err?.responseMessage || err?.message || "Gagal export data member");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  return (
    <AccessGuard moduleCode="MAR_MBR_EXPORT" permission="VIEW">
      <>
        <Head title="Export Data Member" />
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Export Data Member
                </BlockTitle>
                <BlockDes className="text-soft">
                  Satu file Excel (.xlsx) berisi sheet <strong>Member</strong> (semua) dan{" "}
                  <strong>Sales</strong> (filter rentang tanggal).
                </BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="card card-bordered">
              <div className="card-inner">
                <div className="row g-3 align-items-end">
                  <div className="col-md-5 col-lg-4">
                    <label className="hrd-form-label text-uppercase">Tanggal Sales (From - To)</label>
                    <AppDateRangePicker
                      startDate={fromDate}
                      endDate={toDate}
                      placeholder="Pilih rentang tanggal"
                      className="form-control date-picker"
                      onChange={(fromYmd, toYmd) => {
                        setFromDate(fromYmd || "");
                        setToDate(toYmd || "");
                      }}
                    />
                  </div>
                  <div className="col-md-auto">
                    <Button color="primary" disabled={loading} onClick={onExport}>
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-1" /> Memproses…
                        </>
                      ) : (
                        <>
                          <Icon name="download" className="me-1" />
                          Export Excel
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="text-soft small mt-3">
                  Proses bisa sampai beberapa menit untuk data besar. Jangan tutup halaman saat Memproses…
                </div>
              </div>
            </div>
          </Block>
        </Content>
      </>
    </AccessGuard>
  );
};

export default MarcommExportDataMemberPage;
