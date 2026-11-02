import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import api from "../../../lib/api";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import "./reg-reg-report.css";
import "./reg-store-list.css";
import "./reg-member-list.css";

/** Legacy module/rpt/member.aspx — badges, member list, members location, birthday */
const BASE = "/regional/rpt/member/list";

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: "0.8125rem" }),
};

const BRAND_OPTS = [
  { value: "0", label: "All Brand" },
  { value: "Aeesha", label: "Aeesha" },
  { value: "Flies", label: "Flies" },
  { value: "Celcius", label: "Celcius" },
  { value: "Celcius Woman", label: "Celcius Woman" },
  { value: "Iwan Fashion", label: "Iwan Fashion" },
  { value: "Mississippi", label: "Mississippi" },
  { value: "Queensland", label: "Queensland" },
];
const GENDER_OPTS = [
  { value: "0", label: "Gender" },
  { value: "L", label: "Male" },
  { value: "P", label: "Female" },
];
const PAGE_SIZES = [20, 40, 60];
const SIDE_PAGE_SIZE = 10;
const DEFAULT_PROVINSI = "12";

const pad = (n) => String(n).padStart(2, "0");
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const firstOfMonth = () => {
  const d = new Date();
  return toIso(new Date(d.getFullYear(), d.getMonth(), 1));
};

const fmtNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("id-ID") : v ?? "";
};

const logoUrls = (html) => {
  if (!html) return [];
  const out = [];
  const re = /src='([^']+)'/g;
  let m;
  while ((m = re.exec(String(html)))) out.push(m[1]);
  return out;
};

const SORTABLE = [
  { key: "member_id", label: "MEMBER ID" },
  { key: "name", label: "NAME" },
  { key: "provinsi", label: "PROVINSI" },
  { key: "kota", label: "KOTA" },
  { key: "total_point", label: "TOTAL POINT", num: true },
  { key: "point_used", label: "POINT USED", num: true },
  { key: "join_date", label: "JOIN DATE" },
  { key: "tier", label: "TIER" },
  { key: "total_transaction", label: "TOTAL TRANSACTION", num: true },
];

const BadgeCard = ({ title, value, pct, note }) => {
  const down = String(pct || "").includes("-");
  return (
    <div className="rml-badge">
      <div className="rml-badge-title">{title}</div>
      <div className="rml-badge-value">{value ?? "-"}</div>
      <div className="rml-badge-note">
        {pct ? (
          <span className={down ? "rml-down" : "rml-up"}>
            <Icon name={down ? "arrow-long-down" : "arrow-long-up"} /> {pct}
          </span>
        ) : null}{" "}
        <span className="text-soft">{note}</span>
      </div>
    </div>
  );
};

const SimplePager = ({ page, total, size, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / size) || 1);
  if (total <= size) return null;
  return (
    <div className="rsl-pager">
      <span className="rsl-pager-info">
        {(page - 1) * size + 1}–{Math.min(page * size, total)} dari {fmtNum(total)} · Halaman {page}/{pages}
      </span>
      <div className="rsl-pager-btns">
        <button type="button" className="rsl-pager-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Sebelumnya
        </button>
        <button type="button" className="rsl-pager-btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Berikutnya
        </button>
      </div>
    </div>
  );
};

const RegMemberListPage = () => {
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(() => toIso(new Date()));
  const [provOpts, setProvOpts] = useState([]);
  const [kotaOpts, setKotaOpts] = useState([]);
  const [provinsi, setProvinsi] = useState(DEFAULT_PROVINSI);
  const [kota, setKota] = useState("0");
  const [brand, setBrand] = useState("0");
  const [gender, setGender] = useState("0");
  const [ageFrom, setAgeFrom] = useState("0");
  const [ageTo, setAgeTo] = useState("0");
  const [keywords, setKeywords] = useState("");
  const [memberOnly, setMemberOnly] = useState(false);

  const [badge, setBadge] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [sort, setSort] = useState({ key: "", dir: "ASC" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [locProv, setLocProv] = useState(DEFAULT_PROVINSI);
  const [locKota, setLocKota] = useState("0");
  const [locKotaOpts, setLocKotaOpts] = useState([]);
  const [locRows, setLocRows] = useState([]);
  const [locPage, setLocPage] = useState(1);
  const [locLoading, setLocLoading] = useState(false);

  const [bdRows, setBdRows] = useState([]);
  const [bdPage, setBdPage] = useState(1);
  const [wide, setWide] = useState(false);
  const wrapRef = useRef(null);

  const [applied, setApplied] = useState(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const container = wrap?.closest(".container-xl");
    if (!container) return undefined;
    container.classList.toggle("reg-ar-container-wide", wide);
    const t = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 520);
    return () => {
      container.classList.remove("reg-ar-container-wide");
      window.clearTimeout(t);
    };
  }, [wide]);

  const allProv = useMemo(() => [{ value: "0", label: "All Provinsi" }, ...provOpts], [provOpts]);
  const allKota = useMemo(() => [{ value: "0", label: "All Kota" }, ...kotaOpts], [kotaOpts]);
  const allLocKota = useMemo(() => [{ value: "0", label: "All Kota" }, ...locKotaOpts], [locKotaOpts]);

  const loadKota = useCallback(async (prov, setter) => {
    try {
      const res = await api.get(`${BASE}/kota`, { params: { provinsi: prov === "0" ? "" : prov } });
      setter(isSuccess(res) ? extractRows(res) : []);
    } catch {
      setter([]);
    }
  }, []);

  useEffect(() => {
    api
      .get(`${BASE}/provinsi`)
      .then((res) => setProvOpts(isSuccess(res) ? extractRows(res) : []))
      .catch(() => setProvOpts([]));
    api
      .get(`${BASE}/birthday`)
      .then((res) => setBdRows(isSuccess(res) ? extractRows(res) : []))
      .catch(() => setBdRows([]));
  }, []);

  useEffect(() => {
    loadKota(provinsi, setKotaOpts);
  }, [provinsi, loadKota]);

  useEffect(() => {
    loadKota(locProv, setLocKotaOpts);
  }, [locProv, loadKota]);

  const buildParams = useCallback(
    () => ({
      keywords: keywords.trim(),
      from_date: fromDate,
      to_date: toDate,
      provinsi,
      kota,
      brand,
      age_from: ageFrom || "0",
      age_to: ageTo || "0",
      jenis_kelamin: gender,
      search_member: memberOnly ? "1" : "",
    }),
    [ageFrom, ageTo, brand, fromDate, gender, keywords, kota, memberOnly, provinsi, toDate]
  );

  const onSearch = () => {
    setPage(1);
    setLocPage(1);
    setApplied(buildParams());
  };

  useEffect(() => {
    setApplied(buildParams());
    // initial load only; later searches go through onSearch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!applied) return;
    let alive = true;
    setLoading(true);
    setError("");
    api
      .get(`${BASE}/members`, {
        params: { ...applied, page, page_size: pageSize, sort: sort.key, sort_dir: sort.dir },
      })
      .then((res) => {
        if (!alive) return;
        if (!isSuccess(res)) {
          setError(res?.responseMessage || "Gagal memuat member");
          setRows([]);
          setTotal(0);
          return;
        }
        setRows(extractRows(res));
        setTotal(Number(res?.total ?? res?.data?.total ?? 0) || 0);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Gagal memuat member");
        setRows([]);
        setTotal(0);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [applied, page, pageSize, sort]);

  useEffect(() => {
    if (!applied) return;
    api
      .get(`${BASE}/badge`, { params: { from_date: applied.from_date, to_date: applied.to_date } })
      .then((res) => setBadge(isSuccess(res) ? extractRow(res) : null))
      .catch(() => setBadge(null));
  }, [applied]);

  useEffect(() => {
    if (!applied) return;
    let alive = true;
    setLocLoading(true);
    api
      .get(`${BASE}/location`, {
        params: { provinsi: locProv, kota: locKota, from_date: applied.from_date, to_date: applied.to_date },
      })
      .then((res) => alive && setLocRows(isSuccess(res) ? extractRows(res) : []))
      .catch(() => alive && setLocRows([]))
      .finally(() => alive && setLocLoading(false));
    return () => {
      alive = false;
    };
  }, [applied, locProv, locKota]);

  const onSort = (key) => {
    setPage(1);
    setSort((s) => (s.key === key ? { key, dir: s.dir === "ASC" ? "DESC" : "ASC" } : { key, dir: "ASC" }));
  };

  const onExport = async () => {
    if (!applied) return;
    setExporting(true);
    try {
      const res = await api.get(`${BASE}/members`, { params: { ...applied, export: "1" } });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal export");
        return;
      }
      const data = extractRows(res);
      const head = ["MEMBER ID", "NAME", "PROVINSI", "KOTA", "TOTAL POINT", "POINT USED", "JOIN DATE", "TIER",
        "TOTAL TRANSACTION", "STATUS", "BRAND", "AGE", "GENDER"];
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = [head.map(esc).join(",")].concat(
        data.map((r) =>
          [r.member_id, r.name, r.provinsi, r.kota, r.total_point, r.point_used, r.join_date, r.tier,
            r.total_transaction, r.status, r.brand, r.age, r.gender].map(esc).join(",")
        )
      );
      const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `member_list_${applied.from_date}_${applied.to_date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || "Gagal export");
    } finally {
      setExporting(false);
    }
  };

  const locShown = locRows.slice((locPage - 1) * SIDE_PAGE_SIZE, locPage * SIDE_PAGE_SIZE);
  const bdShown = bdRows.slice((bdPage - 1) * SIDE_PAGE_SIZE, bdPage * SIDE_PAGE_SIZE);
  const scrollRevision = `${loading ? "l" : "r"}-${rows.length}-${page}-${locRows.length}-${bdRows.length}-${wide ? "w" : "n"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_MEMBER">
      <Head title="Member" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rsl-page rml-page">
          <div ref={wrapRef}>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Member
                </BlockTitle>
                <BlockDes className="text-soft">Member report</BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <button
                  type="button"
                  className={`rml-wide-btn${wide ? " is-on" : ""}`}
                  title={wide ? "Lebar normal" : "Lebar penuh"}
                  aria-label={wide ? "Lebar normal" : "Lebar penuh"}
                  aria-pressed={wide}
                  onClick={() => setWide((w) => !w)}
                >
                  <Icon name={wide ? "minimize" : "maximize"} />
                </button>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <div className="rml-badges">
            <BadgeCard title="Total Member" value={badge?.member_total} pct={badge?.prev_member_total_presentase} note="from last month" />
            <BadgeCard title="Active Member" value={badge?.active_member_total} pct={badge?.prev_active_member_total_presentase} note="from last month" />
            <BadgeCard title="Inactive Member" value={badge?.inactive_member_total} pct={badge?.prev_inactive_member_total_presentase} note="from last month" />
            <BadgeCard title="Total New Member" value={badge?.new_member_today} pct={badge?.prev_member_total_today_presentase} note="from last day" />
          </div>

          <Block>
            <div className="rml-card">
              <div className="rml-card-head">
                <h6 className="rml-card-title">Member List</h6>
                <label className="rml-switch">
                  <input type="checkbox" checked={memberOnly} onChange={(e) => setMemberOnly(e.target.checked)} />
                  <span>Search member only</span>
                </label>
              </div>

              <div className="rml-filters">
                <div className="rml-f rml-f-date hrd-filter-daterange">
                  <div className="form-control-wrap">
                    <div className="form-icon form-icon-left">
                      <Icon name="calendar" />
                    </div>
                    <AppDateRangePicker
                      startDate={fromDate}
                      endDate={toDate}
                      placeholder="Date Range"
                      className="form-control form-control-sm date-picker ps-4"
                      onChange={(fromYmd, toYmd) => {
                        setFromDate(fromYmd || "");
                        setToDate(toYmd || "");
                      }}
                    />
                  </div>
                </div>
                <div className="rml-f" style={{ minWidth: 170 }}>
                  <RSelect
                    styles={filterSelectStyles}
                    isSearchable
                    isDisabled={memberOnly}
                    options={allProv}
                    value={allProv.find((o) => String(o.value) === String(provinsi)) || allProv[0]}
                    onChange={(o) => {
                      setProvinsi(o?.value || "0");
                      setKota("0");
                    }}
                    placeholder="Provinsi"
                  />
                </div>
                <div className="rml-f" style={{ minWidth: 160 }}>
                  <RSelect
                    styles={filterSelectStyles}
                    isSearchable
                    isDisabled={memberOnly}
                    options={allKota}
                    value={allKota.find((o) => String(o.value) === String(kota)) || allKota[0]}
                    onChange={(o) => setKota(o?.value || "0")}
                    placeholder="Kota"
                  />
                </div>
                <div className="rml-f" style={{ minWidth: 140 }}>
                  <RSelect
                    styles={filterSelectStyles}
                    isDisabled={memberOnly}
                    options={BRAND_OPTS}
                    value={BRAND_OPTS.find((o) => o.value === brand) || BRAND_OPTS[0]}
                    onChange={(o) => setBrand(o?.value || "0")}
                    placeholder="Brand"
                  />
                </div>
                <div className="rml-f rml-f-age">
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    placeholder="Age from"
                    disabled={memberOnly}
                    value={ageFrom}
                    onChange={(e) => setAgeFrom(e.target.value)}
                  />
                  <span className="text-soft">-</span>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    placeholder="Age to"
                    disabled={memberOnly}
                    value={ageTo}
                    onChange={(e) => setAgeTo(e.target.value)}
                  />
                </div>
                <div className="rml-f" style={{ minWidth: 120 }}>
                  <RSelect
                    styles={filterSelectStyles}
                    isDisabled={memberOnly}
                    options={GENDER_OPTS}
                    value={GENDER_OPTS.find((o) => o.value === gender) || GENDER_OPTS[0]}
                    onChange={(o) => setGender(o?.value || "0")}
                    placeholder="Gender"
                  />
                </div>
                <div className="rml-f" style={{ minWidth: 180 }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={memberOnly ? "Nama / No. HP / Email / Member ID" : "Nama / No. HP / Email"}
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSearch();
                    }}
                  />
                </div>
                <div className="rml-f rml-f-actions">
                  <button
                    type="button"
                    className="btn btn-icon btn-trigger admin-filter-premium-btn"
                    onClick={onSearch}
                    disabled={loading}
                    title="Cari"
                    aria-label="Cari"
                  >
                    <Icon pack="premium" name="pencarian" size={32} />
                  </button>
                  <button
                    type="button"
                    className="rml-action-btn"
                    onClick={onExport}
                    disabled={exporting || !total}
                    title="Export"
                  >
                    <Icon name="download" />
                    <span>{exporting ? "Exporting..." : "Export"}</span>
                  </button>
                </div>
                <div className="rml-f rml-f-meta">
                  <span className="rml-meta-total">
                    {loading ? "Memuat data..." : `Total ${fmtNum(total)} member`}
                  </span>
                  <select
                    className="form-select form-select-sm rml-size"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n} / halaman
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error ? <div className="rrd-msg err mb-2">{error}</div> : null}

              <div className="riv-table-wrap rsl-table-wrap">
                <table className="riv-table riv-table--rsl rml-table">
                  <thead>
                    <tr>
                      {SORTABLE.map((c) => (
                        <th key={c.key} className={`rml-sortable ${c.num ? "num" : ""}`} onClick={() => onSort(c.key)}>
                          {c.label}
                          {sort.key === c.key ? <Icon name={sort.dir === "ASC" ? "caret-up-fill" : "caret-down-fill"} /> : null}
                        </th>
                      ))}
                      <th className="ctr">STATUS</th>
                      <th className="ctr">BRAND</th>
                      <th className="rml-sortable num" onClick={() => onSort("age")}>
                        AGE
                        {sort.key === "age" ? <Icon name={sort.dir === "ASC" ? "caret-up-fill" : "caret-down-fill"} /> : null}
                      </th>
                      <th className="rml-sortable" onClick={() => onSort("gender")}>
                        GENDER
                        {sort.key === "gender" ? <Icon name={sort.dir === "ASC" ? "caret-up-fill" : "caret-down-fill"} /> : null}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!rows.length ? (
                      <tr>
                        <td colSpan={SORTABLE.length + 4} className="ctr">
                          {loading ? "Memuat..." : "There Is No Data"}
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={`${r.id_member}-${i}`}>
                          <td>
                            <Link to={`/admin/regional/rpt/member/info?mem=${encodeURIComponent(r.id_member || "")}`}>
                              {r.member_id}
                            </Link>
                          </td>
                          <td>{r.name}</td>
                          <td>{r.provinsi}</td>
                          <td>{r.kota}</td>
                          <td className="num">{fmtNum(r.total_point)}</td>
                          <td className="num">{fmtNum(r.point_used)}</td>
                          <td>{r.join_date}</td>
                          <td>{r.tier}</td>
                          <td className="num">{fmtNum(r.total_transaction)}</td>
                          <td className="ctr">
                            {r.validasi_data ? (
                              <Icon name="check-circle-fill" className="rml-valid" title="Data tervalidasi" />
                            ) : (
                              <span className="text-soft">-</span>
                            )}
                          </td>
                          <td className="ctr">
                            <span className="rml-logos">
                              {logoUrls(r.logo).map((src, k) => (
                                <img key={k} src={src} alt="brand" />
                              ))}
                            </span>
                          </td>
                          <td className="num">{r.age}</td>
                          <td>{r.gender}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <SimplePager page={page} total={total} size={pageSize} onChange={setPage} />
            </div>
          </Block>

          <div className="rml-side">
            <div className="rml-card">
              <div className="rml-card-head">
                <h6 className="rml-card-title">Members Location</h6>
                <div className="rml-card-tools">
                  <div style={{ minWidth: 170 }}>
                    <RSelect
                      styles={filterSelectStyles}
                      isSearchable
                      options={allProv}
                      value={allProv.find((o) => String(o.value) === String(locProv)) || allProv[0]}
                      onChange={(o) => {
                        setLocProv(o?.value || "0");
                        setLocKota("0");
                        setLocPage(1);
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 150 }}>
                    <RSelect
                      styles={filterSelectStyles}
                      isSearchable
                      options={allLocKota}
                      value={allLocKota.find((o) => String(o.value) === String(locKota)) || allLocKota[0]}
                      onChange={(o) => {
                        setLocKota(o?.value || "0");
                        setLocPage(1);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="riv-table-wrap rsl-table-wrap">
                <table className="riv-table riv-table--rsl">
                  <thead>
                    <tr>
                      <th>PROVINSI</th>
                      <th>KOTA</th>
                      <th className="num">TOTAL MEMBER</th>
                      <th className="num">ACTIVE</th>
                      <th className="num">NON ACTIVE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!locShown.length ? (
                      <tr>
                        <td colSpan={5} className="ctr">
                          {locLoading ? "Memuat..." : "There Is No Data"}
                        </td>
                      </tr>
                    ) : (
                      locShown.map((r, i) => (
                        <tr key={`${r.provinsi}-${r.kota}-${i}`}>
                          <td>{r.provinsi}</td>
                          <td>{r.kota}</td>
                          <td className="num">{fmtNum(r.total_member)}</td>
                          <td className="num">{fmtNum(r.total_member_active)}</td>
                          <td className="num">{fmtNum(r.total_member_nonactive)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <SimplePager page={locPage} total={locRows.length} size={SIDE_PAGE_SIZE} onChange={setLocPage} />
            </div>

            <div className="rml-card">
              <div className="rml-card-head">
                <h6 className="rml-card-title">Birthday Member</h6>
              </div>
              <div className="riv-table-wrap rsl-table-wrap">
                <table className="riv-table riv-table--rsl">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>STATUS</th>
                      <th>DATE OF BIRTH</th>
                      <th className="num">INFO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!bdShown.length ? (
                      <tr>
                        <td colSpan={4} className="ctr">
                          There Is No Data
                        </td>
                      </tr>
                    ) : (
                      bdShown.map((r, i) => (
                        <tr key={`${r.name}-${i}`}>
                          <td>{r.name}</td>
                          <td>
                            <span className="rml-pill">{r.status}</span>
                          </td>
                          <td>{r.date_of_birth}</td>
                          <td className="num">{r.info} hari lagi</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <SimplePager page={bdPage} total={bdRows.length} size={SIDE_PAGE_SIZE} onChange={setBdPage} />
            </div>
          </div>
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegMemberListPage;
