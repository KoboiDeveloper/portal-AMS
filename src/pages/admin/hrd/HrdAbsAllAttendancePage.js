import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon, RSelect } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker, { formatAppDateYmd } from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { createHrdService, hrdLookupOptions } from "../../../services/hrd/hrd.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { RivStickyThead } from "../regional/RivStickyThead";
import { ScBtn, ScEmptyState, ScError, ScPageHeader, ScSkeletonBlock } from "../dgs/sc";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";
import "./hrd-rpt.css";
import "./hrd-attendance.css";

const service = createHrdService("abs/all-attendance", { crud: false });
const MODULE = "HRD_ABS_ALL_ATTENDANCE";

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 36,
    height: 36,
    fontSize: "0.8125rem",
    borderColor: "var(--sc-border, #e3e5e7)",
    borderRadius: 6,
    background: "#fff",
    boxShadow: "none",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 10px",
    height: "100%",
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
  }),
  singleValue: (base) => ({
    ...base,
    position: "static",
    transform: "none",
    margin: 0,
    lineHeight: "20px",
    maxWidth: "100%",
  }),
  placeholder: (base) => ({
    ...base,
    position: "static",
    transform: "none",
    margin: 0,
    lineHeight: "20px",
  }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: () => ({ display: "none" }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: "0.8125rem" }),
};

const monthStart = () => {
  const d = new Date();
  return formatAppDateYmd(new Date(d.getFullYear(), d.getMonth(), 1));
};
const todayYmd = () => formatAppDateYmd(new Date());

const initials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const toneFor = (name) => {
  const s = String(name || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 5;
  return `tone-${h}`;
};

const fmtDate = (v) => {
  const s = String(v || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

const fmtTime = (v) => {
  const s = String(v || "").trim();
  if (!s) return "—";
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const HARI_ID = {
  sunday: "Minggu",
  monday: "Senin",
  tuesday: "Selasa",
  wednesday: "Rabu",
  thursday: "Kamis",
  friday: "Jumat",
  saturday: "Sabtu",
  minggu: "Minggu",
  senin: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  "jum'at": "Jumat",
  sabtu: "Sabtu",
};

const fmtHari = (v) => {
  const raw = String(v || "").trim();
  if (!raw) return "—";
  return HARI_ID[raw.toLowerCase()] || raw;
};

const pick = (row, ...keys) => {
  for (const k of keys) {
    if (row?.[k] != null && row[k] !== "") return row[k];
  }
  return "";
};

const HrdAbsAllAttendancePage = () => {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayYmd);
  const [brand, setBrand] = useState("");
  const [store, setStore] = useState("");
  const [brandOpts, setBrandOpts] = useState([]);
  const [storeOpts, setStoreOpts] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [openMap, setOpenMap] = useState({});
  const [defaultOpen, setDefaultOpen] = useState(true);
  const tableRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opts = await hrdLookupOptions("brand");
      if (!cancelled) setBrandOpts(opts);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!brand) {
        setStoreOpts([{ value: "ALL", label: "Semua store" }]);
        return;
      }
      const opts = await hrdLookupOptions("store", { parentId: brand });
      if (!cancelled) {
        setStoreOpts([{ value: "ALL", label: "Semua store" }, ...opts]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brand]);

  const load = useCallback(async () => {
    if (!brand) {
      setError("Pilih Brand dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await service.list({
        id_brand: brand,
        id_store: store && store !== "ALL" ? store : "",
        from_date: from,
        to_date: to,
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat absensi");
        setRows([]);
      } else {
        setRows(extractRows(res));
        setOpenMap({});
        setDefaultOpen(true);
      }
      setLoaded(true);
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Gagal memuat absensi");
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [brand, store, from, to]);

  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const nik = String(pick(r, "nik", "user_nik", "User_NIK") || "");
      const name = String(pick(r, "employee_name", "user_name", "USER_NAME") || nik || "Unknown");
      const key = nik || name;
      if (!map.has(key)) {
        map.set(key, {
          key,
          nik,
          name,
          stores: new Set(),
          days: [],
        });
      }
      const g = map.get(key);
      const storeId = String(pick(r, "store", "store_id", "Store_ID") || "");
      if (storeId) g.stores.add(storeId);
      g.days.push({
        id: pick(r, "id") || `${key}-${pick(r, "tanggal")}`,
        store: storeId,
        hari: String(pick(r, "hari", "Hari") || ""),
        tanggal: String(pick(r, "tanggal", "Tanggal") || ""),
        masuk: String(pick(r, "jam_masuk", "time_in", "Masuk", "masuk") || ""),
        keluar: String(pick(r, "jam_keluar", "time_out", "Keluar", "keluar") || ""),
      });
    });
    return [...map.values()]
      .map((g) => ({
        ...g,
        storeList: [...g.stores],
        dayCount: g.days.length,
        incomplete: g.days.filter((d) => !d.keluar || d.keluar === d.masuk).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [rows]);

  const isOpen = (key) => (openMap[key] == null ? defaultOpen : !!openMap[key]);

  const toggleGroup = (key) => {
    setOpenMap((prev) => ({ ...prev, [key]: !isOpen(key) }));
  };

  const toggleAll = () => {
    const next = !defaultOpen;
    setDefaultOpen(next);
    setOpenMap({});
  };

  const brandValue = brandOpts.find((o) => String(o.value) === String(brand)) || null;
  const storeValue =
    storeOpts.find((o) => String(o.value) === String(store || "ALL")) ||
    storeOpts[0] ||
    null;

  return (
    <AccessGuard moduleCode={MODULE} permission="VIEW">
      <Head title="List absen Store" />
      <Content>
        <PageSmoothScroll revision={`${from}-${to}-${brand}-${store}-${groups.length}`} className="riv-page-scroll">
          <div className="hrd-sc hrd-rpt hrd-att dgs-dash sc-scope">
            <ScPageHeader
              title="List absen Store"
              description="Employee attendance per store (legacy: Rpt_Attendance.aspx)."
              actions={
                <div className="hrd-toolbar-actions">
                  <ScBtn variant="soft" disabled={loading || !groups.length} onClick={toggleAll}>
                    <Icon name={defaultOpen ? "chevron-up" : "chevron-down"} />
                    {defaultOpen ? "Tutup semua" : "Buka semua"}
                  </ScBtn>
                  <ScBtn variant="soft" disabled={loading} onClick={load}>
                    <Icon name="reload" /> Refresh
                  </ScBtn>
                </div>
              }
            />

            <form
              className="dgs-filters hrd-att__filters"
              onSubmit={(e) => {
                e.preventDefault();
                load();
              }}
            >
              <div className="reg-ar-f-item" style={{ minWidth: 180 }}>
                <label>Brand *</label>
                <RSelect
                  className="ams-rselect hrd-process-select"
                  classNamePrefix="hrd-ps"
                  styles={selectStyles}
                  options={brandOpts}
                  value={brandValue}
                  placeholder="Pilih Brand"
                  onChange={(opt) => {
                    setBrand(opt?.value != null ? String(opt.value) : "");
                    setStore("ALL");
                  }}
                />
              </div>
              <div className="reg-ar-f-item" style={{ minWidth: 200 }}>
                <label>Store</label>
                <RSelect
                  className="ams-rselect hrd-process-select"
                  classNamePrefix="hrd-ps"
                  styles={selectStyles}
                  options={storeOpts}
                  value={storeValue}
                  placeholder="Pilih Store"
                  isDisabled={!brand}
                  onChange={(opt) => setStore(opt?.value != null ? String(opt.value) : "ALL")}
                />
              </div>
              <div className="reg-ar-f-item" style={{ minWidth: 260 }}>
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
              <ScBtn type="submit" disabled={loading || !brand}>
                <Icon name="search" /> Filter
              </ScBtn>
            </form>

            {error ? <ScError message={error} onRetry={load} /> : null}

            {loading ? (
              <div className="sc-panel sc-panel--flush" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ScSkeletonBlock key={i} style={{ height: 64, margin: 8 }} />
                ))}
              </div>
            ) : null}

            {loaded && !loading && !error && groups.length > 0 ? (
              <>
                <div className="hrd-att__summary" aria-live="polite">
                  <span>
                    <strong>{groups.length.toLocaleString("id-ID")}</strong> pegawai
                  </span>
                  <span className="hrd-att__summary-sep" aria-hidden>
                    ·
                  </span>
                  <span>
                    <strong>{rows.length.toLocaleString("id-ID")}</strong> baris
                  </span>
                  {(() => {
                    const miss = groups.reduce((n, g) => n + g.incomplete, 0);
                    if (!miss) return null;
                    return (
                      <>
                        <span className="hrd-att__summary-sep" aria-hidden>
                          ·
                        </span>
                        <span className="hrd-att__summary-miss">
                          <strong>{miss.toLocaleString("id-ID")}</strong> tanpa clock-out
                        </span>
                      </>
                    );
                  })()}
                </div>

                <div className="hrd-att__board">
                  <div className="hrd-att__table-wrap">
                    <table ref={tableRef} className="hrd-att__table">
                      <thead>
                        <tr>
                          <th className="hrd-att-sticky-emp">Employee</th>
                          <th>Store</th>
                          <th>Hari</th>
                          <th>Tanggal</th>
                          <th>Time In</th>
                          <th>Time Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((g) => {
                          const open = isOpen(g.key);
                          return (
                            <React.Fragment key={g.key}>
                              <tr className={`hrd-att-group ${toneFor(g.name)}`}>
                                <td colSpan={6}>
                                  <button
                                    type="button"
                                    className="hrd-att-group__btn"
                                    onClick={() => toggleGroup(g.key)}
                                    aria-expanded={open}
                                  >
                                    <span className={`hrd-att-avatar ${toneFor(g.name)}`}>
                                      {initials(g.name)}
                                    </span>
                                    <span className="hrd-att-group__meta">
                                      <strong>{g.name}</strong>
                                      <span>
                                        {g.nik || "—"} · {g.storeList.join(", ") || "—"} · {g.dayCount} hari
                                        {g.incomplete ? ` · ${g.incomplete} incomplete` : ""}
                                      </span>
                                    </span>
                                    <Icon name={open ? "chevron-up" : "chevron-down"} />
                                  </button>
                                </td>
                              </tr>
                              {open
                                ? g.days.map((d) => {
                                    const incomplete = !d.keluar || d.keluar === d.masuk;
                                    return (
                                      <tr
                                        key={d.id}
                                        className={`hrd-att-day${incomplete ? " is-incomplete" : ""}`}
                                      >
                                        <td className="hrd-att-sticky-emp hrd-att-day__emp">
                                          <span className="hrd-att-day__dot" />
                                          {g.name}
                                        </td>
                                        <td>{d.store || "—"}</td>
                                        <td>{fmtHari(d.hari)}</td>
                                        <td>{fmtDate(d.tanggal)}</td>
                                        <td className="hrd-att-time is-in">{fmtTime(d.masuk)}</td>
                                        <td className={`hrd-att-time${incomplete ? " is-miss" : " is-out"}`}>
                                          {incomplete ? "—" : fmtTime(d.keluar)}
                                        </td>
                                      </tr>
                                    );
                                  })
                                : null}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    <RivStickyThead
                      tableRef={tableRef}
                      enabled={!loading && groups.length > 0}
                      tableClassName="hrd-att__table"
                    />
                  </div>
                </div>
              </>
            ) : null}

            {loaded && !loading && !error && groups.length === 0 ? (
              <ScEmptyState
                title="Belum ada absensi"
                hint="Coba ganti brand, store, atau rentang tanggal."
                action={
                  <ScBtn variant="soft" onClick={load}>
                    <Icon name="reload" /> Coba lagi
                  </ScBtn>
                }
              />
            ) : null}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdAbsAllAttendancePage;
