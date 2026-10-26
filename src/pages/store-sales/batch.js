import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import DatePicker from "../../components/AppDatePicker";
import CalendarDateInput from "../../components/CalendarDateInput";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
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
import { PageSmoothScroll } from "../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../components/SalesEmptyState";
import { useStoreScope } from "../../hooks/useStoreScope";
import { storeBatchService } from "../../services/store-batch.service";
import { extractRows, isSuccess } from "../../lib/response";
import { buildImageStorageUrl } from "../../lib/imageStorage";
import { exportStyledXlsx } from "../../lib/exportStyledXlsx";

const BATCH_COLUMNS = [
  { key: "no", label: "No.", className: "nk-tb-col-check batch-col-no" },
  { key: "store", label: "Store", size: "sm", className: "batch-col-store" },
  { key: "date", label: "Date", size: "md", className: "batch-col-date" },
  { key: "open", label: "Open", size: "md", className: "batch-col-time text-center" },
  { key: "close", label: "Close", size: "md", className: "batch-col-time text-center" },
  { key: "mandiri", label: "Mandiri", size: "md", className: "batch-col-image text-center" },
  { key: "bni", label: "BNI", size: "md", className: "batch-col-image text-center" },
];

const formatDisplayDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = parseISO(raw.length <= 10 ? raw : raw.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "dd/MM/yyyy");
  return raw;
};

const BatchImageCell = ({ filename, label }) => {
  const url = buildImageStorageUrl(filename);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!url) {
      setStatus("idle");
      return undefined;
    }

    let cancelled = false;
    setStatus("loading");

    const image = new Image();
    image.onload = () => {
      if (!cancelled) setStatus("loaded");
    };
    image.onerror = () => {
      if (!cancelled) setStatus("error");
    };
    image.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url || status !== "loaded") {
    return null;
  }

  return (
    <Zoom zoomMargin={24}>
      <img src={url} alt={label} className="batch-image-thumb" />
    </Zoom>
  );
};

const SalesBatchPage = () => {
  const { storeId, storeName } = useStoreScope();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sm, setSm] = useState(true);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [appliedRange, setAppliedRange] = useState(null);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    const queryFrom = fromDate;
    const queryTo = toDate || fromDate;
    setLoading(true);
    setError("");
    try {
      const res = await storeBatchService.list({
        store_id: storeId,
        from_date: format(queryFrom, "yyyy-MM-dd"),
        to_date: format(queryTo, "yyyy-MM-dd"),
      });
      if (!isSuccess(res)) {
        throw res;
      }
      setRows(extractRows(res));
      setAppliedRange({ from: queryFrom, to: queryTo });
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data batch");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, fromDate, toDate]);

  const tableRows = useMemo(
    () =>
      rows.map((row, index) => ({
        id: row?.No_Urut ?? `${row?.Store_ID || "row"}-${index}`,
        no: index + 1,
        store: row?.Store_ID || "-",
        open: row?.Start_Date || "-",
        close: row?.Closing_Date || "-",
        date: row?.Tgl,
        mandiri: row?.IMAGE_1,
        bni: row?.IMAGE_2,
      })),
    [rows]
  );

  const renderCell = (item, column) => {
    switch (column.key) {
      case "no":
        return <span>{item.no}</span>;
      case "store":
        return <span>{item.store}</span>;
      case "date":
        return <span>{formatDisplayDate(item.date)}</span>;
      case "open":
        return <span>{item.open}</span>;
      case "close":
        return <span>{item.close}</span>;
      case "mandiri":
        return <BatchImageCell filename={item.mandiri} label="Mandiri" />;
      case "bni":
        return <BatchImageCell filename={item.bni} label="BNI" />;
      default:
        return null;
    }
  };

  const canExport = tableRows.length > 0 && !loading;

  const exportExcel = useCallback(async () => {
    if (!canExport) return;
    const fileName = `sales-batch-${storeId || "store"}-${format(new Date(), "yyyyMMdd")}`;
    const columns = [
      { key: "no", label: "No.", width: 8, align: "right" },
      { key: "store", label: "Store", width: 14 },
      { key: "date", label: "Date", width: 14 },
      { key: "open", label: "Open", width: 16, align: "center" },
      { key: "close", label: "Close", width: 16, align: "center" },
    ];
    const rowsForExport = tableRows.map((row) => ({
      no: row.no,
      store: row.store,
      date: formatDisplayDate(row.date),
      open: row.open || "-",
      close: row.close || "-",
    }));
    await exportStyledXlsx({ fileName, sheetName: "Sales Batch", columns, rows: rowsForExport });
  }, [canExport, storeId, tableRows]);

  return (
    <>
      <Head title="Batch" />
      <Content>
        <PageSmoothScroll revision={`${loading ? "loading" : "ready"}-${tableRows.length}`}>
        <BlockHead size="sm">
          <BlockBetween className="page-head-stack">
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Batch
              </BlockTitle>
              <BlockDes className="text-soft">
                <p>
                  Daftar batch store {storeName ? `${storeName} (${storeId})` : storeId || "-"}
                  {appliedRange
                    ? ` — ${format(appliedRange.from, "dd MMM yyyy")} s/d ${format(appliedRange.to, "dd MMM yyyy")}`
                    : ""}
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
                      <div className="sales-filter-range">
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
                          customInput={<CalendarDateInput className="form-control date-picker sales-filter-date" />}
                        />
                        <span className="sales-filter-to">s/d</span>
                        <DatePicker
                          selected={toDate}
                          onChange={setToDate}
                          selectsEnd
                          startDate={fromDate}
                          endDate={toDate}
                          minDate={fromDate}
                          dateFormat="dd MMM yyyy"
                          customInput={<CalendarDateInput className="form-control date-picker sales-filter-date" />}
                        />
                      </div>
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
                        title="Export Excel"
                        aria-label="Export Excel"
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

        <Block className="sales-batch-page">
          {error ? (
            <div className="text-center py-4">
              <span className="text-danger">{error}</span>
            </div>
          ) : tableRows.length > 0 ? (
          <div className="page-table-scroll">
          <DataTable className="card-stretch">
            <DataTableBody compact>
              <DataTableHead>
                {BATCH_COLUMNS.map((column) => (
                  <DataTableRow key={column.key} size={column.size} className={column.className}>
                    <span className="sub-text">{column.label}</span>
                  </DataTableRow>
                ))}
              </DataTableHead>

              {tableRows.map((item) => (
                    <DataTableItem key={item.id}>
                      {BATCH_COLUMNS.map((column) => (
                        <DataTableRow key={column.key} size={column.size} className={column.className}>
                          {renderCell(item, column)}
                        </DataTableRow>
                      ))}
                    </DataTableItem>
                  ))}
            </DataTableBody>
          </DataTable>
          </div>
          ) : (
            <SalesEmptyState
              description={
                appliedRange ? (
                  <>Tidak ada data batch untuk filter yang dipilih.</>
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

export default SalesBatchPage;
