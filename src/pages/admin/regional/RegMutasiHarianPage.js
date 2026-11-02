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

/** Legacy mutasi harian (REG) — GET /regional/rpt/inv/mutasi-harian */
const svc = createRegionalService("rpt/inv/mutasi-harian", { crud: false });

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

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));

const COLUMNS = [
  { key: "Store_ID", label: "STORE" },
  { key: "TANGGAL", label: "TANGGAL" },
  { key: "A", label: "A", num: true },
  { key: "ST_IN", label: "ST IN", num: true },
  { key: "TRADE_IN", label: "TRADE IN", num: true },
  { key: "ST_OUT", label: "ST OUT", num: true },
  { key: "TRADE_OUT", label: "TRADE OUT", num: true },
  { key: "SALES", label: "SALES", num: true },
  { key: "ADJ", label: "ADJ", num: true },
  { key: "Z", label: "Z", num: true },
  { key: "AA", label: "AA", num: true },
  { key: "SELISIH", label: "SELISIH", num: true },
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
  if (v === "" || v == null) return col.num ? "0" : "—";
  if (col.num) {
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? fmtNum(n) : String(v);
  }
  return String(v);
};

const RegMutasiHarianPage = () => {
  const tableRef = useRef(null);
  const [sm, setSm] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [storeOpts, setStoreOpts] = useState([]);
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "TANGGAL", direction: "asc" });

  useEffect(() => {
    regionalLookupOptions("store").then((opts) => {
      const list = (Array.isArray(opts) ? opts : []).filter(
        (o) => String(o.value).toUpperCase() !== "ALL"
      );
      setStoreOpts(list);
    });
  }, []);

  const canSearch = Boolean(storeId && fromDate && toDate);

  const load = useCallback(async () => {
    if (!storeId || !fromDate || !toDate) {
      setError("Pilih Store dan tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        id_store: storeId,
        from_date: fromDate,
        to_date: toDate,
      });
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
  }, [fromDate, storeId, toDate]);

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
    <AccessGuard moduleCode="REG_RPT_MUTASI_HARIAN">
      <Head title="Mutasi Harian" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Mutasi Harian
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view ? `${rows.length} baris` : "Pilih Store dan tanggal lalu Filter"}
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
                          <tr key={`${cell(r, "Store_ID")}-${cell(r, "TANGGAL")}-${i}`}>
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

export default RegMutasiHarianPage;
