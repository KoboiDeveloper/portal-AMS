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
import AppDatePicker from "../../../components/AppDatePicker";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import "./reg-reg-report.css";
import "./reg-daily-sales.css";
import "./reg-asbc-qty.css";

/** Legacy ASBC.aspx (ASBC by QTY, REG) -> GET /regional/rpt/sales/asbc-qty */
const svc = createRegionalService("rpt/sales/asbc-qty", { crud: false });

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
const parseYmd = (s) => {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Header tanpa "SALES"; tooltip tetap full seperti ASBC.aspx */
const salesCaptions = (dateStr) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || "");
  if (!m) {
    return { ly: "01-", cur: "01-", lyTip: "SALES 01-", curTip: "SALES 01-" };
  }
  const year = Number(m[1]);
  const dm = `${m[3]} ${MONTHS[Number(m[2]) - 1]}`;
  const ly = `01-${dm} ${year - 1}`;
  const cur = `01-${dm} ${year}`;
  return { ly, cur, lyTip: `SALES ${ly}`, curTip: `SALES ${cur}` };
};

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));
const fmtPct = (v) => `${nf0.format(Number(v || 0))}%`;

const ALL_OPT = { value: "ALL", label: "ALL" };

const rowType = (r) => {
  const g = String(r?.KODE_group ?? "");
  if (g.includes("totalgRANDtoT")) return "grand";
  if (g.includes(" total")) return "sub";
  return "row";
};

const RegAsbcQtyPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [date, setDate] = useState(todayYmd());

  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);

  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null); // snapshot of filters used for the loaded result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const canSearch = Boolean(brandId && storeId && date);

  const load = useCallback(async () => {
    if (!brandId || !storeId || !date) {
      setError("Pilih Brand, Store, dan Tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        from_date: date,
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
      setView({ date });
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, date, storeId]);

  const caps = useMemo(() => salesCaptions(view?.date || date), [view, date]);

  return (
    <AccessGuard moduleCode="REG_RPT_ASBC_QTY">
      <Head title="ASBC by QTY" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                ASBC by QTY
              </BlockTitle>
              <BlockDes className="text-soft">
                Sales qty per CLASS, MTD vs tahun sebelumnya
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
                    <li className="hrd-filter-date">
                      <div className="form-control-wrap">
                        <div className="form-icon form-icon-left">
                          <Icon name="calendar" />
                        </div>
                        <AppDatePicker
                          selected={parseYmd(date)}
                          onChange={(d) => setDate(d ? ymd(d) : "")}
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Date"
                          className="form-control form-control-sm date-picker ps-4"
                          isClearable
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
                      <button
                        type="button"
                        className="btn btn-icon btn-trigger admin-filter-premium-btn"
                        onClick={load}
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
          {!view && !loading && !error ? (
            <div className="reg-rpt-empty">Data belum tersedia</div>
          ) : null}
          {view && !error && !rows.length ? (
            <div className="reg-rpt-empty">Data belum tersedia</div>
          ) : null}
          {loading || error || (view && rows.length > 0) ? (
            <div className="card rsa-card">
              <div className="card-inner">
                {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
                {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

                {view && rows.length > 0 ? (
                  <>
                    <div className="rds-table-wrap mt-3">
                      <table className="rds-table rasq-table">
                        <thead>
                          <tr>
                            <th>CLASS</th>
                            <th>DESKRIPSI</th>
                            <th className="num" title={caps.lyTip}>
                              {caps.ly}
                            </th>
                            <th className="num" title={caps.curTip}>
                              {caps.cur}
                            </th>
                            <th className="num" title={`(${caps.curTip}) - (${caps.lyTip})`}>
                              GROWTH
                            </th>
                            <th
                              className="num"
                              title={`((${caps.curTip}) - (${caps.lyTip})) / (${caps.lyTip}) * 100`}
                            >
                              % GROWTH
                            </th>
                            <th className="num" title={`(${caps.curTip} / @akumulasi_tahun_berjalan) * 100`}>
                              % KONTRIBUSI
                            </th>
                            <th className="num">INV STOCK</th>
                            <th className="num" title={`(INV STOCK / ${caps.curTip}) * ${Number(view.date.slice(8, 10))}`}>
                              STOCK DAY
                            </th>
                            <th title="STOCK DAY <= 90 = KIRIM , >90 = STOP">KETERANGAN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!rows.length ? (
                            <tr>
                              <td colSpan={10} className="rds-empty">
                                There Is No Data
                              </td>
                            </tr>
                          ) : (
                            rows.map((r, i) => {
                              const t = rowType(r);
                              const ket = String(r.ket ?? "");
                              return (
                                <tr
                                  key={i}
                                  className={t === "sub" ? "rasq-sub" : t === "grand" ? "rasq-grand" : ""}
                                >
                                  <td>{r.KODE ?? ""}</td>
                                  <td>{r.DESKRIPSI ?? ""}</td>
                                  <td className="num">{fmtNum(r.SALES_QTY_TAHUN_SEBELUMNYA)}</td>
                                  <td className="num">{fmtNum(r.SALES_QTY_BERJALAN)}</td>
                                  <td className="num">{fmtNum(r.GROWTH)}</td>
                                  <td className="num">{fmtPct(r.PERSEN_GROWTH)}</td>
                                  <td className="num">{fmtPct(r.KONTRIBUSI)}</td>
                                  <td className="num">{fmtNum(r.inventory_stock)}</td>
                                  <td className="num">{fmtNum(r.stock_day)}</td>
                                  <td className={ket === "STOP" ? "rasq-stop" : ket === "KIRIM" ? "rasq-kirim" : ""}>
                                    {ket}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="rds-meta">
                      <span>{rows.length ? `${rows.length} baris` : "0 baris"}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default RegAsbcQtyPage;
