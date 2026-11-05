import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
} from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { createHrdService } from "../../../services/hrd/hrd.service";
import { extractRows } from "../../../lib/response";
import { buildImageProfileUrl } from "../../../lib/imageProfile";
import {
  ScBadge,
  ScBtn,
  ScEmptyState,
  ScError,
  ScPageHeader,
  ScSkeletonBlock,
  ScStatusTabs,
  ScViewToggle,
} from "../dgs/sc";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";

const service = createHrdService("abs/personel", { crud: true });

/** Cache in-memory: balik dari detail tidak fetch ulang. */
const listMem = { snap: null };

const ADD_TYPES = [
  { value: "HO", label: "Karyawan HO", icon: "building" },
  { value: "MAGANG", label: "Magang", icon: "user" },
  { value: "MT", label: "MT", icon: "user-list" },
  { value: "AMK", label: "AMK", icon: "truck" },
  { value: "AMV", label: "AMV", icon: "eye-off" },
  { value: "MF", label: "Mostfly", icon: "map-pin" },
];

const STATUS_TABS = [
  { id: "ACTIVE", label: "Aktif" },
  { id: "NON ACTIVE", label: "Nonaktif" },
  { id: "ALL", label: "Semua" },
];

const SORT_OPTS = [
  { id: "employee_name", label: "Nama" },
  { id: "nik", label: "NIK" },
  { id: "department", label: "Departemen" },
  { id: "job_title", label: "Jabatan" },
  { id: "pangkat", label: "Pangkat" },
  { id: "brand", label: "Brand" },
  { id: "branch_name", label: "Cabang" },
];

/** Ikon simbolik per departemen (pola Softnio / mirip DGS). */
const deptIconOf = (name) => {
  const d = String(name || "").toUpperCase();
  if (!d || d === "SEMUA") return "users";
  if (d.includes("STORE DESIGN")) return "layers";
  if (d.includes("STORE")) return "home";
  if (d.includes("WAREHOUSE") || d.includes("DATA ANALYST")) return "db";
  if (d.includes("DIGITAL") || d.includes("SALES OPERATION") || d.includes("SALES")) return "cart";
  if (d.includes("MARKETING")) return "megaphone";
  if (d.includes("ACCOUNT") || d.includes("FINANCE") || d.includes("TAX") || d.includes("PAYROLL"))
    return "wallet-saving";
  if (d.includes("INFORMATION") || d.includes("TECH") || d.includes("IT")) return "laptop";
  if (d.includes("HUMAN RESOURCE") || d.includes("RECRUIT") || d.includes("TRAINING") || d.includes("HR"))
    return "user-list";
  if (d.includes("GENERAL AFFAIR") || d.includes("GA")) return "building";
  if (d.includes("LEGAL")) return "file-docs";
  if (d.includes("AUDIT")) return "check-round-cut";
  if (d.includes("MERCHANDISER") || d.includes("VISUAL") || d.includes("ART")) return "img";
  if (d.includes("BRAND")) return "tag";
  if (d.includes("DIREKSI") || d.includes("BUSINESS")) return "brief-case";
  if (d.includes("OPERATION") || d.includes("KONTRAKTOR")) return "setting";
  if (d.includes("MOSTFLY") || d.includes("FOB")) return "truck";
  if (d.includes("VYNE") || d.includes("WORKS")) return "puzzle";
  if (d.includes("TANPA")) return "user";
  return "folder";
};

const statusTone = (row) => {
  const s = String(row.status || (row.is_active ? "Aktif" : "Nonaktif") || "").toLowerCase();
  if (s.includes("non") || s === "0" || s === "false") return "bad";
  if (s.includes("aktif") || s === "1" || s === "true" || s === "active") return "ok";
  return "new";
};

const statusLabel = (row) => row.status || (row.is_active ? "Aktif" : "Nonaktif") || "—";

const initialsOf = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
};

const photoOf = (row) => {
  const raw = String(
    row.photo || row.Photo || row.foto || row.FOTO || row.photo_url || row.img || row.image || ""
  ).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const file = raw
    .replace(/^~\//, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^\/?ImageProfile\//i, "");
  return buildImageProfileUrl(file);
};

const cmpStr = (a, b, dir) => {
  const mul = dir === "asc" ? 1 : -1;
  return (
    String(a ?? "").localeCompare(String(b ?? ""), "id", {
      numeric: true,
      sensitivity: "base",
    }) * mul
  );
};

/** NIK: pad sama panjang; NIK kosong di belakang. 00000005 < 00000012 < 01000001 */
const cmpNik = (a, b, dir) => {
  const na = String(a ?? "").trim();
  const nb = String(b ?? "").trim();
  const mul = dir === "asc" ? 1 : -1;
  if (!na && !nb) return 0;
  if (!na) return 1; // empty last (asc & desc: always last for usability)
  if (!nb) return -1;
  const len = Math.max(na.length, nb.length, 8);
  const pa = na.padStart(len, "0");
  const pb = nb.padStart(len, "0");
  if (pa < pb) return -1 * mul;
  if (pa > pb) return 1 * mul;
  return 0;
};

const cmpField = (key, a, b, dir) => {
  if (key === "nik") return cmpNik(a, b, dir);
  return cmpStr(a, b, dir);
};

/** 0 senior manager → 1 manager → 2 manager assistant → 99 lainnya */
const managerRankOf = (text) => {
  const t = String(text || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!t || !/\bMANAGER\b/.test(t)) return 99;
  if (/\b(ASSISTANT|ASSISTEN|ASSISSTANT|ASISTEN)\b/.test(t)) return 2;
  if (/\bSENIOR\b/.test(t)) return 0;
  return 1;
};

const managerRank = (row) => Math.min(managerRankOf(row?.pangkat), managerRankOf(row?.job_title));

const isManagerText = (text) => managerRankOf(text) < 99;
const isManagerRole = (row) => managerRank(row) < 99;

/** Ease-in-out quint — start/stop sangat lembut. */
const easeInOutQuint = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - (-2 * t + 2) ** 5 / 2;

const softScrollBy = (el, delta, duration = 980, onDone) => {
  if (!el || !delta) {
    onDone?.();
    return;
  }
  const from = el.scrollLeft;
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  const to = Math.max(0, Math.min(max, from + delta));
  const dist = to - from;
  if (Math.abs(dist) < 1) {
    onDone?.();
    return;
  }
  if (el.__hrdScrollRaf) cancelAnimationFrame(el.__hrdScrollRaf);
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.scrollLeft = from + dist * easeInOutQuint(t);
    if (t < 1) el.__hrdScrollRaf = requestAnimationFrame(tick);
    else {
      el.__hrdScrollRaf = 0;
      onDone?.();
    }
  };
  el.__hrdScrollRaf = requestAnimationFrame(tick);
};

const HrdDeptStrip = ({ rowsTotal, deptTotals, deptFilter, onFilter }) => {
  const scrollerRef = useRef(null);
  const hintTimerRef = useRef(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [thumb, setThumb] = useState({ left: 0, width: 100 });

  const syncScrollUi = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanLeft(el.scrollLeft > 4);
    setCanRight(max > 4 && el.scrollLeft < max - 4);
    if (el.scrollWidth <= 0) return;
    const widthPct = Math.min(100, Math.max(12, (el.clientWidth / el.scrollWidth) * 100));
    const leftPct = max <= 0 ? 0 : (el.scrollLeft / max) * (100 - widthPct);
    setThumb({ left: leftPct, width: widthPct });
  }, []);

  const revealBar = useCallback((holdMs = 0) => {
    setShowBar(true);
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    if (holdMs > 0) {
      hintTimerRef.current = window.setTimeout(() => setShowBar(false), holdMs);
    }
  }, []);

  const hideBarSoon = useCallback(() => {
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setShowBar(false), 420);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    syncScrollUi();
    const onScroll = () => syncScrollUi();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncScrollUi) : null;
    ro?.observe(el);
    window.addEventListener("resize", syncScrollUi);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      window.removeEventListener("resize", syncScrollUi);
      if (el.__hrdScrollRaf) cancelAnimationFrame(el.__hrdScrollRaf);
      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    };
  }, [syncScrollUi, deptTotals.length, rowsTotal]);

  const scrollByDir = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    revealBar(0);
    const step = Math.max(180, Math.round(el.clientWidth * 0.42));
    softScrollBy(el, dir * step, 1100, () => revealBar(900));
  };

  const scrollable = canLeft || canRight;

  return (
    <div
      className={`hrd-dept-rail${canLeft ? " has-left" : ""}${canRight ? " has-right" : ""}${
        showBar && scrollable ? " is-hint" : ""
      }`}
    >
      <button
        type="button"
        className="hrd-dept-rail__arrow is-left"
        aria-label="Geser kiri"
        disabled={!canLeft}
        onClick={() => scrollByDir(-1)}
        onMouseEnter={() => scrollable && revealBar(0)}
        onMouseLeave={hideBarSoon}
        onFocus={() => scrollable && revealBar(0)}
        onBlur={hideBarSoon}
      >
        <Icon name="chevron-left" />
      </button>
      <div ref={scrollerRef} className="hrd-dept-strip" aria-label="Total per departemen">
        <button
          type="button"
          className={`hrd-dept-chip${deptFilter === "" ? " is-active" : ""}`}
          onClick={() => onFilter("")}
        >
          <span className="hrd-dept-chip__icon" aria-hidden>
            <Icon name={deptIconOf("Semua")} />
          </span>
          <strong>{rowsTotal}</strong>
          <em>Semua</em>
        </button>
        {deptTotals.map((d) => (
          <button
            key={d.name}
            type="button"
            className={`hrd-dept-chip${deptFilter === d.name ? " is-active" : ""}`}
            onClick={() => onFilter(deptFilter === d.name ? "" : d.name)}
            title={d.name}
          >
            <span className="hrd-dept-chip__icon" aria-hidden>
              <Icon name={deptIconOf(d.name)} />
            </span>
            <strong>{d.count}</strong>
            <em>{d.name}</em>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="hrd-dept-rail__arrow is-right"
        aria-label="Geser kanan"
        disabled={!canRight}
        onClick={() => scrollByDir(1)}
        onMouseEnter={() => scrollable && revealBar(0)}
        onMouseLeave={hideBarSoon}
        onFocus={() => scrollable && revealBar(0)}
        onBlur={hideBarSoon}
      >
        <Icon name="chevron-right" />
      </button>
      <div className="hrd-dept-rail__bar" aria-hidden>
        <span
          className="hrd-dept-rail__thumb"
          style={{ width: `${thumb.width}%`, left: `${thumb.left}%` }}
        />
      </div>
    </div>
  );
};

const HrdPersonelSkeleton = ({ view = "cards" }) => (
  <div className="hrd-skel" aria-busy="true" aria-label="Memuat employee list">
    <div className="hrd-skel__dept">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="hrd-skel__chip">
          <ScSkeletonBlock className="hrd-skel__chip-icon" />
          <div className="hrd-skel__chip-text">
            <ScSkeletonBlock className="hrd-skel__chip-n" />
            <ScSkeletonBlock className="hrd-skel__chip-l" />
          </div>
        </div>
      ))}
    </div>
    {view === "table" ? (
      <div className="hrd-skel__table sc-panel sc-panel--flush">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="hrd-skel__tr">
            <ScSkeletonBlock className="hrd-skel__td hrd-skel__td--main" />
            <ScSkeletonBlock className="hrd-skel__td" />
            <ScSkeletonBlock className="hrd-skel__td" />
            <ScSkeletonBlock className="hrd-skel__td" />
            <ScSkeletonBlock className="hrd-skel__td" />
          </div>
        ))}
      </div>
    ) : (
      <div className="hrd-emp-card-list hrd-skel__cards">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="hrd-skel__card">
            <div className="hrd-skel__card-body">
              <div className="hrd-skel__card-top">
                <ScSkeletonBlock className="hrd-skel__name" />
                <ScSkeletonBlock className="hrd-skel__badge" />
              </div>
              <ScSkeletonBlock className="hrd-skel__line hrd-skel__line--md" />
              <ScSkeletonBlock className="hrd-skel__line hrd-skel__line--lg" />
              <ScSkeletonBlock className="hrd-skel__pill" />
              <ScSkeletonBlock className="hrd-skel__line hrd-skel__line--sm" />
            </div>
            <ScSkeletonBlock className="hrd-skel__photo" />
          </div>
        ))}
      </div>
    )}
  </div>
);

const HrdEmpCard = ({ row, onClick }) => {
  const [imgBroken, setImgBroken] = useState(false);
  const photo = photoOf(row);
  const showPhoto = Boolean(photo) && !imgBroken;
  const jabatan = String(row.job_title || "").trim();
  const pangkat = String(row.pangkat || "").trim();
  const mgr = isManagerRole(row);
  const pangkatIsMgr = isManagerText(pangkat);
  const meta = [row.nik, jabatan || (!pangkatIsMgr ? pangkat : "")].filter(Boolean).join(" · ");
  const showPangkatPill = Boolean(pangkat && (jabatan || pangkatIsMgr));

  return (
    <button type="button" className={`hrd-emp-card${mgr ? " is-mgr" : ""}`} onClick={onClick}>
      <div className="hrd-emp-card__body">
        <div className="hrd-emp-card__top">
          <div className="hrd-emp-card__name">{row.employee_name || "—"}</div>
          <ScBadge tone={statusTone(row)}>{statusLabel(row)}</ScBadge>
        </div>
        {meta ? <div className="hrd-emp-card__meta">{meta}</div> : null}
        {row.department ? <div className="hrd-emp-card__loc">{row.department}</div> : null}
        {row.brand || showPangkatPill ? (
          <div className="hrd-emp-card__reason">
            {row.brand ? <span>{row.brand}</span> : null}
            {row.brand && showPangkatPill ? <span> · </span> : null}
            {showPangkatPill ? (
              <span className={pangkatIsMgr ? "hrd-emp-card__pangkat is-mgr" : undefined}>
                {pangkatIsMgr ? <Icon name="star-fill" className="hrd-mgr-star" /> : null}
                {pangkat}
              </span>
            ) : null}
          </div>
        ) : null}
        {row.branch_name ? <div className="hrd-emp-card__foot">{row.branch_name}</div> : null}
      </div>
      <div className={`hrd-emp-card__photo${showPhoto ? "" : " is-empty"}`} aria-hidden>
        {showPhoto ? (
          <img src={photo} alt="" onError={() => setImgBroken(true)} />
        ) : (
          <span className="hrd-emp-card__initials">{initialsOf(row.employee_name)}</span>
        )}
        <span className="hrd-emp-card__photo-shade" />
      </div>
    </button>
  );
};

const HrdPersonelListPage = () => {
  const navigate = useNavigate();
  const snap = listMem.snap;
  const skipFetchRef = useRef(Boolean(snap));
  const [rows, setRows] = useState(() => snap?.rows ?? []);
  const [loading, setLoading] = useState(() => !snap);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(() => snap?.search ?? "");
  const [status, setStatus] = useState(() => snap?.status ?? "ACTIVE");
  const [view, setView] = useState(() => snap?.view ?? "cards");
  const [page, setPage] = useState(() => snap?.page ?? 1);
  const [sortKey, setSortKey] = useState(() => snap?.sortKey ?? "employee_name");
  const [sortDir, setSortDir] = useState(() => snap?.sortDir ?? "asc");
  const [deptFilter, setDeptFilter] = useState(() => snap?.deptFilter ?? "");
  const pageSize = 25;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await service.list({
        ...(search.trim() ? { search: search.trim() } : {}),
        status,
      });
      const nextRows = extractRows(res);
      setRows(nextRows);
      setPage(1);
      setDeptFilter("");
      listMem.snap = {
        ...(listMem.snap || {}),
        rows: nextRows,
        search: search.trim(),
        status,
        page: 1,
        deptFilter: "",
      };
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat employee list");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    // Restore dari detail → jangan fetch lagi.
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return undefined;
    }
    // Filter "Semua" → urut NIK; selain itu default nama.
    if (status === "ALL") {
      setSortKey("nik");
      setSortDir("asc");
    } else {
      setSortKey("employee_name");
      setSortDir("asc");
    }
    loadData();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sengaja tidak ikut `search`
  }, [status]);

  // Persist UI + data saat berubah (supaya back dari detail tetap).
  useEffect(() => {
    if (loading) return undefined;
    listMem.snap = {
      rows,
      search,
      status,
      view,
      page,
      sortKey,
      sortDir,
      deptFilter,
    };
    return undefined;
  }, [rows, search, status, view, page, sortKey, sortDir, deptFilter, loading]);

  const openDetail = (row) => {
    listMem.snap = {
      rows,
      search,
      status,
      view,
      page,
      sortKey,
      sortDir,
      deptFilter,
    };
    navigate(`/admin/hrd/abs/personel/${row.id}`);
  };
  const openAdd = (vType) => {
    listMem.snap = {
      rows,
      search,
      status,
      view,
      page,
      sortKey,
      sortDir,
      deptFilter,
    };
    navigate(`/admin/hrd/abs/personel/new?vType=${encodeURIComponent(vType)}`);
  };

  const deptTotals = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = String(r.department || "").trim() || "Tanpa departemen";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }));
  }, [rows]);

  const sortedRows = useMemo(() => {
    let list = rows;
    if (deptFilter) {
      list = list.filter((r) => {
        const d = String(r.department || "").trim() || "Tanpa departemen";
        return d === deptFilter;
      });
    }
    const forceNik = status === "ALL";
    const key = forceNik ? "nik" : sortKey;
    const dir = forceNik ? "asc" : sortDir;
    const valOf = (row) => {
      if (key === "nik") return row?.nik ?? row?.NomorIndukStr ?? row?.NIK ?? "";
      return row?.[key];
    };
    const next = [...list];
    next.sort((a, b) => {
      // Kelompokkan per dept (kecuali tab Semua tanpa filter — tetap NIK global).
      if (!deptFilter && !forceNik) {
        const da = String(a.department || "").trim() || "Tanpa departemen";
        const db = String(b.department || "").trim() || "Tanpa departemen";
        const byDept = cmpStr(da, db, "asc");
        if (byDept) return byDept;
      }
      // Di tiap dept: Manager Senior → Manager → Manager Assistant → lainnya
      if (deptFilter || !forceNik) {
        const byMgr = managerRank(a) - managerRank(b);
        if (byMgr) return byMgr;
      }
      return cmpField(key, valOf(a), valOf(b), dir);
    });
    return next;
  }, [rows, deptFilter, sortKey, sortDir, status]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page]);

  useEffect(() => {
    setPage(1);
  }, [deptFilter, sortKey, sortDir]);

  const hasFilter = Boolean(search.trim() || status !== "ACTIVE" || deptFilter);
  const toggleSortDir = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  return (
    <AccessGuard moduleCode="HRD_ABS_PERSONEL" permission="VIEW">
      <Head title="Employee List" />
      <Content>
        <PageSmoothScroll revision={`${status}-${view}-${sortKey}`} className="riv-page-scroll">
          <div className="hrd-sc dgs-dash sc-scope">
            <ScPageHeader
              title="Employee list"
              description="Kelola data pegawai · klik untuk buka detail"
              actions={
                <div className="hrd-toolbar-actions">
                  <div className="sc-page-search">
                    <input
                      className="form-control form-control-sm sc-page-search__input"
                      placeholder="NIK / nama / jabatan / brand"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadData()}
                    />
                    <ScBtn disabled={loading} onClick={loadData}>
                      <Icon name="search" /> Cari
                    </ScBtn>
                  </div>
                  <UncontrolledDropdown>
                    <DropdownToggle tag="div">
                      <ScBtn>
                        <Icon name="plus" /> Tambah
                      </ScBtn>
                    </DropdownToggle>
                    <DropdownMenu end className="hrd-add-menu">
                      {ADD_TYPES.map((t) => (
                        <DropdownItem
                          key={t.value}
                          tag="button"
                          type="button"
                          onClick={() => openAdd(t.value)}
                        >
                          <Icon name={t.icon} />
                          <span>{t.label}</span>
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </div>
              }
            />

            <div className="hrd-list-bar">
              <ScStatusTabs value={status} onChange={setStatus} items={STATUS_TABS} />
              <div className="hrd-list-bar__tools">
                <label className="hrd-sort">
                  <span>Urutkan</span>
                  <select
                    className="form-control form-control-sm"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                  >
                    {SORT_OPTS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="hrd-sort__dir"
                    onClick={toggleSortDir}
                    title={sortDir === "asc" ? "Naik (A→Z)" : "Turun (Z→A)"}
                  >
                    <Icon name={sortDir === "asc" ? "arrow-up" : "arrow-down"} />
                  </button>
                </label>
                <ScViewToggle
                  value={view}
                  onChange={setView}
                  options={[
                    { id: "cards", label: "Kartu" },
                    { id: "table", label: "Tabel" },
                  ]}
                />
                <span className="hrd-list-bar__count">
                  {loading ? "…" : `${sortedRows.length.toLocaleString("id-ID")} pegawai`}
                </span>
                <ScBtn variant="soft" disabled={loading} onClick={loadData}>
                  <Icon name="reload" />
                </ScBtn>
              </div>
            </div>

            {loading ? <HrdPersonelSkeleton view={view} /> : null}

            {!loading && !error && deptTotals.length > 0 ? (
              <HrdDeptStrip
                rowsTotal={rows.length}
                deptTotals={deptTotals}
                deptFilter={deptFilter}
                onFilter={setDeptFilter}
              />
            ) : null}

            {error ? <ScError message={error} onRetry={loadData} /> : null}

            {!loading && !error && sortedRows.length === 0 ? (
              <ScEmptyState
                icon="users"
                title={hasFilter ? "Tidak ada pegawai untuk filter ini" : "Belum ada data pegawai"}
                hint={
                  hasFilter
                    ? "Ubah status, departemen, atau kata kunci."
                    : "Tambah pegawai baru dari tombol Tambah."
                }
                action={
                  hasFilter ? (
                    <ScBtn
                      onClick={() => {
                        setSearch("");
                        setDeptFilter("");
                        setStatus("ACTIVE");
                        setLoading(true);
                        setError("");
                        service
                          .list({ status: "ACTIVE" })
                          .then((res) => {
                            setRows(extractRows(res));
                            setPage(1);
                          })
                          .catch((err) => {
                            setError(err?.responseMessage || "Gagal memuat employee list");
                            setRows([]);
                          })
                          .finally(() => setLoading(false));
                      }}
                    >
                      Reset filter
                    </ScBtn>
                  ) : (
                    <ScBtn onClick={() => openAdd("HO")}>Tambah karyawan HO</ScBtn>
                  )
                }
              />
            ) : null}

            {!loading && !error && sortedRows.length > 0 && view === "cards" ? (
              <div className="hrd-emp-card-list">
                {pageRows.map((row) => (
                  <HrdEmpCard key={row.id} row={row} onClick={() => openDetail(row)} />
                ))}
              </div>
            ) : null}

            {!loading && !error && sortedRows.length > 0 && view === "table" ? (
              <div className="sc-panel sc-panel--flush">
                <div className="dgs-table-wrap" style={{ maxHeight: "none", border: 0 }}>
                  <table className="dgs-table">
                    <thead>
                      <tr>
                        {[
                          ["employee_name", "Pegawai"],
                          ["brand", "Brand"],
                          ["branch_name", "Cabang"],
                          ["department", "Departemen"],
                          ["pangkat", "Pangkat"],
                          ["job_title", "Jabatan"],
                          ["status", "Status"],
                        ].map(([key, label]) => (
                          <th
                            key={key}
                            className={`dgs-th-sort${sortKey === key ? " is-sorted" : ""}`}
                            onClick={() => {
                              if (sortKey === key) toggleSortDir();
                              else {
                                setSortKey(key);
                                setSortDir("asc");
                              }
                            }}
                          >
                            {label}
                            {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row) => (
                        <tr
                          key={row.id}
                          className="dgs-row-click"
                          onClick={() => openDetail(row)}
                        >
                          <td>
                            <span className="sc-td-main">{row.employee_name || "—"}</span>
                            <span className="sc-td-meta">{row.nik || "—"}</span>
                          </td>
                          <td>
                            <span className="sc-td-main">{row.brand || "—"}</span>
                          </td>
                          <td>
                            <span className="sc-td-main">{row.branch_name || "—"}</span>
                          </td>
                          <td>
                            <span className="sc-td-main">{row.department || "—"}</span>
                          </td>
                          <td>
                            <span
                              className={`sc-td-main${isManagerText(row.pangkat) ? " hrd-td-mgr" : ""}`}
                            >
                              {isManagerText(row.pangkat) ? (
                                <Icon name="star-fill" className="hrd-mgr-star" />
                              ) : null}
                              {row.pangkat || "—"}
                            </span>
                          </td>
                          <td>
                            <span className="sc-td-main">{row.job_title || "—"}</span>
                          </td>
                          <td>
                            <span className={`dgs-pill is-${statusTone(row)}`}>
                              {statusLabel(row)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {!loading && !error && sortedRows.length > pageSize ? (
              <div className="reg-ar-pager">
                <button
                  type="button"
                  className="reg-ar-pager-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="reg-ar-record-info">
                  Hal {page} / {pageCount}
                </span>
                <button
                  type="button"
                  className="reg-ar-pager-btn"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdPersonelListPage;
