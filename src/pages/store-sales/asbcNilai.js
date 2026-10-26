import React, { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import DatePicker from "../../components/AppDatePicker";
import ExcelJS from "exceljs";
import CalendarDateInput from "../../components/CalendarDateInput";
import { NumericFormat } from "react-number-format";
import Head from "../../layout/head/Head";
import Content from "../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
} from "../../components/Component";
import { useStoreScope } from "../../hooks/useStoreScope";
import { storeAsbcService } from "../../services/store-asbc.service";
import { extractRows, isSuccess } from "../../lib/response";
import { PageSmoothScroll } from "../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../components/SalesEmptyState";
import { saveXlsxFile } from "../../lib/exportStyledXlsx";

const ID_MONTHS = [
  "JANUARI",
  "FEBRUARI",
  "MARET",
  "APRIL",
  "MEI",
  "JUNI",
  "JULI",
  "AGUSTUS",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DESEMBER",
];

const buildSalesPeriodHeader = (date, yearOffset = 0) => {
  const endDay = String(date.getDate()).padStart(2, "0");
  const month = ID_MONTHS[date.getMonth()];
  const year = date.getFullYear() + yearOffset;
  return `SALES 01-${endDay} ${month} ${year}`;
};

const classifyAsbcRow = (row) => {
  const group = String(row?.KODE_group ?? "").toLowerCase();
  if (group.includes("totalgrandtot") || group.includes("9999999999999")) {
    return "grandTotal";
  }
  if (group.endsWith(" total")) {
    return "subTotal";
  }
  return "data";
};

const extractGroupCode = (row) => {
  const group = String(row?.KODE_group ?? "");
  return group.replace(/\s+total$/i, "").trim();
};

const formatQty = (value) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator=","
    decimalScale={0}
    displayType="text"
    renderText={(text) => text}
  />
);

const formatDecimal = (value, decimalScale = 1) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator=","
    decimalScale={decimalScale}
    fixedDecimalScale={decimalScale > 0}
    displayType="text"
    renderText={(text) => text}
  />
);

const formatPercent = (value) => (
  <>
    {formatDecimal(value, 1)}
    <span className="text-soft ms-1">%</span>
  </>
);

const ketTone = (ket) => {
  const value = String(ket || "").toUpperCase();
  if (value === "KIRIM") return "success";
  if (value === "STOP") return "danger";
  return "secondary";
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const EXPORT_HEADERS = [
  { key: "kode", label: "Kode", width: 12, align: "left" },
  { key: "deskripsi", label: "Deskripsi", width: 34, align: "left" },
  { key: "salesPrev", width: 20, align: "right", numFmt: "#,##0" },
  { key: "salesCurrent", width: 20, align: "right", numFmt: "#,##0" },
  { key: "growth", label: "Growth", width: 14, align: "right", numFmt: "#,##0" },
  { key: "percentGrowth", label: "% Growth", width: 14, align: "right", numFmt: "#,##0.0\"%\"" },
  { key: "inventoryStock", label: "Inventory Stock", width: 16, align: "right", numFmt: "#,##0" },
  { key: "stockDay", label: "Stock Day", width: 12, align: "right", numFmt: "#,##0.0" },
  { key: "ket", label: "Ket", width: 10, align: "center" },
];

const AsbcNilaiPage = () => {
  const { storeId, storeName } = useStoreScope();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sm, setSm] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appliedDate, setAppliedDate] = useState(null);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    const queryDate = selectedDate;
    setLoading(true);
    setError("");
    try {
      const res = await storeAsbcService.list({
        store_id: storeId,
        date: format(queryDate, "yyyy-MM-dd"),
      });
      if (!isSuccess(res)) {
        throw res;
      }
      setRows(extractRows(res));
      setAppliedDate(queryDate);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data ASBC Nilai");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, selectedDate]);

  const tableRows = useMemo(
    () =>
      rows.map((row, index) => ({
        ...row,
        id: `${row?.KODE_group || "row"}-${row?.KODE || index}-${index}`,
        rowType: classifyAsbcRow(row),
        groupCode: extractGroupCode(row),
      })),
    [rows]
  );

  const salesPrevYearHeader = useMemo(
    () => (appliedDate ? buildSalesPeriodHeader(appliedDate, -1) : "SALES"),
    [appliedDate]
  );
  const salesCurrentYearHeader = useMemo(
    () => (appliedDate ? buildSalesPeriodHeader(appliedDate, 0) : "SALES"),
    [appliedDate]
  );

  const renderRowClass = (rowType) => {
    if (rowType === "grandTotal") return "asbc-row-grand-total";
    if (rowType === "subTotal") return "asbc-row-sub-total";
    return "";
  };

  const exportRows = useMemo(
    () =>
      tableRows.map((item) => ({
        kode: item.KODE || "-",
        deskripsi: item.DESKRIPSI || "-",
        salesPrev: toNumber(item.SALES_QTY_TAHUN_SEBELUMNYA),
        salesCurrent: toNumber(item.SALES_QTY_BERJALAN),
        growth: toNumber(item.GROWTH),
        percentGrowth: toNumber(item.PERSEN_GROWTH),
        inventoryStock: toNumber(item.inventory_stock),
        stockDay: toNumber(item.stock_day),
        ket: item.ket || "-",
        rowType: item.rowType,
      })),
    [tableRows]
  );

  const canExport = !!appliedDate && tableRows.length > 0 && !loading;

  const exportExcel = useCallback(() => {
    if (!canExport) return;

    const run = async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("ASBC Nilai");
      const prevHeader = salesPrevYearHeader;
      const currentHeader = salesCurrentYearHeader;

      const headers = EXPORT_HEADERS.map((column) => ({
        ...column,
        label:
          column.key === "salesPrev"
            ? prevHeader
            : column.key === "salesCurrent"
              ? currentHeader
              : column.label,
      }));

      worksheet.columns = headers.map((column) => ({
        header: column.label,
        key: column.key,
        width: column.width,
      }));

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FF526484" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F6FA" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFDDE0E6" } },
          left: { style: "thin", color: { argb: "FFDDE0E6" } },
          bottom: { style: "thin", color: { argb: "FFDDE0E6" } },
          right: { style: "thin", color: { argb: "FFDDE0E6" } },
        };
      });

      exportRows.forEach((rowData) => {
        const row = worksheet.addRow(rowData);
        const isSubTotal = rowData.rowType === "subTotal";
        const isGrandTotal = rowData.rowType === "grandTotal";
        const fillColor = isGrandTotal ? "FFEDF4FF" : isSubTotal ? "FFF7FAFF" : null;

        headers.forEach((column, index) => {
          const cell = row.getCell(index + 1);
          cell.alignment = { horizontal: column.align, vertical: "middle" };
          if (column.numFmt) {
            cell.numFmt = column.numFmt;
          }
          if (fillColor) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
          }
          if (isSubTotal || isGrandTotal) {
            cell.font = { bold: true, color: { argb: isGrandTotal ? "FF364A63" : "FF526484" } };
          }
          cell.border = {
            top: { style: isGrandTotal ? "medium" : "thin", color: { argb: "FFDDE0E6" } },
            left: { style: "thin", color: { argb: "FFDDE0E6" } },
            bottom: { style: "thin", color: { argb: "FFDDE0E6" } },
            right: { style: "thin", color: { argb: "FFDDE0E6" } },
          };
        });
      });

      const fileName = `asbc-nilai-${storeId || "store"}-${format(appliedDate, "yyyyMMdd")}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      saveXlsxFile(buffer, fileName);
    };

    run();
  }, [canExport, exportRows, storeId, appliedDate, salesPrevYearHeader, salesCurrentYearHeader]);

  return (
    <>
      <Head title="ASBC Nilai" />
      <Content>
        <PageSmoothScroll revision={`${loading ? "loading" : "ready"}-${tableRows.length}-${error || "ok"}`}>
        <BlockHead size="sm">
          <BlockBetween className="page-head-stack">
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                ASBC Nilai
              </BlockTitle>
              <BlockDes className="text-soft">
                <p>
                  Analisa sales by class — store {storeName ? `${storeName} (${storeId})` : storeId || "-"}
                  {appliedDate ? ` — periode ${format(appliedDate, "dd MMM yyyy")}` : ""}
                </p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                  onClick={() => setSm((prev) => !prev)}
                >
                  <Icon name="menu-alt-r" />
                </Button>
                <div className="toggle-expand-content" style={{ display: sm ? "block" : "none" }}>
                  <ul className="nk-block-tools g-3">
                    <li>
                      <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date || new Date())}
                        dateFormat="dd MMM yyyy"
                        customInput={<CalendarDateInput className="form-control date-picker sales-filter-date" />}
                      />
                    </li>
                    <li>
                      <Button color="primary" onClick={loadData} disabled={loading}>
                        <Icon name="search" />
                        <span>Load</span>
                      </Button>
                    </li>
                    <li>
                      <Button
                        color="primary"
                        outline
                        className="btn-icon"
                        onClick={exportExcel}
                        disabled={!canExport}
                        aria-label="Export Excel"
                        title="Export Excel"
                      >
                        <Icon name="download-cloud" />
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block className="asbc-nilai-page">
          {error ? (
            <div className="text-center py-4">
              <span className="text-danger">{error}</span>
            </div>
          ) : tableRows.length > 0 ? (
          <div className="page-table-scroll">
          <DataTable className="card-stretch">
            <DataTableBody compact>
              <DataTableHead>
                <DataTableRow size="sm">
                  <span className="sub-text">Kode</span>
                </DataTableRow>
                <DataTableRow size="lg">
                  <span className="sub-text">Deskripsi</span>
                </DataTableRow>
                <DataTableRow size="md" className="text-end">
                  <span className="sub-text">{salesPrevYearHeader}</span>
                </DataTableRow>
                <DataTableRow size="md" className="text-end">
                  <span className="sub-text">{salesCurrentYearHeader}</span>
                </DataTableRow>
                <DataTableRow size="md" className="text-end">
                  <span className="sub-text">Growth</span>
                </DataTableRow>
                <DataTableRow size="sm" className="text-end">
                  <span className="sub-text">% Growth</span>
                </DataTableRow>
                <DataTableRow size="md" className="text-end">
                  <span className="sub-text">Inventory Stock</span>
                </DataTableRow>
                <DataTableRow size="sm" className="text-end">
                  <span className="sub-text">Stock Day</span>
                </DataTableRow>
                <DataTableRow size="sm" className="text-center">
                  <span className="sub-text">Ket</span>
                </DataTableRow>
              </DataTableHead>

              {tableRows.map((item) => (
                    <DataTableItem key={item.id} className={renderRowClass(item.rowType)}>
                      <DataTableRow size="sm">
                        <span>{item.KODE || "-"}</span>
                      </DataTableRow>
                      <DataTableRow size="lg">
                        <span className={item.rowType !== "data" ? "tb-lead" : "tb-lead"}>{item.DESKRIPSI || "-"}</span>
                      </DataTableRow>
                      <DataTableRow size="md" className="text-end">
                        <span>{formatQty(item.SALES_QTY_TAHUN_SEBELUMNYA)}</span>
                      </DataTableRow>
                      <DataTableRow size="md" className="text-end">
                        <span>{formatQty(item.SALES_QTY_BERJALAN)}</span>
                      </DataTableRow>
                      <DataTableRow size="md" className="text-end">
                        <span>{formatQty(item.GROWTH)}</span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="text-end">
                        <span>{formatPercent(item.PERSEN_GROWTH)}</span>
                      </DataTableRow>
                      <DataTableRow size="md" className="text-end">
                        <span>{formatQty(item.inventory_stock)}</span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="text-end">
                        <span>{formatDecimal(item.stock_day, 1)}</span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="text-center">
                        {item.ket ? (
                          <span className={`tb-status text-${ketTone(item.ket)}`}>{item.ket}</span>
                        ) : (
                          <span className="text-soft">-</span>
                        )}
                      </DataTableRow>
                    </DataTableItem>
                  ))}
            </DataTableBody>
          </DataTable>
          </div>
          ) : (
            <SalesEmptyState
              description={
                appliedDate ? (
                  <>Tidak ada data ASBC Nilai untuk filter yang dipilih.</>
                ) : (
                  <>
                    Pilih tanggal, lalu klik <strong>Load</strong> untuk menampilkan laporan.
                  </>
                )
              }
            />
          )}
        </Block>
        </PageSmoothScroll>
      </Content>
    </>
  );
};

export default AsbcNilaiPage;
