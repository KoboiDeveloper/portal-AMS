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
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { createRegionalService } from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import "./reg-omni-varian.css";

/** Legacy module/omni/varian_stock.aspx — article, size, color, provinsi, sisa per store.
 *  Qty comes from SQL (closing + movements). This page does not read or delete Redis keys. */
const svc = createRegionalService("rpt/omni/varian-stock", { crud: false });

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));

const cellOf = (r, key) => {
  if (r == null) return null;
  if (r[key] != null) return r[key];
  const up = String(key).toUpperCase();
  const hit = Object.keys(r).find((k) => String(k).toUpperCase() === up);
  return hit != null ? r[hit] : null;
};

const same = (a, b) => String(a || "").toUpperCase() === String(b || "").toUpperCase();

const distinct = (rows, key) => {
  const seen = new Set();
  const out = [];
  rows.forEach((r) => {
    const v = String(cellOf(r, key) ?? "").trim();
    if (!v) return;
    const id = v.toUpperCase();
    if (seen.has(id)) return;
    seen.add(id);
    out.push(v);
  });
  return out;
};

const RegOmniVarianPage = () => {
  const [article, setArticle] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [provinsi, setProvinsi] = useState("ALL");
  const [provinces, setProvinces] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [attrLoading, setAttrLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [attrArticle, setAttrArticle] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [sortQty, setSortQty] = useState("desc");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await svc.list({ tipe: "PROVINSI" });
        if (cancel) return;
        if (!isSuccess(res)) return;
        setProvinces(distinct(extractRows(res), "provinsi"));
      } catch {
        /* dropdown stays ALL when the province list cannot be loaded */
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const loadAttr = useCallback(async (value) => {
    const next = String(value || "").trim();
    if (next.toUpperCase() === attrArticle.toUpperCase()) return;
    setAttrArticle(next);
    setSize("");
    setColor("");
    setRows([]);
    setApplied(false);
    setInfo("");
    setError("");
    if (!next) {
      setSizes([]);
      setColors([]);
      return;
    }
    setAttrLoading(true);
    try {
      const res = await svc.list({ tipe: "ATTR", article: next });
      if (!isSuccess(res)) {
        setSizes([]);
        setColors([]);
        setError(res?.responseMessage || "Gagal memuat size dan color");
        return;
      }
      const list = extractRows(res);
      setSizes(distinct(list, "size"));
      setColors(distinct(list, "color"));
    } catch (e) {
      setSizes([]);
      setColors([]);
      setError(e?.message || "Gagal memuat size dan color");
    } finally {
      setAttrLoading(false);
    }
  }, [attrArticle]);

  const clearFilter = () => {
    setSize("");
    setColor("");
    setRows([]);
    setApplied(false);
    setInfo("");
    setError("");
  };

  const apply = async () => {
    const art = article.trim();
    if (!art) {
      setError("Silakan isi Article terlebih dahulu.");
      setRows([]);
      setApplied(true);
      setInfo("");
      return;
    }
    if (!size) {
      setError("Silakan pilih Size.");
      setRows([]);
      setApplied(true);
      setInfo("");
      return;
    }
    if (!color) {
      setError("Silakan pilih Color.");
      setRows([]);
      setApplied(true);
      setInfo("");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await svc.list({
        tipe: "STOCK",
        article: art,
        kategori: size,
        group: color,
        provinsi: provinsi && provinsi !== "ALL" ? provinsi : "",
      });
      if (!isSuccess(res)) {
        setRows([]);
        setApplied(true);
        setError(res?.responseMessage || "Gagal mengambil hasil");
        return;
      }
      const list = extractRows(res);
      setRows(list);
      setApplied(true);
      setInfo(
        list.length
          ? `Hasil ditemukan: ${list.length} store.`
          : "Tidak ditemukan stok untuk kombinasi filter tersebut."
      );
    } catch (e) {
      setRows([]);
      setApplied(true);
      setError(e?.responseMessage || e?.message || "Gagal mengambil hasil");
    } finally {
      setLoading(false);
    }
  };

  const [pinFilter, setPinFilter] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1025px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1025px)");
    const apply = () => setPinFilter(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const visibleRows = useMemo(() => {
    const list = hideEmpty
      ? rows.filter((r) => Number(cellOf(r, "qty") || 0) > 0)
      : rows.slice();
    list.sort((a, b) => {
      const qa = Number(cellOf(a, "qty") || 0);
      const qb = Number(cellOf(b, "qty") || 0);
      if (qa !== qb) return sortQty === "asc" ? qa - qb : qb - qa;
      return String(cellOf(a, "store_id") || "").localeCompare(String(cellOf(b, "store_id") || ""));
    });
    return list;
  }, [rows, hideEmpty, sortQty]);
  const hiddenEmpty = hideEmpty ? rows.length - visibleRows.length : 0;

  const scrollRevision = `${pinFilter ? "pin" : "flow"}-${loading ? "loading" : "ready"}-${visibleRows.length}-${hideEmpty ? "hide" : "all"}-${sortQty}-${error || info || "ok"}`;
  const storeCount = visibleRows.length;

  return (
    <AccessGuard moduleCode="REG_RPT_OMNI_VARIAN">
      <Head title="Varian Stock" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Variant Stock
                </BlockTitle>
                <BlockDes className="text-soft">
                  {applied && !error
                    ? `Sisa realtime ${storeCount} store`
                    : "Article, size, color, lalu sisa stok per store"}
                </BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="omni-var" id="omni-var-layout">
              <aside
                className="omni-var-filter"
                {...(pinFilter
                  ? {
                      "data-scroll": "",
                      "data-scroll-sticky": "",
                      "data-scroll-target": "#omni-var-layout",
                      "data-scroll-offset": "-80,0",
                    }
                  : {})}
              >
                <div className="omni-var-filter-head">
                  <span>FILTER</span>
                  <button type="button" className="omni-var-clear" onClick={clearFilter}>
                    Hapus filter
                  </button>
                </div>

                <label className="omni-var-label" htmlFor="omni-var-article">
                  Article
                </label>
                <input
                  id="omni-var-article"
                  className="form-control"
                  placeholder="All Article"
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  onBlur={() => loadAttr(article)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />

                <div className="omni-var-label">Size</div>
                <div className="omni-var-badges">
                  {attrLoading ? <span className="text-soft small">Memuat...</span> : null}
                  {!attrLoading && !sizes.length ? (
                    <span className="text-soft small">Pilih article</span>
                  ) : null}
                  {sizes.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`omni-var-badge${same(size, v) ? " is-active" : ""}`}
                      onClick={() => setSize((cur) => (same(cur, v) ? "" : v))}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="omni-var-label">Color</div>
                <div className="omni-var-badges">
                  {!attrLoading && !colors.length ? (
                    <span className="text-soft small">Pilih article</span>
                  ) : null}
                  {colors.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`omni-var-badge${same(color, v) ? " is-active" : ""}`}
                      onClick={() => setColor((cur) => (same(cur, v) ? "" : v))}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <label className="omni-var-label" htmlFor="omni-var-prov">
                  Provinsi
                </label>
                <select
                  id="omni-var-prov"
                  className="form-control"
                  value={provinsi}
                  onChange={(e) => setProvinsi(e.target.value)}
                >
                  <option value="ALL">ALL</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <Button color="primary" className="omni-var-apply" onClick={apply} disabled={loading}>
                  {loading ? "Memuat..." : "Terapkan Filter"}
                </Button>
              </aside>

              <section className="omni-var-result">
                <div className="omni-var-result-head">
                  <div className="omni-var-result-title">Hasil per Store</div>
                  <div className="omni-var-result-tools">
                    <label className="omni-var-hide-empty">
                      <input
                        type="checkbox"
                        checked={hideEmpty}
                        onChange={(e) => setHideEmpty(e.target.checked)}
                      />
                      Sembunyikan stok habis
                    </label>
                    <select
                      className="form-control omni-var-sort"
                      aria-label="Urutkan sisa stok"
                      value={sortQty}
                      onChange={(e) => setSortQty(e.target.value)}
                    >
                      <option value="desc">Terbanyak</option>
                      <option value="asc">Tersedikit</option>
                    </select>
                  </div>
                </div>
                {error ? <div className="omni-var-msg err">{error}</div> : null}
                {!error && info ? (
                  <div className="omni-var-msg">
                    {rows.length
                      ? `Hasil ditemukan: ${visibleRows.length} store.${
                          hiddenEmpty ? ` ${hiddenEmpty} stok habis disembunyikan.` : ""
                        }`
                      : info}
                  </div>
                ) : null}
                <div className="omni-var-grid">
                  {visibleRows.map((r, i) => {
                    const storeId = cellOf(r, "store_id");
                    const kota = cellOf(r, "kota");
                    const prov = cellOf(r, "provinsi");
                    const place = [kota, prov].filter(Boolean).join(" - ");
                    return (
                      <article key={`${storeId}-${cellOf(r, "plu")}-${i}`} className="omni-var-card">
                        <div>
                          <strong>STORE {storeId}</strong>
                          {place ? <span> {place}</span> : null}
                        </div>
                        <div className="omni-var-qty">Sisa: {fmtNum(cellOf(r, "qty"))}</div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegOmniVarianPage;
