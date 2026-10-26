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
  Button,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { getRegionalTotalSales } from "../../../services/regional/regional.service";
import { isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import "./reg-total-sales.css";

const BRAND_OPTS = [
  { value: "all", label: "ALL BRAND" },
  { value: "discount", label: "DISCOUNT STORE" },
  { value: "celcius", label: "CELCIUS" },
  { value: "celcius woman", label: "CELCIUS WOMAN" },
  { value: "flies", label: "FLIES" },
  { value: "mississippi", label: "MISSISSIPPI" },
  { value: "queensland", label: "QUEENSLAND" },
  { value: "aeesha", label: "AEESHA" },
  { value: "online", label: "ONLINE" },
];

const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const toApiDate = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{4}\/\d{2}\/\d{2}/.test(s)) return s.replace(/\//g, "-").slice(0, 10);
  return s;
};

const fmtNum = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const storeLabel = (row) =>
  String(
    row?.ID_Store ||
      row?.STORE ||
      row?.store ||
      row?.STORE_NAME ||
      row?.store_name ||
      "-"
  );

const num = (row, ...keys) => {
  for (const k of keys) {
    if (row?.[k] != null && row[k] !== "") return Number(row[k]) || 0;
  }
  return 0;
};

/** Match AdminProjectListPage filter controls (220×32 via CSS) */
const brandSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 32,
    height: 32,
    fontSize: "0.8125rem",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 6px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 4px" }),
  menu: (base) => ({
    ...base,
    zIndex: 30,
    fontSize: "0.8125rem",
    width: "max-content",
    minWidth: "100%",
  }),
  option: (base) => ({
    ...base,
    fontSize: "0.8125rem",
    padding: "6px 12px",
    whiteSpace: "nowrap",
  }),
  singleValue: (base) => ({
    ...base,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
};

const RegTotalSalesPage = () => {
  const [fromDate, setFromDate] = useState(todayYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [brandID, setBrandID] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sm, setSm] = useState(false);

  const brandValue = useMemo(
    () => BRAND_OPTS.find((o) => o.value === brandID) || null,
    [brandID]
  );

  const canSearch = Boolean(brandID && fromDate && toDate);

  const load = useCallback(async () => {
    if (!brandID || !fromDate || !toDate) {
      setError("Pilih Brand dan tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getRegionalTotalSales({
        fromDate: toApiDate(fromDate),
        toDate: toApiDate(toDate),
        brandID: brandID || "all",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat data");
        setRows([]);
        setLoaded(true);
        return;
      }
      const list = Array.isArray(res?.salesDetailbyIland)
        ? res.salesDetailbyIland
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setRows(list);
      setLoaded(true);
    } catch (e) {
      setError(e?.responseMessage || e?.message || "Gagal memuat data");
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, brandID]);

  const mapped = useMemo(
    () =>
      rows.map((r, i) => {
        const offline = num(r, "TOTAL_OFFLINE", "total_offline");
        const wa = num(r, "TOTAL_DIRECT", "total_direct", "TOTAL_WHATSAPP");
        const tiktok = num(r, "TOTAL_TIKTOK", "total_tiktok");
        const ig = num(r, "TOTAL_IG", "total_ig", "TOTAL_INSTAGRAM");
        const online = wa + tiktok + ig;
        const total = num(r, "TOTAL", "total") || offline + online;
        return {
          no: i + 1,
          store: storeLabel(r),
          offline,
          online,
          total,
          wa,
          tiktok,
          ig,
          batch: String(r?.BATCH ?? r?.batch ?? ""),
        };
      }),
    [rows]
  );

  const totals = useMemo(
    () =>
      mapped.reduce(
        (acc, r) => {
          acc.offline += r.offline;
          acc.online += r.online;
          acc.total += r.total;
          acc.wa += r.wa;
          acc.tiktok += r.tiktok;
          acc.ig += r.ig;
          return acc;
        },
        { offline: 0, online: 0, total: 0, wa: 0, tiktok: 0, ig: 0 }
      ),
    [mapped]
  );

  const brandLabel = useMemo(
    () => BRAND_OPTS.find((o) => o.value === brandID)?.label || brandID || "ALL",
    [brandID]
  );

  const exportExcel = useCallback(async () => {
    if (!mapped.length) return;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("NILAI");

    ws.mergeCells("A1:A2");
    ws.getCell("A1").value = "NO";
    ws.mergeCells("B1:B2");
    ws.getCell("B1").value = "STORE";
    ws.mergeCells("C1:C2");
    ws.getCell("C1").value = "OFFLINE";
    ws.mergeCells("D1:D2");
    ws.getCell("D1").value = "ONLINE";
    ws.mergeCells("E1:E2");
    ws.getCell("E1").value = "TOTAL";
    ws.mergeCells("F1:H1");
    ws.getCell("F1").value = "ONLINE DETAIL";
    ws.getCell("F2").value = "WHATSAPP";
    ws.getCell("G2").value = "TIKTOK";
    ws.getCell("H2").value = "INSTAGRAM";
    ws.mergeCells("I1:I2");
    ws.getCell("I1").value = "BATCH";

    const thin = { style: "thin", color: { argb: "FFB8C8E8" } };
    const headerBorder = { top: thin, left: thin, bottom: thin, right: thin };

    for (let r = 1; r <= 2; r++) {
      for (let c = 1; c <= 9; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { bold: true, color: { argb: "FF0F2E57" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCEEFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = headerBorder;
      }
    }
    ws.getCell("F1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFCFE3FF" },
    };

    ws.getRow(1).height = 20;
    ws.getRow(2).height = 18;

    mapped.forEach((row) => {
      const excelRow = ws.addRow([
        row.no,
        row.store,
        row.offline,
        row.online,
        row.total,
        row.wa,
        row.tiktok,
        row.ig,
        row.batch,
      ]);
      excelRow.eachCell((cell, col) => {
        cell.border = headerBorder;
        cell.alignment = {
          horizontal: col === 1 ? "center" : col === 2 || col === 9 ? "left" : "right",
          vertical: "middle",
        };
        if (col >= 3 && col <= 8) {
          cell.numFmt = "#,##0";
        }
        if (col === 5) {
          cell.font = { bold: true, color: { argb: "FFFF5A2E" } };
        }
      });
    });

    const firstDataRow = 3;
    const lastDataRow = 2 + mapped.length;
    const totalRowIdx = lastDataRow + 2;
    ws.getCell(totalRowIdx, 2).value = "TOTAL";
    ws.getCell(totalRowIdx, 2).font = { bold: true };

    for (let col = 3; col <= 8; col++) {
      const letter = ws.getColumn(col).letter;
      const cell = ws.getCell(totalRowIdx, col);
      cell.value = { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})` };
      cell.numFmt = "#,##0";
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
    for (let col = 2; col <= 8; col++) {
      ws.getCell(totalRowIdx, col).border = headerBorder;
    }

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 14;
    ws.getColumn(4).width = 14;
    ws.getColumn(5).width = 14;
    ws.getColumn(6).width = 14;
    ws.getColumn(7).width = 14;
    ws.getColumn(8).width = 14;
    ws.getColumn(9).width = 14;

    const fromKey = toApiDate(fromDate).replace(/-/g, "");
    const toKey = toApiDate(toDate).replace(/-/g, "");
    const safeBrand = String(brandLabel).replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `Total_Sales_${safeBrand} - ${fromKey}_${toKey}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    saveXlsxFile(buffer, fileName);
  }, [mapped, fromDate, toDate, brandLabel]);

  return (
    <AccessGuard moduleCode="REG_MOBILE_TOT_SALES" permission="VIEW">
      <Head title="Total Sales" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Total Sales
              </BlockTitle>
              <BlockDes className="text-soft">
                {loaded
                  ? `You have total ${mapped.length} store sales`
                  : "Report Sales · pilih filter lalu Load"}
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
                          placeholder="Date Range"
                          className="form-control form-control-sm date-picker ps-4"
                          onChange={(fromYmd, toYmd) => {
                            setFromDate(fromYmd || "");
                            setToDate(toYmd || "");
                          }}
                        />
                      </div>
                    </li>
                    <li className="hrd-filter-select">
                      <RSelect
                        className="hrd-filter-rselect"
                        styles={brandSelectStyles}
                        isClearable
                        isSearchable
                        placeholder="Brand"
                        options={BRAND_OPTS}
                        value={brandValue}
                        onChange={(opt) => setBrandID(opt?.value ?? "")}
                      />
                    </li>
                    <li>
                      <button
                        type="button"
                        className="btn btn-icon btn-trigger admin-filter-premium-btn"
                        onClick={load}
                        disabled={loading || !canSearch}
                        title={canSearch ? "Cari" : "Pilih filter dulu"}
                        aria-label="Cari"
                      >
                        <Icon pack="premium" name="pencarian" size={32} />
                      </button>
                    </li>
                    <li>
                      <Button
                        color="light"
                        size="sm"
                        onClick={exportExcel}
                        disabled={!mapped.length}
                      >
                        <Icon name="download" />
                        <span>Export Excel</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <div className="reg-ts-wrap">
            {error ? <div className="reg-ts-msg err">{error}</div> : null}
            {!loaded && !loading && !error ? (
              <div className="reg-ts-empty">Data belum tersedia</div>
            ) : null}
            {loaded && !error && !mapped.length ? (
              <div className="reg-ts-empty">Data belum tersedia</div>
            ) : null}

            {loaded && mapped.length > 0 ? (
              <>
                <div className="reg-ts-totbar">
                  <div className="reg-ts-tot-head">TOTAL (SUMMARY)</div>
                  <div className="reg-ts-scroll">
                    <table className="reg-ts-tot-tbl">
                      <thead>
                        <tr>
                          <th colSpan={2} rowSpan={2}>
                            NO
                          </th>
                          <th className="num" rowSpan={2}>
                            OFFLINE
                          </th>
                          <th className="num" rowSpan={2}>
                            ONLINE
                          </th>
                          <th className="num" rowSpan={2}>
                            TOTAL
                          </th>
                          <th className="grp" colSpan={3}>
                            ONLINE DETAIL
                          </th>
                        </tr>
                        <tr>
                          <th className="num">WHATSAPP</th>
                          <th className="num">TIKTOK</th>
                          <th className="num">INSTAGRAM</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={2} />
                          <td className="num soft">{fmtNum(totals.offline)}</td>
                          <td className="num soft">{fmtNum(totals.online)}</td>
                          <td className="num emph">{fmtNum(totals.total)}</td>
                          <td className="num soft">{fmtNum(totals.wa)}</td>
                          <td className="num soft">{fmtNum(totals.tiktok)}</td>
                          <td className="num soft">{fmtNum(totals.ig)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="reg-ts-table-card">
                  <div className="reg-ts-scroll">
                    <table className="reg-ts-tbl">
                      <thead>
                        <tr>
                          <th rowSpan={2} style={{ width: 60 }}>
                            NO
                          </th>
                          <th rowSpan={2}>STORE</th>
                          <th className="num" rowSpan={2}>
                            OFFLINE
                          </th>
                          <th className="num" rowSpan={2}>
                            ONLINE
                          </th>
                          <th className="num" rowSpan={2}>
                            TOTAL
                          </th>
                          <th className="grp" colSpan={3}>
                            ONLINE DETAIL
                          </th>
                        </tr>
                        <tr>
                          <th className="num">WHATSAPP</th>
                          <th className="num">TIKTOK</th>
                          <th className="num">INSTAGRAM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mapped.map((r) => (
                          <tr key={r.no}>
                            <td className="center">{r.no}</td>
                            <td className="store">{r.store}</td>
                            <td className="num">{fmtNum(r.offline)}</td>
                            <td className="num">{fmtNum(r.online)}</td>
                            <td className="num emph">{fmtNum(r.total)}</td>
                            <td className="num">{fmtNum(r.wa)}</td>
                            <td className="num">{fmtNum(r.tiktok)}</td>
                            <td className="num">{fmtNum(r.ig)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default RegTotalSalesPage;
