import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import ErrorState from "../../../components/admin/common/ErrorState";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-daily-sales.css";
import "./reg-payment-detail.css";
import "./reg-inv-report.css";

/** Legacy Seles_byM.aspx — Brand / Store / ManPower DDL / periode */
const svc = createRegionalService("rpt/sales/sales-manpower", { crud: false });

/** Same box size as AdminProjectListPage / AR Detail filter bar */
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
    maxWidth: "none",
    overflowX: "hidden",
  }),
  menuList: (base) => ({
    ...base,
    overflowX: "hidden",
  }),
  option: (base) => ({
    ...base,
    fontSize: "0.8125rem",
    padding: "6px 12px",
    whiteSpace: "nowrap",
    overflow: "visible",
    textOverflow: "clip",
  }),
  singleValue: (base) => ({
    ...base,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  }),
};

const ALL_OPT = { value: "ALL", label: "ALL" };
const PILIH_OPT = { value: "", label: "PILIH" };

const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const monthStartYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
};

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));

const COLUMNS = [
  { key: "TANGGAL_TRANSAKSI", label: "TANGGAL" },
  { key: "USER_NIK", label: "NIK" },
  { key: "USER_NAME", label: "NAMA" },
  { key: "JABATAN", label: "JABATAN" },
  { key: "TOTAL_QTY", label: "QTY", num: true },
  { key: "NILAI_SALES", label: "NILAI SALES", num: true },
];

const cellOf = (r, key) => {
  if (r == null) return null;
  if (r[key] != null) return r[key];
  const up = String(key).toUpperCase();
  const hit = Object.keys(r).find((k) => String(k).toUpperCase() === up);
  return hit != null ? r[hit] : null;
};

const normalizeRow = (r, idx) => ({
  ...r,
  id: r.id ?? `${cellOf(r, "TANGGAL_TRANSAKSI") || ""}-${cellOf(r, "USER_NIK") || ""}-${idx}`,
  TANGGAL_TRANSAKSI: cellOf(r, "TANGGAL_TRANSAKSI") ?? cellOf(r, "TANGGAL") ?? "",
  USER_NIK: cellOf(r, "USER_NIK") ?? cellOf(r, "id_sales") ?? "",
  USER_NAME: cellOf(r, "USER_NAME") ?? "",
  JABATAN: cellOf(r, "JABATAN") ?? "",
  TOTAL_QTY: cellOf(r, "TOTAL_QTY") ?? 0,
  NILAI_SALES: cellOf(r, "NILAI_SALES") ?? 0,
});

const toSortable = (value) => {
  if (value == null || value === "") return { kind: "empty", raw: "" };
  if (typeof value === "number" && Number.isFinite(value)) return { kind: "num", raw: value };
  const s = String(value).trim();
  const iso = Date.parse(s.length >= 10 ? s.slice(0, 10) : s);
  if (!Number.isNaN(iso) && /\d{4}[-/]\d{2}[-/]\d{2}/.test(s)) return { kind: "num", raw: iso };
  const asId = s.replace(/\./g, "").replace(/,/g, "");
  if (asId !== "" && /^-?\d+(\.\d+)?$/.test(asId)) {
    const n = Number(asId);
    if (Number.isFinite(n)) return { kind: "num", raw: n };
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
  else cmp = String(left.raw).localeCompare(String(right.raw), "id", { numeric: true, sensitivity: "base" });
  return direction === "desc" ? -cmp : cmp;
};

const RegSalesManpowerPage = () => {
  const tableRef = useRef(null);
  const [sm, setSm] = useState(false);
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [nik, setNik] = useState("");
  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);
  const [manpowerOpts, setManpowerOpts] = useState([PILIH_OPT]);
  const [manpowerLoading, setManpowerLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "TANGGAL_TRANSAKSI", direction: "asc" });

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
  }, []);

  useEffect(() => {
    const parentId = brandId === "ALL" ? "" : brandId;
    regionalLookupOptions("store", { parentId }).then((opts) => {
      const list = (Array.isArray(opts) ? opts : []).filter(
        (o) => String(o.value).toUpperCase() !== "ALL"
      );
      setStoreOpts([ALL_OPT, ...list]);
    });
    setStoreId("");
    setNik("");
    setManpowerOpts([PILIH_OPT]);
  }, [brandId]);

  /* Legacy ddlStore_TextChanged → BindManPowerSalesGH(ddlManPower, store) */
  useEffect(() => {
    let cancelled = false;
    setNik("");
    if (!storeId || storeId === "ALL") {
      setManpowerOpts([PILIH_OPT]);
      return undefined;
    }
    setManpowerLoading(true);
    regionalLookupOptions("manpower", { parentId: storeId, force: true })
      .then((opts) => {
        if (cancelled) return;
        const list = (Array.isArray(opts) ? opts : []).filter(
          (o) => o.value && !["ALL", "PILIH", ""].includes(String(o.value).toUpperCase())
        );
        setManpowerOpts([PILIH_OPT, ...list]);
      })
      .catch(() => {
        if (!cancelled) setManpowerOpts([PILIH_OPT]);
      })
      .finally(() => {
        if (!cancelled) setManpowerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const canSearch = Boolean(
    brandId && storeId && storeId !== "ALL" && nik && fromDate && toDate
  );

  const load = useCallback(async () => {
    if (!brandId || !storeId || storeId === "ALL") {
      setError("Pilih Store terlebih dahulu");
      setLoaded(false);
      return;
    }
    if (!nik) {
      setError("Pilih Nama / NIK terlebih dahulu");
      setLoaded(false);
      return;
    }
    if (!fromDate || !toDate) {
      setError("Tanggal wajib diisi");
      setLoaded(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
        id_member: String(nik || "").trim(),
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setLoaded(true);
        return;
      }
      setRows(extractRows(res).map(normalizeRow));
      setLoaded(true);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [brandId, fromDate, nik, storeId, toDate]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;
    const next = [...rows];
    next.sort((a, b) => compareRows(a, b, sortConfig.key, sortConfig.direction));
    return next;
  }, [rows, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return "unsorted";
    return sortConfig.direction === "asc" ? "arrow-up" : "arrow-down";
  };

  const nikValue = manpowerOpts.find((o) => String(o.value) === String(nik)) || PILIH_OPT;
  const scrollRevision = `${loading ? "loading" : "ready"}-${sortedRows.length}-${sortConfig.key}-${sortConfig.direction}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_SALES_MANPOWER">
      <Head title="Sales By Man Power" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Sales By Man Power
                </BlockTitle>
                <BlockDes className="text-soft">
                  {!loaded
                    ? "Isi filter lalu klik Cari untuk memuat data"
                    : `You have total ${rows.length} sales by man power`}
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
                            onChange={(f, t) => {
                              setFromDate(f || "");
                              setToDate(t || "");
                            }}
                          />
                        </div>
                      </li>
                      <li className="hrd-filter-select">
                        <RSelect
                          className="hrd-filter-rselect"
                          styles={filterSelectStyles}
                          isSearchable
                          isClearable
                          placeholder="Brand"
                          options={brandOpts}
                          value={brandOpts.find((o) => String(o.value) === String(brandId)) || null}
                          onChange={(o) => setBrandId(o?.value ?? "")}
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
                          value={storeOpts.find((o) => String(o.value) === String(storeId)) || null}
                          onChange={(o) => setStoreId(o?.value ?? "")}
                        />
                      </li>
                      <li className="hrd-filter-select">
                        <RSelect
                          className="hrd-filter-rselect"
                          styles={filterSelectStyles}
                          options={manpowerOpts}
                          value={nikValue}
                          onChange={(o) => setNik(o?.value != null ? String(o.value) : "")}
                          placeholder={manpowerLoading ? "Memuat..." : "Nama / NIK"}
                          isDisabled={!storeId || storeId === "ALL" || manpowerLoading}
                          isSearchable
                        />
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
            {error && !loading ? (
              <ErrorState message={error} onRetry={load} />
            ) : null}
            {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}
            {!loaded && !loading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}
            {loaded && !error && !rows.length && !loading ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}

            {loaded && rows.length > 0 ? (
              <div className="card rsa-card">
                <div className="card-inner">
                  <div className="rds-table-wrap mt-3">
                    <table ref={tableRef} className="rds-table">
                      <thead>
                        <tr>
                          {COLUMNS.map((c) => (
                            <th key={c.key} className={c.num ? "num" : ""}>
                              <button
                                type="button"
                                className="rpd-sort"
                                onClick={() => handleSort(c.key)}
                              >
                                <span>{c.label}</span>
                                <Icon name={sortIcon(c.key)} />
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((r, i) => (
                          <tr key={r.id || i}>
                            {COLUMNS.map((c) => (
                              <td key={c.key} className={c.num ? "num" : ""}>
                                {c.num ? fmtNum(r[c.key]) : r[c.key] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rds-meta">
                    <span>{rows.length} baris</span>
                  </div>
                  <RivStickyThead
                    tableRef={tableRef}
                    enabled={Boolean(loaded && sortedRows.length)}
                    tableClassName="rds-table"
                  />
                </div>
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegSalesManpowerPage;
