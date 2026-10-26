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

/** Legacy module/Tools/voucher_rpt.aspx — Voucher Fisik */
const svc = createRegionalService("rpt/voucher/fisik", { crud: false });

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
const YEAR_OPTS = (() => {
  const y = new Date().getFullYear();
  const opts = [ALL_OPT];
  for (let i = y; i >= 2018; i -= 1) opts.push({ value: String(i), label: String(i) });
  return opts;
})();

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
  const iso = Date.parse(s.length >= 10 ? s.slice(0, 10) : s);
  if (!Number.isNaN(iso) && /\d{4}[-/]\d{2}[-/]\d{2}/.test(s)) return { kind: "num", raw: iso };
  const asId = s.replace(/\./g, "").replace(/,/g, "");
  if (asId !== "" && /^-?\d+(\.\d+)?$/.test(asId.replace(/,/g, ""))) {
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
  { key: "KETERANGAN", label: "Keterangan" },
  { key: "CRE_DATE", label: "Generate" },
  { key: "TIPE_VOUCHER", label: "Tipe" },
  { key: "BRAND", label: "Brand" },
  { key: "QTY", label: "Qty", className: "num" },
  { key: "NOMINAL", label: "Nilai", className: "num" },
  { key: "QTY_Z", label: "Sisa", className: "num" },
];

const RegVoucherFisikPage = () => {
  const tableRef = useRef(null);
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [year, setYear] = useState("");
  const [keywords, setKeywords] = useState("");
  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");
  const [detailStatus, setDetailStatus] = useState("ALL");
  const [detailMap, setDetailMap] = useState({});
  const [detailLoading, setDetailLoading] = useState("");
  const [detailError, setDetailError] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: "CRE_DATE", direction: "desc" });

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

  const cacheKey = (id, st) => `${id}::${st || "ALL"}`;
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
    setOpenId("");
    setDetailMap({});
    setDetailError({});
    setDetailStatus("ALL");
    try {
      const res = await svc.list({
        status: "ALL",
        keywords: keywords || "",
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
      setView({ keywords, brandId, storeId, year });
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [keywords, brandId, storeId, year]);

  const loadDetail = useCallback(async (id, st) => {
    if (!id) return;
    const key = cacheKey(id, st);
    setDetailLoading(id);
    setDetailError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await api.get(`/regional/rpt/voucher/fisik/${encodeURIComponent(id)}/detail`, {
        params: { status: st || "ALL" },
      });
      if (!isSuccess(res)) {
        setDetailError((prev) => ({ ...prev, [id]: res?.responseMessage || "Gagal memuat detail" }));
        return;
      }
      setDetailMap((prev) => ({ ...prev, [key]: extractRows(res) }));
    } catch (e) {
      setDetailError((prev) => ({ ...prev, [id]: e?.message || "Gagal memuat detail" }));
    } finally {
      setDetailLoading("");
    }
  }, []);

  const toggleOpen = useCallback(
    (id) => {
      if (openId === id) {
        setOpenId("");
        return;
      }
      setOpenId(id);
      setDetailStatus("ALL");
      const key = cacheKey(id, "ALL");
      if (!detailMap[key]) loadDetail(id, "ALL");
    },
    [openId, detailMap, loadDetail]
  );

  const changeDetailStatus = useCallback(
    (st) => {
      setDetailStatus(st);
      if (!openId) return;
      const key = cacheKey(openId, st);
      if (!detailMap[key]) loadDetail(openId, st);
    },
    [openId, detailMap, loadDetail]
  );

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;

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
        : { key, direction: key === "KETERANGAN" || key === "TIPE_VOUCHER" || key === "BRAND" ? "asc" : "desc" }
    );
  }, []);

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return "unsorted";
    return sortConfig.direction === "asc" ? "arrow-up" : "arrow-down";
  };

  return (
    <AccessGuard moduleCode="REG_RPT_VOUCHER_FISIK">
      <Head title="Voucher Fisik" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rvch-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Voucher Fisik
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
                    ? `${rows.length} batch voucher`
                    : "Pilih Brand / Store / Tahun, lalu klik Cari"}
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
                          value={YEAR_OPTS.find((o) => String(o.value) === String(year)) || null}
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
            <div className="rvch-toolbar">
              <div className="rvch-toolbar-spacer" />
              <div className="rvch-keywords">
                <input
                  type="search"
                  className="rvch-keywords-input"
                  placeholder="keterangan / No.Voucher / Brand"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadData();
                  }}
                  aria-label="Cari keterangan, no voucher, atau brand"
                />
              </div>
            </div>
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
                        const id = String(cell(r, "ID_VOUCHER"));
                        const open = openId === id;
                        const details = detailMap[cacheKey(id, detailStatus)] || [];
                        return (
                          <React.Fragment key={id}>
                            <tr
                              className={`rvch-batch-row${open ? " is-open" : ""}`}
                              onClick={() => toggleOpen(id)}
                            >
                              <td className="rvch-col-no">{idx + 1}</td>
                              <td className="rvch-col-title">{cell(r, "KETERANGAN") || id}</td>
                              <td className="rvch-col-muted">{cell(r, "CRE_DATE") || "-"}</td>
                              <td>{cell(r, "TIPE_VOUCHER") || "-"}</td>
                              <td>{cell(r, "BRAND") || "-"}</td>
                              <td className="num">{cell(r, "QTY") || "0"}</td>
                              <td className="num">{cell(r, "NOMINAL") || "0"}</td>
                              <td className="num">{cell(r, "QTY_Z") || "0"}</td>
                              <td className="rvch-col-toggle">
                                <span className="rvch-chev" aria-hidden>
                                  <Icon name={open ? "chevron-up" : "chevron-down"} />
                                </span>
                              </td>
                            </tr>
                            {open ? (
                              <tr className="rvch-detail-row">
                                <td colSpan={9}>
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
                                    {detailLoading === id ? (
                                      <div className="text-soft small mb-2">Memuat detail...</div>
                                    ) : null}
                                    {detailError[id] ? (
                                      <div className="rrd-msg err mb-2">{detailError[id]}</div>
                                    ) : null}
                                    <div className="rvch-table-shell">
                                      <table className="riv-table rvch-table">
                                        <thead>
                                          <tr>
                                            <th className="rds-no">No</th>
                                            <th className="ctr">No. Voucher</th>
                                            <th className="num">Nominal</th>
                                            <th className="ctr">Tgl Pakai</th>
                                            <th>Store Penggunaan</th>
                                            <th className="ctr">Transaksi</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {!details.length && detailLoading !== id ? (
                                            <tr>
                                              <td colSpan={6} className="rds-empty">
                                                There Is No Data
                                              </td>
                                            </tr>
                                          ) : (
                                            details.map((d, i) => (
                                              <tr key={`${cell(d, "NO_VOUCHER")}-${i}`}>
                                                <td className="rds-no">{cell(d, "ID") || i + 1}</td>
                                                <td className="ctr">{cell(d, "NO_VOUCHER")}</td>
                                                <td className="num">{cell(d, "NOMINAL")}</td>
                                                <td className="ctr">{cell(d, "TGL_DIGUNAKAN")}</td>
                                                <td>{cell(d, "STORE_PENGGUNA")}</td>
                                                <td className="ctr">
                                                  {cell(d, "STATUS") && cell(d, "STATUS") !== "-"
                                                    ? cell(d, "STATUS")
                                                    : "-"}
                                                </td>
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

export default RegVoucherFisikPage;
