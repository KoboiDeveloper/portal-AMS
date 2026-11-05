import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon, RSelect } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker, { formatAppDateYmd } from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { createHrdService, hrdLookupOptions } from "../../../services/hrd/hrd.service";
import { getActorId } from "../../../lib/auth";
import { extractRows, isSuccess } from "../../../lib/response";
import { ScBtn, ScEmptyState, ScError, ScKpi, ScKpiStrip, ScPageHeader, ScSkeletonBlock } from "../dgs/sc";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";
import "./hrd-rpt.css";

const service = createHrdService("rpt/detail-kehadiran", { crud: false });
const MODULE = "HRD_RPT_DETAIL_HADIR";

const GROUP_OPTS = [
  { value: "REGULER", label: "Reguler" },
  { value: "TEMPORER", label: "Temporer" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 36,
    height: 36,
    fontSize: "0.8125rem",
    borderColor: "var(--sc-border, #e3e5e7)",
    borderRadius: 6,
    background: "#fff",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px", height: 34 }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: "0.8125rem" }),
};

const monthStart = () => {
  const d = new Date();
  return formatAppDateYmd(new Date(d.getFullYear(), d.getMonth(), 1));
};
const monthEnd = () => {
  const d = new Date();
  return formatAppDateYmd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

const dayTone = (color) => {
  const c = String(color || "").toLowerCase();
  if (c.includes("red")) return "is-absen redFont";
  if (c.includes("black")) return "is-hadir blackFont";
  return "";
};

const DayCell = ({ value, color }) => {
  const v = value == null || value === "" ? "" : String(value);
  if (!v || v === "0") return <span className="hrd-dk-cell is-empty">·</span>;
  const tone = dayTone(color) || (Number(v) > 0 ? "is-hadir" : "");
  return <span className={`hrd-dk-cell ${tone}`}>{v}</span>;
};

const HrdRptDetailKehadiranPage = () => {
  const seq = useRef(0);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [brand, setBrand] = useState("");
  const [group, setGroup] = useState("REGULER");
  const [brandOpts, setBrandOpts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [openStore, setOpenStore] = useState("");
  const [empByStore, setEmpByStore] = useState({});
  const [empLoading, setEmpLoading] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const b = await hrdLookupOptions("brand");
      if (!alive) return;
      setBrandOpts([{ value: "", label: "Pilih brand" }, ...b]);
      if (b[0]?.value) setBrand(String(b[0].value));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadStores = useCallback(async () => {
    if (!from || !to || !brand) return;
    const my = ++seq.current;
    setLoading(true);
    setError("");
    setEmpByStore({});
    setOpenStore("");
    try {
      const res = await service.list({
        from_date: from,
        to_date: to,
        brand,
        id_brand: brand,
        group,
        user_id: getActorId() || "portal",
      });
      if (my !== seq.current) return;
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat detail kehadiran");
        setStores([]);
      } else {
        setStores(extractRows(res));
      }
      setLoaded(true);
    } catch (err) {
      if (my !== seq.current) return;
      setError(err?.responseMessage || err?.message || "Gagal memuat detail kehadiran");
      setStores([]);
      setLoaded(true);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [from, to, brand, group]);

  const loadEmployees = useCallback(
    async (idCabang) => {
      if (!idCabang) return;
      setEmpLoading(idCabang);
      try {
        const res = await service.list({
          from_date: from,
          to_date: to,
          brand,
          id_brand: brand,
          group,
          id_cabang: idCabang,
          user_id: getActorId() || "portal",
        });
        if (!isSuccess(res)) {
          setEmpByStore((prev) => ({ ...prev, [idCabang]: [] }));
          return;
        }
        setEmpByStore((prev) => ({ ...prev, [idCabang]: extractRows(res) }));
      } catch {
        setEmpByStore((prev) => ({ ...prev, [idCabang]: [] }));
      } finally {
        setEmpLoading("");
      }
    },
    [from, to, brand, group]
  );

  const toggleStore = async (id) => {
    if (openStore === id) {
      setOpenStore("");
      return;
    }
    setOpenStore(id);
    if (!empByStore[id]) await loadEmployees(id);
  };

  const totalEmp = useMemo(
    () => Object.values(empByStore).reduce((a, list) => a + (list?.length || 0), 0),
    [empByStore]
  );

  const brandLabel = brandOpts.find((o) => String(o.value) === String(brand))?.label || brand || "—";
  const desc = loaded
    ? `${from} → ${to} · ${brandLabel} · ${group} · ${stores.length.toLocaleString("id-ID")} cabang`
    : "Kalender kehadiran 1–31 per cabang — cocok untuk rekap bulanan store";

  const dayCount = useMemo(() => {
    if (!from) return 31;
    const d = new Date(from);
    if (Number.isNaN(d.getTime())) return 31;
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }, [from]);

  return (
    <AccessGuard moduleCode={MODULE} permission="VIEW">
      <Head title="Detail Kehadiran" />
      <Content>
        <PageSmoothScroll revision={`${loading}-${stores.length}-${openStore}`} className="riv-page-scroll">
          <div className="hrd-sc hrd-rpt dgs-dash sc-scope">
            <ScPageHeader
              title="Detail Kehadiran Rangkuman Pegawai"
              description={desc}
              actions={
                <div className="hrd-toolbar-actions">
                  <ScBtn variant="soft" disabled={loading} onClick={loadStores}>
                    <Icon name="reload" /> Refresh
                  </ScBtn>
                  <ScBtn
                    variant="ghost"
                    onClick={() => window.print()}
                    disabled={!stores.length}
                  >
                    <Icon name="printer" /> Print
                  </ScBtn>
                </div>
              }
            />

            <div className="dgs-filters">
              <div className="reg-ar-f-item">
                <label>Periode</label>
                <AppDateRangePicker
                  startDate={from}
                  endDate={to}
                  className="reg-ar-ctl"
                  onChange={(a, b) => {
                    setFrom(a || "");
                    setTo(b || "");
                  }}
                />
              </div>
              <div className="reg-ar-f-item" style={{ minWidth: 160 }}>
                <label>Brand</label>
                <RSelect
                  styles={selectStyles}
                  options={brandOpts}
                  value={brandOpts.find((o) => String(o.value) === String(brand)) || null}
                  onChange={(opt) => setBrand(opt?.value != null ? String(opt.value) : "")}
                />
              </div>
              <div className="reg-ar-f-item" style={{ minWidth: 140 }}>
                <label>Group pegawai</label>
                <RSelect
                  styles={selectStyles}
                  options={GROUP_OPTS}
                  value={GROUP_OPTS.find((o) => o.value === group) || GROUP_OPTS[0]}
                  onChange={(opt) => setGroup(opt?.value || "REGULER")}
                />
              </div>
              <ScBtn disabled={loading || !brand} onClick={loadStores}>
                <Icon name="search" /> Terapkan
              </ScBtn>
            </div>

            {error ? <ScError message={error} onRetry={loadStores} /> : null}

            {loading ? (
              <div className="sc-panel sc-panel--flush" aria-busy="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <ScSkeletonBlock key={i} style={{ height: 48, margin: 8 }} />
                ))}
              </div>
            ) : null}

            {loaded && !error && stores.length > 0 ? (
              <>
                <ScKpiStrip>
                  <ScKpi title="Cabang" value={stores.length.toLocaleString("id-ID")} />
                  <ScKpi title="Hari di bulan" value={String(dayCount)} />
                  <ScKpi title="Pegawai dibuka" value={totalEmp.toLocaleString("id-ID")} tone="ok" />
                </ScKpiStrip>

                <div className="hrd-rpt__meta">
                  <span className="hrd-rpt__meta-count">Klik cabang untuk membuka kalender 01–{String(dayCount).padStart(2, "0")}</span>
                  <div className="hrd-rpt__legend">
                    <span>
                      <i className="hrd-rpt__swatch is-hadir" /> Hadir
                    </span>
                    <span>
                      <i className="hrd-rpt__swatch is-absen" /> Tidak masuk / highlight
                    </span>
                  </div>
                </div>

                {stores.map((s) => {
                  const id = String(s.id_cabang || s.store_id || s.id);
                  const open = openStore === id;
                  const emps = empByStore[id] || [];
                  const busy = empLoading === id;
                  return (
                    <div key={id} className="hrd-rpt-group">
                      <button type="button" className="hrd-rpt-group__head" onClick={() => toggleStore(id)}>
                        <div>
                          <h3 className="hrd-rpt-group__title">{s.store_name || s.branch_name || id}</h3>
                          <p className="hrd-rpt-group__sub">{s.period_label || `${from} s/d ${to}`}</p>
                        </div>
                        <div className="hrd-rpt-group__right">
                          {open && emps.length ? `${emps.length} pegawai` : null}
                          <Icon name={open ? "chevron-up" : "chevron-down"} />
                        </div>
                      </button>
                      {open ? (
                        <div className="hrd-rpt-group__body">
                          {busy ? (
                            <div style={{ padding: 16 }}>
                              <ScSkeletonBlock style={{ height: 36 }} />
                            </div>
                          ) : emps.length === 0 ? (
                            <p className="text-soft" style={{ margin: 0, padding: 16 }}>
                              Tidak ada data pegawai di cabang ini.
                            </p>
                          ) : (
                            <div className="dgs-table-wrap" style={{ overflowX: "auto" }}>
                              <table className="dgs-table hrd-dk-table">
                                <thead>
                                  <tr>
                                    <th className="hrd-rpt-sticky-name">NICK</th>
                                    <th>Nama</th>
                                    <th>Jabatan</th>
                                    <th className="num">Total</th>
                                    {DAYS.filter((d) => d <= dayCount).map((d) => (
                                      <th key={d} className="hrd-dk-day">
                                        {String(d).padStart(2, "0")}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {emps.map((r) => (
                                    <tr key={`${id}-${r.nik}-${r.id}`}>
                                      <td className="hrd-rpt-sticky-name">
                                        <div className="sc-td-meta">{r.nick || r.nik || "—"}</div>
                                      </td>
                                      <td>
                                        <div className="sc-td-main">{r.employee_name || "—"}</div>
                                      </td>
                                      <td>{r.jabatan || "—"}</td>
                                      <td className="num">{r.total ?? 0}</td>
                                      {DAYS.filter((d) => d <= dayCount).map((d) => (
                                        <td key={d} className="hrd-dk-day">
                                          <DayCell value={r[`history_${d}`]} color={r[`history_${d}_color`]} />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </>
            ) : null}

            {loaded && !loading && !error && stores.length === 0 ? (
              <ScEmptyState
                icon="map-pin"
                title="Tidak ada cabang untuk filter ini"
                hint="Coba ganti brand, group, atau periode."
                action={
                  <ScBtn variant="soft" onClick={loadStores}>
                    Terapkan ulang
                  </ScBtn>
                }
              />
            ) : null}

            {!loaded && !loading ? (
              <ScEmptyState
                icon="calendar"
                title="Siapkan filter laporan"
                hint="Pilih periode & brand, lalu Terapkan. Buka tiap cabang untuk melihat kalender harian."
              />
            ) : null}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdRptDetailKehadiranPage;
