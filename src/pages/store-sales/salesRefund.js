import React, { useCallback, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import DatePicker from "../../components/AppDatePicker";
import { Card } from "reactstrap";
import { NumericFormat } from "react-number-format";
import CalendarDateInput from "../../components/CalendarDateInput";
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
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
  PaginationComponent,
  TooltipComponent,
} from "../../components/Component";
import { useStoreScope } from "../../hooks/useStoreScope";
import { storeRefundService } from "../../services/store-refund.service";
import { extractRows, isSuccess } from "../../lib/response";
import RefundDetailModal from "./RefundDetailModal";
import { PageSmoothScroll } from "../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../components/SalesEmptyState";
import { exportStyledXlsx } from "../../lib/exportStyledXlsx";

const REFUND_COLUMNS = [
  { key: "no", label: "NO", size: "sm", className: "refund-col-no" },
  { key: "store", label: "STORE", size: "sm", className: "refund-col-store" },
  { key: "salesNumber", label: "SALES NUMBER", size: "lg", className: "refund-col-sales-number" },
  { key: "date", label: "DATE", size: "md", className: "refund-col-date text-center" },
  { key: "qty", label: "QTY", size: "sm", className: "refund-col-qty text-center" },
  { key: "totalPrice", label: "TOTAL PRICE", size: "md", className: "refund-col-total-price text-end" },
  { key: "action", label: "ACTION", size: "sm", className: "refund-col-action text-end" },
];

const formatDisplayDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = parseISO(raw.length <= 10 ? raw : raw.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "dd/MM/yyyy");
  return raw;
};

const formatNumber = (value) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator=","
    decimalScale={0}
    displayType="text"
    renderText={(text) => text}
  />
);

const mapRefundRow = (row, index) => ({
  id: row?.ID_TR_SALES_REFUND || `${row?.NO_URUT || "row"}-${index}`,
  refundId: row?.ID_TR_SALES_REFUND || "",
  store: row?.ID_STORE || "-",
  salesNumber: row?.ID_TR_SALES_HEADER || "-",
  date: row?.tgl_refund,
  qty: row?.DIST_QTY,
  totalPrice: row?.TOTAL_PRICE,
});

const RefundPage = () => {
  const { storeId, storeName } = useStoreScope();
  const [rows, setRows] = useState([]);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sm, setSm] = useState(true);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(25);
  const [detailModal, setDetailModal] = useState({ open: false, refundId: "", salesNumber: "" });

  const loadData = useCallback(async () => {
    if (!storeId) return;
    const queryFrom = fromDate;
    const queryTo = toDate || fromDate;

    setLoading(true);
    setError("");
    try {
      const res = await storeRefundService.list({
        store_id: storeId,
        from_date: format(queryFrom, "yyyy-MM-dd"),
        to_date: format(queryTo, "yyyy-MM-dd"),
      });

      if (!isSuccess(res)) {
        throw res;
      }

      setRows(extractRows(res));
      setApplied(true);
      setCurrentPage(1);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data refund");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, fromDate, toDate]);

  const tableRows = useMemo(() => rows.map(mapRefundRow), [rows]);

  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentItems = useMemo(() => {
    const slice = tableRows.slice(indexOfFirstItem, indexOfLastItem);
    return slice.map((row, index) => ({
      ...row,
      no: indexOfFirstItem + index + 1,
    }));
  }, [tableRows, indexOfFirstItem, indexOfLastItem]);

  const noColumnWidth = useMemo(() => {
    const digits = tableRows.length > 0 ? String(tableRows.length).length : 2;
    if (digits <= 2) return "3.25rem";
    if (digits === 3) return "3.75rem";
    if (digits === 4) return "4.25rem";
    return "4.75rem";
  }, [tableRows.length]);

  const openDetail = (item) => {
    setDetailModal({
      open: true,
      refundId: item.refundId,
      salesNumber: item.salesNumber,
    });
  };

  const closeDetail = () => {
    setDetailModal({ open: false, refundId: "", salesNumber: "" });
  };

  const renderCell = (item, column) => {
    switch (column.key) {
      case "no":
        return <span className="tb-lead">{item.no}</span>;
      case "store":
        return <span className="tb-lead">{item.store}</span>;
      case "salesNumber":
        return <span className="tb-lead refund-sales-number">{item.salesNumber}</span>;
      case "date":
        return <span>{formatDisplayDate(item.date)}</span>;
      case "qty":
        return <span className="tb-sub">{formatNumber(item.qty)}</span>;
      case "totalPrice":
        return <span className="tb-sub">{formatNumber(item.totalPrice)}</span>;
      case "action":
        return (
          <ul className="nk-tb-actions gx-1 my-n1">
            <li
              className="nk-tb-action-hidden"
              onClick={() => item.refundId && openDetail(item)}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={`refund-detail-${item.id}`}
                icon="edit-alt-fill"
                direction="top"
                text="Detail"
              />
            </li>
          </ul>
        );
      default:
        return null;
    }
  };

  const canExport = applied && tableRows.length > 0 && !loading;

  const exportExcel = useCallback(async () => {
    if (!canExport) return;
    const fileName = `sales-refund-${storeId || "store"}-${format(new Date(), "yyyyMMdd")}`;
    const columns = [
      { key: "store", label: "STORE", width: 12 },
      { key: "salesNumber", label: "SALES NUMBER", width: 22 },
      { key: "date", label: "DATE", width: 14, align: "center" },
      { key: "qty", label: "QTY", width: 10, align: "right", numFmt: "#,##0" },
      { key: "totalPrice", label: "TOTAL PRICE", width: 14, align: "right", numFmt: "#,##0" },
    ];
    const rowsForExport = tableRows.map((row) => ({
      store: row.store || "-",
      salesNumber: row.salesNumber || "-",
      date: formatDisplayDate(row.date),
      qty: Number(row.qty) || 0,
      totalPrice: Number(row.totalPrice) || 0,
    }));
    const totals = rowsForExport.reduce(
      (acc, row) => ({
        qty: acc.qty + (Number(row.qty) || 0),
        totalPrice: acc.totalPrice + (Number(row.totalPrice) || 0),
      }),
      { qty: 0, totalPrice: 0 }
    );
    rowsForExport.push({
      store: "",
      salesNumber: "TOTAL",
      date: "",
      qty: totals.qty,
      totalPrice: totals.totalPrice,
      rowType: "footer",
    });
    await exportStyledXlsx({
      fileName,
      sheetName: "Sales Refund",
      columns,
      rows: rowsForExport,
      getRowStyle: (row) =>
        row.rowType === "footer"
          ? { fill: "FFF7FAFF", font: { bold: true, color: { argb: "FF364A63" } } }
          : null,
    });
  }, [canExport, storeId, tableRows]);

  return (
    <>
      <Head title="Refund" />
      <Content>
        <PageSmoothScroll revision={`${loading ? "loading" : "ready"}-${tableRows.length}-${error || "ok"}`}>
        <BlockHead size="sm">
          <BlockBetween className="page-head-stack">
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Refund
              </BlockTitle>
              <BlockDes className="text-soft">
                <p>
                  Daftar refund store {storeName ? `${storeName} (${storeId})` : storeId || "-"}
                  {applied ? ` ù total ${tableRows.length} transaksi.` : ""}
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
                      <Button color="primary" onClick={loadData} disabled={loading || !storeId}>
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

        <Block className="sales-refund-page" style={{ "--refund-no-col-width": noColumnWidth }}>
          {error ? (
            <div className="text-center py-4">
              <span className="text-danger">{error}</span>
            </div>
          ) : tableRows.length > 0 ? (
          <div className="page-table-scroll">
          <Card className="card-bordered card-full">
            <DataTableBody compact className="border-top" bodyclass="nk-tb-orders">
              <DataTableHead>
                {REFUND_COLUMNS.map((column) => (
                  <DataTableRow key={column.key} size={column.size} className={column.className}>
                    <span>{column.label}</span>
                  </DataTableRow>
                ))}
              </DataTableHead>

              {currentItems.map((item) => (
                    <DataTableItem key={item.id}>
                      {REFUND_COLUMNS.map((column) => (
                        <DataTableRow
                          key={column.key}
                          size={column.size}
                          className={
                            column.key === "action"
                              ? "nk-tb-col-tools"
                              : column.key === "store" || column.key === "salesNumber"
                                ? "nk-tb-orders-type"
                                : column.className
                          }
                        >
                          {renderCell(item, column)}
                        </DataTableRow>
                      ))}
                    </DataTableItem>
                  ))}
            </DataTableBody>

            <div className="card-inner">
              <PaginationComponent
                itemPerPage={itemPerPage}
                totalItems={tableRows.length}
                paginate={setCurrentPage}
                currentPage={currentPage}
              />
            </div>
          </Card>
          </div>
          ) : (
            <SalesEmptyState
              description={
                applied ? (
                  <>Tidak ada data refund untuk filter yang dipilih.</>
                ) : (
                  <>
                    Atur periode, lalu klik <strong>Load</strong> untuk menampilkan laporan.
                  </>
                )
              }
            />
          )}
        </Block>
        </PageSmoothScroll>

        <RefundDetailModal
          isOpen={detailModal.open}
          toggle={closeDetail}
          refundId={detailModal.refundId}
          salesNumber={detailModal.salesNumber}
        />
      </Content>
    </>
  );
};

export default RefundPage;
