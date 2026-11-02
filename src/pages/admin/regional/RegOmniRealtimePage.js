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
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import "./reg-omni-realtime.css";

/** Realtime Stock — Redis cache per store (warmer); Reload = refresh=1 SQL rebuild. */
const svc = createRegionalService("rpt/omni/realtime-stock", { crud: false });

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));

const filterSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 32,
    height: 32,
    fontSize: "0.8125rem",
    backgroundColor: "#fff",
    borderColor: "#dbdfea",
    color: "#364a63",
  }),
  singleValue: (base) => ({ ...base, color: "#364a63" }),
  placeholder: (base) => ({ ...base, color: "#8094ae" }),
  input: (base) => ({ ...base, margin: 0, padding: 0, color: "#364a63" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: "0.8125rem",
    backgroundColor: "#fff",
    color: "#364a63",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menuList: (base) => ({ ...base, maxHeight: 280, backgroundColor: "#fff" }),
  option: (base, state) => ({
    ...base,
    color: "#364a63",
    backgroundColor: state.isSelected ? "#e5e9f2" : state.isFocused ? "#f5f6fa" : "#fff",
    cursor: "pointer",
  }),
};

const COLS = [
  { key: "brand", label: "Brand" },
  { key: "store_id", label: "Store ID" },
  { key: "kota", label: "Kota" },
  { key: "provinsi", label: "Provinsi" },
  { key: "pulau", label: "Pulau" },
  { key: "article", label: "Article" },
  { key: "plu", label: "PLU" },
  { key: "qty", label: "Qty", num: true },
  { key: "size", label: "Size" },
  { key: "color", label: "Color" },
];

const cellOf = (r, key) => {
  if (r == null) return null;
  if (r[key] != null) return r[key];
  const up = String(key).toUpperCase();
  const hit = Object.keys(r).find((k) => String(k).toUpperCase() === up);
  return hit != null ? r[hit] : null;
};

const fmtBuiltAt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("id-ID");
};

const RegOmniRealtimePage = () => {
  const [storeOpts, setStoreOpts] = useState([{ value: "", label: "PILIH STORE" }]);
  const [storeId, setStoreId] = useState("");
  const [article, setArticle] = useState("");
  const [articleDraft, setArticleDraft] = useState("");
  const [rows, setRows] = useState([]);
  const [totalQty, setTotalQty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [source, setSource] = useState("");
  const [builtAt, setBuiltAt] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [movementFrom, setMovementFrom] = useState("");
  const [sort, setSort] = useState({ key: "brand", dir: "ASC" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const opts = await regionalLookupOptions("store_all");
        if (cancel) return;
        setStoreOpts([{ value: "", label: "PILIH STORE" }, ...opts]);
      } catch {
        if (!cancel) setStoreOpts([{ value: "", label: "PILIH STORE" }]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const loadStore = useCallback(async (sid, { keepArticle = true, refresh = false } = {}) => {
    const store = String(sid || "").trim();
    if (!store) {
      setRows([]);
      setTotalQty(0);
      setLoaded(false);
      setError("");
      setInfo("");
      setSource("");
      setBuiltAt("");
      setCloseDate("");
      setMovementFrom("");
      return;
    }
    setLoading(true);
    setRebuilding(!!refresh);
    setError("");
    setInfo("");
    try {
      const res = await svc.list({
        store_id: store,
        ...(refresh ? { refresh: "1" } : {}),
      });
      if (!isSuccess(res)) {
        setRows([]);
        setTotalQty(0);
        setLoaded(true);
        setSource(res?.source || "");
        setBuiltAt(res?.built_at || "");
        setCloseDate(res?.close_date || "");
        setMovementFrom(res?.movement_from || "");
        setError(res?.responseMessage || "Gagal mengambil data");
        return;
      }
      const list = extractRows(res);
      const src = String(res?.source || "");
      const tq =
        res?.total_qty != null
          ? Number(res.total_qty)
          : list.reduce((s, r) => s + Number(cellOf(r, "qty") || 0), 0);
      setRows(list);
      setTotalQty(tq);
      setLoaded(true);
      setSource(src);
      setBuiltAt(res?.built_at || "");
      setCloseDate(res?.close_date || "");
      setMovementFrom(res?.movement_from || "");
      if (!keepArticle) {
        setArticle("");
        setArticleDraft("");
      }
      if (src === "miss") {
        setInfo(
          res?.responseMessage ||
            "Belum di-cache. Tunggu background warmer atau klik Reload (bisa 2–3 menit)."
        );
      } else if (!list.length) {
        setInfo("API sukses tetapi tidak ada data untuk ditampilkan.");
      }
    } catch (e) {
      setRows([]);
      setTotalQty(0);
      setLoaded(true);
      setSource("");
      setBuiltAt("");
      setCloseDate("");
      setMovementFrom("");
      setError(e?.responseMessage || e?.message || "Gagal mengambil data");
    } finally {
      setLoading(false);
      setRebuilding(false);
    }
  }, []);

  const onStoreChange = (opt) => {
    const next = opt?.value || "";
    setStoreId(next);
    setArticle("");
    setArticleDraft("");
    loadStore(next, { keepArticle: false, refresh: false });
  };

  const onSearch = () => {
    setArticle(articleDraft.trim());
  };

  const onReload = () => {
    setArticle("");
    setArticleDraft("");
    loadStore(storeId, { keepArticle: false, refresh: true });
  };

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "ASC" ? "DESC" : "ASC" }
        : { key, dir: "ASC" }
    );
  };

  const visibleRows = useMemo(() => {
    const needle = article.trim().toUpperCase();
    let list = needle
      ? rows.filter((r) => String(cellOf(r, "article") || "").toUpperCase().includes(needle))
      : rows.slice();
    const { key, dir } = sort;
    const mul = dir === "ASC" ? 1 : -1;
    list.sort((a, b) => {
      const va = cellOf(a, key);
      const vb = cellOf(b, key);
      if (key === "qty") {
        return (Number(va || 0) - Number(vb || 0)) * mul;
      }
      return String(va ?? "").localeCompare(String(vb ?? ""), "id", { sensitivity: "base" }) * mul;
    });
    return list;
  }, [rows, article, sort]);

  const storeValue =
    storeOpts.find((o) => String(o.value) === String(storeId)) || storeOpts[0];

  const scrollRevision = `${storeId}-${loading}-${visibleRows.length}-${sort.key}-${sort.dir}-${article}-${source}`;

  const sourceLabel =
    source === "cache"
      ? "cache"
      : source === "sql"
        ? "sql rebuild"
        : source === "miss"
          ? "belum cache"
          : source || "";

  return (
    <AccessGuard moduleCode="REG_RPT_OMNI_RT">
      <Head title="Realtime Stock" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Realtime Stock
                </BlockTitle>
                <BlockDes className="text-soft">
                  Cache Redis per store (warmer otomatis). Reload = hitung ulang SQL store ini.
                </BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="omni-rt card card-bordered">
              <div className="omni-rt-toolbar">
                <div className="omni-rt-filters">
                  <div className="omni-rt-f omni-rt-f-store">
                    <RSelect
                      styles={filterSelectStyles}
                      isSearchable
                      options={storeOpts}
                      value={storeValue}
                      onChange={onStoreChange}
                      placeholder="PILIH STORE"
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      menuPosition="fixed"
                    />
                  </div>
                  <div className="omni-rt-f">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Filter Article..."
                      value={articleDraft}
                      disabled={!storeId || loading}
                      onChange={(e) => setArticleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSearch();
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!storeId || loading}
                    onClick={onSearch}
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    className="btn btn-dim btn-outline-light btn-sm"
                    disabled={!storeId || loading}
                    onClick={onReload}
                    title="Rebuild SQL + tulis ulang cache (bisa 2–3 menit)"
                  >
                    <Icon name="reload" /> {rebuilding ? "Rebuilding..." : "Reload"}
                  </button>
                </div>
                <div className="omni-rt-meta">
                  {sourceLabel ? <span className="omni-rt-source">{sourceLabel}</span> : null}
                  {builtAt ? <span className="omni-rt-built">built {fmtBuiltAt(builtAt)}</span> : null}
                  <div className="omni-rt-total">
                    TOTAL QTY <strong>{fmtNum(totalQty)}</strong>
                  </div>
                </div>
              </div>

              {error ? <div className="omni-rt-msg err">{error}</div> : null}
              {!error && info ? <div className="omni-rt-msg">{info}</div> : null}
              {rebuilding ? (
                <div className="omni-rt-msg">
                  Sedang rebuild SQL untuk store ini — bisa 2–3 menit, jangan tutup halaman.
                </div>
              ) : null}
              {storeId && (closeDate || builtAt || source === "miss") ? (
                <div className="omni-rt-log" role="status">
                  <div>
                    <strong>Store</strong> {storeId}
                  </div>
                  <div>
                    <strong>Closing stock (Z)</strong> {closeDate || "—"}
                  </div>
                  <div>
                    <strong>Mutasi dari</strong> {movementFrom || "—"}
                  </div>
                  <div>
                    <strong>Tarikan / cache</strong> {builtAt ? fmtBuiltAt(builtAt) : "—"}
                    {sourceLabel ? ` · ${sourceLabel}` : ""}
                  </div>
                </div>
              ) : null}

              <div className="table-responsive omni-rt-table-wrap">
                <table className="table table-hover nk-tb-list nk-tb-ulist omni-rt-table">
                  <thead>
                    <tr>
                      {COLS.map((c) => (
                        <th
                          key={c.key}
                          className={`omni-rt-sortable${c.num ? " num" : ""}`}
                          onClick={() => toggleSort(c.key)}
                        >
                          {c.label}
                          {sort.key === c.key ? (
                            <Icon name={sort.dir === "ASC" ? "caret-up-fill" : "caret-down-fill"} />
                          ) : null}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && !rebuilding ? (
                      <tr>
                        <td colSpan={COLS.length} className="text-center text-soft">
                          Memuat cache...
                        </td>
                      </tr>
                    ) : null}
                    {!loading && loaded && !visibleRows.length ? (
                      <tr>
                        <td colSpan={COLS.length} className="text-center text-soft">
                          {source === "miss" ? "Belum ada cache untuk store ini." : "Tidak ada data."}
                        </td>
                      </tr>
                    ) : null}
                    {!loading &&
                      visibleRows.map((r, i) => (
                        <tr key={`${cellOf(r, "plu")}-${cellOf(r, "store_id")}-${i}`}>
                          {COLS.map((c) => (
                            <td key={c.key} className={c.num ? "num" : undefined}>
                              {c.num ? fmtNum(cellOf(r, c.key)) : cellOf(r, c.key) ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegOmniRealtimePage;
