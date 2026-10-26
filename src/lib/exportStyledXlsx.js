import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const BORDER = { style: "thin", color: { argb: "FFDDE0E6" } };
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Prevents duplicate downloads from double-click / double event fire. */
let exportBusy = false;

/**
 * Save one xlsx file. Ignores overlapping calls for ~1s so export only downloads once.
 * @returns {boolean} true if download started
 */
export function saveXlsxFile(buffer, fileName) {
  if (exportBusy) return false;
  exportBusy = true;
  try {
    const name = String(fileName || "export").endsWith(".xlsx")
      ? String(fileName)
      : `${fileName}.xlsx`;
    saveAs(new Blob([buffer], { type: XLSX_MIME }), name);
    return true;
  } finally {
    window.setTimeout(() => {
      exportBusy = false;
    }, 1000);
  }
}

export const exportStyledXlsx = async ({ fileName, sheetName, columns, rows, getRowStyle }) => {
  if (exportBusy) return false;
  exportBusy = true;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName || "Sheet1");

    worksheet.columns = columns.map((column) => ({
      header: column.label,
      key: column.key,
      width: column.width || 14,
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF526484" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F6FA" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
    });

    rows.forEach((rowData) => {
      const row = worksheet.addRow(rowData);
      const rowStyle = getRowStyle ? getRowStyle(rowData) : null;

      columns.forEach((column, index) => {
        const cell = row.getCell(index + 1);
        cell.alignment = { horizontal: column.align || "left", vertical: "middle" };
        if (column.numFmt) cell.numFmt = column.numFmt;
        if (rowStyle?.fill) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowStyle.fill } };
        }
        if (rowStyle?.font) {
          cell.font = rowStyle.font;
        }
        cell.border = {
          top: rowStyle?.topBorder || BORDER,
          left: BORDER,
          bottom: BORDER,
          right: BORDER,
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const name = String(fileName || "export").endsWith(".xlsx")
      ? String(fileName)
      : `${fileName}.xlsx`;
    saveAs(new Blob([buffer], { type: XLSX_MIME }), name);
    return true;
  } catch (err) {
    exportBusy = false;
    throw err;
  } finally {
    window.setTimeout(() => {
      exportBusy = false;
    }, 1000);
  }
};
