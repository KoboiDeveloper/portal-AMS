import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Spinner } from "reactstrap";
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
import { marcommVoucherReportService } from "../../../services/marcomm/marcomm.service";
import api from "../../../lib/api";
import { extractRows, isSuccess } from "../../../lib/response";
import { ScBtn } from "../dgs/sc";
import MarcommReportPager from "./MarcommReportPager";
import "../hrd/hrd-personel.css";
import "../dgs/sc/sc-ui.css";
import "./marcomm-voucher-report.css";

const PAGE_SIZE = 10;

const STATUS_OPTS = [
  { value: "ALL", label: "ALL" },
  { value: "TERPAKAI", label: "TERPAKAI" },
  { value: "BELUM TERPAKAI", label: "BELUM TERPAKAI" },
  { value: "EXPIRED", label: "EXPIRED" },
];

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 36, height: 36, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 34 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem" }),
};

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const qtyzLabel = (status) => {
  const s = String(status || "ALL").toUpperCase();
  if (s === "TERPAKAI") return "Terpakai";
  if (s === "BELUM TERPAKAI") return "Belum Terpakai";
  if (s === "EXPIRED") return "Expired";
  return "Sisa";
};

const fmtNum = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return v == null || v === "" ? "0" : String(v);
  return n.toLocaleString("id-ID");
};

const fmtDate = (v) => {
  if (v == null || v === "") return "-";
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
};

const badgeClass = (status) => {
  const s = String(status || "").toUpperCase();
  if (s.includes("TERPAKAI") && !s.includes("BELUM")) return "mvr-badge is-used";
  if (s.includes("BELUM")) return "mvr-badge is-open";
  if (s.includes("EXPIRED") || s.includes("KADALUARSA")) return "mvr-badge is-expired";
  return "mvr-badge";
};

const MarcommVoucherReportPage = () => {
  const [status, setStatus] = useState("ALL");
  const [keywords, setKeywords] = useState("");
  const [draftKeywords, setDraftKeywords] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState("");
  const [detailMap, setDetailMap] = useState({});
  const [detailLoading, setDetailLoading] = useState("");
  const [detailError, setDetailError] = useState({});

  const cacheKey = (id, st) => `${id}::${st || "ALL"}`;

  const loadData = useCallback(
    async ({ nextStatus, nextKeywords } = {}) => {
      const st = nextStatus != null ? nextStatus : status;
      const kw = nextKeywords != null ? nextKeywords : keywords;
      setLoading(true);
      setError("");
      setOpenId("");
      setDetailMap({});
      setDetailError({});
      setPage(1);
      try {
        const res = await marcommVoucherReportService.list({
          status: st || "ALL",
          keywords: kw || "",
        });
        if (!isSuccess(res)) {
          setError(res?.responseMessage || "Gagal memuat laporan voucher");
          setRows([]);
          setLoaded(true);
          return;
        }
        setRows(extractRows(res));
        setLoaded(true);
      } catch (e) {
        setError(e?.responseMessage || e?.message || "Gagal memuat laporan voucher");
        setRows([]);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    },
    [status, keywords]
  );

  useEffect(() => {
    loadData({ nextStatus: "ALL", nextKeywords: "" });
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDetail = useCallback(async (id, st) => {
    if (!id) return;
    const key = cacheKey(id, st);
    setDetailLoading(id);
    setDetailError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await api.get(`/marcomm/voucher/report/${encodeURIComponent(id)}/detail`, {
        params: { status: st || "ALL" },
      });
      if (!isSuccess(res)) {
        setDetailError((prev) => ({
          ...prev,
          [id]: res?.responseMessage || "Gagal memuat detail",
        }));
        return;
      }
      setDetailMap((prev) => ({ ...prev, [key]: extractRows(res) }));
    } catch (e) {
      setDetailError((prev) => ({
        ...prev,
        [id]: e?.responseMessage || e?.message || "Gagal memuat detail",
      }));
    } finally {
      setDetailLoading("");
    }
  }, []);

  const onStatusChange = (opt) => {
    const next = opt?.value || "ALL";
    setStatus(next);
    loadData({ nextStatus: next, nextKeywords: keywords });
  };

  const onFilter = () => {
    setKeywords(draftKeywords);
    loadData({ nextStatus: status, nextKeywords: draftKeywords });
  };

  const onRefresh = () => {
    loadData({ nextStatus: status, nextKeywords: keywords });
  };

  const toggleOpen = (id) => {
    if (openId === id) {
      setOpenId("");
      return;
    }
    setOpenId(id);
    const key = cacheKey(id, status);
    if (!detailMap[key]) loadDetail(id, status);
  };

  const totalPages = Math.max(1, Math.ceil((rows.length || 0) / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, pageSafe]);

  return (
    <AccessGuard moduleCode="MAR_VCR_REPORT" permission="VIEW">
      <Head title="Voucher Report" />
      <Content>
        <div className="mvr-page hrd-sc sc-scope">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Voucher Report
                </BlockTitle>
                <BlockDes className="text-soft">
                  Laporan batch voucher marcomm — filter status & kata kunci, buka baris untuk detail kode.
                </BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="mvr-toolbar">
              <div className="mvr-field" style={{ minWidth: 200 }}>
                <label htmlFor="mvr-status">Status</label>
                <RSelect
                  inputId="mvr-status"
                  className="hrd-filter-rselect"
                  styles={filterSelectStyles}
                  options={STATUS_OPTS}
                  value={STATUS_OPTS.find((o) => o.value === status) || STATUS_OPTS[0]}
                  onChange={onStatusChange}
                />
              </div>
              <div className="mvr-field mvr-keywords">
                <label htmlFor="mvr-keywords">Keywords</label>
                <input
                  id="mvr-keywords"
                  type="search"
                  placeholder="keterangan / No.Voucher / Brand"
                  value={draftKeywords}
                  onChange={(e) => setDraftKeywords(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onFilter();
                  }}
                />
              </div>
              <div className="mvr-actions">
                <ScBtn variant="soft" disabled={loading} onClick={onRefresh} title="Refresh">
                  <Icon name="reload" className="me-1" />
                  Refresh
                </ScBtn>
                <ScBtn disabled={loading} onClick={onFilter}>
                  <Icon name="search" className="me-1" />
                  Filter
                </ScBtn>
              </div>
            </div>

            {error ? <div className="mvr-msg err mb-3">{error}</div> : null}
            {loading ? (
              <div className="text-center py-4">
                <Spinner color="primary" size="sm" /> <span className="text-soft ms-2">Memuat…</span>
              </div>
            ) : null}

            {!loading && loaded && !rows.length ? (
              <div className="mvr-empty card card-bordered">There Is No Data</div>
            ) : null}

            {!loading && pageRows.length > 0 ? (
              <>
                <div className="mvr-list">
                  {pageRows.map((r) => {
                    const id = String(cell(r, "ID_VOUCHER", "id_voucher", "NO_URUT", "no_urut") || "");
                    const open = openId === id;
                    const details = detailMap[cacheKey(id, status)] || [];
                    return (
                      <div key={id || cell(r, "KETERANGAN")} className={`mvr-card${open ? " is-open" : ""}`}>
                        <button
                          type="button"
                          className="mvr-card__head"
                          onClick={() => id && toggleOpen(id)}
                          aria-expanded={open}
                        >
                          <div>
                            <div className="mvr-card__title">
                              {cell(r, "KETERANGAN", "keterangan") || id || "-"}
                            </div>
                            <div className="mvr-card__meta">ID {id || "-"}</div>
                          </div>
                          <div className="mvr-card__cell">
                            <span>Generate</span>
                            {fmtDate(cell(r, "CRE_DATE", "cre_date"))}
                          </div>
                          <div className="mvr-card__cell">
                            <span>Tipe</span>
                            {cell(r, "TIPE_VOUCHER", "tipe_voucher", "tipe") || "-"}
                          </div>
                          <div className="mvr-card__cell num">
                            <span>Qty</span>
                            {fmtNum(cell(r, "QTY", "qty"))}
                          </div>
                          <div className="mvr-card__cell num">
                            <span>Nominal</span>
                            {fmtNum(cell(r, "NOMINAL", "nominal"))}
                          </div>
                          <div className="mvr-card__qtyz">
                            <span className="sub-text d-block" style={{ fontSize: "0.6875rem" }}>
                              {qtyzLabel(status)}
                            </span>
                            <strong>{fmtNum(cell(r, "QTY_Z", "qty_z"))}</strong>
                          </div>
                          <span className="mvr-chev" aria-hidden>
                            <Icon name={open ? "chevron-up" : "chevron-down"} />
                          </span>
                        </button>

                        {open ? (
                          <div className="mvr-body">
                            {detailLoading === id ? (
                              <div className="text-soft small mb-2">Memuat detail…</div>
                            ) : null}
                            {detailError[id] ? (
                              <div className="mvr-msg err mb-2">{detailError[id]}</div>
                            ) : null}
                            <div className="mvr-table-shell">
                              <table className="mvr-table">
                                <thead>
                                  <tr>
                                    <th>ID</th>
                                    <th className="ctr">ID Voucher</th>
                                    <th className="num">Nominal</th>
                                    <th className="ctr">Tanggal Pakai</th>
                                    <th>Store Penggunaan</th>
                                    <th className="ctr">Transaksi</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {!details.length && detailLoading !== id ? (
                                    <tr>
                                      <td colSpan={6} className="mvr-empty">
                                        There Is No Data
                                      </td>
                                    </tr>
                                  ) : (
                                    details.map((d, i) => {
                                      const st = cell(d, "STATUS", "status", "Badgestatus");
                                      return (
                                        <tr key={`${cell(d, "NO_VOUCHER", "no_voucher")}-${i}`}>
                                          <td className="ctr">{cell(d, "ID", "id") || i + 1}</td>
                                          <td className="ctr">
                                            {cell(d, "NO_VOUCHER", "no_voucher", "ID_VOUCHER")}
                                          </td>
                                          <td className="num">{fmtNum(cell(d, "NOMINAL", "nominal"))}</td>
                                          <td className="ctr">
                                            {fmtDate(cell(d, "TGL_DIGUNAKAN", "tgl_digunakan"))}
                                          </td>
                                          <td>{cell(d, "STORE_PENGGUNA", "store_pengguna") || "-"}</td>
                                          <td className="ctr">
                                            {st ? <span className={badgeClass(st)}>{st}</span> : "-"}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <MarcommReportPager
                  page={pageSafe}
                  totalPages={totalPages}
                  totalLabel={`${rows.length} batch`}
                  onPage={setPage}
                />
              </>
            ) : null}
          </Block>
        </div>
      </Content>
    </AccessGuard>
  );
};

export default MarcommVoucherReportPage;
