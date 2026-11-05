import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon, RSelect } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker, { formatAppDateYmd } from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createHrdService,
  getHrdDetailKehadiranAbsensiInfo,
  hrdLookupOptions,
  updateHrdDetailKehadiranAkhir,
} from "../../../services/hrd/hrd.service";
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

const dayVal = (row, ...keys) => {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k];
  }
  return "";
};

const DayCell = ({ value, color, editable, onPick }) => {
  const v = value == null || value === "" ? "" : String(value);
  const empty = !v || v === "0";
  const tone = dayTone(color) || (!empty && Number(v) > 0 ? "is-hadir" : "");
  if (!editable) {
    if (empty) return <span className="hrd-dk-cell is-empty">·</span>;
    return <span className={`hrd-dk-cell ${tone}`}>{v}</span>;
  }
  return (
    <button
      type="button"
      className={`hrd-dk-cell hrd-dk-cell--btn ${empty ? "is-empty" : tone}`}
      title={empty || v === "0" ? "Set HADIR" : "Set TIDAK MASUK"}
      onClick={(e) => {
        e.stopPropagation();
        onPick?.(empty || v === "0" ? 1 : 0);
      }}
    >
      {empty ? "·" : v}
    </button>
  );
};

const EmpBlock = ({ row, dayCount, onNameClick, onAkhirToggle, savingKey }) => {
  const nik = row.nick || row.nik || "—";
  const name = row.employee_name || "—";
  const days = DAYS.filter((d) => d <= dayCount);
  return (
    <>
      <tr className="hrd-dk-row hrd-dk-row--history">
        <td className="hrd-rpt-sticky-name hrd-dk-emp-sticky" rowSpan={3}>
          <div className="sc-td-meta">{nik}</div>
          <button type="button" className="hrd-dk-name-link" onClick={() => onNameClick(row)}>
            {name}
          </button>
          <div className="hrd-dk-job">{row.jabatan || "—"}</div>
        </td>
        <td className="hrd-dk-kind">History</td>
        <td className="num">{row.total_history ?? row.HISTORY_TOTAL ?? row.total ?? 0}</td>
        {days.map((d) => (
          <td key={`h-${d}`} className="hrd-dk-day">
            <DayCell
              value={dayVal(row, `history_${d}`, `HISTORY_${d}`)}
              color={dayVal(row, `history_${d}_color`, `HISTORY_${d}_color`)}
            />
          </td>
        ))}
      </tr>
      <tr className="hrd-dk-row hrd-dk-row--manual">
        <td className="hrd-dk-kind">Manual</td>
        <td className="num">{row.m_total ?? row.M_TOTAL ?? 0}</td>
        {days.map((d) => (
          <td key={`m-${d}`} className="hrd-dk-day">
            <DayCell
              value={dayVal(row, `m_${d}`, `M_${d}`)}
              color={dayVal(row, `m_${d}_color`, `M_${d}_color`)}
            />
          </td>
        ))}
      </tr>
      <tr className="hrd-dk-row hrd-dk-row--akhir hrd-dk-row--emp-end">
        <td className="hrd-dk-kind">Data akhir</td>
        <td className="num">{row.total_akhir ?? row.TOTAL ?? 0}</td>
        {days.map((d) => {
          const key = `${row.nik}-${d}`;
          const busy = savingKey === key;
          return (
            <td key={`a-${d}`} className="hrd-dk-day">
              {busy ? (
                <span className="hrd-dk-cell is-busy">…</span>
              ) : (
                <DayCell
                  value={dayVal(row, `akhir_${d}`, String(d))}
                  color={dayVal(row, `akhir_${d}_color`, `${d}_color`)}
                  editable
                  onPick={(typeAbsensi) => onAkhirToggle(row, d, typeAbsensi)}
                />
              )}
            </td>
          );
        })}
      </tr>
    </>
  );
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
  const [savingKey, setSavingKey] = useState("");
  const [modal, setModal] = useState({ open: false, nik: "", name: "" });
  const [modalRows, setModalRows] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const b = await hrdLookupOptions("brand");
      if (!alive) return;
      setBrandOpts([{ value: "", label: "Pilih brand" }, ...b]);
      const prefer = b.find((o) => String(o.value).toUpperCase() === "RC") || b[0];
      if (prefer?.value) setBrand(String(prefer.value));
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

  const openAbsensiInfo = async (row) => {
    const nik = String(row.nik || row.nick || "");
    if (!nik) return;
    setModal({ open: true, nik, name: row.employee_name || nik });
    setModalRows([]);
    setModalError("");
    setModalLoading(true);
    try {
      const res = await getHrdDetailKehadiranAbsensiInfo({
        nik,
        from_date: from,
        to_date: to,
      });
      if (!isSuccess(res)) {
        setModalError(res?.responseMessage || res?.message || "Gagal memuat info absensi");
        setModalRows([]);
      } else {
        setModalRows(extractRows(res));
      }
    } catch (err) {
      const msg = err?.responseMessage || err?.message || "";
      setModalError(msg.includes("404") || msg.includes("Not Found")
        ? "API absensi-info belum aktif — restart AMS API lalu refresh."
        : msg || "Gagal memuat info absensi");
      setModalRows([]);
    } finally {
      setModalLoading(false);
    }
  };

  const onAkhirToggle = async (row, day, typeAbsensi) => {
    const nik = String(row.nik || "");
    const storeId = String(row.store_id || "");
    if (!nik || !storeId) return;
    const key = `${nik}-${day}`;
    setSavingKey(key);
    try {
      const res = await updateHrdDetailKehadiranAkhir({
        nik,
        store_id: storeId,
        tgl: String(day),
        typeAbsensi,
        date: from,
        from_date: from,
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal update data akhir");
        return;
      }
      const idCabang = String(row.id_cabang || openStore);
      setEmpByStore((prev) => {
        const list = (prev[idCabang] || []).map((r) => {
          if (String(r.nik) !== nik) return r;
          const cur = Number(r.total_akhir ?? 0) || 0;
          const nextTotal = typeAbsensi === 1 ? cur + 1 : Math.max(0, cur - 1);
          return {
            ...r,
            [`akhir_${day}`]: typeAbsensi,
            total_akhir: nextTotal,
          };
        });
        return { ...prev, [idCabang]: list };
      });
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Gagal update data akhir");
    } finally {
      setSavingKey("");
    }
  };

  const totalEmp = useMemo(
    () => Object.values(empByStore).reduce((a, list) => a + (list?.length || 0), 0),
    [empByStore]
  );

  const brandLabel = brandOpts.find((o) => String(o.value) === String(brand))?.label || brand || "—";
  const desc = loaded
    ? `${from} → ${to} · ${brandLabel} · ${group} · ${stores.length.toLocaleString("id-ID")} cabang`
    : "Kalender kehadiran 1–31 per cabang — History / Manual / Data akhir";

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
                  <ScBtn variant="ghost" onClick={() => window.print()} disabled={!stores.length}>
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
                  <span className="hrd-rpt__meta-count">
                    Klik nama → info absensi · klik Data akhir → HADIR / TIDAK
                  </span>
                  <div className="hrd-rpt__legend">
                    <span>
                      <i className="hrd-rpt__swatch is-hadir" /> Hadir
                    </span>
                    <span>
                      <i className="hrd-rpt__swatch is-absen" /> Tidak masuk
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
                            <div className="dgs-table-wrap hrd-dk-wrap">
                              <table className="dgs-table hrd-dk-table">
                                <thead>
                                  <tr>
                                    <th className="hrd-rpt-sticky-name">Pegawai</th>
                                    <th className="hrd-dk-kind-col">Baris</th>
                                    <th className="num hrd-dk-total-col">Tot</th>
                                    {DAYS.filter((d) => d <= dayCount).map((d) => (
                                      <th key={d} className="hrd-dk-day">
                                        {String(d).padStart(2, "0")}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {emps.map((r) => (
                                    <EmpBlock
                                      key={`${id}-${r.nik}-${r.id}`}
                                      row={r}
                                      dayCount={dayCount}
                                      onNameClick={openAbsensiInfo}
                                      onAkhirToggle={onAkhirToggle}
                                      savingKey={savingKey}
                                    />
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
                hint="Coba ganti brand, group, atau periode. Brand harus kode (RC, FL, …)."
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
                hint="Pilih periode & brand, lalu Terapkan. Buka tiap cabang untuk melihat History / Manual / Data akhir."
              />
            ) : null}
          </div>
        </PageSmoothScroll>

        <Modal
          isOpen={modal.open}
          toggle={() => setModal({ open: false, nik: "", name: "" })}
          size="md"
          className="modal-dialog-centered hrd-dk-info-modal"
          contentClassName="dgs-modal-content"
        >
          <div className="hrd-modal-head">
            <div>
              <h5 className="hrd-modal-head__title">Info Absensi Store</h5>
              <p className="hrd-modal-head__sub">
                {modal.name} · {modal.nik} · {from} → {to}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-icon btn-trigger"
              onClick={() => setModal({ open: false, nik: "", name: "" })}
            >
              <Icon name="cross" />
            </button>
          </div>
          <ModalBody className="dgs-modal-body">
            {modalLoading ? <ScSkeletonBlock style={{ height: 120 }} /> : null}
            {modalError ? <ScError message={modalError} /> : null}
            {!modalLoading && !modalError && modalRows.length === 0 ? (
              <p className="text-soft" style={{ margin: 0 }}>
                Tidak ada punch absensi di periode ini.
              </p>
            ) : null}
            {!modalLoading && modalRows.length > 0 ? (
              <div className="dgs-table-wrap">
                <table className="dgs-table">
                  <thead>
                    <tr>
                      <th>Tanggal / Waktu</th>
                      <th>Store</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalRows.map((r, i) => (
                      <tr key={r.id || i}>
                        <td>{r.waktu || r.tanggal || "—"}</td>
                        <td>{r.store_id || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </ModalBody>
        </Modal>
      </Content>
    </AccessGuard>
  );
};

export default HrdRptDetailKehadiranPage;
