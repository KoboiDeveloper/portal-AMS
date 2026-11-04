import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon, RSelect } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { getDgsPrasales } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { cellOf, errMsg, fmtNum, fmtYmd, addDaysYmd, todayYmd } from "./dgsUtils";
import DgsConfirmSalesModal from "./DgsConfirmSalesModal";
import {
  ScAttentionBar,
  ScBtn,
  ScChip,
  ScEmptyState,
  ScError,
  ScFilterChips,
  ScPageHeader,
  ScStatusTabs,
} from "./sc";
import DgsContentShell from "./shell/DgsContentShell";
import { RivStickyThead } from "../regional/RivStickyThead";
import "../regional/reg-mp-ar-list.css";
import "./dgs.css";

const PAGE_SIZE = 50;

const MP_FILTER = [
  { value: "", label: "Semua Marketplace" },
  ...["SHOPEE", "TOKOPEDIA", "TIKTOK", "LAZADA", "ZALORA", "BLIBLI", "BUKALAPAK", "JD.ID", "ZILINGO", "DIRECT SELLING"].map(
    (m) => ({ value: m, label: m })
  ),
];

const STATUS_TABS = [
  { id: "", label: "Semua" },
  { id: "0", label: "New" },
  { id: "1", label: "Approved" },
  { id: "2", label: "Rejected" },
];

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 34,
    height: 34,
    fontSize: "0.8125rem",
    borderColor: "var(--sc-border, #e3e5e7)",
    borderRadius: 4,
    background: "#fff",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px", height: 32 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 32 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem", borderRadius: 6 }),
};

const statusPill = (s) => {
  const v = String(s);
  if (v === "1") return <span className="dgs-pill is-ok">Approved</span>;
  if (v === "2") return <span className="dgs-pill is-bad">Rejected</span>;
  return <span className="dgs-pill is-new">New</span>;
};

const urgencyClass = (isNew, age) => {
  if (!isNew) return "";
  if (age > 14) return " sc-row-late";
  if (age > 7) return " sc-row-urgent";
  return "";
};

const SORT_COLS = [
  { key: "TANGGAL_TRANSAKSI", label: "Pesanan", type: "str" }, // tgl + jam di meta; tie-break invoice
  { key: "ID_STORE", label: "Store / MP", type: "str" },
  { key: "ITEMS", label: "Produk", type: "num" },
  { key: "STATUS_TRANSAKSI", label: "Status pesanan", type: "str" },
  { key: "NO_RESI", label: "Pengiriman", type: "str" },
  { key: "GRAND_TOTAL", label: "Total", type: "num", num: true },
];

const compareSortVal = (a, b, type, dir) => {
  const mul = dir === "asc" ? 1 : -1;
  if (type === "num") {
    const an = a === "" || a == null || Number.isNaN(Number(a)) ? -Infinity : Number(a);
    const bn = b === "" || b == null || Number.isNaN(Number(b)) ? -Infinity : Number(b);
    return (an - bn) * mul;
  }
  return String(a ?? "").localeCompare(String(b ?? ""), "id", { numeric: true, sensitivity: "base" }) * mul;
};

const DgsPrasalesPage = () => {
  const [sp] = useSearchParams();
  const [from, setFrom] = useState(addDaysYmd(todayYmd(), sp.get("kw") ? -365 : -29));
  const [to, setTo] = useState(todayYmd());
  const [mp, setMp] = useState("");
  const [status, setStatus] = useState(sp.get("status") ?? "0");
  const [store, setStore] = useState("");
  const [kw, setKw] = useState(sp.get("kw") || "");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState({ "": null, "0": null, "1": null, "2": null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");
  const [sort, setSort] = useState({ key: "TANGGAL_TRANSAKSI", dir: "desc" }); // default: terbaru dulu
  const seq = useRef(0);
  const countSeq = useRef(0);
  const tableRef = useRef(null);

  const load = useCallback(
    async (pg = 1) => {
      if (!from || !to) return;
      const my = ++seq.current;
      setLoading(true);
      setError("");
      try {
        const res = await getDgsPrasales({
          from_date: from,
          to_date: to,
          marketplace: mp,
          status,
          store: store.trim(),
          keywords: kw.trim(),
          page: pg,
          page_size: PAGE_SIZE,
        });
        if (my !== seq.current) return;
        if (!isSuccess(res)) {
          setError(res?.responseMessage || "Gagal memuat prasales");
          setRows([]);
          setTotal(0);
          return;
        }
        setRows(res.data || []);
        setTotal(Number(res.total || 0));
        setPage(pg);
      } catch (e) {
        if (my === seq.current) setError(errMsg(e, "Gagal memuat prasales"));
      } finally {
        if (my === seq.current) setLoading(false);
      }
    },
    [from, to, mp, status, store, kw]
  );

  const loadTabCounts = useCallback(async () => {
    if (!from || !to) return;
    const my = ++countSeq.current;
    const base = {
      from_date: from,
      to_date: to,
      marketplace: mp,
      store: store.trim(),
      keywords: kw.trim(),
      page: 1,
      page_size: 1,
    };
    try {
      const statuses = ["", "0", "1", "2"];
      const results = await Promise.all(
        statuses.map((st) => getDgsPrasales({ ...base, status: st }).catch(() => null))
      );
      if (my !== countSeq.current) return;
      const next = {};
      statuses.forEach((st, i) => {
        const res = results[i];
        next[st] = res && isSuccess(res) ? Number(res.total || 0) : null;
      });
      setTabCounts(next);
    } catch {
      /* ignore count errors */
    }
  }, [from, to, mp, store, kw]);

  const boot = useRef(false);

  useEffect(() => {
    load(1);
    boot.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTabCounts();
  }, [loadTabCounts]);

  const handleTabChange = (id) => {
    if (String(id) === String(status)) {
      load(1);
      return;
    }
    setStatus(String(id));
  };

  useEffect(() => {
    if (!boot.current) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;
  const fmtCount = (v) => (v == null ? "…" : fmtNum(v));

  const sortedRows = useMemo(() => {
    if (!rows.length) return rows;
    const col = SORT_COLS.find((c) => c.key === sort.key);
    const type = col?.type || (sort.key === "TANGGAL_TRANSAKSI" ? "str" : "str");
    const next = [...rows];
    next.sort((a, b) => {
      let av = cellOf(a, sort.key);
      let bv = cellOf(b, sort.key);
      if (sort.key === "TANGGAL_TRANSAKSI") {
        av = `${cellOf(a, "TANGGAL_TRANSAKSI")} ${cellOf(a, "JAM_TRANSAKSI")}`;
        bv = `${cellOf(b, "TANGGAL_TRANSAKSI")} ${cellOf(b, "JAM_TRANSAKSI")}`;
      } else if (sort.key === "ID_STORE") {
        av = `${cellOf(a, "ID_STORE")} ${cellOf(a, "NAMA_MP")}`;
        bv = `${cellOf(b, "ID_STORE")} ${cellOf(b, "NAMA_MP")}`;
      }
      let cmp = compareSortVal(av, bv, type, sort.dir);
      if (cmp !== 0) return cmp;
      return compareSortVal(cellOf(a, "NO_INVOICE"), cellOf(b, "NO_INVOICE"), "str", "asc");
    });
    return next;
  }, [rows, sort]);

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "GRAND_TOTAL" || key === "ITEMS" ? "desc" : "asc" }));
  };

  const sortMark = (key) => {
    if (sort.key !== key) return "";
    return sort.dir === "asc" ? " ▲" : " ▼";
  };

  const tabItems = STATUS_TABS.map((t) => ({
    ...t,
    count: fmtCount(tabCounts[t.id]),
  }));

  const attention = [
    {
      id: "new",
      label: "Perlu dikonfirmasi (New)",
      value: fmtCount(tabCounts["0"]),
      sub: Number(tabCounts["0"]) > 0 ? "Mendesak" : null,
      tone: Number(tabCounts["0"]) > 0 ? "warn" : "ok",
      onClick: () => handleTabChange("0"),
    },
    {
      id: "approved",
      label: "Approved",
      value: fmtCount(tabCounts["1"]),
      tone: "ok",
      onClick: () => handleTabChange("1"),
    },
    {
      id: "rejected",
      label: "Rejected / dibatalkan",
      value: fmtCount(tabCounts["2"]),
      tone: Number(tabCounts["2"]) > 0 ? "bad" : "ok",
      onClick: () => handleTabChange("2"),
    },
    {
      id: "all",
      label: "Semua transaksi",
      value: fmtCount(tabCounts[""]),
      onClick: () => handleTabChange(""),
    },
  ];

  const hasActiveFilter = Boolean(mp || store.trim() || kw.trim() || status !== "");

  return (
    <AccessGuard moduleCode="DGS_PRASALES">
      <Head title="Prasales" />
      <Content>
        <PageSmoothScroll revision={`${loading}-${rows.length}-${page}-${status}`} className="riv-page-scroll">
          <DgsContentShell>
          <div className="reg-ar-wrap dgs-dash sc-scope">
            <ScPageHeader
              title="Kelola prasales"
              description="Lihat detail pesanan marketplace · klik baris untuk membuka"
              actions={
                <div className="sc-page-search">
                  <input
                    className="form-control form-control-sm sc-page-search__input"
                    placeholder="Cari ID pesanan / resi"
                    value={kw}
                    onChange={(e) => setKw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && load(1)}
                  />
                  <ScBtn
                    disabled={loading}
                    onClick={() => {
                      load(1);
                      loadTabCounts();
                    }}
                  >
                    <Icon name="search" /> Cari
                  </ScBtn>
                </div>
              }
            />

            <ScAttentionBar items={attention} />

            <div className="sc-panel sc-panel--flush" style={{ padding: "0 16px" }}>
              <ScStatusTabs value={status} onChange={handleTabChange} items={tabItems} />
            </div>

            <ScFilterChips
              actions={
                <ScBtn
                  variant="soft"
                  disabled={loading}
                  onClick={() => {
                    load(1);
                    loadTabCounts();
                  }}
                >
                  <Icon name="reload" /> Terapkan filter
                </ScBtn>
              }
            >
              <div className="reg-ar-f-item" style={{ margin: 0, minWidth: 200 }}>
                <AppDateRangePicker
                  startDate={from}
                  endDate={to}
                  className="form-control form-control-sm reg-ar-ctl"
                  onChange={(f, t) => {
                    setFrom(f || "");
                    setTo(t || "");
                  }}
                />
              </div>
              <div style={{ minWidth: 160 }}>
                <RSelect
                  styles={selectStyles}
                  options={MP_FILTER}
                  value={MP_FILTER.find((o) => o.value === mp) || MP_FILTER[0]}
                  onChange={(o) => setMp(o?.value || "")}
                  isSearchable
                />
              </div>
              <input
                className="form-control form-control-sm"
                style={{ width: 100, height: 34 }}
                placeholder="Store"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load(1)}
              />
              <ScChip active={status === "0"} onClick={() => handleTabChange("0")}>
                New saja
              </ScChip>
              <ScChip
                active={!mp && !store && !kw}
                onClick={() => {
                  setMp("");
                  setStore("");
                  setKw("");
                  handleTabChange("0");
                }}
              >
                Reset
              </ScChip>
            </ScFilterChips>

            {error ? <ScError message={error} onRetry={() => load(1)} /> : null}
            <div className="reg-ar-record-info" style={{ marginBottom: 8 }}>
              {loading ? "Memuat…" : `${fmtNum(total)} transaksi`}
              {status === "0" ? " · highlight kuning/merah = umur New >7 / >14 hari" : null}
            </div>

            {!loading && rows.length === 0 && !error ? (
              <ScEmptyState
                icon="cart"
                title={hasActiveFilter ? "Tidak ada data untuk filter ini" : "Belum ada pesanan"}
                hint={
                  hasActiveFilter
                    ? "Ubah tab status, periode, atau kata kunci — atau reset ke New."
                    : "Atur periode lalu klik Cari."
                }
                action={
                  <ScBtn
                    onClick={() => {
                      setStatus("0");
                      setMp("");
                      setStore("");
                      setKw("");
                    }}
                  >
                    Reset ke New
                  </ScBtn>
                }
              />
            ) : (
              <div className="sc-panel sc-panel--flush">
              <div className="dgs-table-wrap" style={{ maxHeight: "none", border: 0 }}>
                <table ref={tableRef} className="dgs-table">
                  <thead>
                    <tr>
                      {SORT_COLS.map((c) => (
                        <th
                          key={c.key}
                          className={`${c.num ? "num " : ""}dgs-th-sort${sort.key === c.key ? " is-sorted" : ""}`}
                          onClick={() => toggleSort(c.key)}
                          title="Klik untuk urutkan"
                        >
                          {c.label}
                          {sortMark(c.key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.length === 0 ? (
                      <tr>
                        <td className="dgs-empty" colSpan={6}>
                          Memuat…
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((r, i) => {
                        const age = Number(cellOf(r, "AGE_DAYS"));
                        const isNew = String(cellOf(r, "STATUS_TRANSAKSI")) === "0";
                        const gt = Number(cellOf(r, "GRAND_TOTAL"));
                        const gtmp = cellOf(r, "GRAND_TOTAL_MP");
                        const diff = gtmp !== "" && Math.abs(gt - Number(gtmp)) > 1;
                        return (
                          <tr
                            key={cellOf(r, "ID_PRASALES_HEADER")}
                            className={`dgs-row-click${urgencyClass(isNew, age)}`}
                            onClick={() => setOpenId(String(cellOf(r, "ID_PRASALES_HEADER")))}
                          >
                            <td>
                              <span className="sc-td-main">{cellOf(r, "NO_INVOICE") || "—"}</span>
                              <span className="sc-td-meta">
                                #{offset + i + 1} · {fmtYmd(cellOf(r, "TANGGAL_TRANSAKSI"))} {cellOf(r, "JAM_TRANSAKSI")}
                              </span>
                            </td>
                            <td>
                              <span className="sc-td-main">{cellOf(r, "ID_STORE") || "—"}</span>
                              <span className="sc-td-meta">{cellOf(r, "NAMA_MP")}</span>
                            </td>
                            <td>
                              <span className="sc-td-main">
                                {fmtNum(cellOf(r, "ITEMS_CHECKED"))}/{fmtNum(cellOf(r, "ITEMS"))} item
                              </span>
                              {Number(cellOf(r, "ITEMS_RETUR")) > 0 ? (
                                <span className="sc-td-meta">{fmtNum(cellOf(r, "ITEMS_RETUR"))} retur</span>
                              ) : null}
                            </td>
                            <td>
                              {statusPill(cellOf(r, "STATUS_TRANSAKSI"))}
                              {isNew && age > 7 ? (
                                <div className="sc-td-urgent">
                                  {age > 14 ? `Terlambat ${fmtNum(age)} hr` : `Konfirmasi dalam ${fmtNum(age)} hr`}
                                </div>
                              ) : null}
                            </td>
                            <td>
                              <span className="sc-td-main">{cellOf(r, "NO_RESI") || "Belum ada resi"}</span>
                              <span className="sc-td-meta">Marketplace shipping</span>
                            </td>
                            <td className="num">
                              <span className="sc-td-main">Rp {fmtNum(gt)}</span>
                              <span className="sc-td-meta">
                                MP {gtmp === "" ? "—" : `Rp ${fmtNum(gtmp)}`}
                                {diff ? " · selisih" : ""}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            )}

            {total > PAGE_SIZE ? (
              <div className="reg-ar-pager">
                <span className="reg-ar-pager-info">
                  Halaman {page} / {totalPages} · {fmtNum(total)} transaksi
                </span>
                <div className="reg-ar-pager-btns">
                  <button type="button" className="reg-ar-pager-btn" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    className="reg-ar-pager-btn"
                    disabled={page >= totalPages || loading}
                    onClick={() => load(page + 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            ) : null}

            <RivStickyThead
              tableRef={tableRef}
              enabled={!loading && sortedRows.length > 0}
              tableClassName="dgs-table"
              interactive
            />
          </div>
          </DgsContentShell>
        </PageSmoothScroll>

        <DgsConfirmSalesModal
          isOpen={Boolean(openId)}
          idPrasales={openId}
          viewOnly
          onClose={() => setOpenId("")}
        />
      </Content>
    </AccessGuard>
  );
};

export default DgsPrasalesPage;
