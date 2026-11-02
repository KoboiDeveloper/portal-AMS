import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
} from "reactstrap";
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
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import "./reg-reg-report.css";
import "./reg-store-list.css";

/** Legacy module/admin/STORE_ACTIVE.aspx — simple store list + inline status toggle */
const svc = createRegionalService("util/store-list", { crud: true });

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: "0.8125rem" }),
};

const ALL_OPT = { value: "ALL", label: "ALL" };
const STATUS_OPTS = [
  ALL_OPT,
  { value: "AKTIF", label: "AKTIF" },
  { value: "TIDAK AKTIF", label: "TIDAK AKTIF" },
];
const PAGE_SIZE = 50;

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const isActiveRow = (r) => {
  const st = String(cell(r, "status", "STATUS") || "").toUpperCase();
  if (st.includes("TIDAK")) return false;
  if (st.includes("AKTIF")) return true;
  return Number(cell(r, "is_active")) === 1;
};

const RegStoreListPage = () => {
  const [sm, setSm] = useState(false);
  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [brandId, setBrandId] = useState("ALL");
  const [status, setStatus] = useState("AKTIF");
  const [keywords, setKeywords] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts.filter((o) => String(o.value).toUpperCase() !== "ALL") : [];
      setBrandOpts([ALL_OPT, ...list]);
    });
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        keywords: keywords.trim(),
        id_brand: brandId || "ALL",
        status: status || "ALL",
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setLoaded(false);
        return;
      }
      setRows(extractRows(res));
      setPage(1);
      setLoaded(true);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [brandId, keywords, status]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const shown = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const onToggleStatus = async (row) => {
    const id = cell(row, "store_id", "id", "STORE");
    const action = cell(row, "confirm_status") || (isActiveRow(row) ? "NONAKTIFKAN" : "AKTIFKAN");
    if (!id) return;
    setBusyId(String(id));
    setError("");
    try {
      const res = await svc.update(id, { confirm_status: action, action });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal update status");
        return;
      }
      await loadList();
    } catch (e) {
      setError(e?.message || "Gagal update status");
    } finally {
      setBusyId("");
    }
  };

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${safePage}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_TOOLS_STORE">
      <Head title="Store List" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll rsl-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Store List
                </BlockTitle>
                <BlockDes className="text-soft">
                  {loaded ? `You have total ${rows.length} stores` : "Store active / nonaktif"}
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
                      <li className="hrd-filter-select" style={{ minWidth: 150 }}>
                        <RSelect
                          styles={filterSelectStyles}
                          isSearchable
                          options={brandOpts}
                          value={brandOpts.find((o) => String(o.value) === String(brandId)) || ALL_OPT}
                          onChange={(opt) => setBrandId(opt?.value || "ALL")}
                          placeholder="Brand"
                        />
                      </li>
                      <li className="hrd-filter-select" style={{ minWidth: 140 }}>
                        <RSelect
                          styles={filterSelectStyles}
                          options={STATUS_OPTS}
                          value={STATUS_OPTS.find((o) => o.value === status) || ALL_OPT}
                          onChange={(opt) => setStatus(opt?.value || "ALL")}
                          placeholder="Status"
                        />
                      </li>
                      <li>
                        <div className="form-control-wrap" style={{ minWidth: 160 }}>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Keywords"
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") loadList();
                            }}
                          />
                        </div>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="btn btn-icon btn-trigger admin-filter-premium-btn"
                          onClick={loadList}
                          disabled={loading}
                          title="Search"
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
            {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
            {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

            <div className="riv-table-wrap rsl-table-wrap">
              <table className="riv-table riv-table--rsl">
                <thead>
                  <tr>
                    <th className="rds-no">NO</th>
                    <th>STORE</th>
                    <th>BRAND</th>
                    <th className="ctr">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {!shown.length ? (
                    <tr>
                      <td colSpan={4} className="ctr">
                        There Is No Data
                      </td>
                    </tr>
                  ) : (
                    shown.map((r, i) => {
                      const id = String(cell(r, "store_id", "id") || i);
                      const active = isActiveRow(r);
                      const confirm = cell(r, "confirm_status") || (active ? "NONAKTIFKAN" : "AKTIFKAN");
                      const busy = busyId === id;
                      return (
                        <tr key={id}>
                          <td className="rds-no">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                          <td>{cell(r, "store_desc") || cell(r, "store_id")}</td>
                          <td>{cell(r, "brand_id", "brand")}</td>
                          <td className="ctr">
                            <UncontrolledDropdown>
                              <DropdownToggle
                                tag="button"
                                type="button"
                                className={`btn btn-sm rsl-status-btn ${active ? "is-on" : "is-off"}`}
                                disabled={busy}
                              >
                                {busy ? "..." : cell(r, "status") || (active ? "AKTIF" : "TIDAK AKTIF")}
                                <Icon name="chevron-down" />
                              </DropdownToggle>
                              <DropdownMenu end className="rsl-status-menu">
                                <ul className="link-list-opt no-bdr">
                                  <li>
                                    <DropdownItem
                                      tag="a"
                                      href="#toggle"
                                      onClick={(ev) => {
                                        ev.preventDefault();
                                        onToggleStatus(r);
                                      }}
                                    >
                                      <Icon name={active ? "na" : "check-circle"} />
                                      <span>{confirm}</span>
                                    </DropdownItem>
                                  </li>
                                </ul>
                              </DropdownMenu>
                            </UncontrolledDropdown>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {rows.length > PAGE_SIZE ? (
              <div className="rsl-pager">
                <span className="rsl-pager-info">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} dari {rows.length} ·
                  Halaman {safePage}/{totalPages}
                </span>
                <div className="rsl-pager-btns">
                  <button
                    type="button"
                    className="rsl-pager-btn"
                    disabled={safePage <= 1}
                    onClick={() => setPage(Math.max(1, safePage - 1))}
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    className="rsl-pager-btn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegStoreListPage;
