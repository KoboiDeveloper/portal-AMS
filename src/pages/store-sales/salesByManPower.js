import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import DatePicker from "../../components/AppDatePicker";
import CalendarDateInput from "../../components/CalendarDateInput";
import { NumericFormat } from "react-number-format";
import Head from "../../layout/head/Head";
import Content from "../../layout/content/Content";
import { Row, Col, Card, CardTitle } from "reactstrap";
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
import { storeManpowerService } from "../../services/store-manpower.service";
import { storeNikService } from "../../services/store-nik.service";
import { extractRows, isSuccess } from "../../lib/response";
import ManpowerNikPickerModal from "./ManpowerNikPickerModal";
import { PageSmoothScroll } from "../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../components/SalesEmptyState";
import { exportStyledXlsx } from "../../lib/exportStyledXlsx";

const parseNikOption = (row) => {
  const nik = String(row?.USER_NIK || "").trim();
  const label = String(row?.USER_NAME || row?.USER_NIK || "").trim();
  const parts = label.split(" - ");
  const name =
    parts.length > 1
      ? parts.slice(0, -1).join(" - ").trim()
      : label.replace(new RegExp(`\\s*-\\s*${nik}$`), "").trim() || label;

  return { value: nik, label, name, nik };
};

const MANPOWER_COLUMNS = [
  { key: "no", label: "No.", className: "nk-tb-col-check manpower-col-no" },
  { key: "date", label: "Tgl. Transaksi", size: "md", className: "manpower-col-date", sortable: true },
  { key: "nik", label: "NIK", size: "sm", className: "manpower-col-nik" },
  { key: "name", label: "Nama", size: "lg", className: "manpower-col-name" },
  { key: "jabatan", label: "Jabatan", size: "md", className: "manpower-col-jabatan" },
  { key: "qty", label: "Qty", size: "sm", className: "manpower-col-qty text-end", sortable: true },
  { key: "nilai", label: "Nilai Sales", size: "md", className: "manpower-col-nilai text-end", sortable: true },
];

const getSortIcon = (key, sortConfig) => {
  if (sortConfig.key !== key) return "sort-v";
  return sortConfig.direction === "asc" ? "sort-up-fill" : "sort-down-fill";
};

const compareManpowerRows = (a, b, key, direction) => {
  const mul = direction === "asc" ? 1 : -1;

  if (key === "date") {
    const parsedA = parseISO(String(a.date || "").slice(0, 10));
    const parsedB = parseISO(String(b.date || "").slice(0, 10));
    const timeA = isValid(parsedA) ? parsedA.getTime() : 0;
    const timeB = isValid(parsedB) ? parsedB.getTime() : 0;
    return (timeA - timeB) * mul;
  }

  return ((Number(a[key]) || 0) - (Number(b[key]) || 0)) * mul;
};

const formatDisplayDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = parseISO(raw.length <= 10 ? raw : raw.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "dd/MM/yyyy");
  return raw;
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

const formatCurrency = (value) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator=","
    decimalScale={0}
    displayType="text"
    renderText={(text) => text}
  />
);

const SalesByManPowerPage = () => {
  const { storeId, storeName } = useStoreScope();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sm, setSm] = useState(true);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [userNik, setUserNik] = useState("");
  const [nikOptions, setNikOptions] = useState([]);
  const [nikLoading, setNikLoading] = useState(false);
  const [nikError, setNikError] = useState("");
  const [appliedNik, setAppliedNik] = useState("");
  const [nikModalOpen, setNikModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });

  useEffect(() => {
    if (!storeId) {
      setNikOptions([]);
      setUserNik("");
      return;
    }

    let cancelled = false;

    const loadNikOptions = async () => {
      setNikLoading(true);
      setNikError("");
      setUserNik("");
      setRows([]);
      setAppliedNik("");
      try {
        const res = await storeNikService.list({ store_id: storeId });
        if (!isSuccess(res)) {
          throw res;
        }
        const options = extractRows(res).map(parseNikOption).filter((option) => option.value);
        if (!cancelled) {
          setNikOptions(options);
        }
      } catch (err) {
        if (!cancelled) {
          setNikOptions([]);
          setNikError(err?.responseMessage || "Gagal memuat daftar NIK");
        }
      } finally {
        if (!cancelled) {
          setNikLoading(false);
        }
      }
    };

    loadNikOptions();

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const selectedNikOption = useMemo(
    () => nikOptions.find((option) => option.value === userNik) || null,
    [nikOptions, userNik]
  );

  const appliedNikOption = useMemo(
    () => nikOptions.find((option) => option.value === appliedNik) || null,
    [nikOptions, appliedNik]
  );

  const summaryDateLabel = useMemo(() => {
    const from = format(fromDate, "dd MMM yyyy");
    const to = format(toDate || fromDate, "dd MMM yyyy");
    return `${from} s/d ${to}`;
  }, [fromDate, toDate]);

  const handleNikConfirm = useCallback((nik) => {
    setUserNik(nik);
    setError("");
  }, []);

  const openNikModal = useCallback(() => {
    if (!nikLoading && storeId) {
      setNikModalOpen(true);
    }
  }, [nikLoading, storeId]);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    const nik = String(userNik || "").trim();
    if (!nik) {
      setNikModalOpen(true);
      setError("Pilih karyawan terlebih dahulu");
      return;
    }
    const queryFrom = fromDate;
    const queryTo = toDate || fromDate;
    setLoading(true);
    setError("");
    try {
      const res = await storeManpowerService.list({
        store_id: storeId,
        from_date: format(queryFrom, "yyyy-MM-dd"),
        to_date: format(queryTo, "yyyy-MM-dd"),
        user_nik: nik,
      });
      if (!isSuccess(res)) {
        throw res;
      }
      setRows(extractRows(res));
      setAppliedNik(nik);
      setSortConfig({ key: "date", direction: "desc" });
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data sales by man power");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, fromDate, toDate, userNik]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }, []);

  const summaryTotals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          qty: acc.qty + (Number(row?.total_qty) || 0),
          nilai: acc.nilai + (Number(row?.nilai_sales) || 0),
        }),
        { qty: 0, nilai: 0 }
      ),
    [rows]
  );

  const tableRows = useMemo(() => {
    const mapped = rows.map((row, index) => ({
      id: `${row?.User_NIK || "row"}-${row?.tanggal_transaksi || index}-${index}`,
      date: row?.tanggal_transaksi,
      nik: row?.User_NIK || "-",
      name: row?.User_Name || "-",
      jabatan: row?.jabatan || "-",
      qty: row?.total_qty,
      nilai: row?.nilai_sales,
    }));

    const sorted = sortConfig.key
      ? [...mapped].sort((a, b) => compareManpowerRows(a, b, sortConfig.key, sortConfig.direction))
      : mapped;

    return sorted.map((row, index) => ({
      ...row,
      no: index + 1,
    }));
  }, [rows, sortConfig]);

  const renderHeader = (column) => {
    if (!column.sortable) {
      return <span className="sub-text">{column.label}</span>;
    }

    const isActive = sortConfig.key === column.key;
    const isEnd = column.className?.includes("text-end");

    return (
      <button
        type="button"
        className={`manpower-sort-trigger${isActive ? " is-active" : ""}${isEnd ? " is-end" : ""}`}
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
      case "date":
        return <span>{formatDisplayDate(item.date)}</span>;
      case "nik":
        return <span className="tb-lead">{item.nik}</span>;
      case "name":
        return <span>{item.name}</span>;
      case "jabatan":
        return <span>{item.jabatan}</span>;
      case "qty":
        return <span>{formatQty(item.qty)}</span>;
      case "nilai":
        return <span>{formatCurrency(item.nilai)}</span>;
      default:
        return null;
    }
  };

  const canExport = !!appliedNik && tableRows.length > 0 && !loading;

  const exportExcel = useCallback(async () => {
    if (!canExport) return;
    const fileName = `sales-man-power-${storeId || "store"}-${appliedNik || "nik"}-${format(new Date(), "yyyyMMdd")}`;
    const columns = [
      { key: "date", label: "Tgl. Transaksi", width: 14 },
      { key: "nik", label: "NIK", width: 14 },
      { key: "name", label: "Nama", width: 24 },
      { key: "jabatan", label: "Jabatan", width: 16 },
      { key: "qty", label: "Qty", width: 10, align: "right", numFmt: "#,##0" },
      { key: "nilai", label: "Nilai Sales", width: 14, align: "right", numFmt: "#,##0" },
    ];
    const rowsForExport = tableRows.map((row) => ({
      date: formatDisplayDate(row.date),
      nik: row.nik || "-",
      name: row.name || "-",
      jabatan: row.jabatan || "-",
      qty: Number(row.qty) || 0,
      nilai: Number(row.nilai) || 0,
    }));
    rowsForExport.push({
      date: "",
      nik: "",
      name: "TOTAL",
      jabatan: "",
      qty: Number(summaryTotals.qty) || 0,
      nilai: Number(summaryTotals.nilai) || 0,
      rowType: "footer",
    });
    await exportStyledXlsx({
      fileName,
      sheetName: "Sales By Man Power",
      columns,
      rows: rowsForExport,
      getRowStyle: (row) =>
        row.rowType === "footer"
          ? { fill: "FFF7FAFF", font: { bold: true, color: { argb: "FF364A63" } } }
          : null,
    });
  }, [canExport, storeId, appliedNik, tableRows, summaryTotals.qty, summaryTotals.nilai]);

  return (
    <>
      <Head title="Sales By Man Power" />
      <Content>
        <PageSmoothScroll revision={`${loading ? "loading" : "ready"}-${tableRows.length}-${appliedNik || ""}`}>
        <BlockHead size="sm">
          <BlockBetween className="page-head-stack">
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Sales By Man Power
              </BlockTitle>
              <BlockDes className="text-soft">
                <p>Sales per karyawan store {storeName ? `${storeName} (${storeId})` : storeId || "-"}</p>
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
                      <Button
                        color="light"
                        outline
                        className="btn-dim"
                        onClick={openNikModal}
                        disabled={nikLoading || !storeId}
                      >
                        <Icon name="users" />
                        <span>{selectedNikOption ? selectedNikOption.name : "Pilih Karyawan"}</span>
                      </Button>
                    </li>
                    <li>
                      <Button color="primary" onClick={loadData} disabled={loading || nikLoading || !userNik}>
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

        {appliedNik ? (
          <Block className="sales-manpower-summary">
            <Row className="g-gs">
              <Col xs="12">
                <Card className="card-bordered card-full">
                  <div className="card-inner">
                    <div className="sales-manpower-summary__layout">
                      <div className="sales-manpower-summary__heading card-title-group align-start mb-0">
                        <CardTitle className="card-title">
                          <h6 className="title">Ringkasan Sales</h6>
                          <p>
                            Periode {summaryDateLabel}
                            {appliedNikOption ? ` — ${appliedNikOption.name}` : ""}{" "}
                            <Icon name="info" />
                          </p>
                        </CardTitle>
                      </div>

                      <div className="sales-manpower-summary__divider sales-manpower-summary__divider--section" aria-hidden="true" />
                      <div className="nk-divider divider md sales-manpower-summary__divider sales-manpower-summary__divider--mobile" />

                      <div className="user-activity-group sales-manpower-summary__stats">
                        <div className="user-activity">
                          <Icon name="package-fill" />
                          <div className="info">
                            <span className="amount">{formatQty(summaryTotals.qty)}</span>
                            <span className="title">Total Qty</span>
                          </div>
                        </div>

                        <div className="sales-manpower-summary__divider sales-manpower-summary__divider--stat" aria-hidden="true" />

                        <div className="user-activity">
                          <Icon name="coins" />
                          <div className="info">
                            <span className="amount">
                              {formatCurrency(summaryTotals.nilai)}
                              <span className="currency currency-usd"> IDR</span>
                            </span>
                            <span className="title">Total Nilai Sales</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </Block>
        ) : null}

        <Block className="sales-manpower-page">
          {error || nikError ? (
            <div className="text-center py-4">
              <span className="text-danger">{error || nikError}</span>
            </div>
          ) : tableRows.length > 0 ? (
          <div className="page-table-scroll">
          <DataTable className="card-stretch">
            <DataTableBody compact>
              <DataTableHead>
                {MANPOWER_COLUMNS.map((column) => (
                  <DataTableRow key={column.key} size={column.size} className={column.className}>
                    {renderHeader(column)}
                  </DataTableRow>
                ))}
              </DataTableHead>

              {tableRows.map((item) => (
                    <DataTableItem key={item.id}>
                      {MANPOWER_COLUMNS.map((column) => (
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
                appliedNik ? (
                  <>Tidak ada data sales by man power untuk filter yang dipilih.</>
                ) : (
                  <>
                    Pilih karyawan, lalu klik <strong>Load</strong> untuk menampilkan laporan.
                  </>
                )
              }
            />
          )}
        </Block>
        </PageSmoothScroll>

        <ManpowerNikPickerModal
          isOpen={nikModalOpen}
          toggle={() => setNikModalOpen(false)}
          options={nikOptions}
          value={userNik}
          onConfirm={handleNikConfirm}
          loading={nikLoading}
          error={nikError}
        />
      </Content>
    </>
  );
};

export default SalesByManPowerPage;
