import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import DatePicker from "../../components/AppDatePicker";
import { NumericFormat } from "react-number-format";
import Content from "../../layout/content/Content";
import Head from "../../layout/head/Head";
import CalendarDateInput from "../../components/CalendarDateInput";
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
import { extractRows, isSuccess } from "../../lib/response";
import { storeSalesDcrDetailService } from "../../services/store-sales-dcr-detail.service";
import { PageSmoothScroll } from "../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../components/SalesEmptyState";
import { exportStyledXlsx } from "../../lib/exportStyledXlsx";
import "./daily-sales-summary.css";

const GROUP_BY_OPTIONS = [
  { value: "plu", label: "By PLU" },
  { value: "class", label: "By Class" },
  { value: "dept", label: "By Dept" },
];

const VIEW_MODE_OPTIONS = [
  { value: "detail", label: "Detail" },
  { value: "total", label: "Total" },
];

const toDateKey = (value) => {
  if (!value) return "";
  if (value instanceof Date && isValid(value)) return format(value, "yyyy-MM-dd");
  const raw = String(value).trim();
  if (!raw) return "";
  const first = raw.split(",")[0].trim();
  const parsed = parseISO(first.length <= 10 ? first : first.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  return first.slice(0, 10);
};

const formatDisplayDate = (value) => {
  const key = toDateKey(value);
  if (!key) return "—";
  const parsed = parseISO(key);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy") : key;
};

const isApiOk = (res) => {
  const code = String(res?.responseCode ?? "");
  return isSuccess(res) || code === "00" || code === "2000000";
};

const isNotFoundResponse = (res) => {
  const code = String(res?.responseCode ?? "");
  const msg = String(res?.responseMessage ?? "").toLowerCase();
  return (
    code === "01" ||
    code === "4040000" ||
    code === "4042500" ||
    msg.includes("tidak ditemukan") ||
    msg.includes("not found") ||
    msg.includes("tidak ada")
  );
};

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** PLU key by filter: full | left 3 (class) | left 1 (dept) */
const pluGroupKey = (plu, groupBy) => {
  const value = String(plu ?? "").trim();
  if (!value) return "—";
  if (groupBy === "class") return value.slice(0, 3) || "—";
  if (groupBy === "dept") return value.slice(0, 1) || "—";
  return value;
};

const COLUMNS_BASE = [
  { key: "no", label: "No", size: "sm", className: "dss-col-no" },
  { key: "store", label: "Store", size: "sm", className: "dss-col-store" },
  { key: "date", label: "Date", size: "md", className: "dss-col-date", sortable: true },
  { key: "plu", label: "PLU", size: "md", className: "dss-col-plu", sortable: true },
  { key: "price", label: "Price", size: "md", className: "dss-col-num text-end", sortable: true },
  { key: "qty", label: "Qty", size: "sm", className: "dss-col-num text-end", sortable: true },
  { key: "sales", label: "Gross Sales", size: "md", className: "dss-col-num text-end", sortable: true },
  { key: "discount", label: "Discount", size: "md", className: "dss-col-num text-end", sortable: true },
  { key: "pp", label: "Price Point", size: "md", className: "dss-col-num text-end", sortable: true },
  { key: "netSales", label: "Net Sales", size: "md", className: "dss-col-num text-end", sortable: true },
];

const getSortIcon = (key, sortConfig) => {
  if (sortConfig.key !== key) return "sort-v";
  return sortConfig.direction === "asc" ? "sort-up-fill" : "sort-down-fill";
};

const compareField = (a, b, key) => {
  if (key === "plu" || key === "store" || key === "date") {
    const left = key === "date" ? a.tanggal : key === "store" ? a.storeId : a.plu;
    const right = key === "date" ? b.tanggal : key === "store" ? b.storeId : b.plu;
    return String(left || "").localeCompare(String(right || ""), undefined, { numeric: true });
  }
  return toNum(a[key]) - toNum(b[key]);
};

const compareSummaryRows = (a, b, key, direction) => {
  const mul = direction === "asc" ? 1 : -1;
  return compareField(a, b, key) * mul;
};

/** Keep store+date groups contiguous; date orders groups, other keys sort inside each group. */
const sortDetailGroupedRows = (rows, sortConfig) => {
  const groups = new Map();
  rows.forEach((row) => {
    const key = `${row.storeId}|${row.tanggal}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  const dateDir = sortConfig.key === "date" ? sortConfig.direction : "desc";
  const innerKey = sortConfig.key && sortConfig.key !== "date" ? sortConfig.key : "plu";
  const innerDir = sortConfig.key && sortConfig.key !== "date" ? sortConfig.direction : "asc";

  const ordered = Array.from(groups.values())
    .map((items) => [...items].sort((a, b) => compareSummaryRows(a, b, innerKey, innerDir)))
    .sort((a, b) => {
      const byDate = compareSummaryRows(a[0], b[0], "date", dateDir);
      if (byDate !== 0) return byDate;
      return compareField(a[0], b[0], "store");
    });

  let groupNo = 0;
  return ordered.flatMap((items) => {
    groupNo += 1;
    return items.map((row, idx) => ({
      ...row,
      isGroupStart: idx === 0,
      groupNo,
    }));
  });
};

const Money = ({ value }) => (
  <NumericFormat
    value={toNum(value)}
    thousandSeparator="."
    decimalSeparator=","
    displayType="text"
    renderText={(v) => <span>{v}</span>}
  />
);

/**
 * Aggregate API rows for table display.
 * - total: group by store + pluKey (no date), sum
 * - detail + multi date: group by store + date + pluKey, sum, show date
 * - detail + single date: group by store + date + pluKey (still sum dupes)
 */
const buildSummaryRows = (rows, { groupBy, viewMode, multiDate }) => {
  const map = new Map();

  rows.forEach((row) => {
    const storeId = String(row?.storeId ?? row?.store_id ?? "").trim() || "—";
    const tanggal = toDateKey(row?.tanggal ?? row?.date);
    const plu = pluGroupKey(row?.plu, groupBy);
    const includeDate = viewMode === "detail";
    const key = includeDate ? `${storeId}|${tanggal}|${plu}` : `${storeId}|${plu}`;

    const prev = map.get(key) || {
      storeId,
      tanggal: includeDate ? tanggal : "",
      plu,
      price: toNum(row?.price),
      qty: 0,
      sales: 0,
      discount: 0,
      pp: 0,
      netSales: 0,
      priceSet: new Set(),
    };

    prev.qty += toNum(row?.qty);
    prev.sales += toNum(row?.sales);
    prev.discount += toNum(row?.discount);
    prev.pp += toNum(row?.pp);
    prev.netSales += toNum(row?.netSales);
    prev.priceSet.add(toNum(row?.price));
    map.set(key, prev);
  });

  const list = Array.from(map.values()).map((item) => {
    const prices = Array.from(item.priceSet);
    const samePrice = prices.length === 1;
    return {
      storeId: item.storeId,
      tanggal: item.tanggal,
      plu: item.plu,
      price: samePrice ? prices[0] : 0,
      qty: item.qty,
      sales: item.sales,
      discount: item.discount,
      pp: item.pp,
      netSales: item.netSales,
      showDate: viewMode === "detail" && (multiDate || Boolean(item.tanggal)),
    };
  });

  list.sort((a, b) => {
    const d = String(b.tanggal).localeCompare(String(a.tanggal));
    if (d !== 0) return d;
    const s = String(a.storeId).localeCompare(String(b.storeId));
    if (s !== 0) return s;
    return String(a.plu).localeCompare(String(b.plu), undefined, { numeric: true });
  });

  return list;
};

const DailySalesSummary = () => {
  const { storeId } = useStoreScope();
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [groupBy, setGroupBy] = useState("plu");
  const [viewMode, setViewMode] = useState("detail");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });

  const fromKey = toDateKey(fromDate);
  const toKey = toDateKey(toDate || fromDate);
  const multiDate = Boolean(fromKey && toKey && fromKey !== toKey);

  const loadData = useCallback(async () => {
    if (!storeId || !fromKey) return;
    setLoading(true);
    setError("");
    try {
      const res = await storeSalesDcrDetailService.list({
        from_date: fromKey,
        to_date: toKey || fromKey,
        store_id: storeId,
      });
      if (isApiOk(res)) {
        setRawRows(extractRows(res));
        setLoaded(true);
        return;
      }
      if (isNotFoundResponse(res)) {
        setRawRows([]);
        setLoaded(true);
        return;
      }
      setRawRows([]);
      setLoaded(true);
      setError(res?.responseMessage || "Gagal memuat daily sales summary");
    } catch (err) {
      setRawRows([]);
      setLoaded(true);
      setError(err?.responseMessage || err?.message || "Gagal memuat daily sales summary");
    } finally {
      setLoading(false);
    }
  }, [storeId, fromKey, toKey]);

  useEffect(() => {
    setRawRows([]);
    setError("");
    setLoaded(false);
  }, [storeId]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: key === "date" ? "desc" : "asc" };
    });
  }, []);

  useEffect(() => {
    if (viewMode === "detail") {
      setSortConfig({ key: "date", direction: "desc" });
      return;
    }
    setSortConfig((prev) => (prev.key === "date" ? { key: "plu", direction: "asc" } : prev));
  }, [viewMode]);

  const tableRows = useMemo(() => {
    const rows = buildSummaryRows(rawRows, {
      groupBy,
      viewMode,
      multiDate,
    });

    if (viewMode === "detail") {
      return sortDetailGroupedRows(rows, sortConfig.key ? sortConfig : { key: "date", direction: "desc" });
    }

    if (!sortConfig.key || sortConfig.key === "date") {
      return [...rows].sort((a, b) => compareSummaryRows(a, b, "plu", "asc"));
    }
    return [...rows].sort((a, b) => compareSummaryRows(a, b, sortConfig.key, sortConfig.direction));
  }, [rawRows, groupBy, viewMode, multiDate, sortConfig]);

  const totals = useMemo(
    () =>
      tableRows.reduce(
        (acc, row) => {
          acc.qty += toNum(row.qty);
          acc.sales += toNum(row.sales);
          acc.discount += toNum(row.discount);
          acc.pp += toNum(row.pp);
          acc.netSales += toNum(row.netSales);
          return acc;
        },
        { qty: 0, sales: 0, discount: 0, pp: 0, netSales: 0 }
      ),
    [tableRows]
  );

  const showDateCol = viewMode === "detail";

  const pluColumnLabel = groupBy === "class" ? "Class" : groupBy === "dept" ? "Dept" : "PLU";

  const columns = useMemo(() => {
    const base = showDateCol ? COLUMNS_BASE : COLUMNS_BASE.filter((c) => c.key !== "date");
    return base.map((column) => (column.key === "plu" ? { ...column, label: pluColumnLabel } : column));
  }, [showDateCol, pluColumnLabel]);

  const renderHeader = (column) => {
    if (!column.sortable) {
      return <span className="sub-text">{column.label}</span>;
    }

    const isActive = sortConfig.key === column.key;
    const isEnd = column.className?.includes("text-end");

    return (
      <button
        type="button"
        className={`dss-sort-trigger${isActive ? " is-active" : ""}${isEnd ? " is-end" : ""}`}
        onClick={() => handleSort(column.key)}
      >
        <span className="sub-text">{column.label}</span>
        <Icon name={getSortIcon(column.key, sortConfig)} />
      </button>
    );
  };

  const renderCell = (row, column, idx) => {
    const hideGrouped = viewMode === "detail" && !row.isGroupStart;

    switch (column.key) {
      case "no":
        if (hideGrouped) return null;
        return <span>{row.groupNo ?? idx + 1}</span>;
      case "store":
        if (hideGrouped) return null;
        return <span>{row.storeId}</span>;
      case "date":
        if (hideGrouped) return null;
        return <span>{row.showDate ? row.tanggal || "—" : "—"}</span>;
      case "plu":
        return <span className="dss-plu">{row.plu}</span>;
      case "price":
        return <Money value={row.price} />;
      case "qty":
        return <Money value={row.qty} />;
      case "sales":
        return <Money value={row.sales} />;
      case "discount":
        return <Money value={row.discount} />;
      case "pp":
        return <Money value={row.pp} />;
      case "netSales":
        return (
          <strong>
            <Money value={row.netSales} />
          </strong>
        );
      default:
        return null;
    }
  };

  const renderTotalCell = (column) => {
    switch (column.key) {
      case "store":
        return <strong>Total</strong>;
      case "qty":
        return (
          <strong>
            <Money value={totals.qty} />
          </strong>
        );
      case "sales":
        return (
          <strong>
            <Money value={totals.sales} />
          </strong>
        );
      case "discount":
        return (
          <strong>
            <Money value={totals.discount} />
          </strong>
        );
      case "pp":
        return (
          <strong>
            <Money value={totals.pp} />
          </strong>
        );
      case "netSales":
        return (
          <strong>
            <Money value={totals.netSales} />
          </strong>
        );
      default:
        return <span />;
    }
  };

  const canExport = loaded && tableRows.length > 0 && !loading;

  const exportExcel = useCallback(async () => {
    if (!canExport) return;
    const pluLabel = groupBy === "class" ? "Class" : groupBy === "dept" ? "Dept" : "PLU";
    const columns = [
      { key: "no", label: "No", width: 8, align: "right" },
      { key: "store", label: "Store", width: 12 },
      ...(showDateCol ? [{ key: "date", label: "Date", width: 14 }] : []),
      { key: "plu", label: pluLabel, width: 18 },
      { key: "price", label: "Price", width: 14, align: "right" },
      { key: "qty", label: "Qty", width: 10, align: "right" },
      { key: "sales", label: "Gross Sales", width: 14, align: "right" },
      { key: "discount", label: "Discount", width: 12, align: "right" },
      { key: "pp", label: "Price Point", width: 12, align: "right" },
      { key: "netSales", label: "Net Sales", width: 14, align: "right" },
    ];
    const rowsForExport = tableRows.map((row, idx) => ({
      no: row.groupNo ?? idx + 1,
      store: row.storeId,
      date: row.tanggal || "",
      plu: row.plu,
      price: row.price,
      qty: row.qty,
      sales: row.sales,
      discount: row.discount,
      pp: row.pp,
      netSales: row.netSales,
    }));
    await exportStyledXlsx({
      fileName: `daily-sales-summary-${storeId || "store"}-${fromKey || "date"}`,
      sheetName: "Daily Sales Summary",
      columns,
      rows: rowsForExport,
    });
  }, [canExport, groupBy, showDateCol, tableRows, storeId, fromKey]);

  return (
    <React.Fragment>
      <Head title="Daily Sales Summary" />
      <Content>
        <PageSmoothScroll
          revision={`${loading ? "loading" : "ready"}-${tableRows.length}-${viewMode}-${groupBy}-${error || "ok"}`}
        >
          <div className="dss-page">
          <BlockHead size="sm" className="dss-head">
            <BlockBetween className="dss-head-between page-head-stack">
              <BlockHeadContent className="dss-head-title">
                <BlockTitle page tag="h3">
                  Daily Sales Summary
                </BlockTitle>
                <BlockDes className="text-soft">
                  <p>Ringkasan penjualan harian by PLU / Class / Dept</p>
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent className="dss-head-filters">
                <div className="dss-filter">
                  <div className="dss-filter-range">
                    <DatePicker
                      selected={fromDate}
                      onChange={(d) => {
                        setFromDate(d);
                        if (toDate && d && toDate < d) setToDate(d);
                      }}
                      selectsStart
                      startDate={fromDate}
                      endDate={toDate}
                      dateFormat="dd MMM yyyy"
                      customInput={<CalendarDateInput className="form-control date-picker dss-filter-date" />}
                    />
                    <span className="dss-filter-to">s/d</span>
                    <DatePicker
                      selected={toDate}
                      onChange={(d) => setToDate(d)}
                      selectsEnd
                      startDate={fromDate}
                      endDate={toDate}
                      minDate={fromDate}
                      dateFormat="dd MMM yyyy"
                      customInput={<CalendarDateInput className="form-control date-picker dss-filter-date" />}
                    />
                  </div>
                  <select
                    className="form-select dss-filter-select"
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    aria-label="Group by"
                  >
                    {GROUP_BY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="form-select dss-filter-select"
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    aria-label="View mode"
                  >
                    {VIEW_MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    color="primary"
                    className="dss-filter-load"
                    onClick={loadData}
                    disabled={loading || !storeId}
                  >
                    <Icon name="search" />
                    <span>Load</span>
                  </Button>
                  <Button
                    color="primary"
                    outline
                    className="btn-icon"
                    onClick={exportExcel}
                    disabled={!canExport}
                    title="Export Excel"
                    aria-label="Export Excel"
                  >
                    <Icon name="download-cloud" />
                  </Button>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="dss-toolbar">
              <div className="dss-store-badge">
                <Icon name="building" />
                <div>
                  <span className="dss-badge-label">Store</span>
                  <strong>{storeId || "—"}</strong>
                </div>
              </div>
              <div className="dss-period-badge dss-mobile-hide">
                <Icon name="calender-date" />
                <div>
                  <span className="dss-badge-label">Periode</span>
                  <strong>
                    {fromKey === toKey
                      ? formatDisplayDate(fromKey)
                      : `${formatDisplayDate(fromKey)} – ${formatDisplayDate(toKey)}`}
                  </strong>
                </div>
              </div>
              <div className="dss-period-badge dss-mobile-hide">
                <Icon name="list" />
                <div>
                  <span className="dss-badge-label">Mode</span>
                  <strong>
                    {GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label} ·{" "}
                    {VIEW_MODE_OPTIONS.find((o) => o.value === viewMode)?.label}
                  </strong>
                </div>
              </div>
            </div>

            {error ? (
              <div className="dss-empty is-error">
                <Icon name="alert-circle" />
                <h5>Gagal memuat data</h5>
                <p>{error}</p>
                <Button color="primary" outline onClick={loadData} disabled={loading}>
                  Coba lagi
                </Button>
              </div>
            ) : null}

            {!error && loaded && tableRows.length > 0 ? (
              <div className="dss-table-scroll page-table-scroll">
                <DataTable className="card-stretch dss-table">
                  <DataTableBody compact>
                    <DataTableHead>
                      {columns.map((column) => (
                        <DataTableRow key={column.key} size={column.size} className={column.className}>
                          {renderHeader(column)}
                        </DataTableRow>
                      ))}
                    </DataTableHead>

                    {tableRows.map((row, idx) => (
                          <DataTableItem
                            key={`${row.storeId}-${row.tanggal}-${row.plu}-${idx}`}
                            className={
                              viewMode === "detail"
                                ? row.isGroupStart
                                  ? "dss-group-start"
                                  : "dss-group-cont"
                                : undefined
                            }
                          >
                            {columns.map((column) => (
                              <DataTableRow
                                key={column.key}
                                size={column.size}
                                className={`${column.className || ""}${
                                  viewMode === "detail" &&
                                  !row.isGroupStart &&
                                  (column.key === "no" || column.key === "store" || column.key === "date")
                                    ? " dss-cell-merged"
                                    : ""
                                }`}
                              >
                                {renderCell(row, column, idx)}
                              </DataTableRow>
                            ))}
                          </DataTableItem>
                        ))}

                    <DataTableItem className="dss-total-row">
                      {columns.map((column) => (
                        <DataTableRow key={`total-${column.key}`} size={column.size} className={column.className}>
                          {renderTotalCell(column)}
                        </DataTableRow>
                      ))}
                    </DataTableItem>
                  </DataTableBody>
                </DataTable>
              </div>
            ) : null}

            {!error && (!loaded || tableRows.length === 0) ? (
              <SalesEmptyState
                description={
                  loaded ? (
                    <>Tidak ada data untuk filter yang dipilih.</>
                  ) : (
                    <>
                      Pilih tanggal & filter, lalu klik <strong>Load</strong> untuk menampilkan laporan.
                    </>
                  )
                }
              />
            ) : null}
          </Block>
          </div>
        </PageSmoothScroll>
      </Content>
    </React.Fragment>
  );
};

export default DailySalesSummary;
