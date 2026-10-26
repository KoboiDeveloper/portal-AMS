import React, { useCallback, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import DatePicker from "../../../../components/AppDatePicker";
import { Card, Spinner } from "reactstrap";
import { NumericFormat } from "react-number-format";
import { toast } from "react-toastify";
import CalendarDateInput from "../../../../components/CalendarDateInput";
import Head from "../../../../layout/head/Head";
import Content from "../../../../layout/content/Content";
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
} from "../../../../components/Component";
import { useStoreScope } from "../../../../hooks/useStoreScope";
import { storeKasService } from "../../../../services/store-kas.service";
import { extractRows, isSuccess } from "../../../../lib/response";
import { PageSmoothScroll } from "../../../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../../../components/SalesEmptyState";
import KasFormModal from "./KasFormModal";
import KasConfirmDialog from "./KasConfirmDialog";
import KasRealisasiPanel from "./KasRealisasiPanel";
import { KasPhotoThumb } from "./KasPhoto";
import { rememberKasCoa, resolveCoaCode } from "./coaUtils";
import "./kas-list.css";

const KAS_TABS = [
  { id: "detail", label: "Detail Kas List" },
  { id: "realisasi", label: "Kas Realisasi" },
];

const KAS_COLUMNS = [
  { key: "no", label: "No", size: "sm", className: "kas-col-no", sortable: false },
  { key: "date", label: "Tanggal", size: "md", className: "kas-col-date", sortable: true },
  { key: "remarks", label: "Keterangan", size: "lg", className: "kas-col-remarks", sortable: true },
  { key: "amountIn", label: "Uang Masuk", size: "md", className: "kas-col-money text-end", sortable: true },
  { key: "amountOut", label: "Uang Keluar", size: "md", className: "kas-col-money text-end", sortable: true },
  { key: "photo", label: "Foto", size: "sm", className: "kas-col-photo text-center", sortable: false },
  { key: "status", label: "Status", size: "sm", className: "kas-col-status text-center", sortable: true },
  { key: "action", label: "Action", size: "sm", className: "kas-col-action text-end", sortable: false },
];

const isApiOk = (res) => {
  const code = String(res?.responseCode ?? "");
  return isSuccess(res) || code === "00" || code === "2000000" || code === "2002500";
};

const isKasStatusBaru = (status) => {
  const key = String(status || "").trim().toLowerCase();
  if (!key || key.includes("ajukan")) return false;
  return key === "baru" || key.startsWith("baru") || key === "1";
};

const formatDisplayDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = parseISO(raw.length <= 10 ? raw : raw.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "dd/MM/yyyy");
  return raw;
};

const formatMoney = (value) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator="."
    decimalSeparator=","
    decimalScale={0}
    displayType="text"
    renderText={(text) => text}
  />
);

const compareKasRows = (a, b, key, direction) => {
  const mul = direction === "desc" ? -1 : 1;
  if (key === "date") {
    const av = String(a.date || "");
    const bv = String(b.date || "");
    return av.localeCompare(bv) * mul;
  }
  if (key === "remarks" || key === "status") {
    return String(a[key] || "").localeCompare(String(b[key] || ""), "id", { sensitivity: "base" }) * mul;
  }
  return ((Number(a[key]) || 0) - (Number(b[key]) || 0)) * mul;
};

const getSortIcon = (key, sortConfig) => {
  if (sortConfig.key !== key) return "unsorted";
  return sortConfig.direction === "asc" ? "arrow-up" : "arrow-down";
};

const getStatusBadge = (status) => {
  const label = String(status || "").trim() || "-";
  const key = label.toLowerCase();
  let color = "secondary";
  if (key.includes("ajukan")) color = "warning";
  else if (key.includes("baru")) color = "success";
  return <span className={`tb-status text-${color}`}>{label}</span>;
};

const KasListPage = () => {
  const { storeId, storeName } = useStoreScope();
  const [rows, setRows] = useState([]);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [sm, setSm] = useState(true);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(25);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [formModal, setFormModal] = useState({ open: false, item: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [ajukanModal, setAjukanModal] = useState({ open: false, item: null });
  const [ajukanLoading, setAjukanLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("detail");
  const isDetailTab = activeTab === "detail";

  const loadData = useCallback(async () => {
    if (!storeId) return;
    const queryFrom = fromDate;
    const queryTo = toDate || fromDate;
    setLoading(true);
    setError("");
    try {
      const res = await storeKasService.list({
        store_id: storeId,
        from_date: format(queryFrom, "yyyy-MM-dd"),
        to_date: format(queryTo, "yyyy-MM-dd"),
      });
      if (!isApiOk(res)) {
        const msg = String(res?.responseMessage || "").toLowerCase();
        if (msg.includes("tidak ditemukan") || msg.includes("not found")) {
          setRows([]);
          setApplied(true);
          setCurrentPage(1);
          return;
        }
        throw res;
      }
      const nextRows = extractRows(res);
      nextRows.forEach((row) => {
        const code = resolveCoaCode(row);
        if (row?.id != null && code) rememberKasCoa(row.id, code);
      });
      setRows(nextRows);
      setApplied(true);
      setCurrentPage(1);
      setSortConfig({ key: "date", direction: "desc" });
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data kas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, fromDate, toDate]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
    setCurrentPage(1);
  }, []);

  const requestDelete = useCallback((item) => {
    if (!item?.id) return;
    if (!isKasStatusBaru(item.status)) {
      toast.error("Hanya data dengan status Baru yang dapat dihapus");
      return;
    }
    setDeleteModal({ open: true, item });
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deleting) return;
    setDeleteModal({ open: false, item: null });
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    const item = deleteModal.item;
    if (!item?.id) return;

    setDeleting(true);
    try {
      const res = await storeKasService.remove({ id: item.id, status: item.status });
      if (!isApiOk(res)) {
        toast.error(res?.responseMessage || "Gagal menghapus kas");
        return;
      }
      toast.success(res?.responseMessage || "Data kas berhasil dihapus");
      setDeleteModal({ open: false, item: null });
      setFormModal({ open: false, item: null });
      setRows((prev) => prev.filter((row) => String(row?.id) !== String(item.id)));
    } catch (err) {
      toast.error(err?.responseMessage || err?.message || "Gagal menghapus kas");
    } finally {
      setDeleting(false);
    }
  }, [deleteModal.item]);

  const requestAjukan = useCallback((item) => {
    if (!item?.id) return;
    if (!isKasStatusBaru(item.status)) {
      toast.error("Hanya data dengan status Baru yang dapat diajukan");
      return;
    }
    setAjukanModal({ open: true, item });
  }, []);

  const closeAjukanModal = useCallback(() => {
    if (ajukanLoading) return;
    setAjukanModal({ open: false, item: null });
  }, [ajukanLoading]);

  const confirmAjukan = useCallback(async () => {
    const item = ajukanModal.item;
    if (!item?.id) return;

    setAjukanLoading(true);
    try {
      // SP ajukan belum tersedia — UI + konfirmasi sudah siap
      toast.info("SP ajukan kas belum tersedia");
      setAjukanModal({ open: false, item: null });
    } finally {
      setAjukanLoading(false);
    }
  }, [ajukanModal.item]);

  const tableRows = useMemo(() => {
    const mapped = rows.map((row, index) => {
      const id = row?.id ?? `${row?.storeId || "row"}-${index}`;
      const coa = resolveCoaCode({ ...row, id, raw: row });
      return {
        ...row,
        id,
        storeId: row?.storeId || "-",
        date: row?.date,
        remarks: row?.remarks || "-",
        photo: row?.photo || "",
        amountIn: Number(row?.amountIn) || 0,
        amountOut: Number(row?.amountOut) || 0,
        coa,
        status: row?.status || "-",
        bgClass: row?.bgClass || "",
        styleDisplay: row?.styleDisplay || "",
        raw: row,
      };
    });

    const sorted = sortConfig.key
      ? [...mapped].sort((a, b) => compareKasRows(a, b, sortConfig.key, sortConfig.direction))
      : mapped;

    return sorted.map((row, index) => ({ ...row, no: index + 1 }));
  }, [rows, sortConfig]);

  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentItems = useMemo(
    () => tableRows.slice(indexOfFirstItem, indexOfLastItem),
    [tableRows, indexOfFirstItem, indexOfLastItem]
  );

  const openCreate = () => setFormModal({ open: true, item: null });
  const openEdit = (item) => setFormModal({ open: true, item });
  const closeFormModal = () => setFormModal({ open: false, item: null });

  const renderHeader = (column) => {
    if (!column.sortable) {
      return <span className="sub-text">{column.label}</span>;
    }
    const isActive = sortConfig.key === column.key;
    const isEnd = column.className?.includes("text-end");
    return (
      <button
        type="button"
        className={`kas-sort-trigger${isActive ? " is-active" : ""}${isEnd ? " is-end" : ""}`}
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
      case "remarks":
        return <span className="kas-remarks" title={item.remarks}>{item.remarks}</span>;
      case "amountIn":
        return <span className="text-success">{formatMoney(item.amountIn)}</span>;
      case "amountOut":
        return <span className="text-danger">{formatMoney(item.amountOut)}</span>;
      case "photo":
        return <KasPhotoThumb filename={item.photo} />;
      case "status":
        return getStatusBadge(item.status);
      case "action": {
        const canAjukan = isKasStatusBaru(item.status);
        const canDelete = canAjukan;
        return (
          <ul className="nk-tb-actions gx-1 my-n1">
            <li onClick={() => openEdit(item)}>
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={`kas-edit-${item.id}`}
                icon="edit"
                direction="top"
                text="Edit"
              />
            </li>
            {canAjukan ? (
              <li onClick={() => requestAjukan(item)}>
                <TooltipComponent
                  tag="a"
                  containerClassName="btn btn-trigger btn-icon"
                  id={`kas-ajukan-${item.id}`}
                  icon="send"
                  direction="top"
                  text="Ajukan"
                />
              </li>
            ) : null}
            {canDelete ? (
              <li onClick={() => requestDelete(item)}>
                <TooltipComponent
                  tag="a"
                  containerClassName="btn btn-trigger btn-icon"
                  id={`kas-del-${item.id}`}
                  icon="trash"
                  direction="top"
                  text="Hapus"
                />
              </li>
            ) : null}
          </ul>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      <Head title="Kas List" />
      <Content>
        <PageSmoothScroll revision={`${loading ? "loading" : "ready"}-${tableRows.length}-${error || "ok"}`}>
          <BlockHead size="sm">
            <BlockBetween className="page-head-stack">
              <BlockHeadContent>
                <BlockTitle tag="h3" page>
                  Kas List
                </BlockTitle>
                <BlockDes className="text-soft">
                  <p>
                    Kas kecil store {storeName ? `${storeName} (${storeId})` : storeId || "-"}
                    {isDetailTab && applied ? ` — ${tableRows.length} data.` : ""}
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
                      {isDetailTab ? (
                        <>
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
                              {loading ? <Spinner size="sm" /> : <Icon name="search" />}
                              <span>Load</span>
                            </Button>
                          </li>
                          <li>
                            <Button color="primary" outline onClick={openCreate} disabled={!storeId}>
                              <Icon name="plus" />
                              <span>Tambah</span>
                            </Button>
                          </li>
                        </>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block className="kas-list-page">
            <div className="kas-tabs card card-bordered">
              <ul className="kas-tabs__nav">
                {KAS_TABS.map((tab) => (
                  <li key={tab.id} className={activeTab === tab.id ? "active" : ""}>
                    <button type="button" onClick={() => setActiveTab(tab.id)}>
                      {tab.label}
                      {tab.id === "detail" && applied ? (
                        <span className="kas-tabs__count">{tableRows.length}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {isDetailTab ? (
              loading ? (
                <div className="text-center py-5">
                  <Spinner size="sm" /> <span className="text-soft ms-2">Memuat data…</span>
                </div>
              ) : error ? (
                <div className="text-center py-4">
                  <span className="text-danger">{error}</span>
                </div>
              ) : !applied ? (
                <SalesEmptyState
                  title="Belum ada data"
                  description="Pilih rentang tanggal lalu tekan Load untuk menampilkan kas kecil."
                />
              ) : tableRows.length === 0 ? (
                <SalesEmptyState
                  title="Data kas tidak ditemukan"
                  description="Tidak ada transaksi kas kecil untuk periode yang dipilih."
                />
              ) : (
                <div className="page-table-scroll">
                  <Card className="card-bordered card-full">
                    <DataTableBody compact className="border-top" bodyclass="nk-tb-orders">
                      <DataTableHead>
                        {KAS_COLUMNS.map((column) => (
                          <DataTableRow key={column.key} size={column.size} className={column.className}>
                            {renderHeader(column)}
                          </DataTableRow>
                        ))}
                      </DataTableHead>
                      {currentItems.map((item) => (
                        <DataTableItem key={item.id}>
                          {KAS_COLUMNS.map((column) => (
                            <DataTableRow
                              key={column.key}
                              size={column.size}
                              className={column.key === "action" ? "nk-tb-col-tools" : column.className}
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
              )
            ) : (
              <KasRealisasiPanel storeId={storeId} active={!isDetailTab} />
            )}
          </Block>
        </PageSmoothScroll>
      </Content>

      <KasFormModal
        open={formModal.open}
        item={formModal.item}
        onClose={closeFormModal}
        storeId={storeId}
        onSaved={(res) => {
          const savedId = res?.data?.id;
          const savedCoa = res?.data?.coa;
          if (savedId && savedCoa) rememberKasCoa(savedId, savedCoa);
          if (applied) loadData();
        }}
      />

      <KasConfirmDialog
        open={deleteModal.open}
        item={deleteModal.item}
        loading={deleting}
        title="Hapus Kas"
        confirmLabel="Hapus"
        loadingLabel="Menghapus…"
        variant="danger"
        message={
          deleteModal.item ? (
            <>
              <p className="mb-2">
                Hapus transaksi <strong>#{deleteModal.item.id}</strong>
                {deleteModal.item.amountOut ? (
                  <>
                    {" "}
                    sebesar{" "}
                    <strong>Rp {Number(deleteModal.item.amountOut).toLocaleString("id-ID")}</strong>
                  </>
                ) : null}
                ?
              </p>
              <p className="text-soft mb-0">Tindakan ini tidak dapat dibatalkan.</p>
            </>
          ) : null
        }
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />

      <KasConfirmDialog
        open={ajukanModal.open}
        item={ajukanModal.item}
        loading={ajukanLoading}
        title="Ajukan Kas"
        confirmLabel="Ajukan"
        loadingLabel="Mengajukan…"
        variant="primary"
        message={
          ajukanModal.item ? (
            <>
              <p className="mb-2">
                Ajukan transaksi <strong>#{ajukanModal.item.id}</strong>
                {ajukanModal.item.amountOut ? (
                  <>
                    {" "}
                    sebesar{" "}
                    <strong>Rp {Number(ajukanModal.item.amountOut).toLocaleString("id-ID")}</strong>
                  </>
                ) : null}
                ?
              </p>
              <p className="text-soft mb-0">Status akan berubah menjadi Diajukan.</p>
            </>
          ) : null
        }
        onCancel={closeAjukanModal}
        onConfirm={confirmAjukan}
      />
    </>
  );
};

export default KasListPage;
