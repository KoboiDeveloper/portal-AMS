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
  Button,
  Icon,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { createRegionalService } from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-sales-detail.css";
import "./reg-payment-detail.css";
import "./reg-inv-report.css";
import "./reg-print-outstanding.css";

/** Legacy module/Rpt/InvStockOut.aspx — Outstanding Stock (Detail + Summary, no filters) */
const svc = createRegionalService("util/print-outstanding", { crud: false });

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));
const PAGE_SIZE = 50;

/** Display short brand — CELCIUS WOMAN - TIKTOK → RCW - TIKTOK */
const shortBrandLabel = (v) =>
  String(v ?? "").replace(/CELCIUS\s+WOMAN/gi, "RCW").trim();

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const toSortable = (value) => {
  if (value == null || value === "") return { kind: "empty", raw: "" };
  if (typeof value === "number" && Number.isFinite(value)) return { kind: "num", raw: value };
  const s = String(value).trim();
  const asId = s.replace(/\./g, "").replace(/,/g, "");
  if (asId !== "" && /^-?\d+(\.\d+)?$/.test(asId)) {
    const n = Number(asId);
    if (Number.isFinite(n)) return { kind: "num", raw: n };
  }
  return { kind: "str", raw: s.toLowerCase() };
};

const compareRows = (a, b, key, direction) => {
  const left = toSortable(cell(a, key));
  const right = toSortable(cell(b, key));
  let cmp = 0;
  if (left.kind === "empty" && right.kind !== "empty") cmp = 1;
  else if (right.kind === "empty" && left.kind !== "empty") cmp = -1;
  else if (left.kind === "num" && right.kind === "num") cmp = left.raw - right.raw;
  else cmp = String(left.raw).localeCompare(String(right.raw), "id", { numeric: true, sensitivity: "base" });
  return direction === "desc" ? -cmp : cmp;
};

const sumCols = (rows, keys) => {
  const out = {};
  keys.forEach((k) => {
    out[k] = 0;
  });
  rows.forEach((r) => {
    keys.forEach((k) => {
      out[k] += Number(cell(r, k) || 0);
    });
  });
  return out;
};

const exportSheet = async (sheetName, headers, rows, fileName) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(headers.map((h) => h.label));
  rows.forEach((r, i) => {
    ws.addRow(headers.map((h) => (h.key === "_no" ? i + 1 : cell(r, h.key))));
  });
  ws.getRow(1).font = { bold: true };
  const buffer = await wb.xlsx.writeBuffer();
  saveXlsxFile(buffer, fileName);
};

const DETAIL_COLS = [
  { key: "PENGIRIM", label: "PENGIRIM", cls: "ctr" },
  { key: "PENERIMA", label: "PENERIMA", cls: "ctr" },
  { key: "PLU", label: "PLU", cls: "ctr" },
  { key: "QTY", label: "QTY", cls: "num", num: true },
  { key: "HPP", label: "HPP", cls: "num", num: true },
  { key: "PRICE", label: "PRICE", cls: "num", num: true },
];

const SUMMARY_COLS = [
  { key: "PENGIRIM", label: "PENGIRIM", cls: "ctr", short: true },
  { key: "PENERIMA", label: "PENERIMA", cls: "ctr", short: true },
  { key: "DEPT", label: "DEPT", cls: "ctr" },
  { key: "QTY", label: "QTY", cls: "num", num: true },
  { key: "HPP", label: "HPP", cls: "num", num: true },
  { key: "PRICE", label: "PRICE", cls: "num", num: true },
];

const DETAIL_HEADERS = [{ key: "_no", label: "NO" }, ...DETAIL_COLS.map((c) => ({ key: c.key, label: c.label }))];
const SUMMARY_HEADERS = [{ key: "_no", label: "NO" }, ...SUMMARY_COLS.map((c) => ({ key: c.key, label: c.label }))];

const pageSlice = (rows, page) => {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return {
    totalPages,
    safePage,
    start,
    shown: rows.slice(start, start + PAGE_SIZE),
  };
};

const Pager = ({ total, page, onPage }) => {
  if (total <= PAGE_SIZE) return null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, total);
  return (
    <div className="rpo-pager">
      <span className="rpo-pager-info">
        {from.toLocaleString("id-ID")}–{to.toLocaleString("id-ID")} dari {total.toLocaleString("id-ID")} · Halaman{" "}
        {safePage}/{totalPages}
      </span>
      <div className="rpo-pager-btns">
        <button
          type="button"
          className="rpo-pager-btn"
          disabled={safePage <= 1}
          onClick={() => onPage(Math.max(1, safePage - 1))}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          className="rpo-pager-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPage(Math.min(totalPages, safePage + 1))}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
};

const SortTh = ({ col, sortConfig, onSort }) => (
  <th className={col.cls || ""}>
    <button type="button" className="rpd-sort" onClick={() => onSort(col.key)}>
      <span>{col.label}</span>
      <Icon
        name={
          sortConfig.key !== col.key ? "unsorted" : sortConfig.direction === "asc" ? "arrow-up" : "arrow-down"
        }
      />
    </button>
  </th>
);

const RegPrintOutstandingPage = () => {
  const detailTableRef = useRef(null);
  const summaryTableRef = useRef(null);

  const [detailRows, setDetailRows] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [detailSort, setDetailSort] = useState({ key: "", direction: "asc" });
  const [summarySort, setSummarySort] = useState({ key: "", direction: "asc" });
  const [exporting, setExporting] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [detRes, sumRes] = await Promise.all([
        svc.list({ tipe: "detail" }),
        svc.list({ tipe: "summary" }),
      ]);
      if (!isSuccess(detRes)) {
        setError(detRes?.responseMessage || "Gagal memuat detail");
        setDetailRows([]);
        setSummaryRows([]);
        setLoaded(false);
        return;
      }
      if (!isSuccess(sumRes)) {
        setError(sumRes?.responseMessage || "Gagal memuat summary");
        setDetailRows([]);
        setSummaryRows([]);
        setLoaded(false);
        return;
      }
      setDetailRows(extractRows(detRes));
      setSummaryRows(extractRows(sumRes));
      setDetailPage(1);
      setSummaryPage(1);
      setDetailSort({ key: "", direction: "asc" });
      setSummarySort({ key: "", direction: "asc" });
      setLoaded(true);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setDetailRows([]);
      setSummaryRows([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedDetail = useMemo(() => {
    if (!detailSort.key) return detailRows;
    const next = [...detailRows];
    next.sort((a, b) => compareRows(a, b, detailSort.key, detailSort.direction));
    return next;
  }, [detailRows, detailSort]);

  const sortedSummary = useMemo(() => {
    if (!summarySort.key) return summaryRows;
    const next = [...summaryRows];
    next.sort((a, b) => compareRows(a, b, summarySort.key, summarySort.direction));
    return next;
  }, [summaryRows, summarySort]);

  const detailPager = useMemo(() => pageSlice(sortedDetail, detailPage), [sortedDetail, detailPage]);
  const summaryPager = useMemo(() => pageSlice(sortedSummary, summaryPage), [sortedSummary, summaryPage]);
  const detailFooter = useMemo(() => sumCols(detailRows, ["QTY", "HPP", "PRICE"]), [detailRows]);
  const summaryFooter = useMemo(() => sumCols(summaryRows, ["QTY", "HPP", "PRICE"]), [summaryRows]);

  const handleDetailSort = (key) => {
    setDetailSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setDetailPage(1);
  };

  const handleSummarySort = (key) => {
    setSummarySort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setSummaryPage(1);
  };

  const onExportDetail = useCallback(async () => {
    if (!sortedDetail.length) return;
    setExporting("detail");
    try {
      await exportSheet("DETAIL", DETAIL_HEADERS, sortedDetail, `Outstanding_Stock_Detail_${Date.now()}.xlsx`);
    } finally {
      setExporting("");
    }
  }, [sortedDetail]);

  const onExportSummary = useCallback(async () => {
    if (!sortedSummary.length) return;
    setExporting("summary");
    try {
      const rows = sortedSummary.map((r) => ({
        ...r,
        PENGIRIM: shortBrandLabel(cell(r, "PENGIRIM")),
        PENERIMA: shortBrandLabel(cell(r, "PENERIMA")),
      }));
      await exportSheet("SUMMARY", SUMMARY_HEADERS, rows, `Outstanding_Stock_Summary_${Date.now()}.xlsx`);
    } finally {
      setExporting("");
    }
  }, [sortedSummary]);

  const scrollRevision = `${loading ? "loading" : "ready"}-${sortedDetail.length}-${sortedSummary.length}-${detailPager.safePage}-${summaryPager.safePage}-${detailSort.key}-${detailSort.direction}-${summarySort.key}-${summarySort.direction}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_PRINT_OUTSTANDING">
      <Head title="Outstanding Stock Print" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rpo-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Outstanding Stock
                </BlockTitle>
                <BlockDes className="text-soft">
                  {loaded
                    ? `Detail ${detailRows.length} · Summary ${summaryRows.length}`
                    : "ST outstanding belum realisasi (InvStockOut)"}
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <ul className="nk-block-tools g-3">
                  <li>
                    <Button
                      color="light"
                      className="btn-white btn-dim btn-sm"
                      onClick={loadData}
                      disabled={loading}
                    >
                      <Icon name="reload" />
                      <span>{loading ? "Memuat..." : "Refresh"}</span>
                    </Button>
                  </li>
                </ul>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
            {loading && !loaded ? <div className="text-soft small mb-2">Memuat data...</div> : null}

            <div className="rpo-split">
              <div className="rpo-pane">
                <div className="rpo-pane-head">
                  <Button
                    color="light"
                    className="btn-white btn-dim btn-sm"
                    onClick={onExportDetail}
                    disabled={!detailRows.length || exporting === "detail"}
                  >
                    <Icon name="download" />
                    <span>{exporting === "detail" ? "Export..." : "Export To Excel"}</span>
                  </Button>
                  <strong className="rpo-pane-title">DETAIL</strong>
                </div>
                {loaded && !detailRows.length ? (
                  <div className="reg-rpt-empty">There Is No Data</div>
                ) : null}
                {detailRows.length > 0 ? (
                  <>
                    <div className="rpo-total-card">
                      <div className="rpo-total-card__item">
                        <span className="rpo-total-card__label">Total QTY</span>
                        <strong className="rpo-total-card__value">{fmtNum(detailFooter.QTY)}</strong>
                      </div>
                      <div className="rpo-total-card__item">
                        <span className="rpo-total-card__label">Total HPP</span>
                        <strong className="rpo-total-card__value">{fmtNum(detailFooter.HPP)}</strong>
                      </div>
                      <div className="rpo-total-card__item">
                        <span className="rpo-total-card__label">Total PRICE</span>
                        <strong className="rpo-total-card__value">{fmtNum(detailFooter.PRICE)}</strong>
                      </div>
                    </div>
                    <div className="riv-table-wrap rpo-table-wrap">
                      <table
                        ref={detailTableRef}
                        className="riv-table riv-table--rpo riv-table--rpo-detail"
                      >
                        <thead>
                          <tr>
                            <th className="rds-no">NO</th>
                            {DETAIL_COLS.map((c) => (
                              <SortTh key={c.key} col={c} sortConfig={detailSort} onSort={handleDetailSort} />
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detailPager.shown.map((r, i) => (
                            <tr
                              key={`d-${cell(r, "PENGIRIM")}-${cell(r, "PENERIMA")}-${cell(r, "PLU")}-${detailPager.start + i}`}
                            >
                              <td className="rds-no">{detailPager.start + i + 1}</td>
                              <td className="ctr">{cell(r, "PENGIRIM")}</td>
                              <td className="ctr">{cell(r, "PENERIMA")}</td>
                              <td className="ctr">{cell(r, "PLU")}</td>
                              <td className="num">{fmtNum(cell(r, "QTY"))}</td>
                              <td className="num">{fmtNum(cell(r, "HPP"))}</td>
                              <td className="num">{fmtNum(cell(r, "PRICE"))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <RivStickyThead
                      tableRef={detailTableRef}
                      enabled={Boolean(loaded && sortedDetail.length)}
                      tableClassName="riv-table riv-table--rpo riv-table--rpo-detail"
                    />
                    <Pager total={sortedDetail.length} page={detailPager.safePage} onPage={setDetailPage} />
                  </>
                ) : null}
              </div>

              <div className="rpo-pane">
                <div className="rpo-pane-head">
                  <Button
                    color="light"
                    className="btn-white btn-dim btn-sm"
                    onClick={onExportSummary}
                    disabled={!summaryRows.length || exporting === "summary"}
                  >
                    <Icon name="download" />
                    <span>{exporting === "summary" ? "Export..." : "Export To Excel"}</span>
                  </Button>
                  <strong className="rpo-pane-title">SUMMARY</strong>
                </div>
                {loaded && !summaryRows.length ? (
                  <div className="reg-rpt-empty">There Is No Data</div>
                ) : null}
                {summaryRows.length > 0 ? (
                  <>
                    <div className="rpo-total-card">
                      <div className="rpo-total-card__item">
                        <span className="rpo-total-card__label">Total QTY</span>
                        <strong className="rpo-total-card__value">{fmtNum(summaryFooter.QTY)}</strong>
                      </div>
                      <div className="rpo-total-card__item">
                        <span className="rpo-total-card__label">Total HPP</span>
                        <strong className="rpo-total-card__value">{fmtNum(summaryFooter.HPP)}</strong>
                      </div>
                      <div className="rpo-total-card__item">
                        <span className="rpo-total-card__label">Total PRICE</span>
                        <strong className="rpo-total-card__value">{fmtNum(summaryFooter.PRICE)}</strong>
                      </div>
                    </div>
                    <div className="riv-table-wrap rpo-table-wrap">
                      <table
                        ref={summaryTableRef}
                        className="riv-table riv-table--rpo riv-table--rpo-summary"
                      >
                        <thead>
                          <tr>
                            <th className="rds-no">NO</th>
                            {SUMMARY_COLS.map((c) => (
                              <SortTh key={c.key} col={c} sortConfig={summarySort} onSort={handleSummarySort} />
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {summaryPager.shown.map((r, i) => (
                            <tr
                              key={`s-${cell(r, "PENGIRIM")}-${cell(r, "PENERIMA")}-${cell(r, "DEPT")}-${summaryPager.start + i}`}
                            >
                              <td className="rds-no">{summaryPager.start + i + 1}</td>
                              <td className="ctr">{shortBrandLabel(cell(r, "PENGIRIM"))}</td>
                              <td className="ctr">{shortBrandLabel(cell(r, "PENERIMA"))}</td>
                              <td className="ctr">{cell(r, "DEPT")}</td>
                              <td className="num">{fmtNum(cell(r, "QTY"))}</td>
                              <td className="num">{fmtNum(cell(r, "HPP"))}</td>
                              <td className="num">{fmtNum(cell(r, "PRICE"))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <RivStickyThead
                      tableRef={summaryTableRef}
                      enabled={Boolean(loaded && sortedSummary.length)}
                      tableClassName="riv-table riv-table--rpo riv-table--rpo-summary"
                    />
                    <Pager total={sortedSummary.length} page={summaryPager.safePage} onPage={setSummaryPage} />
                  </>
                ) : null}
              </div>
            </div>
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegPrintOutstandingPage;
