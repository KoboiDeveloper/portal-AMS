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

/** Legacy Promosi_v.aspx (REG) — GET /regional/rpt/sales/promosi */
const svc = createRegionalService("rpt/sales/promosi", { crud: false });

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem" }),
};

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayYmd = () => ymd(new Date());
const monthStartYmd = () => {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
};

const ALL_OPT = { value: "ALL", label: "ALL" };
const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

const COLUMNS = [
  { key: "ID_STORE", label: "STORE" },
  { key: "PLU", label: "PLU" },
  { key: "KETERANGAN", label: "KETERANGAN" },
  { key: "QTY", label: "QTY", num: true },
  { key: "POT_HRG", label: "POT HRG", num: true },
  { key: "START_DATE", label: "START DATE" },
  { key: "END_DATE", label: "END DATE" },
  { key: "STATUS_KIRIM", label: "STATUS KIRIM" },
];

const cell = (r, key) => {
  if (r?.[key] != null && r[key] !== "") return r[key];
  const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === String(key).toUpperCase());
  return hit != null ? r[hit] : "";
};

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
  const left = toSortable(cell(a, key));
  const right = toSortable(cell(b, key));
  let cmp = 0;
  if (left.kind === "empty" && right.kind !== "empty") cmp = 1;
  else if (right.kind === "empty" && left.kind !== "empty") cmp = -1;
  else if (left.kind === "num" && right.kind === "num") cmp = left.raw - right.raw;
  else cmp = String(left.raw).localeCompare(String(right.raw), "id", { numeric: true, sensitivity: "base" });
  return direction === "desc" ? -cmp : cmp;
};

const fmtCell = (col, r) => {
  const v = cell(r, col.key);
  if (v === "" || v == null) return "—";
  if (col.num) {
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? nf0.format(n) : String(v);
  }
  return String(v);
};

const RegPromosiPage = () => {
  const tableRef = useRef(null);
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [plu, setPlu] = useState("");
  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "ID_STORE", direction: "asc" });

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
  }, [brandId]);

  const canSearch = Boolean(brandId && storeId && fromDate && toDate);

  const load = useCallback(async () => {
    if (!brandId || !storeId || !fromDate || !toDate) {
      setError("Pilih Brand, Store, dan tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = {
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
      };
      if (plu.trim()) params.plu = plu.trim();
      const res = await svc.list(params);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(false);
        return;
      }
      setRows(extractRows(res));
      setView(true);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(false);
    } finally {
      setLoading(false);
    }
  }, [brandId, fromDate, plu, storeId, toDate]);

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

  const scrollRevision = `${loading ? "loading" : "ready"}-${sortedRows.length}-${sortConfig.key}-${sortConfig.direction}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_PROMOSI">
      <Head title="Promosi" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Promosi
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view ? `${rows.length} baris` : "Filter lalu muat laporan"}
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
                      <li>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          style={{ minWidth: 110 }}
                          placeholder="PLU"
                          value={plu}
                          onChange={(e) => setPlu(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && canSearch) load();
                          }}
                          aria-label="PLU"
                        />
                      </li>
                      <li>
                        <button
                          type="button"
                          className="btn btn-icon btn-trigger admin-filter-premium-btn"
                          onClick={load}
                          disabled={loading || !canSearch}
                          title={canSearch ? "Filter" : "Pilih filter dulu"}
                          aria-label="Filter"
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
            {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
            {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

            {!view && !loading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}
            {view && !error && !rows.length ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}

            {view && rows.length > 0 ? (
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
                          <tr key={`${cell(r, "ID_STORE")}-${cell(r, "PLU")}-${i}`}>
                            {COLUMNS.map((c) => (
                              <td key={c.key} className={c.num ? "num" : ""}>
                                {fmtCell(c, r)}
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
                    enabled={Boolean(view && sortedRows.length)}
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

export default RegPromosiPage;
