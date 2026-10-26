import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import "./reg-reg-report.css";
import "./reg-daily-sales.css";
import "./reg-payment-detail.css";

/** Legacy Get_Payment_detail.aspx — dense finance table (grouped / used-columns only) */
const svc = createRegionalService("rpt/sales/payment-detail", { crud: false });

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
const ALL_OPT = { value: "ALL", label: "ALL" };

const n = (r, k) => Number(r?.[k] ?? 0) || 0;

const DETAIL_COLS = [
  { key: "CASH", label: "CASH" },
  { key: "DBCA", label: "D.BCA" },
  { key: "KBCA", label: "K.BCA" },
  { key: "DMANDIRI", label: "D.MDR" },
  { key: "KMANDIRI", label: "K.MDR" },
  { key: "DBNI", label: "D.BNI" },
  { key: "KBNI", label: "K.BNI" },
  { key: "DBRI", label: "D.BRI" },
  { key: "KBRI", label: "K.BRI" },
  { key: "VOUCHER", label: "VOUCHER" },
  { key: "VOUCHER_ONLINE", label: "V.ONLINE" },
  { key: "KOVO", label: "OVO" },
  { key: "ATOME", label: "ATOME" },
  { key: "KINDODANA", label: "INDODANA" },
  { key: "D_QRIS_BCA", label: "QRIS BCA" },
  { key: "D_QRIS_BNI", label: "QRIS BNI" },
  { key: "D_QRIS_BRI", label: "QRIS BRI" },
  { key: "D_QRIS_MANDIRI", label: "QRIS MDR" },
  { key: "ONLINE", label: "ONLINE" },
  { key: "COD", label: "COD" },
];

const GROUP_COLS = [
  { key: "CASH", label: "CASH", sum: (r) => n(r, "CASH") },
  {
    key: "DEBIT",
    label: "DEBIT",
    sum: (r) => n(r, "DBCA") + n(r, "DMANDIRI") + n(r, "DBNI") + n(r, "DBRI"),
  },
  {
    key: "KREDIT",
    label: "KREDIT",
    sum: (r) => n(r, "KBCA") + n(r, "KMANDIRI") + n(r, "KBNI") + n(r, "KBRI"),
  },
  {
    key: "QRIS",
    label: "QRIS",
    sum: (r) => n(r, "D_QRIS_BCA") + n(r, "D_QRIS_BNI") + n(r, "D_QRIS_BRI") + n(r, "D_QRIS_MANDIRI"),
  },
  {
    key: "EWALLET",
    label: "E-WALLET",
    sum: (r) => n(r, "KOVO") + n(r, "ATOME") + n(r, "KINDODANA"),
  },
  { key: "VOUCHER_G", label: "VOUCHER", sum: (r) => n(r, "VOUCHER") + n(r, "VOUCHER_ONLINE") },
  { key: "ONLINE_G", label: "ONLINE", sum: (r) => n(r, "ONLINE") + n(r, "COD") },
];

const rowTotal = (r) => {
  const t = Number(r?.totalnyaLOH);
  if (Number.isFinite(t)) return t;
  return DETAIL_COLS.reduce((s, c) => s + n(r, c.key), 0);
};

const parseYmd = (v) => {
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtDate = (v) => {
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v || "");
};

const dayNameId = (v) => {
  const d = parseYmd(v);
  if (!d) return "";
  return d.toLocaleDateString("id-ID", { weekday: "long" });
};

/** Saturday (6) / Sunday (0) */
const isWeekend = (v) => {
  const d = parseYmd(v);
  if (!d) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
};

const colVal = (c, r) => {
  if (!c) return 0;
  if (c.key === "STORE") return String(r.STORE_ID || "");
  if (c.key === "TANGGAL") return String(r.TANGGAL || "");
  if (c.key === "TOTAL") return rowTotal(r);
  return c.sum ? c.sum(r) : n(r, c.key);
};

const compareRows = (a, b, key, direction, colMap) => {
  const c = colMap[key];
  const av = colVal(c, a);
  const bv = colVal(c, b);
  let cmp = 0;
  if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
  else cmp = String(av).localeCompare(String(bv), "id", { numeric: true, sensitivity: "base" });
  return direction === "asc" ? cmp : -cmp;
};

const RegPaymentDetailPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [mode, setMode] = useState("group"); // group | detail
  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "TANGGAL", direction: "asc" });

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
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(null);
        return;
      }
      setRows(extractRows(res));
      setView({ mode });
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, fromDate, mode, storeId, toDate]);

  const columns = useMemo(() => {
    if (!view) return [];
    if (view.mode === "group") {
      return GROUP_COLS.filter((c) => rows.some((r) => c.sum(r) !== 0));
    }
    return DETAIL_COLS.filter((c) => rows.some((r) => n(r, c.key) !== 0));
  }, [rows, view]);

  const allSortCols = useMemo(
    () => [
      { key: "STORE", label: "STORE" },
      { key: "TANGGAL", label: "TANGGAL" },
      ...columns,
      { key: "TOTAL", label: "TOTAL" },
    ],
    [columns]
  );

  const colMap = useMemo(() => {
    const m = {};
    allSortCols.forEach((c) => {
      m[c.key] = c;
    });
    return m;
  }, [allSortCols]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;
    const next = [...rows];
    next.sort((a, b) => compareRows(a, b, sortConfig.key, sortConfig.direction, colMap));
    return next;
  }, [colMap, rows, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "STORE" || key === "TANGGAL" ? "asc" : "desc" }
    );
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return "unsorted";
    return sortConfig.direction === "asc" ? "arrow-up" : "arrow-down";
  };

  const footer = useMemo(() => {
    const t = { TOTAL: 0 };
    columns.forEach((c) => {
      t[c.key] = 0;
    });
    rows.forEach((r) => {
      columns.forEach((c) => {
        t[c.key] += colVal(c, r);
      });
      t.TOTAL += rowTotal(r);
    });
    return t;
  }, [columns, rows]);

  const activeMode = view?.mode || mode;

  return (
    <AccessGuard moduleCode="REG_RPT_PAYMENT">
      <Head title="Payment Detail" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Payment Detail
              </BlockTitle>
              <BlockDes className="text-soft">
                {view
                  ? `${rows.length} baris · total ${fmtNum(footer.TOTAL)}`
                  : "Filter lalu muat laporan"}
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
                    <li>
                      <select
                        className="form-select form-select-sm rds-select"
                        value={mode}
                        onChange={(e) => {
                          const m = e.target.value;
                          setMode(m);
                          if (view) setView({ mode: m });
                        }}
                        title="Tampilan"
                      >
                        <option value="group">Ringkas</option>
                        <option value="detail">Detail metode</option>
                      </select>
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
                  <table className={`rds-table rpd-table${activeMode === "group" ? " rpd-table--group" : ""}`}>
                    <thead>
                      <tr>
                        {allSortCols.map((c) => {
                          const sticky =
                            c.key === "STORE"
                              ? "rpd-sticky rpd-sticky--store"
                              : c.key === "TANGGAL"
                                ? "rpd-sticky rpd-sticky--date"
                                : c.key === "TOTAL"
                                  ? "num rpd-sticky rpd-sticky--total"
                                  : "num";
                          return (
                            <th key={c.key} className={sticky}>
                              <button
                                type="button"
                                className="rpd-sort"
                                onClick={() => handleSort(c.key)}
                              >
                                <span>{c.label}</span>
                                <Icon name={sortIcon(c.key)} />
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((r, i) => (
                        <tr
                          key={`${r.STORE_ID}-${r.TANGGAL}-${i}`}
                          className={isWeekend(r.TANGGAL) ? "rpd-weekend" : undefined}
                        >
                          <td className="rpd-sticky rpd-sticky--store">{r.STORE_ID}</td>
                          <td className="rpd-sticky rpd-sticky--date" title={dayNameId(r.TANGGAL)}>
                            {fmtDate(r.TANGGAL)}
                          </td>
                          {columns.map((c) => {
                            const v = colVal(c, r);
                            return (
                              <td key={c.key} className={`num${v === 0 ? " rpd-zero" : ""}`}>
                                {v === 0 ? "—" : fmtNum(v)}
                              </td>
                            );
                          })}
                          <td className="num rpd-sticky rpd-sticky--total rpd-total">
                            {fmtNum(rowTotal(r))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="rpd-sticky rpd-sticky--store">TOTAL</td>
                        <td className="rpd-sticky rpd-sticky--date" />
                        {columns.map((c) => (
                          <td key={c.key} className="num">
                            {fmtNum(footer[c.key])}
                          </td>
                        ))}
                        <td className="num rpd-sticky rpd-sticky--total">{fmtNum(footer.TOTAL)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="rds-meta">
                  <span>
                    {activeMode === "group"
                      ? "Ringkas: debit/kredit/QRIS digabung. Ganti ke Detail metode untuk per bank."
                      : "Detail: kolom kosong (semua 0) disembunyikan otomatis."}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default RegPaymentDetailPage;
