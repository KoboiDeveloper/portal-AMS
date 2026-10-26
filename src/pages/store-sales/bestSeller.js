import React, { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import DatePicker from "../../components/AppDatePicker";
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
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
  PaginationComponent,
} from "../../components/Component";
import { useStoreScope } from "../../hooks/useStoreScope";
import { storeBestsellerService } from "../../services/store-bestseller.service";
import { extractRows, isSuccess } from "../../lib/response";
import { exportStyledXlsx } from "../../lib/exportStyledXlsx";
import { PageSmoothScroll } from "../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../components/SalesEmptyState";

const TABS = [
  { id: "instore", label: "In Store" },
  { id: "allstore", label: "All Store" },
];

const INSTORE_COLUMNS = [
  { key: "no", label: "No", className: "bestseller-col-no" },
  { key: "plu", label: "PLU", size: "md", className: "bestseller-col-plu" },
  { key: "article", label: "Article", size: "sm", className: "bestseller-col-article" },
  { key: "deskripsi", label: "Deskripsi", size: "lg", className: "bestseller-col-deskripsi" },
  { key: "qty", label: "Qty", size: "sm", className: "bestseller-col-qty text-end", sortable: true },
];

const DEFAULT_SORT = { key: "qty", direction: "desc" };

const ALLSTORE_COLUMNS = [
  { key: "no", label: "No", className: "bestseller-col-no" },
  { key: "store", label: "Store", size: "sm", className: "bestseller-col-store", sortable: true },
  { key: "plu", label: "PLU", size: "md", className: "bestseller-col-plu" },
  { key: "article", label: "Article", size: "sm", className: "bestseller-col-article" },
  { key: "deskripsi", label: "Deskripsi", size: "lg", className: "bestseller-col-deskripsi" },
  { key: "qty", label: "Qty", size: "sm", className: "bestseller-col-qty text-end", sortable: true },
];

const getSortIcon = (key, sortConfig) => {
  if (sortConfig.key !== key) return "sort-v";
  return sortConfig.direction === "asc" ? "sort-up-fill" : "sort-down-fill";
};

const compareBestsellerRows = (a, b, key, direction) => {
  const mul = direction === "asc" ? 1 : -1;

  if (key === "qty") {
    return ((Number(a.qty) || 0) - (Number(b.qty) || 0)) * mul;
  }

  if (key === "store") {
    return String(a.store || "").localeCompare(String(b.store || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * mul;
  }

  return 0;
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

const mapInstoreRow = (row, index) => ({
  id: `${row?.PLU || "row"}-${index}`,
  plu: row?.PLU || "-",
  article: row?.ARTICLE || "-",
  deskripsi: row?.DESKRIPSI || "-",
  qty: row?.QTY,
});

const mapAllstoreRow = (row, index) => ({
  id: `${row?.ID_Store || "store"}-${row?.PLU || "row"}-${index}`,
  store: row?.ID_Store || "-",
  plu: row?.PLU || "-",
  article: row?.ARTICLE || "-",
  deskripsi: row?.DESKRIPSI || "-",
  qty: row?.QTY,
});

const BestSellerPage = () => {
  const { storeId, storeName } = useStoreScope();
  const [activeTab, setActiveTab] = useState("instore");
  const [instoreRows, setInstoreRows] = useState([]);
  const [allstoreRows, setAllstoreRows] = useState([]);
  const [appliedTabs, setAppliedTabs] = useState({ instore: false, allstore: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sm, setSm] = useState(true);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [plu, setPlu] = useState("");
  const [sortByTab, setSortByTab] = useState({
    instore: DEFAULT_SORT,
    allstore: DEFAULT_SORT,
  });
  const [pageByTab, setPageByTab] = useState({ instore: 1, allstore: 1 });
  const [itemPerPage] = useState(25);

  const sortConfig = sortByTab[activeTab];
  const currentPage = pageByTab[activeTab];

  const activeColumns = activeTab === "allstore" ? ALLSTORE_COLUMNS : INSTORE_COLUMNS;
  const activeRows = activeTab === "allstore" ? allstoreRows : instoreRows;
  const applied = appliedTabs[activeTab];

  const loadData = useCallback(async () => {
    if (!storeId) return;
    const queryFrom = fromDate;
    const queryTo = toDate || fromDate;
    const params = {
      store_id: storeId,
      from_date: format(queryFrom, "yyyy-MM-dd"),
      to_date: format(queryTo, "yyyy-MM-dd"),
      plu: String(plu || "").trim(),
    };

    setLoading(true);
    setError("");
    try {
      const res =
        activeTab === "allstore"
          ? await storeBestsellerService.listAllstore(params)
          : await storeBestsellerService.listInstore(params);

      if (!isSuccess(res)) {
        throw res;
      }

      const data = extractRows(res);
      if (activeTab === "allstore") {
        setAllstoreRows(data);
        setAppliedTabs((prev) => ({ ...prev, allstore: true }));
      } else {
        setInstoreRows(data);
        setAppliedTabs((prev) => ({ ...prev, instore: true }));
      }
      setSortByTab((prev) => ({ ...prev, [activeTab]: DEFAULT_SORT }));
      setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }));
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data best seller");
      if (activeTab === "allstore") {
        setAllstoreRows([]);
      } else {
        setInstoreRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, [storeId, fromDate, toDate, plu, activeTab]);

  const handleSort = useCallback((key) => {
    setSortByTab((prev) => {
      const current = prev[activeTab];
      if (current.key === key) {
        return {
          ...prev,
          [activeTab]: { key, direction: current.direction === "asc" ? "desc" : "asc" },
        };
      }
      return {
        ...prev,
        [activeTab]: { key, direction: key === "qty" ? "desc" : "asc" },
      };
    });
    setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }));
  }, [activeTab]);

  const tableRows = useMemo(() => {
    const mapper = activeTab === "allstore" ? mapAllstoreRow : mapInstoreRow;
    const mapped = activeRows.map(mapper);

    if (!sortConfig.key) return mapped;

    return [...mapped].sort((a, b) => compareBestsellerRows(a, b, sortConfig.key, sortConfig.direction));
  }, [activeRows, activeTab, sortConfig]);

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

  const applyTab = (tabId) => {
    setActiveTab(tabId);
    setError("");
  };

  const paginate = (pageNumber) => {
    setPageByTab((prev) => ({ ...prev, [activeTab]: pageNumber }));
  };

  const renderHeader = (column) => {
    if (!column.sortable) {
      return <span className="sub-text">{column.label}</span>;
    }

    const isActive = sortConfig.key === column.key;
    const isEnd = column.className?.includes("text-end");

    return (
      <button
        type="button"
        className={`bestseller-sort-trigger${isActive ? " is-active" : ""}${isEnd ? " is-end" : ""}`}
        onClick={() => handleSort(column.key)}
      >
        <span className="sub-text">{column.label}</span>
        <Icon name={getSortIcon(column.key, sortConfig)} />
      </button>
    );
  };

  const renderCell = (item, column) => {
    switch (column.key) {
      case "no":
        return <span>{item.no}</span>;
      case "store":
        return <span className="tb-lead">{item.store}</span>;
      case "plu":
        return <span className="tb-lead">{item.plu}</span>;
      case "article":
        return <span>{item.article}</span>;
      case "deskripsi":
        return <span>{item.deskripsi}</span>;
      case "qty":
        return <span className="bestseller-qty-cell">{formatQty(item.qty)}</span>;
      default:
        return null;
    }
  };

  const canExport = applied && tableRows.length > 0 && !loading;

  const exportExcel = useCallback(async () => {
    if (!canExport) return;
    const fileName = `item-best-seller-${activeTab}-${storeId || "store"}-${format(new Date(), "yyyyMMdd")}`;
    const columns = activeColumns
      .filter((column) => column.key !== "no")
      .map((column) => ({
        key: column.key,
        label: column.label,
        width: column.key === "deskripsi" ? 34 : column.key === "plu" ? 16 : 14,
        align: column.key === "qty" ? "right" : "left",
        numFmt: column.key === "qty" ? "#,##0" : undefined,
      }));
    const rowsForExport = tableRows.map((row) => {
      const result = {};
      columns.forEach((column) => {
        result[column.key] = column.key === "qty" ? Number(row.qty) || 0 : row[column.key] || "-";
      });
      return result;
    });
    await exportStyledXlsx({ fileName, sheetName: "Item Best Seller", columns, rows: rowsForExport });
  }, [canExport, activeColumns, activeTab, storeId, tableRows]);

  return (
    <>
      <Head title="Item Best Seller" />
      <Content>
        <PageSmoothScroll revision={`${loading ? "loading" : "ready"}-${tableRows.length}-${activeTab}-${error || "ok"}`}>
        <BlockHead size="sm">
          <BlockBetween className="page-head-stack">
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Item Best Seller
              </BlockTitle>
              <BlockDes className="text-soft">
                <p>
                  Item best seller store {storeName ? `${storeName} (${storeId})` : storeId || "-"}
                  {applied ? ` — total ${tableRows.length} item.` : ""}
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
                          portalId="sales-datepicker-portal"
                          popperProps={{ strategy: "fixed" }}
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
                          portalId="sales-datepicker-portal"
                          popperProps={{ strategy: "fixed" }}
                          customInput={<CalendarDateInput className="form-control date-picker sales-filter-date" />}
                        />
                      </div>
                    </li>
                    <li>
                      <div className="form-control-wrap">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="PLU (opsional)"
                          value={plu}
                          onChange={(event) => setPlu(event.target.value)}
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

        <Block
          className="sales-bestseller-page"
          style={{ "--bestseller-no-col-width": noColumnWidth }}
        >
          <div className="page-table-scroll">
          <DataTable className="card-stretch">
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools">
                  <ul className="card-tools-nav">
                    {TABS.map((tab) => (
                      <li key={tab.id} className={activeTab === tab.id ? "active" : ""}>
                        <a
                          href={`#${tab.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            applyTab(tab.id);
                          }}
                        >
                          <span>{tab.label}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {error ? (
              <div className="card-inner">
                <div className="text-center py-4">
                  <span className="text-danger">{error}</span>
                </div>
              </div>
            ) : tableRows.length > 0 ? (
              <>
            <DataTableBody>
              <DataTableHead>
                {activeColumns.map((column) => (
                  <DataTableRow key={column.key} size={column.size} className={column.className}>
                    {renderHeader(column)}
                  </DataTableRow>
                ))}
              </DataTableHead>

              {currentItems.map((item) => (
                    <DataTableItem key={item.id}>
                      {activeColumns.map((column) => (
                        <DataTableRow key={column.key} size={column.size} className={column.className}>
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
                paginate={paginate}
                currentPage={currentPage}
              />
            </div>
              </>
            ) : (
              <div className="card-inner">
                <SalesEmptyState
                  description={
                    applied ? (
                      <>Tidak ada data best seller untuk filter yang dipilih.</>
                    ) : (
                      <>
                        Atur filter, lalu klik <strong>Load</strong> untuk menampilkan laporan.
                      </>
                    )
                  }
                />
              </div>
            )}
          </DataTable>
          </div>
        </Block>
        </PageSmoothScroll>
      </Content>
    </>
  );
};

export default BestSellerPage;
