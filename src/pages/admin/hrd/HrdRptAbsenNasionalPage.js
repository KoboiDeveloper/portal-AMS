import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Modal, ModalBody } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon, RSelect } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker, { formatAppDateYmd } from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createHrdService,
  getHrdAbsenNasionalDetail,
  hrdLookupOptions,
} from "../../../services/hrd/hrd.service";
import { getActorId } from "../../../lib/auth";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import { ScBtn, ScEmptyState, ScError, ScPageHeader, ScSkeletonBlock } from "../dgs/sc";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";
import "./hrd-rpt.css";

const service = createHrdService("rpt/absen-nasional", { crud: false });
const MODULE = "HRD_RPT_ABSEN_NASIONAL";

/** Legacy AbsenReportNasionalATotal.aspx — hardcoded lokasi absensi, NOT store master. */
const CABANG_OPTS = [
  { value: "1", label: "HO" },
  { value: "3", label: "CIPAKU" },
  { value: "4", label: "PAMOYANAN" },
  { value: "5", label: "NAGROG" },
  { value: "6", label: "PEMALANG" },
  { value: "7", label: "AMK" },
];

const GROUP_OPTS = [
  { value: "ALL", label: "ALL" },
  { value: "Kontrak", label: "BULANAN" },
  { value: "Temporer", label: "TEMPORER" },
  { value: "Tetap", label: "TETAP" },
];

const MANAGERIAL_DEPT = { value: "216216", label: "MANAGERIAL" };

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
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  menu: (base) => ({ ...base, zIndex: 9999, fontSize: "0.8125rem", borderRadius: 6 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menuList: (base) => ({ ...base, maxHeight: 280 }),
};

const menuPortalProps = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : null,
  menuPosition: "fixed",
};

const monthStart = () => {
  const d = new Date();
  return formatAppDateYmd(new Date(d.getFullYear(), d.getMonth(), 1));
};
const monthEnd = () => {
  const d = new Date();
  return formatAppDateYmd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

const n = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

/** Legacy ASPX strips leading "/" from weekend/holiday totals. */
const stripSlash = (v) => String(v ?? "0").replace(/^\/\s*/, "").trim() || "0";

const WdWkHd = ({ wd, wk, hd }) => (
  <span className="hrd-rpt-triple">{`${n(wd)}/${stripSlash(wk)}/${stripSlash(hd)}`}</span>
);

const DATE_LINE_RE = /^(\d{1,2})\.\s+(\d{4}-\d{2}-\d{2})(.*)$/;

/** Turn legacy popup HTML (br / hr.divider / font) into structured rows. */
const parseLegacyHtml = (html) => {
  if (html == null) return [];
  const text = String(html)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p\/?>/gi, "\n")
    .replace(/<hr[^>]*>/gi, "\n__SEC__\n")
    .replace(/<\/?i[^>]*>/gi, "")
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?font[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "");

  const chunks = text.split(/\n?__SEC__\n?/);
  const sections = [];
  let pendingTitle = null;

  const pushItems = (title, lines) => {
    const items = [];
    lines.forEach((line) => {
      const t = line.trim();
      if (!t || t === "-" || t === "–" || t === "—") return;
      const m = t.match(DATE_LINE_RE);
      if (m) {
        const rest = (m[3] || "").replace(/^\s*[|·•]\s*/, "").trim();
        /* Legacy often omits closing ")" before Total jam. */
        const clockM = rest.match(/\(\s*([\d:]+)\s*-\s*([\d:]+)\s*([A-Za-z]+)?/);
        const jamM = rest.match(/Total jam\s+(\d{1,2}:\d{2}:\d{2})/i);
        const timeIn = clockM ? clockM[1] : "";
        const timeOut = clockM ? clockM[2] : "";
        const day = clockM && clockM[3] ? clockM[3] : "";
        items.push({
          no: m[1].padStart(2, "0"),
          date: m[2],
          timeIn,
          timeOut,
          day,
          total: jamM ? jamM[1] : "",
          note: !clockM && rest ? rest.replace(/\s*\|\s*/g, " · ").trim() : "",
        });
        return;
      }
      if (/^(reguler|in\s*=\s*out)$/i.test(t)) return;
      if (!DATE_LINE_RE.test(t) && t.length < 48 && !/\d{4}-\d{2}-\d{2}/.test(t)) {
        pendingTitle = t;
      }
    });
    if (items.length) sections.push({ title: title || null, items });
  };

  chunks.forEach((chunk) => {
    const lines = chunk
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (!lines.length) return;

    const first = lines[0];
    const firstIsDate = DATE_LINE_RE.test(first);
    if (!firstIsDate && lines.length === 1 && (first === "-" || first.length < 40)) {
      if (first !== "-") pendingTitle = first;
      return;
    }

    let title = pendingTitle;
    let body = lines;
    if (!firstIsDate) {
      title = first;
      body = lines.slice(1);
      pendingTitle = null;
    } else {
      pendingTitle = null;
    }
    pushItems(title, body);
  });

  if (!sections.length) {
    const all = text
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    pushItems(null, all);
  }

  return sections;
};

const ContentBlock = ({ html }) => {
  const sections = useMemo(() => parseLegacyHtml(html), [html]);
  if (!sections.length) {
    return <div className="hrd-nas-empty">Tidak ada data</div>;
  }
  return (
    <div className="hrd-nas-content">
      {sections.map((sec, si) => (
        <div key={`${sec.title || "s"}-${si}`} className="hrd-nas-sec">
          {sec.title ? <div className="hrd-nas-sec__title">{sec.title}</div> : null}
          <ul className="hrd-nas-list">
            {sec.items.map((it) => (
              <li key={`${it.no}-${it.date}-${it.timeIn}`} className="hrd-nas-item">
                <span className="hrd-nas-item__line">
                  <span className="hrd-nas-item__no">{it.no}.</span>{" "}
                  <span className="hrd-nas-item__date">{it.date}</span>
                  {it.timeIn || it.timeOut ? (
                    <span className="hrd-nas-item__time">
                      {it.timeIn || "—"}
                      <i> - </i>
                      {it.timeOut || "—"}
                      {it.day ? <span className="hrd-nas-item__day"> {it.day}</span> : null}
                      {it.total ? <strong>{it.total}</strong> : null}
                    </span>
                  ) : null}
                  {it.note ? <span className="hrd-nas-item__note"> {it.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const TotalBadge = ({ children }) => <span className="hrd-nas-total">{children ?? 0}</span>;

const FieldHead = ({ label, value }) => (
  <div className="hrd-nas-label">
    <span>{label}</span>
    <TotalBadge>{value}</TotalBadge>
  </div>
);

const SkelLines = ({ count = 6 }) => (
  <div className="hrd-nas-skel-lines">
    {Array.from({ length: count }).map((_, i) => (
      <ScSkeletonBlock key={i} className="hrd-nas-skel-line" style={{ width: `${88 - (i % 4) * 8}%` }} />
    ))}
  </div>
);

/** Skeleton mirrors legacy 4-col layout; totals from list row show immediately. */
const DetailSkeleton = ({ row = {} }) => (
  <div className="hrd-nas-grid" aria-busy="true" aria-label="Memuat detail absen">
    <section className="hrd-nas-col">
      <h6>Kehadiran</h6>
      <div className="hrd-nas-block">
        <FieldHead label="Reguler" value={row.kehadiran_reguler} />
        <SkelLines count={8} />
      </div>
      <div className="hrd-nas-lembur">
        <h6 className="hrd-nas-sub">Lembur</h6>
        <div className="hrd-nas-split">
          <div>
            <FieldHead label="Weekday" value={row.lembur_wd} />
            <SkelLines count={3} />
          </div>
          <div>
            <FieldHead label="Weekend" value={stripSlash(row.lembur_wk)} />
            <SkelLines count={2} />
            <FieldHead label="Holiday" value={stripSlash(row.lembur_hd)} />
            <SkelLines count={2} />
          </div>
        </div>
      </div>
    </section>
    <section className="hrd-nas-col">
      <h6>Disiplin</h6>
      <div className="hrd-nas-tri">
        <div>
          <FieldHead label="Weekday" value={row.disiplin_wd} />
          <SkelLines count={7} />
        </div>
        <div>
          <FieldHead label="Weekend" value={stripSlash(row.disiplin_wk)} />
          <SkelLines count={3} />
        </div>
        <div>
          <FieldHead label="Holiday" value={stripSlash(row.disiplin_hd)} />
          <SkelLines count={3} />
        </div>
      </div>
    </section>
    <section className="hrd-nas-col hrd-nas-col--transport">
      <h6>Transport</h6>
      <div className="hrd-nas-tri">
        <div>
          <FieldHead label="Weekday" value={row.transport_wd} />
          <SkelLines count={7} />
        </div>
        <div>
          <FieldHead label="Weekend" value={stripSlash(row.transport_wk)} />
          <SkelLines count={3} />
        </div>
        <div>
          <FieldHead label="Holiday" value={stripSlash(row.transport_hd)} />
          <SkelLines count={3} />
        </div>
      </div>
    </section>
    <section className="hrd-nas-col">
      {[
        ["Izin", row.izin],
        ["Sakit", row.sakit],
        ["Cuti", row.cuti],
        ["Alfa", row.alfa],
      ].map(([label, val]) => (
        <div key={label} className="hrd-nas-block">
          <FieldHead label={label} value={val} />
          <SkelLines count={3} />
        </div>
      ))}
    </section>
  </div>
);

const HrdRptAbsenNasionalPage = () => {
  const seq = useRef(0);
  const detailSeq = useRef(0);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [cabang, setCabang] = useState("1");
  const [group, setGroup] = useState("ALL");
  const [dept, setDept] = useState(MANAGERIAL_DEPT.value);
  const [deptOpts, setDeptOpts] = useState([MANAGERIAL_DEPT]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await hrdLookupOptions("department");
      if (!alive) return;
      const rest = (d || []).filter((o) => String(o.value) !== MANAGERIAL_DEPT.value);
      setDeptOpts([MANAGERIAL_DEPT, ...rest]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!from || !to || !cabang) return;
    const my = ++seq.current;
    setLoading(true);
    setError("");
    try {
      const actor = getActorId?.() || "portal";
      const res = await service.list({
        from_date: from,
        to_date: to,
        id_cabang: cabang,
        cabang,
        group: group || "ALL",
        dept: dept || MANAGERIAL_DEPT.value,
        user_id: actor,
      });
      if (my !== seq.current) return;
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat absen nasional");
        setRows([]);
        setLoaded(true);
        return;
      }
      setRows(extractRows(res));
      setLoaded(true);
    } catch (err) {
      if (my !== seq.current) return;
      setError(err?.responseMessage || err?.message || "Gagal memuat absen nasional");
      setRows([]);
      setLoaded(true);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [from, to, cabang, group, dept]);

  const openDetail = useCallback(
    (r) => {
      /* Paint modal + skeleton first; SP popup can be slow. */
      flushSync(() => {
        setDetailRow(r);
        setDetailOpen(true);
        setDetailData(null);
        setDetailError("");
        setDetailLoading(true);
      });

      const my = ++detailSeq.current;
      (async () => {
        try {
          const res = await getHrdAbsenNasionalDetail({
            from_date: from,
            to_date: to,
            group: group || "ALL",
            dept: r.dept_id || dept,
            nik: r.nik,
            user_id: getActorId?.() || "portal",
          });
          if (my !== detailSeq.current) return;
          if (!isSuccess(res)) {
            setDetailError(res?.responseMessage || "Gagal memuat detail absen");
            setDetailData(null);
          } else {
            setDetailData(extractRow(res));
          }
        } catch (err) {
          if (my !== detailSeq.current) return;
          setDetailError(err?.responseMessage || err?.message || "Gagal memuat detail absen");
          setDetailData(null);
        } finally {
          if (my === detailSeq.current) setDetailLoading(false);
        }
      })();
    },
    [from, to, group, dept]
  );

  const closeDetail = () => {
    detailSeq.current += 1;
    setDetailOpen(false);
    setDetailRow(null);
    setDetailData(null);
    setDetailError("");
    setDetailLoading(false);
  };

  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = String(r.dept_id || r.department_name || "—");
      const label = r.department_name || key;
      if (!map.has(key)) map.set(key, { key, label, rows: [] });
      map.get(key).rows.push(r);
    });
    return Array.from(map.values());
  }, [rows]);

  const cabangLabel = CABANG_OPTS.find((o) => String(o.value) === String(cabang))?.label || cabang || "—";
  const groupLabel = GROUP_OPTS.find((o) => o.value === group)?.label || group;
  const deptLabel = deptOpts.find((o) => String(o.value) === String(dept))?.label || dept || "—";
  const ket = loaded ? `REKAP ABSEN TANGGAL ${from} s/d ${to}` : "";
  const desc = loaded
    ? `${from} → ${to} · ${cabangLabel} · ${groupLabel} · ${deptLabel} · ${rows.length.toLocaleString("id-ID")} pegawai`
    : "Rekap kehadiran nasional per departemen — filter periode, cabang, dan group";

  const t = detailRow || {};
  const nama = detailData?.employee_name || t.employee_name || t.nama || "—";

  return (
    <AccessGuard moduleCode={MODULE} permission="VIEW">
      <Head title="Absen Nasional Report" />
      <Content>
        <PageSmoothScroll revision={`${loading}-${rows.length}-${from}-${to}`} className="riv-page-scroll">
          <div className="hrd-sc hrd-rpt dgs-dash sc-scope">
            <ScPageHeader
              title="Absen Nasional Report"
              description={desc}
              actions={
                <div className="hrd-toolbar-actions">
                  <ScBtn variant="soft" disabled={loading} onClick={() => load()}>
                    <Icon name="reload" /> Refresh
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
                <label>Cabang</label>
                <RSelect
                  styles={selectStyles}
                  {...menuPortalProps}
                  options={CABANG_OPTS}
                  value={CABANG_OPTS.find((o) => String(o.value) === String(cabang)) || CABANG_OPTS[0]}
                  onChange={(opt) => setCabang(opt?.value != null ? String(opt.value) : "1")}
                  placeholder="Cabang"
                  isSearchable
                />
              </div>
              <div className="reg-ar-f-item" style={{ minWidth: 140 }}>
                <label>Group pegawai</label>
                <RSelect
                  styles={selectStyles}
                  {...menuPortalProps}
                  options={GROUP_OPTS}
                  value={GROUP_OPTS.find((o) => o.value === group) || GROUP_OPTS[0]}
                  onChange={(opt) => setGroup(opt?.value || "ALL")}
                />
              </div>
              <div className="reg-ar-f-item" style={{ minWidth: 200 }}>
                <label>Department</label>
                <RSelect
                  styles={selectStyles}
                  {...menuPortalProps}
                  options={deptOpts}
                  value={deptOpts.find((o) => String(o.value) === String(dept)) || deptOpts[0] || null}
                  onChange={(opt) => setDept(opt?.value != null ? String(opt.value) : MANAGERIAL_DEPT.value)}
                  placeholder="Department"
                  isSearchable
                />
              </div>
              <ScBtn disabled={loading || !cabang} onClick={() => load()}>
                <Icon name="search" /> Terapkan
              </ScBtn>
            </div>

            {error ? <ScError message={error} onRetry={() => load()} /> : null}

            {loading && !rows.length ? (
              <div className="sc-panel sc-panel--flush" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ScSkeletonBlock key={i} className="hrd-skel__td" style={{ height: 44, margin: 8 }} />
                ))}
              </div>
            ) : null}

            {loaded && !error && rows.length > 0 ? (
              <>
                {groups.map((g) => (
                  <div key={g.key} className="hrd-rpt-group is-open">
                    <div className="hrd-rpt-group__head hrd-rpt-group__head--static">
                      <div>
                        <h3 className="hrd-rpt-group__title">
                          <Icon name="calender-date" /> {ket || "Rekap absen"}
                        </h3>
                        <p className="hrd-rpt-group__sub">
                          Tipe: {g.label} · {g.rows.length} pegawai
                        </p>
                      </div>
                    </div>
                    <div className="hrd-rpt-group__body">
                      <div className="dgs-table-wrap">
                        <table className="dgs-table hrd-rpt-table">
                          <thead>
                            <tr>
                              <th>NIK</th>
                              <th>Nama</th>
                              <th>Jabatan</th>
                              <th className="num">
                                Kehadiran
                                <br />
                                reguler
                              </th>
                              <th className="num">
                                Disiplin
                                <span className="hrd-rpt-th-hint">WD/WK/HD</span>
                              </th>
                              <th className="num">
                                Transport
                                <span className="hrd-rpt-th-hint">WD/WK/HD</span>
                              </th>
                              <th className="num">Izin</th>
                              <th className="num">Sakit</th>
                              <th className="num">Cuti</th>
                              <th className="num">
                                Lembur
                                <span className="hrd-rpt-th-hint">WD/WK/HD</span>
                              </th>
                              <th className="num">Alfa</th>
                              <th className="num">Detail</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.rows.map((r) => (
                              <tr key={`${r.dept_id}-${r.nik}-${r.id}`}>
                                <td>
                                  <div className="sc-td-meta">{r.nik || "—"}</div>
                                </td>
                                <td>
                                  <div className="sc-td-main">{r.employee_name || "—"}</div>
                                </td>
                                <td>{r.jabatan || "—"}</td>
                                <td className="num">{r.kehadiran_reguler ?? 0}</td>
                                <td className="num">
                                  <WdWkHd wd={r.disiplin_wd ?? r.kehadiran} wk={r.disiplin_wk} hd={r.disiplin_hd} />
                                </td>
                                <td className="num">
                                  <WdWkHd wd={r.transport_wd} wk={r.transport_wk} hd={r.transport_hd} />
                                </td>
                                <td className="num">{r.izin ?? 0}</td>
                                <td className="num">{r.sakit ?? 0}</td>
                                <td className="num">{r.cuti ?? 0}</td>
                                <td className="num">
                                  <WdWkHd wd={r.lembur_wd} wk={r.lembur_wk} hd={r.lembur_hd} />
                                </td>
                                <td className="num">
                                  {n(r.alfa) > 0 ? <span className="dgs-pill is-bad">{r.alfa}</span> : r.alfa ?? 0}
                                </td>
                                <td className="num">
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm hrd-rpt-detail-btn"
                                    title="Detail absen"
                                    onClick={() => openDetail(r)}
                                  >
                                    <Icon name="arrow-right" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : null}

            {loaded && !loading && !error && rows.length === 0 ? (
              <ScEmptyState
                icon="calendar"
                title="Belum ada data absen"
                hint="Sesuaikan periode / cabang / group lalu klik Terapkan."
                action={
                  <ScBtn variant="soft" onClick={() => load()}>
                    Terapkan ulang
                  </ScBtn>
                }
              />
            ) : null}

            {!loaded && !loading ? (
              <ScEmptyState
                icon="search"
                title="Siapkan filter laporan"
                hint="Pilih periode dan cabang, lalu Terapkan untuk menarik rekap nasional."
              />
            ) : null}
          </div>
        </PageSmoothScroll>

        {/* Legacy lookup_absen_detail.aspx layout */}
        <Modal
          isOpen={detailOpen}
          toggle={closeDetail}
          className="modal-dialog-centered hrd-nas-detail-modal"
          size="xl"
          contentClassName="dgs-modal-content"
        >
          <div className="rsd-detail-hero">
            <div>
              <h5 className="rsd-detail-title">{nama}</h5>
              <p className="rsd-detail-sub">
                NIK {t.nik || "—"} · {detailData?.jabatan || t.jabatan || "—"} · {from} → {to} · {groupLabel}
              </p>
            </div>
            <button type="button" className="btn btn-icon btn-trigger" onClick={closeDetail} aria-label="Tutup">
              <Icon name="cross" />
            </button>
          </div>
          <ModalBody className="rsd-detail-body dgs-modal-body hrd-nas-detail-body">
            {detailError ? <div className="reg-ar-err">{detailError}</div> : null}
            {detailLoading ? <DetailSkeleton row={t} /> : null}
            {!detailLoading && !detailError && detailData ? (
              <div className="hrd-nas-grid">
                <section className="hrd-nas-col">
                  <h6>Kehadiran</h6>
                  <div className="hrd-nas-block">
                    <FieldHead label="Reguler" value={t.kehadiran_reguler} />
                    <ContentBlock html={detailData.content_kehadiran_reguler} />
                  </div>
                  <div className="hrd-nas-lembur">
                    <h6 className="hrd-nas-sub">Lembur</h6>
                    <div className="hrd-nas-split">
                      <div>
                        <FieldHead label="Weekday" value={t.lembur_wd} />
                        <ContentBlock html={detailData.content_lembur_wd} />
                      </div>
                      <div>
                        <FieldHead label="Weekend" value={stripSlash(t.lembur_wk)} />
                        <ContentBlock html={detailData.content_lembur_wk} />
                        <FieldHead label="Holiday" value={stripSlash(t.lembur_hd)} />
                        <ContentBlock html={detailData.content_lembur_hd} />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="hrd-nas-col">
                  <h6>Disiplin</h6>
                  <div className="hrd-nas-tri">
                    <div>
                      <FieldHead label="Weekday" value={t.disiplin_wd} />
                      <ContentBlock html={detailData.content_disiplin_wd} />
                    </div>
                    <div>
                      <FieldHead label="Weekend" value={stripSlash(t.disiplin_wk)} />
                      <ContentBlock html={detailData.content_disiplin_wk} />
                    </div>
                    <div>
                      <FieldHead label="Holiday" value={stripSlash(t.disiplin_hd)} />
                      <ContentBlock html={detailData.content_disiplin_hd} />
                    </div>
                  </div>
                </section>

                <section className="hrd-nas-col hrd-nas-col--transport">
                  <h6>Transport</h6>
                  <div className="hrd-nas-tri">
                    <div>
                      <FieldHead label="Weekday" value={t.transport_wd} />
                      <ContentBlock html={detailData.content_transport_wd} />
                    </div>
                    <div>
                      <FieldHead label="Weekend" value={stripSlash(t.transport_wk)} />
                      <ContentBlock html={detailData.content_transport_wk} />
                    </div>
                    <div>
                      <FieldHead label="Holiday" value={stripSlash(t.transport_hd)} />
                      <ContentBlock html={detailData.content_transport_hd} />
                    </div>
                  </div>
                </section>

                <section className="hrd-nas-col">
                  <div className="hrd-nas-block">
                    <FieldHead label="Izin" value={t.izin} />
                    <ContentBlock html={detailData.content_izin} />
                  </div>
                  <div className="hrd-nas-block">
                    <FieldHead label="Sakit" value={t.sakit} />
                    <ContentBlock html={detailData.content_sakit} />
                  </div>
                  <div className="hrd-nas-block">
                    <FieldHead label="Cuti" value={t.cuti} />
                    <ContentBlock html={detailData.content_cuti} />
                  </div>
                  <div className="hrd-nas-block">
                    <FieldHead label="Alfa" value={t.alfa} />
                    <ContentBlock html={detailData.content_alfa} />
                  </div>
                </section>
              </div>
            ) : null}
            {!detailLoading && !detailError && !detailData ? (
              <div className="dgs-hint">Tidak ada detail untuk NIK ini.</div>
            ) : null}
          </ModalBody>
        </Modal>
      </Content>
    </AccessGuard>
  );
};

export default HrdRptAbsenNasionalPage;
