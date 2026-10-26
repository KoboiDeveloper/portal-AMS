import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Spinner } from "reactstrap";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
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
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
  PaginationComponent,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { buildImageStorageUrl, isDropboxStoragePath, isMissingImagePath } from "../../../lib/imageStorage";
import { filesService } from "../../../services/files.service";
import "./reg-slip-dcr.css";

const slipService = createRegionalService("slip/dcr", { crud: false });

const filterSelectStyles = {
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
};

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDate = (v) => {
  const s = String(v || "").trim();
  if (!s) return "—";
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const blankImage = (v) => {
  if (isMissingImagePath(v)) return true;
  const base = String(v || "")
    .toLowerCase()
    .replace(/\\/g, "/")
    .split("/")
    .pop();
  return /noimage|no_image|imageupload\.png|noimagefound/i.test(base || "");
};

const SlipThumb = ({ filename, label }) => {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    const value = String(filename ?? "").trim();
    if (!value || blankImage(value)) {
      setUrl("");
      setStatus("idle");
      return undefined;
    }
    setStatus("loading");
    const apply = (next) => {
      if (cancelled) return;
      if (!next) {
        setUrl("");
        setStatus("error");
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          setUrl(next);
          setStatus("loaded");
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          setUrl("");
          setStatus("error");
        }
      };
      img.src = next;
    };

    if (isDropboxStoragePath(value)) {
      const path = value.startsWith("/") ? value : `/${value}`;
      filesService
        .getTemporaryLink(path)
        .then((res) => {
          if (!isSuccess(res) && String(res?.responseCode) !== "00") throw res;
          apply(res?.data?.temporaryLink || "");
        })
        .catch(() => {
          if (!cancelled) {
            setUrl("");
            setStatus("error");
          }
        });
      return () => {
        cancelled = true;
      };
    }

    apply(buildImageStorageUrl(value));
    return () => {
      cancelled = true;
    };
  }, [filename]);

  if (!filename || blankImage(filename) || status === "error" || status === "idle") {
    return (
      <div className="rsd-thumb rsd-thumb--empty" title={label}>
        <Icon name="img" />
      </div>
    );
  }
  if (status === "loading") {
    return (
      <div className="rsd-thumb rsd-thumb--loading" title={label}>
        <Spinner size="sm" />
      </div>
    );
  }
  return (
    <Zoom zoomMargin={40}>
      <img src={url} alt={label} className="rsd-thumb" />
    </Zoom>
  );
};

const SlipCell = ({ label, amount, filename, showAmount }) => (
  <div className="rsd-bank-cell">
    <SlipThumb filename={filename} label={label} />
    <div className="rsd-bank-amt">{showAmount ? fmtMoney(amount) : "\u00a0"}</div>
    <div className="rsd-bank-lbl">{label}</div>
  </div>
);

const toSortable = (value) => {
  if (value == null || value === "") return { kind: "empty", raw: "" };
  if (typeof value === "number" && Number.isFinite(value)) return { kind: "num", raw: value };
  const s = String(value).trim();
  const iso = Date.parse(s.length >= 10 ? s.slice(0, 10) : s);
  if (!Number.isNaN(iso) && /\d{4}-\d{2}-\d{2}/.test(s)) return { kind: "num", raw: iso };
  const num = Number(s.replace(/,/g, ""));
  if (s !== "" && Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(s.replace(/,/g, ""))) {
    return { kind: "num", raw: num };
  }
  return { kind: "str", raw: s.toLowerCase() };
};

const compareRows = (a, b, key, direction) => {
  const left = toSortable(a?.[key]);
  const right = toSortable(b?.[key]);
  let cmp = 0;
  if (left.kind === "empty" && right.kind !== "empty") cmp = 1;
  else if (right.kind === "empty" && left.kind !== "empty") cmp = -1;
  else if (left.kind === "num" && right.kind === "num") cmp = left.raw - right.raw;
  else cmp = String(left.raw).localeCompare(String(right.raw), "id", { numeric: true });
  return direction === "desc" ? -cmp : cmp;
};

/** Header order must match tbody: STORE → SLIP → SETTLEMENT → UPLOAD → BATCH */
const SORT_COLS = [
  { key: "store", label: "STORE", sortable: true },
  { key: "totalSlip", label: "SLIP SETORAN", sortable: true },
  { key: "settlement", label: "SETTLEMENT", sortable: false },
  { key: "creDate", label: "TANGGAL UPLOAD", sortable: true },
  { key: "tglBatch", label: "TGL BATCH", sortable: true },
];

const RegSlipDcrPage = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [brandOpts, setBrandOpts] = useState([]);
  const [storeOpts, setStoreOpts] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sm, setSm] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "creDate", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemPerPage = 25;

  const filtersReady = Boolean(brandId && storeId && fromDate && toDate);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opts = await regionalLookupOptions("brand");
      if (cancelled) return;
      setBrandOpts((opts || []).filter((o) => o.value !== "ALL" && o.value !== "all" && o.value !== ""));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!brandId) {
        setStoreOpts([]);
        setStoreId("");
        return;
      }
      const opts = await regionalLookupOptions("store", { parentId: brandId });
      if (cancelled) return;
      const next = (opts || []).filter((o) => o.value !== "ALL" && o.value !== "all" && o.value !== "");
      setStoreOpts(next);
      if (!next.some((o) => String(o.value) === String(storeId))) setStoreId("");
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandValue = useMemo(
    () => brandOpts.find((o) => String(o.value) === String(brandId)) || null,
    [brandOpts, brandId]
  );
  const storeValue = useMemo(
    () => storeOpts.find((o) => String(o.value) === String(storeId)) || null,
    [storeOpts, storeId]
  );

  const canSearch = Boolean(brandId && storeId && fromDate && toDate);

  const load = useCallback(async () => {
    if (!brandId || !storeId || !fromDate || !toDate) {
      setRows([]);
      setLoaded(false);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await slipService.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId,
        id_store: storeId,
      });
      if (!isSuccess(res) && String(res?.responseCode) !== "00") {
        setError(res?.responseMessage || "Gagal memuat data");
        setRows([]);
        setLoaded(true);
        return;
      }
      setRows(extractRows(res));
      setLoaded(true);
      setSortConfig({ key: "creDate", direction: "desc" });
      setCurrentPage(1);
    } catch (e) {
      setError(e?.message || "Gagal memuat data");
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, brandId, storeId]);

  const mapped = useMemo(
    () =>
      (rows || []).map((r, i) => ({
        id: r.id ?? r.ID ?? i,
        store: r.storeId || r.store_id || r.store || "—",
        creDate: r.creDate || r.cre_date || "",
        tglBatch: r.tglBatch || r.tgl_batch || "",
        nilaiMandiri: Number(r.nilaiMandiri ?? r.NILAI_MANDIRI ?? 0),
        nilaiBni: Number(r.nilaiBni ?? r.NILAI_BNI ?? 0),
        nilaiDirectSelling: Number(r.nilaiDirectSelling ?? r.NILAI_DIRECTSELLING ?? 0),
        totalSlip:
          Number(r.nilaiMandiri ?? r.NILAI_MANDIRI ?? 0) +
          Number(r.nilaiBni ?? r.NILAI_BNI ?? 0) +
          Number(r.nilaiDirectSelling ?? r.NILAI_DIRECTSELLING ?? 0),
        image1: blankImage(r.image1 || r.IMAGE_1) ? "" : r.image1 || r.IMAGE_1,
        image2: blankImage(r.image2 || r.IMAGE_2) ? "" : r.image2 || r.IMAGE_2,
        image3: blankImage(r.image3 || r.IMAGE_3) ? "" : r.image3 || r.IMAGE_3,
        image4: blankImage(r.image4 || r.IMAGE_4) ? "" : r.image4 || r.IMAGE_4,
        image5: blankImage(r.image5 || r.IMAGE_5) ? "" : r.image5 || r.IMAGE_5,
        image6: blankImage(r.image6 || r.IMAGE_6) ? "" : r.image6 || r.IMAGE_6,
      })),
    [rows]
  );

  const sorted = useMemo(() => {
    if (!sortConfig.key) return mapped;
    const next = [...mapped];
    next.sort((a, b) => compareRows(a, b, sortConfig.key, sortConfig.direction));
    return next;
  }, [mapped, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setCurrentPage(1);
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return "unsorted";
    return sortConfig.direction === "asc" ? "arrow-up" : "arrow-down";
  };

  const indexOfLast = currentPage * itemPerPage;
  const indexOfFirst = indexOfLast - itemPerPage;
  const pageRows = sorted.slice(indexOfFirst, indexOfLast);

  return (
    <AccessGuard moduleCode="REG_SLIP_DCR" permission="VIEW">
      <Head title="Slip Setoran Bank" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Slip Setoran Bank
              </BlockTitle>
              <BlockDes className="text-soft">
                {!filtersReady
                  ? "Isi Brand, Store, dan Date Range lalu klik refresh untuk memuat data"
                  : loaded
                    ? `You have total ${sorted.length} slip setoran bank`
                    : "Isi Brand, Store, dan Date Range lalu klik refresh untuk memuat data"}
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
                    <li className="hrd-filter-select">
                      <RSelect
                        className="hrd-filter-rselect"
                        styles={filterSelectStyles}
                        isSearchable
                        isClearable
                        placeholder="Brand"
                        options={brandOpts}
                        value={brandValue}
                        onChange={(opt) => setBrandId(opt?.value != null ? String(opt.value) : "")}
                      />
                    </li>
                    <li className="hrd-filter-select">
                      <RSelect
                        className="hrd-filter-rselect"
                        styles={filterSelectStyles}
                        isSearchable
                        isClearable
                        placeholder="Store"
                        options={storeOpts}
                        value={storeValue}
                        onChange={(opt) => setStoreId(opt?.value != null ? String(opt.value) : "")}
                      />
                    </li>
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
                    <li>
                      <button
                        type="button"
                        className="btn btn-icon btn-trigger admin-filter-premium-btn"
                        onClick={load}
                        disabled={loading || !canSearch}
                        title={canSearch ? "Load" : "Pilih filter dulu"}
                        aria-label="Load"
                      >
                        <Icon pack="premium" name="pencarian" size={32} />
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {error && !loading ? <div className="rsd-msg err">{error}</div> : null}

          {!error || loading ? (
            <div className="rsd-page">
              <DataTable className="card-stretch">
                <DataTableBody>
                  <DataTableHead className="nk-tb-item nk-tb-head">
                    <DataTableRow size="sm" className="rsd-col-no">
                      <span className="sub-text">No</span>
                    </DataTableRow>
                    {SORT_COLS.map((col) => (
                      <DataTableRow
                        key={col.key}
                        size={col.key === "store" ? "md" : col.key === "totalSlip" || col.key === "settlement" ? "lg" : "md"}
                        className={
                          col.key === "totalSlip"
                            ? "rsd-col-slip"
                            : col.key === "settlement"
                              ? "rsd-col-settle"
                              : undefined
                        }
                      >
                        {col.sortable ? (
                          <button
                            type="button"
                            className={`admin-sort-trigger${sortConfig.key === col.key ? " is-active" : ""}`}
                            onClick={() => handleSort(col.key)}
                          >
                            <span className="sub-text">{col.label}</span>
                            <Icon name={sortIcon(col.key)} />
                          </button>
                        ) : (
                          <span className="sub-text">{col.label}</span>
                        )}
                      </DataTableRow>
                    ))}
                  </DataTableHead>

                  {!loading &&
                    pageRows.map((row, idx) => (
                      <DataTableItem key={row.id}>
                        <DataTableRow size="sm" className="rsd-col-no">
                          <span>{indexOfFirst + idx + 1}</span>
                        </DataTableRow>
                        <DataTableRow size="md">
                          <span className="tb-lead">{row.store}</span>
                        </DataTableRow>
                        <DataTableRow size="lg" className="rsd-col-slip">
                          <div className="rsd-bank-row">
                            <SlipCell
                              label="Mandiri"
                              amount={row.nilaiMandiri}
                              filename={row.image1}
                              showAmount
                            />
                            <SlipCell label="BNI" amount={row.nilaiBni} filename={row.image2} showAmount />
                            <SlipCell
                              label="Direct Selling"
                              amount={row.nilaiDirectSelling}
                              filename={row.image3}
                              showAmount
                            />
                          </div>
                        </DataTableRow>
                        <DataTableRow size="lg" className="rsd-col-settle">
                          <div className="rsd-bank-row">
                            <SlipCell label="Mandiri" filename={row.image4} />
                            <SlipCell label="BNI" filename={row.image5} />
                            <SlipCell label="BCA" filename={row.image6} />
                          </div>
                        </DataTableRow>
                        <DataTableRow size="md">
                          <span>{fmtDate(row.creDate)}</span>
                        </DataTableRow>
                        <DataTableRow size="md">
                          <span className="rsd-batch">
                            {String(row.tglBatch || "")
                              .split(",")
                              .filter(Boolean)
                              .map((d, i) => (
                                <span key={`${row.id}-b-${i}`} className="d-block">
                                  {fmtDate(d)}
                                </span>
                              ))}
                            {!row.tglBatch ? "—" : null}
                          </span>
                        </DataTableRow>
                      </DataTableItem>
                    ))}
                </DataTableBody>
                <div className="card-inner">
                  {loading ? (
                    <div className="admin-table-status">
                      <Spinner size="sm" color="primary" />
                      <span className="text-silent">Loading...</span>
                    </div>
                  ) : sorted.length > 0 ? (
                    sorted.length > itemPerPage ? (
                      <PaginationComponent
                        itemPerPage={itemPerPage}
                        totalItems={sorted.length}
                        paginate={setCurrentPage}
                        currentPage={currentPage}
                      />
                    ) : (
                      <div className="admin-table-status">
                        <span className="text-silent">{sorted.length} records</span>
                      </div>
                    )
                  ) : (
                    <div className="admin-table-status">
                      <span className="text-silent">No data found</span>
                    </div>
                  )}
                </div>
              </DataTable>
            </div>
          ) : null}
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default RegSlipDcrPage;
