import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { getDgsPrasales } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { cellOf, errMsg, fmtNum, fmtYmd, addDaysYmd, todayYmd } from "./dgsUtils";
import DgsConfirmSalesModal from "./DgsConfirmSalesModal";
import "../regional/reg-mp-ar-list.css";
import "./dgs.css";

const PAGE_SIZE = 50;

const MP_FILTER = [
  { value: "", label: "Semua Marketplace" },
  ...["SHOPEE", "TOKOPEDIA", "TIKTOK", "LAZADA", "ZALORA", "BLIBLI", "BUKALAPAK", "JD.ID", "ZILINGO", "DIRECT SELLING"].map(
    (m) => ({ value: m, label: m })
  ),
];
const STATUS_FILTER = [
  { value: "", label: "Semua Status" },
  { value: "0", label: "New (belum confirm)" },
  { value: "1", label: "Approved" },
  { value: "2", label: "Rejected" },
];

const selectStyles = {
  control: (base) => ({ ...base, minHeight: 38, height: 38, fontSize: "0.8125rem", borderColor: "#dbdfea", borderRadius: 0, background: "#eef2f8" }),
  valueContainer: (base) => ({ ...base, padding: "0 10px", height: 36 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem", borderRadius: 0 }),
};

const statusPill = (s) => {
  const v = String(s);
  if (v === "1") return <span className="dgs-pill is-ok">Approved</span>;
  if (v === "2") return <span className="dgs-pill is-bad">Rejected</span>;
  return <span className="dgs-pill is-new">New</span>;
};

const DgsPrasalesPage = () => {
  const [sp] = useSearchParams();
  const [from, setFrom] = useState(addDaysYmd(todayYmd(), sp.get("kw") ? -365 : -29));
  const [to, setTo] = useState(todayYmd());
  const [mp, setMp] = useState("");
  const [status, setStatus] = useState(sp.get("status") || "0");
  const [store, setStore] = useState("");
  const [kw, setKw] = useState(sp.get("kw") || "");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");
  const seq = useRef(0);

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

  // initial load + when kw came from the dashboard link
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;

  return (
    <AccessGuard moduleCode="DGS_PRASALES">
      <Head title="Prasales" />
      <Content>
        <PageSmoothScroll revision={`${loading}-${rows.length}-${page}`} className="riv-page-scroll">
          <div className="reg-ar-wrap">
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    Prasales
                  </BlockTitle>
                  <BlockDes className="text-soft">
                    Transaksi marketplace yang belum dikonfirmasi · klik baris untuk Confirm Sales
                  </BlockDes>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>

            <div className="dgs-filters">
              <div className="reg-ar-f-item">
                <label>Periode Transaksi</label>
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
              <div className="reg-ar-f-item">
                <label>Marketplace</label>
                <RSelect
                  styles={selectStyles}
                  options={MP_FILTER}
                  value={MP_FILTER.find((o) => o.value === mp) || MP_FILTER[0]}
                  onChange={(o) => setMp(o?.value || "")}
                  isSearchable
                />
              </div>
              <div className="reg-ar-f-item">
                <label>Status</label>
                <RSelect
                  styles={selectStyles}
                  options={STATUS_FILTER}
                  value={STATUS_FILTER.find((o) => o.value === status) || STATUS_FILTER[0]}
                  onChange={(o) => setStatus(o?.value ?? "")}
                />
              </div>
              <div className="reg-ar-f-item" style={{ minWidth: 110 }}>
                <label>Store</label>
                <input
                  className="form-control form-control-sm reg-ar-ctl"
                  placeholder="mis. 07E"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load(1)}
                />
              </div>
              <div className="reg-ar-f-item">
                <label>Invoice / Resi</label>
                <input
                  className="form-control form-control-sm reg-ar-ctl"
                  placeholder="Cari invoice atau resi"
                  value={kw}
                  onChange={(e) => setKw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load(1)}
                />
              </div>
              <button type="button" className="reg-ar-btn" disabled={loading} onClick={() => load(1)}>
                <Icon name="search" /> Cari
              </button>
            </div>

            {error ? <div className="reg-ar-error">{error}</div> : null}
            <div className="reg-ar-record-info" style={{ marginBottom: 8 }}>
              {loading ? "Memuat…" : `${fmtNum(total)} transaksi`}
            </div>

            <div className="dgs-table-wrap" style={{ maxHeight: "none" }}>
              <table className="dgs-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Tanggal</th>
                    <th>Invoice</th>
                    <th>Marketplace</th>
                    <th>Store</th>
                    <th>Status</th>
                    <th className="num">Item</th>
                    <th className="num">Grand Total</th>
                    <th className="num">Total MP</th>
                    <th>No. Resi</th>
                    <th className="num">Umur</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="dgs-empty" colSpan={11}>
                        {loading ? "Memuat…" : "Tidak ada data untuk filter ini."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => {
                      const age = Number(cellOf(r, "AGE_DAYS"));
                      const isNew = String(cellOf(r, "STATUS_TRANSAKSI")) === "0";
                      const gt = Number(cellOf(r, "GRAND_TOTAL"));
                      const gtmp = cellOf(r, "GRAND_TOTAL_MP");
                      const diff = gtmp !== "" && Math.abs(gt - Number(gtmp)) > 1;
                      return (
                        <tr
                          key={cellOf(r, "ID_PRASALES_HEADER")}
                          className="dgs-row-click"
                          onClick={() => setOpenId(String(cellOf(r, "ID_PRASALES_HEADER")))}
                        >
                          <td>{offset + i + 1}</td>
                          <td>
                            {fmtYmd(cellOf(r, "TANGGAL_TRANSAKSI"))} {cellOf(r, "JAM_TRANSAKSI")}
                          </td>
                          <td>{cellOf(r, "NO_INVOICE")}</td>
                          <td>{cellOf(r, "NAMA_MP")}</td>
                          <td>{cellOf(r, "ID_STORE")}</td>
                          <td>{statusPill(cellOf(r, "STATUS_TRANSAKSI"))}</td>
                          <td className="num">
                            {fmtNum(cellOf(r, "ITEMS_CHECKED"))}/{fmtNum(cellOf(r, "ITEMS"))}
                            {Number(cellOf(r, "ITEMS_RETUR")) > 0 ? ` · ${fmtNum(cellOf(r, "ITEMS_RETUR"))} retur` : ""}
                          </td>
                          <td className="num">{fmtNum(gt)}</td>
                          <td className="num">
                            {gtmp === "" ? "—" : fmtNum(gtmp)}
                            {diff ? <span className="dgs-pill is-bad ml-1">selisih</span> : null}
                          </td>
                          <td>{cellOf(r, "NO_RESI") || "—"}</td>
                          <td className="num">
                            {isNew ? (
                              <span className={`dgs-pill ${age > 14 ? "is-bad" : age > 7 ? "is-warn" : ""}`}>{fmtNum(age)} hr</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {total > PAGE_SIZE ? (
              <div className="reg-ar-pager">
                <span className="reg-ar-pager-info">
                  Halaman {page} / {totalPages}
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
          </div>
        </PageSmoothScroll>

        <DgsConfirmSalesModal
          isOpen={Boolean(openId)}
          idPrasales={openId}
          onClose={() => setOpenId("")}
          onChanged={() => load(page)}
        />
      </Content>
    </AccessGuard>
  );
};

export default DgsPrasalesPage;
