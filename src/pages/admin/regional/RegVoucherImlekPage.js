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
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import api from "../../../lib/api";
import { extractRows, isSuccess } from "../../../lib/response";
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-sales-detail.css";
import "./reg-inv-report.css";
import "./reg-voucher-report.css";

/** Legacy module/Tools/voucher_imlek_rpt.aspx — Voucher Imlek */
const svc = createRegionalService("rpt/voucher/imlek", { crud: false });

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem" }),
};

const ALL_OPT = { value: "ALL", label: "ALL" };
const DETAIL_STATUS = [
  { value: "ALL", label: "Semua" },
  { value: "TERPAKAI", label: "Terpakai" },
  { value: "BELUM TERPAKAI", label: "Belum" },
];

/** Tahun = YEAR(DT_PROMOSI_STORE.START_DATE) — data historis hanya 2020/2019/2010 */
const YEAR_OPTS = [
  ALL_OPT,
  { value: "2020", label: "2020" },
  { value: "2019", label: "2019" },
  { value: "2010", label: "2010" },
];

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const toSortable = (value) => {
  if (value == null || value === "") return { kind: "empty", raw: "" };
  if (typeof value === "number" && Number.isFinite(value)) return { kind: "num", raw: value };
  const s = String(value).trim();
  const asId = s.replace(/\./g, "").replace(/,/g, "");
  if (asId !== "" && /^-?\d+(\.\d+)?$/.test(asId)) {
    const n = Number(asId);
    if (Number.isFinite(n)) return { kind: "num", raw: n };
  }
  return { kind: "str", raw: s.toLowerCase() };
};

const compareCell = (a, b, direction) => {
  const left = toSortable(a);
  const right = toSortable(b);
  let cmp = 0;
  if (left.kind === "empty" && right.kind !== "empty") cmp = 1;
  else if (right.kind === "empty" && left.kind !== "empty") cmp = -1;
  else if (left.kind === "num" && right.kind === "num") cmp = left.raw - right.raw;
  else cmp = String(left.raw).localeCompare(String(right.raw), "id", { numeric: true });
  return direction === "desc" ? -cmp : cmp;
};

const BATCH_SORT_COLS = [
  { key: "TIPE", label: "Tipe" },
  { key: "STORE_ID", label: "Store" },
  { key: "NOMINAL", label: "Nilai", className: "num" },
];

const rowKey = (r) => `${cell(r, "ID_PROMO")}__${cell(r, "STORE_ID")}`;
const cacheKey = (key, st) => `${key}::${st || "ALL"}`;

const RegVoucherImlekPage = () => {
  const tableRef = useRef(null);
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [year, setYear] = useState("");
  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openKey, setOpenKey] = useState("");
  const [openRow, setOpenRow] = useState(null);
  const [detailStatus, setDetailStatus] = useState("ALL");
  const [detailMap, setDetailMap] = useState({});
  const [detailLoading, setDetailLoading] = useState("");
  const [detailError, setDetailError] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: "TIPE", direction: "asc" });

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
  }, []);

  useEffect(() => {
    regionalLookupOptions("store", { parentId: brandId === "ALL" ? "" : brandId || "" }).then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setStoreOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
    setStoreId("");
  }, [brandId]);

  const canSearch = Boolean(brandId && storeId && year);

  const loadData = useCallback(async () => {
    if (!brandId || !storeId || !year) {
      setError("Pilih Brand, Store, dan Tahun dulu.");
      setRows([]);
      setView(null);
      return;
    }
    setLoading(true);
    setError("");
    setOpenKey("");
    setOpenRow(null);
    setDetailMap({});
    setDetailError({});
    setDetailStatus("ALL");
    try {
      const res = await svc.list({
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
        year: year || "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setView(null);
        return;
      }
      setRows(extractRows(res));
      setView({ brandId, storeId, year });
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, storeId, year]);

  const loadDetail = useCallback(async (r, st) => {
    const key = rowKey(r);
    const promo = String(cell(r, "ID_PROMO"));
    const store = String(cell(r, "STORE_ID"));
    if (!promo || !store) return;
    setDetailLoading(key);
    setDetailError((prev) => ({ ...prev, [key]: "" }));
    try {
      const res = await api.get(`/regional/rpt/voucher/imlek/${encodeURIComponent(promo)}/detail`, {
        params: { id_cabang: store, status: st || "ALL" },
      });
      if (!isSuccess(res)) {
        setDetailError((prev) => ({ ...prev, [key]: res?.responseMessage || "Gagal memuat detail" }));
        return;
      }
      setDetailMap((prev) => ({ ...prev, [cacheKey(key, st)]: extractRows(res) }));
    } catch (e) {
      setDetailError((prev) => ({ ...prev, [key]: e?.message || "Gagal memuat detail" }));
    } finally {
      setDetailLoading("");
    }
  }, []);

  const toggleOpen = useCallback(
    (r) => {
      const key = rowKey(r);
      if (openKey === key) {
        setOpenKey("");
        setOpenRow(null);
        return;
      }
      setOpenKey(key);
      setOpenRow(r);
      setDetailStatus("ALL");
      if (!detailMap[cacheKey(key, "ALL")]) loadDetail(r, "ALL");
    },
    [openKey, detailMap, loadDetail]
  );

  const changeDetailStatus = useCallback(
    (st) => {
      setDetailStatus(st);
      if (!openRow) return;
      const key = rowKey(openRow);
      if (!detailMap[cacheKey(key, st)]) loadDetail(openRow, st);
    },
    [openRow, detailMap, loadDetail]
  );

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;
  const yearValue = useMemo(
    () => YEAR_OPTS.find((o) => String(o.value) === String(year)) || null,
    [year]
  );

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;
    const next = [...rows];
    next.sort((a, b) =>
      compareCell(cell(a, sortConfig.key), cell(b, sortConfig.key), sortConfig.direction)
    );
    return next;
  }, [rows, sortConfig]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "NOMINAL" ? "desc" : "asc" }
    );
  }, []);

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return "unsorted";
    return sortConfig.direction === "asc" ? "arrow-up" : "arrow-down";
  };

  return (
    <AccessGuard moduleCode="REG_RPT_VOUCHER_IMLEK">
      <Head title="Voucher Imlek" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rvch-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Voucher Imlek
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
                    ? `${rows.length} promo · tahun = START_DATE`
                    : "Pilih Brand / Store / Tahun (START_DATE), lalu klik Cari"}
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
                          value={storeOpts.find((o) => String(o.value) === String(storeId)) || null}
                          onChange={(opt) => setStoreId(opt?.value != null ? String(opt.value) : "")}
                        />
                      </li>
                      <li className="hrd-filter-select" style={{ minWidth: 100 }}>
                        <RSelect
                          className="hrd-filter-rselect"
                          styles={filterSelectStyles}
                          isClearable
                          isSearchable
                          placeholder="Tahun"
                          options={YEAR_OPTS}
                          value={yearValue}
                          onChange={(opt) => setYear(opt?.value != null ? String(opt.value) : "")}
                        />
                      </li>
                      <li>
                        <button
                          type="button"
                          className="btn btn-icon btn-trigger admin-filter-premium-btn"
                          onClick={loadData}
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
            {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
            {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

            {!view && !loading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}

            {view ? (
              <div className="rvch-batch-wrap">
                {!rows.length ? (
                  <div className="rvch-empty">There Is No Data</div>
                ) : (
                  <table ref={tableRef} className="rvch-batch-table">
                    <thead>
                      <tr>
                        <th className="rvch-col-no">No</th>
                        {BATCH_SORT_COLS.map((col) => (
                          <th key={col.key} className={col.className || undefined}>
                            <button
                              type="button"
                              className={`admin-sort-trigger${sortConfig.key === col.key ? " is-active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSort(col.key);
                              }}
                            >
                              <span className="sub-text">{col.label}</span>
                              <Icon name={sortIcon(col.key)} />
                            </button>
                          </th>
                        ))}
                        <th className="rvch-col-toggle" aria-hidden />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((r, idx) => {
                        const key = rowKey(r);
                        const open = openKey === key;
                        const details = detailMap[cacheKey(key, detailStatus)] || [];
                        return (
                          <React.Fragment key={key}>
                            <tr
                              className={`rvch-batch-row${open ? " is-open" : ""}`}
                              onClick={() => toggleOpen(r)}
                            >
                              <td className="rvch-col-no">{idx + 1}</td>
                              <td className="rvch-col-title">{cell(r, "TIPE")}</td>
                              <td>{cell(r, "STORE_ID") || "-"}</td>
                              <td className="num">{fmtNum(cell(r, "NOMINAL"))}</td>
                              <td className="rvch-col-toggle">
                                <span className="rvch-chev" aria-hidden>
                                  <Icon name={open ? "chevron-up" : "chevron-down"} />
                                </span>
                              </td>
                            </tr>
                            {open ? (
                              <tr className="rvch-detail-row">
                                <td colSpan={5}>
                                  <div className="rvch-body">
                                    <div className="rvch-detail-bar">
                                      <span className="rvch-detail-label">Detail voucher</span>
                                      <div className="rvch-seg" role="group" aria-label="Filter pemakaian">
                                        {DETAIL_STATUS.map((opt) => (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            className={detailStatus === opt.value ? "is-active" : ""}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              changeDetailStatus(opt.value);
                                            }}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    {detailLoading === key ? (
                                      <div className="text-soft small mb-2">Memuat detail...</div>
                                    ) : null}
                                    {detailError[key] ? (
                                      <div className="rrd-msg err mb-2">{detailError[key]}</div>
                                    ) : null}
                                    <div className="rvch-table-shell">
                                      <table className="riv-table rvch-table">
                                        <thead>
                                          <tr>
                                            <th className="rds-no">No</th>
                                            <th className="ctr">No. Voucher</th>
                                            <th className="num">Nominal</th>
                                            <th className="ctr">Tgl Pakai</th>
                                            <th className="ctr">Store Penggunaan</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {!details.length && detailLoading !== key ? (
                                            <tr>
                                              <td colSpan={5} className="rds-empty">
                                                There Is No Data
                                              </td>
                                            </tr>
                                          ) : (
                                            details.map((d, i) => (
                                              <tr key={`${cell(d, "NO_VOUCHER")}-${i}`}>
                                                <td className="rds-no">{cell(d, "ID") || i + 1}</td>
                                                <td className="ctr">{cell(d, "NO_VOUCHER")}</td>
                                                <td className="num">{fmtNum(cell(d, "NOMINAL"))}</td>
                                                <td className="ctr">{cell(d, "TGL_DIGUNAKAN")}</td>
                                                <td className="ctr">{cell(d, "STORE_PENGGUNA")}</td>
                                              </tr>
                                            ))
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <RivStickyThead
                  tableRef={tableRef}
                  enabled={Boolean(view && sortedRows.length)}
                  tableClassName="rvch-batch-table"
                />
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegVoucherImlekPage;
