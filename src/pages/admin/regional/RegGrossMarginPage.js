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
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { createRegionalService } from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import "./reg-gross-margin.css";

const gmService = createRegionalService("rpt/sales/gross-margin", { crud: false });

const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const monthNameId = (ymd) => {
  const d = new Date(`${String(ymd).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", { month: "long" }).toUpperCase();
};

const num = (row, ...keys) => {
  for (const k of keys) {
    if (row?.[k] != null && row[k] !== "") return Number(row[k]) || 0;
  }
  return 0;
};

const str = (row, ...keys) => {
  for (const k of keys) {
    if (row?.[k] != null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
};

const pctSafe = (net, hpp) => {
  if (!net) return 0;
  return Math.round(((net - hpp) / net) * 10000) / 100;
};

const BLUE = "FF0000FF";
const WHITE = "FFFFFFFF";
const NUM_FMT = "#,##0";
const PCT_FMT = "0.00";

const styleSummaryRow = (ws, rowIdx) => {
  for (let c = 2; c <= 7; c++) {
    const cell = ws.getCell(rowIdx, c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.font = { bold: true, color: { argb: WHITE } };
  }
  for (let c = 3; c <= 6; c++) {
    ws.getCell(rowIdx, c).numFmt = NUM_FMT;
  }
  ws.getCell(rowIdx, 7).numFmt = PCT_FMT;
};

/** Parity with module/Rpt/gross_margin.aspx — Tanggal + Export only */
const RegGrossMarginPage = () => {
  const [sm, setSm] = useState(false);
  const [fromDate, setFromDate] = useState(todayYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const canExport = Boolean(fromDate && toDate);

  const onExport = useCallback(async () => {
    if (!canExport || exporting) return;
    setExporting(true);
    setError("");
    try {
      const res = await gmService.list({
        from_date: fromDate,
        to_date: toDate,
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat data export");
        return;
      }
      const rows = extractRows(res);
      if (!rows.length) {
        setError("Tidak ada data untuk periode ini");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Sales");
      const monthHdr = monthNameId(toDate);

      ws.getCell(1, 1).value = "STATUS";
      ws.getCell(1, 2).value = "BRAND";
      ws.getCell(1, 3).value = "QTY";
      ws.getCell(1, 4).value = "HPP";
      ws.getCell(1, 5).value = "NET SALES";
      ws.getCell(1, 6).value = "MARGIN";
      ws.getCell(1, 7).value = monthHdr;
      ws.getRow(1).font = { bold: true };

      const empty = () => ({ qty: 0, hpp: 0, net: 0, margin: 0 });
      const dailyReg = empty();
      const dailyNon = empty();
      const dailyDs = empty();
      const monthlyReg = empty();
      const monthlyNon = empty();
      const monthlyDs = empty();
      const yearlyReg = empty();
      const yearlyNon = empty();
      const yearlyDs = empty();

      let summaryDayAt = -1;
      let summaryMtdAt = -1;
      let summaryYtdAt = -1;

      const addTo = (bucket, q, hpp, ns, mg) => {
        bucket.qty += q;
        bucket.hpp += hpp;
        bucket.net += ns;
        bucket.margin += mg;
      };

      let rowIndex = 2;
      rows.forEach((r) => {
        const brand = str(r, "BRAND", "brand");
        const status = str(r, "STATUS", "status");
        const q = num(r, "QTY", "qty");
        const hpp = num(r, "HPP", "hpp");
        const ns = num(r, "NET SALES", "NET_SALES", "net_sales");
        const mg = num(r, "MARGIN", "margin");
        const pct = num(r, "NET PERSENTASE", "NET_PERSENTASE", "net_persentase");

        ws.getCell(rowIndex, 1).value = status;
        ws.getCell(rowIndex, 2).value = brand;
        ws.getCell(rowIndex, 3).value = q;
        ws.getCell(rowIndex, 4).value = hpp;
        ws.getCell(rowIndex, 5).value = ns;
        ws.getCell(rowIndex, 6).value = mg;
        ws.getCell(rowIndex, 7).value = pct;

        if (brand === "ONLINE" && status === "DAY") summaryDayAt = rowIndex + 1;
        if (brand === "ONLINE" && status === "MTD") summaryMtdAt = rowIndex + 5;
        if (brand === "ONLINE" && status === "YTD") summaryYtdAt = rowIndex + 9;

        if (brand !== "DISCOUNT STORE" && brand !== "ONLINE") {
          if (status === "DAY") addTo(dailyReg, q, hpp, ns, mg);
          if (status === "MTD") addTo(monthlyReg, q, hpp, ns, mg);
          if (status === "YTD") addTo(yearlyReg, q, hpp, ns, mg);
        } else {
          if (status === "DAY") addTo(dailyNon, q, hpp, ns, mg);
          if (status === "MTD") addTo(monthlyNon, q, hpp, ns, mg);
          if (status === "YTD") addTo(yearlyNon, q, hpp, ns, mg);
        }
        if (brand === "DISCOUNT STORE") {
          if (status === "DAY") addTo(dailyDs, q, hpp, ns, mg);
          if (status === "MTD") addTo(monthlyDs, q, hpp, ns, mg);
          if (status === "YTD") addTo(yearlyDs, q, hpp, ns, mg);
        }
        rowIndex += 1;
      });

      const lastData = rowIndex - 1;
      if (lastData >= 2) {
        for (let r = 2; r <= lastData; r++) {
          ws.getCell(r, 3).numFmt = NUM_FMT;
          ws.getCell(r, 4).numFmt = NUM_FMT;
          ws.getCell(r, 5).numFmt = NUM_FMT;
          ws.getCell(r, 6).numFmt = NUM_FMT;
          ws.getCell(r, 7).numFmt = PCT_FMT;
        }
      }

      /* Build full sheet rows in memory then insert summary blocks (legacy InsertRow) */
      const sheetRows = [];
      for (let r = 1; r < rowIndex; r++) {
        sheetRows.push([
          ws.getCell(r, 1).value,
          ws.getCell(r, 2).value,
          ws.getCell(r, 3).value,
          ws.getCell(r, 4).value,
          ws.getCell(r, 5).value,
          ws.getCell(r, 6).value,
          ws.getCell(r, 7).value,
        ]);
      }

      /* Legacy offsets already bake in prior InsertRow shifts (+1 / +5 / +9) — do not re-bump */
      const insertBlock = (at1Based, blockRows) => {
        if (at1Based < 0) return;
        sheetRows.splice(at1Based - 1, 0, ...blockRows);
      };

      const makeBlock = (labels, reg, non, ds) => [
        [null, labels.reguler, reg.qty, reg.hpp, reg.net, reg.margin, pctSafe(reg.net, reg.hpp)],
        [null, labels.non, non.qty, non.hpp, non.net, non.margin, pctSafe(non.net, non.hpp)],
        [
          null,
          labels.regDs,
          reg.qty + ds.qty,
          reg.hpp + ds.hpp,
          reg.net + ds.net,
          reg.margin + ds.margin,
          pctSafe(reg.net + ds.net, reg.hpp + ds.hpp),
        ],
        [
          null,
          "GRAND TOTAL",
          reg.qty + non.qty,
          reg.hpp + non.hpp,
          reg.net + non.net,
          reg.margin + non.margin,
          pctSafe(reg.net + non.net, reg.hpp + non.hpp),
        ],
      ];

      insertBlock(
        summaryDayAt,
        makeBlock(
          {
            reguler: "Total Daily Reguler",
            non: "Total Daily Non Reguler",
            regDs: "Total Daily Reguler + DISCOUNT STORE",
          },
          dailyReg,
          dailyNon,
          dailyDs
        )
      );
      insertBlock(
        summaryMtdAt,
        makeBlock(
          {
            reguler: "Total Monthly Reguler",
            non: "Total Monthly Non Reguler",
            regDs: "Total Monthly Reguler + DISCOUNT STORE",
          },
          monthlyReg,
          monthlyNon,
          monthlyDs
        )
      );
      insertBlock(
        summaryYtdAt,
        makeBlock(
          {
            reguler: "Total Yearly Reguler",
            non: "Total Yearly Non Reguler",
            regDs: "Total Yearly Reguler + DISCOUNT STORE",
          },
          yearlyReg,
          yearlyNon,
          yearlyDs
        )
      );

      /* Rewrite worksheet from sheetRows */
      ws.spliceRows(1, ws.rowCount);
      sheetRows.forEach((vals, i) => {
        const r = i + 1;
        vals.forEach((v, ci) => {
          ws.getCell(r, ci + 1).value = v == null ? null : v;
        });
        if (r === 1) {
          ws.getRow(1).font = { bold: true };
          return;
        }
        const label = String(vals[1] || "");
        const isSummary =
          /Total (Daily|Monthly|Yearly)|GRAND TOTAL/i.test(label);
        if (isSummary) {
          styleSummaryRow(ws, r);
        } else {
          ws.getCell(r, 3).numFmt = NUM_FMT;
          ws.getCell(r, 4).numFmt = NUM_FMT;
          ws.getCell(r, 5).numFmt = NUM_FMT;
          ws.getCell(r, 6).numFmt = NUM_FMT;
          ws.getCell(r, 7).numFmt = PCT_FMT;
        }
      });

      ws.autoFilter = { from: "A1", to: "G1" };
      ws.columns = [
        { width: 10 },
        { width: 36 },
        { width: 12 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 12 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Gross_Margin_${fromDate}_${toDate}.xlsx`;
      saveXlsxFile(buffer, fileName);
    } catch (e) {
      const msg =
        (typeof e === "string" && e) ||
        e?.responseMessage ||
        e?.message ||
        "Gagal export";
      setError(String(msg).trim().slice(0, 300));
    } finally {
      setExporting(false);
    }
  }, [canExport, exporting, fromDate, toDate]);

  return (
    <AccessGuard moduleCode="REG_RPT_GROSS_MARGIN">
      <Head title="Gross Margin" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Gross Margin
              </BlockTitle>
              <BlockDes className="text-soft">
                Export Gross Margin Report
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                  onClick={() => setSm(!sm)}
                >
                  <Icon name="menu-alt-r" />
                </Button>
                <div className="toggle-expand-content" style={{ display: sm ? "block" : undefined }}>
                  <ul className="nk-block-tools g-3 align-items-center">
                    <li className="hrd-filter-daterange">
                      <div className="form-control-wrap">
                        <div className="form-icon form-icon-left">
                          <Icon name="calendar" />
                        </div>
                        <AppDateRangePicker
                          startDate={fromDate}
                          endDate={toDate}
                          placeholder="From — To"
                          className="form-control form-control-sm date-picker ps-4"
                          onChange={(fromYmd, toYmd) => {
                            setFromDate(fromYmd || "");
                            setToDate(toYmd || "");
                          }}
                        />
                      </div>
                    </li>
                    <li>
                      <Button
                        color="light"
                        size="sm"
                        onClick={onExport}
                        disabled={!canExport || exporting}
                        title={canExport ? "Export" : "Pilih filter dulu"}
                      >
                        <Icon name="download" />
                        <span>{exporting ? "Loading…" : "Export Excel"}</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>{error ? <div className="alert alert-danger py-2">{error}</div> : null}</Block>
      </Content>
    </AccessGuard>
  );
};

export default RegGrossMarginPage;
