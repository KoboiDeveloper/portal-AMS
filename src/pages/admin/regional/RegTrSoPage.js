import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  ModalBody,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
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
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { ModalSmoothScroll } from "../../../components/ModalSmoothScroll";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import api from "../../../lib/api";
import { extractRows, isSuccess } from "../../../lib/response";
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-sales-detail.css";
import "./reg-inv-report.css";

/** Legacy module/Rpt/Rpt_Tr_So.aspx — list + DETAIL / SELISIH / GAWANG / DETAIL GAWANG / PLU GAWANG modals */
const svc = createRegionalService("rpt/so/tr-so", { crud: false });

const fetchAction = (action, headerId, params = {}) =>
  api.get(`/regional/rpt/so/tr-so/${encodeURIComponent(headerId)}/${action}`, { params });

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
const monthStartYmd = () => {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
};

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));
const fmtDate = (v) => {
  if (v == null || v === "") return "";
  const s = String(v);
  const m = s.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
};
const fmtBit = (v) => {
  if (v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true") return "1";
  return "0";
};

const ALL_OPT = { value: "ALL", label: "ALL" };
const TIPE_OPTS = [
  { value: "FULL", label: "FULL" },
  { value: "DEPT", label: "DEPT" },
  { value: "CLASS", label: "CLASS" },
];
const SELISIH_MODE_OPTS = [
  { value: "ALL", label: "ALL" },
  { value: "FIX", label: "FIX (!=0)" },
];
const RENDER_STEP = 80;

const ACTION_META = {
  detail: { title: "DETAIL", path: "detail" },
  selisih: { title: "SELISIH", path: "selisih" },
  gawang: { title: "GAWANG", path: "gawang" },
  "gawang-detail": { title: "DETAIL GAWANG", path: "gawang-detail" },
  "gawang-plu": { title: "PLU GAWANG", path: "gawang-plu" },
};

const headerIdOf = (r) => String(r?.NO_TR_SO_HEADER || r?.no_tr_so_header || "").trim();
const storeOf = (r) => String(r?.ID_STORE_SO || r?.id_store_so || r?.ID_Store_SO || "").trim();

const cell = (r, ...keys) => {
  for (const k of keys) {
    if (r?.[k] != null && r[k] !== "") return r[k];
    const up = String(k).toUpperCase();
    const hit = r && Object.keys(r).find((x) => String(x).toUpperCase() === up);
    if (hit != null && r[hit] != null && r[hit] !== "") return r[hit];
  }
  return "";
};

const RegTrSoPage = () => {
  const tableRef = useRef(null);
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());

  const [brandOpts, setBrandOpts] = useState([ALL_OPT]);
  const [storeOpts, setStoreOpts] = useState([ALL_OPT]);

  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);
  const [selectedId, setSelectedId] = useState("");
  const [listQuery, setListQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState("");
  const [modalHeader, setModalHeader] = useState("");
  const [modalStore, setModalStore] = useState("");
  const [modalItems, setModalItems] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalTipe, setModalTipe] = useState("FULL");
  const [modalMode, setModalMode] = useState("ALL");
  const [modalFilter, setModalFilter] = useState("");

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
  }, []);

  useEffect(() => {
    regionalLookupOptions("store", { parentId: brandId === "ALL" ? "" : brandId || "" }).then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setStoreOpts([ALL_OPT, ...list.filter((o) => String(o.value).toUpperCase() !== "ALL")]);
    });
    setStoreId("");
  }, [brandId]);

  const canSearch = Boolean(brandId && storeId && fromDate && toDate);

  const loadData = useCallback(async () => {
    if (!brandId || !storeId || !fromDate || !toDate) {
      setError("Pilih Brand, Store, dan tanggal dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await svc.list({
        from_date: fromDate,
        to_date: toDate,
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
      setView({ brandId, storeId, fromDate, toDate });
      setLimit(RENDER_STEP);
      setSelectedId("");
      setListQuery("");
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, storeId, fromDate, toDate]);

  const loadModal = useCallback(
    async (action, headerId, store, tipe, mode, filter) => {
      const meta = ACTION_META[action];
      if (!meta || !headerId) return;
      setModalLoading(true);
      setModalError("");
      setModalItems([]);
      try {
        const params = {};
        if (action === "detail") {
          params.id_store = store;
          params.tipe = tipe || "FULL";
        } else if (action === "selisih") {
          params.tipe = tipe || "FULL";
          params.status = mode || "ALL";
        } else if (action === "gawang" || action === "gawang-detail") {
          params.id_store = store;
          if (filter) params.article = filter;
        } else if (action === "gawang-plu") {
          params.id_store = store;
          if (filter) params.plu = filter;
        }
        const res = await fetchAction(meta.path, headerId, params);
        if (!isSuccess(res)) {
          setModalError(res?.responseMessage || "Gagal memuat");
          return;
        }
        setModalItems(extractRows(res));
      } catch (e) {
        setModalError(e?.message || "Gagal memuat");
      } finally {
        setModalLoading(false);
      }
    },
    []
  );

  const openAction = useCallback(
    (action, row) => {
      const id = headerIdOf(row);
      const store = storeOf(row);
      if (!id) return;
      setModalAction(action);
      setModalHeader(id);
      setModalStore(store);
      setModalTipe("FULL");
      setModalMode("ALL");
      setModalFilter("");
      setModalOpen(true);
      loadModal(action, id, store, "FULL", "ALL", "");
    },
    [loadModal]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalAction("");
    setModalHeader("");
    setModalStore("");
    setModalItems([]);
    setModalError("");
    setModalFilter("");
  }, []);

  const reloadModal = useCallback(() => {
    loadModal(modalAction, modalHeader, modalStore, modalTipe, modalMode, modalFilter);
  }, [loadModal, modalAction, modalHeader, modalStore, modalTipe, modalMode, modalFilter]);

  const filteredRows = useMemo(() => {
    const q = String(listQuery || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = [
        headerIdOf(r),
        storeOf(r),
        cell(r, "CLASS_SO"),
        cell(r, "GRADE_SO"),
        cell(r, "TGL_SO"),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, listQuery]);

  const shown = useMemo(() => filteredRows.slice(0, limit), [filteredRows, limit]);

  const modalTitle = ACTION_META[modalAction]?.title || "";
  const needsTipe = modalAction === "detail" || modalAction === "selisih";
  const needsMode = modalAction === "selisih";
  const needsGawangFilter = modalAction === "gawang" || modalAction === "gawang-detail";
  const needsPluFilter = modalAction === "gawang-plu";

  const detailFooter = useMemo(() => {
    if (modalAction !== "detail") return null;
    let qd = 0,
      pd = 0,
      tpd = 0,
      qr = 0,
      pa = 0,
      tpa = 0,
      qs = 0,
      ps = 0,
      tps = 0;
    modalItems.forEach((r) => {
      qd += Number(cell(r, "QTY_DATA") || 0);
      pd += Number(cell(r, "PRICE_DATA") || 0);
      tpd += Number(cell(r, "TOTAL_PRICE_DATA") || 0);
      qr += Number(cell(r, "QTY_REAL") || 0);
      pa += Number(cell(r, "PRICE_A") || 0);
      tpa += Number(cell(r, "TOTAL_PRICE_A") || 0);
      qs += Number(cell(r, "QTY_SELISIH") || 0);
      ps += Number(cell(r, "PRICE_SELISIH") || 0);
      tps += Number(cell(r, "TOTAL_PRICE_SELISIH") || 0);
    });
    return { qd, pd, tpd, qr, pa, tpa, qs, ps, tps };
  }, [modalAction, modalItems]);

  const selisihFooter = useMemo(() => {
    if (modalAction !== "selisih") return null;
    let qs = 0,
      hs = 0,
      ps = 0,
      ths = 0,
      tps = 0,
      qa = 0,
      ha = 0,
      pa = 0,
      tha = 0,
      tpa = 0;
    modalItems.forEach((r) => {
      qs += Number(cell(r, "QTY_SELISIH") || 0);
      hs += Number(cell(r, "HPP_SELISIH") || 0);
      ps += Number(cell(r, "PRICE_SELISIH") || 0);
      ths += Number(cell(r, "TOTAL_HPP_SELISIH") || 0);
      tps += Number(cell(r, "TOTAL_PRICE_SELISIH") || 0);
      qa += Number(cell(r, "QTY_ADJ") || 0);
      ha += Number(cell(r, "HPP_ADJ") || 0);
      pa += Number(cell(r, "PRICE_ADJ") || 0);
      tha += Number(cell(r, "TOTAL_HPP_ADJ") || 0);
      tpa += Number(cell(r, "TOTAL_PRICE_ADJ") || 0);
    });
    return { qs, hs, ps, ths, tps, qa, ha, pa, tha, tpa };
  }, [modalAction, modalItems]);

  const gawangFooter = useMemo(() => {
    if (modalAction === "gawang") {
      let qty = 0;
      modalItems.forEach((r) => {
        qty += Number(cell(r, "TOTAL_QTY") || 0);
      });
      return { qty };
    }
    if (modalAction === "gawang-detail" || modalAction === "gawang-plu") {
      let qty = 0,
        price = 0,
        total = 0;
      modalItems.forEach((r) => {
        qty += Number(cell(r, "QTY_REAL") || 0);
        price += Number(cell(r, "PRICE_REAL") || 0);
        total += Number(cell(r, "TOTAL_PRICE_REAL") || 0);
      });
      return { qty, price, total };
    }
    return null;
  }, [modalAction, modalItems]);

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_TR_SO">
      <Head title="Tr So" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Tr So
                </BlockTitle>
                <BlockDes className="text-soft">
                  {view
                    ? `You have total ${rows.length} transactions`
                    : "Isi filter lalu klik Cari untuk memuat data"}
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
                      <li className="hrd-filter-select">
                        <RSelect
                          className="hrd-filter-rselect"
                          styles={filterSelectStyles}
                          isSearchable
                          isClearable
                          placeholder="Brand"
                          options={brandOpts}
                          value={brandOpts.find((o) => String(o.value) === String(brandId)) || null}
                          onChange={(opt) => setBrandId(opt?.value != null ? String(opt.value) : "")}
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
                          onChange={(opt) => setStoreId(opt?.value != null ? String(opt.value) : "")}
                        />
                      </li>
                      <li className="hrd-filter-daterange">
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
                      </li>
                      <li>
                        <button
                          type="button"
                          className="btn btn-icon btn-trigger admin-filter-premium-btn"
                          onClick={loadData}
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
            {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
            {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

            {!view && !loading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}
            {view && !error && !rows.length ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}

            {view && rows.length > 0 ? (
              <div className="riv-bleed">
                <div className="riv-list-toolbar">
                  <input
                    type="search"
                    className="riv-list-search"
                    placeholder="Cari SO / store / class…"
                    value={listQuery}
                    onChange={(e) => {
                      setListQuery(e.target.value);
                      setLimit(RENDER_STEP);
                    }}
                    aria-label="Cari SO, store, atau class"
                  />
                </div>
                <div className="riv-table-wrap riv-table-wrap--trso">
                  <table ref={tableRef} className="riv-table riv-table--trso">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="rds-no riv-trso-pin-no">
                          NO
                        </th>
                        <th rowSpan={2} className="ctr riv-trso-pin-so">
                          SO.NUMBER
                        </th>
                        <th rowSpan={2} className="ctr">
                          DATE
                        </th>
                        <th rowSpan={2} className="ctr">
                          STORE
                        </th>
                        <th rowSpan={2} className="ctr">
                          CLASS
                        </th>
                        <th rowSpan={2} className="ctr">
                          GRADE
                        </th>
                        <th colSpan={2} className="ctr riv-trso-grp--date">
                          DATE
                        </th>
                        <th colSpan={3} className="ctr riv-trso-grp--data">
                          DATA
                        </th>
                        <th colSpan={5} className="ctr riv-trso-grp--so">
                          STOCK OPNAME
                        </th>
                        <th colSpan={3} className="ctr riv-trso-grp--diff">
                          DIFFERENT
                        </th>
                        <th rowSpan={2} className="ctr riv-trso-act">
                          ACTION
                        </th>
                      </tr>
                      <tr>
                        <th className="ctr riv-trso-grp--date">OPEN</th>
                        <th className="ctr riv-trso-grp--date">CLOSED</th>
                        <th className="num riv-trso-grp--data">QTY</th>
                        <th className="num riv-trso-grp--data">HPP</th>
                        <th className="num riv-trso-grp--data">PRICE</th>
                        <th className="num riv-trso-grp--so">SO.STOCK</th>
                        <th className="num riv-trso-grp--so">HPP REAL</th>
                        <th className="num riv-trso-grp--so">PRICE REAL</th>
                        <th className="ctr riv-trso-grp--so">SO.STATUS</th>
                        <th className="ctr riv-trso-grp--so">CLOSING</th>
                        <th className="num riv-trso-grp--diff">QTY</th>
                        <th className="num riv-trso-grp--diff">HPP</th>
                        <th className="num riv-trso-grp--diff">PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!shown.length ? (
                        <tr>
                          <td colSpan={20} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        shown.map((r, i) => {
                          const id = headerIdOf(r);
                          const selected = id && id === selectedId;
                          return (
                            <tr
                              key={id || i}
                              className={`rsd-row-click${selected ? " riv-trso-selected" : ""}`}
                              onClick={() => setSelectedId(id)}
                            >
                              <td className="rds-no riv-trso-pin-no">{i + 1}</td>
                              <td className="ctr riv-trso-pin-so riv-trso-so">{id}</td>
                              <td className="ctr">{fmtDate(cell(r, "TGL_SO"))}</td>
                              <td className="ctr">{cell(r, "ID_STORE_SO")}</td>
                              <td className="ctr">{cell(r, "CLASS_SO")}</td>
                              <td className="ctr">{cell(r, "GRADE_SO")}</td>
                              <td className="ctr riv-trso-grp--date">{fmtDate(cell(r, "TGL_STATUS_SO"))}</td>
                              <td className="ctr riv-trso-grp--date">{fmtDate(cell(r, "TGL_CLOSING"))}</td>
                              <td className="num riv-trso-grp--data">{fmtNum(cell(r, "QTY_A"))}</td>
                              <td className="num riv-trso-grp--data">{fmtNum(cell(r, "HPP_A"))}</td>
                              <td className="num riv-trso-grp--data">{fmtNum(cell(r, "PRICE_A"))}</td>
                              <td className="num riv-trso-grp--so">{fmtNum(cell(r, "QTY_REAL"))}</td>
                              <td className="num riv-trso-grp--so">{fmtNum(cell(r, "HPP_REAL"))}</td>
                              <td className="num riv-trso-grp--so">{fmtNum(cell(r, "PRICE_REAL"))}</td>
                              <td className="ctr riv-trso-grp--so">{fmtBit(cell(r, "STATUS_SO"))}</td>
                              <td className="ctr riv-trso-grp--so">{fmtBit(cell(r, "STATUS_CLOSING"))}</td>
                              <td className="num riv-trso-grp--diff">{fmtNum(cell(r, "QTY_SELISIH"))}</td>
                              <td className="num riv-trso-grp--diff">{fmtNum(cell(r, "HPP_SELISIH"))}</td>
                              <td className="num riv-trso-grp--diff">{fmtNum(cell(r, "PRICE_SELISIH"))}</td>
                              <td
                                className="ctr riv-trso-act"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <UncontrolledDropdown>
                                  <DropdownToggle
                                    tag="a"
                                    href="#action"
                                    className="text-soft dropdown-toggle btn btn-icon btn-trigger riv-trso-dd-toggle"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <Icon name="more-h" />
                                  </DropdownToggle>
                                  <DropdownMenu end container="body" className="riv-trso-dd-menu">
                                    <DropdownItem onClick={() => openAction("detail", r)}>DETAIL</DropdownItem>
                                    <DropdownItem onClick={() => openAction("selisih", r)}>SELISIH</DropdownItem>
                                    <DropdownItem onClick={() => openAction("gawang", r)}>GAWANG</DropdownItem>
                                    <DropdownItem onClick={() => openAction("gawang-detail", r)}>
                                      DETAIL GAWANG
                                    </DropdownItem>
                                    <DropdownItem onClick={() => openAction("gawang-plu", r)}>PLU GAWANG</DropdownItem>
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
                <RivStickyThead
                  tableRef={tableRef}
                  enabled={Boolean(view && filteredRows.length)}
                  tableClassName="riv-table riv-table--trso"
                />
                <div className="rds-meta">
                  <span>
                    {filteredRows.length
                      ? `Menampilkan ${shown.length} dari ${filteredRows.length} baris${
                          listQuery.trim() ? ` (filter dari ${rows.length})` : ""
                        }`
                      : "0 baris"}
                  </span>
                  {filteredRows.length > shown.length ? (
                    <span className="rds-more">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setLimit((l) => l + RENDER_STEP)}
                      >
                        Tampilkan {RENDER_STEP} lagi
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setLimit(filteredRows.length)}
                      >
                        Tampilkan semua
                      </button>
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>

        <Modal
          isOpen={modalOpen}
          toggle={closeModal}
          className="modal-dialog-centered rsd-detail-modal riv-detail-modal"
        >
          <div className="rsd-detail-hero">
            <div>
              <h5 className="rsd-detail-title">{modalTitle}</h5>
              <p className="rsd-detail-sub">
                {modalHeader ? `SO: ${modalHeader}` : null}
                {modalStore ? <span className="text-soft"> · Store: {modalStore}</span> : null}
              </p>
            </div>
            <button type="button" className="btn btn-icon btn-trigger" onClick={closeModal} aria-label="Tutup">
              <Icon name="cross" />
            </button>
          </div>
          <ModalBody className="rsd-detail-body">
            <ModalSmoothScroll
              active={modalOpen}
              revision={`${modalLoading ? "loading" : "ready"}-${modalItems.length}-${modalAction}-${modalHeader}`}
            >
              <div className="riv-trso-modal-filters mb-2">
                {needsTipe ? (
                  <div className="riv-trso-modal-fitem">
                    <RSelect
                      styles={filterSelectStyles}
                      options={TIPE_OPTS}
                      value={TIPE_OPTS.find((o) => o.value === modalTipe) || TIPE_OPTS[0]}
                      onChange={(opt) => {
                        const v = opt?.value || "FULL";
                        setModalTipe(v);
                        loadModal(modalAction, modalHeader, modalStore, v, modalMode, modalFilter);
                      }}
                    />
                  </div>
                ) : null}
                {needsMode ? (
                  <div className="riv-trso-modal-fitem">
                    <RSelect
                      styles={filterSelectStyles}
                      options={SELISIH_MODE_OPTS}
                      value={SELISIH_MODE_OPTS.find((o) => o.value === modalMode) || SELISIH_MODE_OPTS[0]}
                      onChange={(opt) => {
                        const v = opt?.value || "ALL";
                        setModalMode(v);
                        loadModal(modalAction, modalHeader, modalStore, modalTipe, v, modalFilter);
                      }}
                    />
                  </div>
                ) : null}
                {needsGawangFilter || needsPluFilter ? (
                  <>
                    <div className="riv-trso-modal-fitem">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder={needsPluFilter ? "PLU" : "Gawang"}
                        value={modalFilter}
                        onChange={(e) => setModalFilter(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") reloadModal();
                        }}
                      />
                    </div>
                    <button type="button" className="btn btn-sm btn-primary" onClick={reloadModal} disabled={modalLoading}>
                      Filter
                    </button>
                  </>
                ) : null}
              </div>

              {modalError ? <div className="rrd-msg err mb-2">{modalError}</div> : null}
              {modalLoading ? <div className="text-soft small mb-2">Memuat...</div> : null}

              <div className="riv-detail-wrap">
                {modalAction === "detail" ? (
                  <table className="riv-table riv-detail-table">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="rds-no">
                          No
                        </th>
                        <th rowSpan={2} className="ctr">
                          PLU
                        </th>
                        <th rowSpan={2}>DESKRIPSI</th>
                        <th colSpan={3} className="ctr ls-grp--a">
                          DATA
                        </th>
                        <th colSpan={3} className="ctr ls-grp--b">
                          STOCK OPNAME
                        </th>
                        <th colSpan={3} className="ctr ls-grp--a">
                          SELISIH
                        </th>
                      </tr>
                      <tr>
                        <th className="num ls-grp--a">QTY</th>
                        <th className="num ls-grp--a">PRICE</th>
                        <th className="num ls-grp--a">TOTAL PRICE</th>
                        <th className="num ls-grp--b">QTY</th>
                        <th className="num ls-grp--b">PRICE</th>
                        <th className="num ls-grp--b">TOTAL PRICE</th>
                        <th className="num ls-grp--a">QTY</th>
                        <th className="num ls-grp--a">PRICE</th>
                        <th className="num ls-grp--a">TOTAL PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!modalItems.length && !modalLoading ? (
                        <tr>
                          <td colSpan={12} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        modalItems.map((r, i) => (
                          <tr key={`${cell(r, "PLU")}-${i}`}>
                            <td className="rds-no">{i + 1}</td>
                            <td className="ctr">{cell(r, "PLU")}</td>
                            <td>{cell(r, "DESKRIPSI")}</td>
                            <td className="num">{fmtNum(cell(r, "QTY_DATA"))}</td>
                            <td className="num">{fmtNum(cell(r, "PRICE_DATA"))}</td>
                            <td className="num">{fmtNum(cell(r, "TOTAL_PRICE_DATA"))}</td>
                            <td className="num">{fmtNum(cell(r, "QTY_REAL"))}</td>
                            <td className="num">{fmtNum(cell(r, "PRICE_A"))}</td>
                            <td className="num">{fmtNum(cell(r, "TOTAL_PRICE_A"))}</td>
                            <td className="num">{fmtNum(cell(r, "QTY_SELISIH"))}</td>
                            <td className="num">{fmtNum(cell(r, "PRICE_SELISIH"))}</td>
                            <td className="num">{fmtNum(cell(r, "TOTAL_PRICE_SELISIH"))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {detailFooter && modalItems.length ? (
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="num">
                            TOTAL
                          </td>
                          <td className="num">{fmtNum(detailFooter.qd)}</td>
                          <td className="num">{fmtNum(detailFooter.pd)}</td>
                          <td className="num">{fmtNum(detailFooter.tpd)}</td>
                          <td className="num">{fmtNum(detailFooter.qr)}</td>
                          <td className="num">{fmtNum(detailFooter.pa)}</td>
                          <td className="num">{fmtNum(detailFooter.tpa)}</td>
                          <td className="num">{fmtNum(detailFooter.qs)}</td>
                          <td className="num">{fmtNum(detailFooter.ps)}</td>
                          <td className="num">{fmtNum(detailFooter.tps)}</td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                ) : null}

                {modalAction === "selisih" ? (
                  <table className="riv-table riv-detail-table">
                    <thead>
                      <tr>
                        <th className="rds-no">No</th>
                        <th className="ctr">PLU</th>
                        <th className="num">QTY</th>
                        <th className="num">HPP SELISIH</th>
                        <th className="num">PRICE</th>
                        <th className="num">TOTAL HPP SELISIH</th>
                        <th className="num">TOTAL</th>
                        <th className="num">QTY ADJ</th>
                        <th className="num">HPP ADJ</th>
                        <th className="num">PRICE ADJ</th>
                        <th className="num">TOTAL HPP ADJ</th>
                        <th className="num">TOTAL ADJ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!modalItems.length && !modalLoading ? (
                        <tr>
                          <td colSpan={12} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        modalItems.map((r, i) => (
                          <tr key={`${cell(r, "PLU")}-${i}`}>
                            <td className="rds-no">{i + 1}</td>
                            <td className="ctr">{cell(r, "PLU")}</td>
                            <td className="num">{fmtNum(cell(r, "QTY_SELISIH"))}</td>
                            <td className="num">{fmtNum(cell(r, "HPP_SELISIH"))}</td>
                            <td className="num">{fmtNum(cell(r, "PRICE_SELISIH"))}</td>
                            <td className="num">{fmtNum(cell(r, "TOTAL_HPP_SELISIH"))}</td>
                            <td className="num">{fmtNum(cell(r, "TOTAL_PRICE_SELISIH"))}</td>
                            <td className="num">{fmtNum(cell(r, "QTY_ADJ"))}</td>
                            <td className="num">{fmtNum(cell(r, "HPP_ADJ"))}</td>
                            <td className="num">{fmtNum(cell(r, "PRICE_ADJ"))}</td>
                            <td className="num">{fmtNum(cell(r, "TOTAL_HPP_ADJ"))}</td>
                            <td className="num">{fmtNum(cell(r, "TOTAL_PRICE_ADJ"))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {selisihFooter && modalItems.length ? (
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="num">
                            TOTAL
                          </td>
                          <td className="num">{fmtNum(selisihFooter.qs)}</td>
                          <td className="num">{fmtNum(selisihFooter.hs)}</td>
                          <td className="num">{fmtNum(selisihFooter.ps)}</td>
                          <td className="num">{fmtNum(selisihFooter.ths)}</td>
                          <td className="num">{fmtNum(selisihFooter.tps)}</td>
                          <td className="num">{fmtNum(selisihFooter.qa)}</td>
                          <td className="num">{fmtNum(selisihFooter.ha)}</td>
                          <td className="num">{fmtNum(selisihFooter.pa)}</td>
                          <td className="num">{fmtNum(selisihFooter.tha)}</td>
                          <td className="num">{fmtNum(selisihFooter.tpa)}</td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                ) : null}

                {modalAction === "gawang" ? (
                  <table className="riv-table riv-detail-table">
                    <thead>
                      <tr>
                        <th className="rds-no">No</th>
                        <th>GAWANG</th>
                        <th className="num">TOTAL QTY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!modalItems.length && !modalLoading ? (
                        <tr>
                          <td colSpan={3} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        modalItems.map((r, i) => (
                          <tr key={`${cell(r, "GAWANG")}-${i}`}>
                            <td className="rds-no">{i + 1}</td>
                            <td>{cell(r, "GAWANG")}</td>
                            <td className="num">{fmtNum(cell(r, "TOTAL_QTY"))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {gawangFooter && modalItems.length ? (
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="num">
                            TOTAL
                          </td>
                          <td className="num">{fmtNum(gawangFooter.qty)}</td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                ) : null}

                {modalAction === "gawang-detail" || modalAction === "gawang-plu" ? (
                  <table className="riv-table riv-detail-table">
                    <thead>
                      <tr>
                        <th className="rds-no">No</th>
                        {modalAction === "gawang-plu" ? (
                          <>
                            <th className="ctr">PLU</th>
                            <th>GAWANG</th>
                          </>
                        ) : (
                          <>
                            <th>GAWANG</th>
                            <th className="ctr">PLU</th>
                          </>
                        )}
                        <th>DESKRIPSI</th>
                        <th className="num">QTY</th>
                        <th className="num">PRICE</th>
                        <th className="num">TOTAL PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!modalItems.length && !modalLoading ? (
                        <tr>
                          <td colSpan={7} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        modalItems.map((r, i) => (
                          <tr key={`${cell(r, "PLU")}-${cell(r, "GAWANG")}-${i}`}>
                            <td className="rds-no">{i + 1}</td>
                            {modalAction === "gawang-plu" ? (
                              <>
                                <td className="ctr">{cell(r, "PLU")}</td>
                                <td>{cell(r, "GAWANG")}</td>
                              </>
                            ) : (
                              <>
                                <td>{cell(r, "GAWANG")}</td>
                                <td className="ctr">{cell(r, "PLU")}</td>
                              </>
                            )}
                            <td>{cell(r, "DESKRIPSI")}</td>
                            <td className="num">{fmtNum(cell(r, "QTY_REAL"))}</td>
                            <td className="num">{fmtNum(cell(r, "PRICE_REAL"))}</td>
                            <td className="num">{fmtNum(cell(r, "TOTAL_PRICE_REAL"))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {gawangFooter && modalItems.length ? (
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="num">
                            TOTAL
                          </td>
                          <td className="num">{fmtNum(gawangFooter.qty)}</td>
                          <td className="num">{fmtNum(gawangFooter.price)}</td>
                          <td className="num">{fmtNum(gawangFooter.total)}</td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                ) : null}
              </div>
            </ModalSmoothScroll>
          </ModalBody>
        </Modal>
      </Content>
    </AccessGuard>
  );
};

export default RegTrSoPage;
