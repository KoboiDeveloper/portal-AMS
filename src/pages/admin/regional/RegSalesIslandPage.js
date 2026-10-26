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
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import "./reg-sales-island.css";

const islandService = createRegionalService("rpt/sales/sales-island", { crud: false });

const filterSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 32,
    height: 32,
    fontSize: "0.8125rem",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 6px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 4px" }),
  menu: (base) => ({
    ...base,
    zIndex: 30,
    fontSize: "0.8125rem",
    width: "max-content",
    minWidth: "100%",
  }),
  option: (base) => ({
    ...base,
    fontSize: "0.8125rem",
    padding: "6px 12px",
    whiteSpace: "nowrap",
  }),
};

const ymd = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const defaultFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return ymd(d);
};

const defaultTo = () => ymd(new Date());

const fmtNum = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const num = (row, ...keys) => {
  for (const k of keys) {
    if (row?.[k] != null && row[k] !== "") return Number(row[k]) || 0;
  }
  return 0;
};

const str = (row, ...keys) => {
  for (const k of keys) {
    if (row?.[k] != null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
};

/** Parity with module/Mobile/salesiland.aspx — From/To/Brand + Load, tree by pulau */
const RegSalesIslandPage = () => {
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [brandId, setBrandId] = useState("");
  const [brandOpts, setBrandOpts] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [sm, setSm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opts = await regionalLookupOptions("brand_all");
      if (cancelled) return;
      setBrandOpts(opts || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const brandValue = useMemo(
    () => brandOpts.find((o) => String(o.value) === String(brandId)) || null,
    [brandOpts, brandId]
  );

  const canLoad = Boolean(fromDate && toDate && brandId);

  const load = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError("fromDate dan toDate wajib diisi.");
      return;
    }
    if (!brandId) {
      setError("brandID wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await islandService.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId,
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat data");
        setRows([]);
        setLoaded(true);
        return;
      }
      const list = extractRows(res);
      setRows(list);
      setLoaded(true);
      if (!list.length) setInfo("Tidak ada data pada periode tersebut.");
      const open = {};
      list.forEach((r, i) => {
        const pulau = str(r, "STORE_PULAU", "StorePulau", "store_pulau") || "(tanpa pulau)";
        open[pulau] = true;
      });
      setOpenGroups(open);
    } catch (e) {
      const msg =
        (typeof e === "string" && e) ||
        e?.responseMessage ||
        e?.message ||
        "Gagal memuat data";
      setError(String(msg).trim().slice(0, 300));
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [brandId, fromDate, toDate]);

  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const pulau = str(r, "STORE_PULAU", "StorePulau", "store_pulau") || "(tanpa pulau)";
      const store = str(r, "ID_Store", "id_store", "Store") || "-";
      const total = num(r, "TOTAL", "Total", "total");
      if (!map.has(pulau)) map.set(pulau, { StorePulau: pulau, Total: 0, Stores: [] });
      const g = map.get(pulau);
      g.Total += total;
      g.Stores.push({ ID_Store: store, TOTAL: total });
    });
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        Stores: g.Stores.slice().sort((a, b) =>
          String(a.ID_Store).localeCompare(String(b.ID_Store), "id", { numeric: true })
        ),
      }))
      .sort((a, b) => String(a.StorePulau).localeCompare(String(b.StorePulau), "id"));
  }, [rows]);

  const grandTotal = useMemo(
    () => groups.reduce((s, g) => s + (Number(g.Total) || 0), 0),
    [groups]
  );

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AccessGuard moduleCode="REG_RPT_SALES_ISLAND">
      <Head title="Sales By Island" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Sales By Island</BlockTitle>
              <BlockDes>
                <p>Sales per pulau · From / To / Brand — Load</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                  onClick={() => setSm((v) => !v)}
                >
                  <Icon name="menu-alt-r" />
                </Button>
                <div className={`toggle-expand-content ${sm ? "expanded" : ""}`}>
                  <ul className="nk-block-tools g-3 align-items-center">
                    <li className="hrd-filter-daterange">
                      <div className="form-control-wrap">
                        <div className="form-icon form-icon-left">
                          <Icon name="calendar" />
                        </div>
                        <AppDateRangePicker
                          startDate={fromDate}
                          endDate={toDate}
                          placeholder="From — To"
                          className="form-control form-control-sm date-picker ps-4"
                          onChange={(fromYmd, toYmd) => {
                            setFromDate(fromYmd || "");
                            setToDate(toYmd || "");
                          }}
                        />
                      </div>
                    </li>
                    <li className="hrd-filter-select">
                      <RSelect
                        className="hrd-filter-rselect"
                        styles={filterSelectStyles}
                        isClearable
                        isSearchable
                        placeholder="Brand"
                        options={brandOpts}
                        value={brandValue}
                        onChange={(opt) => setBrandId(opt?.value ?? "")}
                      />
                    </li>
                    <li>
                      <button
                        type="button"
                        className="btn btn-icon btn-trigger admin-filter-premium-btn"
                        onClick={load}
                        disabled={loading || !canLoad}
                        title={canLoad ? "Load" : "Pilih filter dulu"}
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
          <div className="rsi-wrap">
            {error ? <div className="rsi-msg err">{error}</div> : null}
            {info && !error ? <div className="rsi-msg ok">{info}</div> : null}

            {!loaded && !loading && !error ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}
            {loaded && !error && !groups.length ? (
              <div className="reg-rpt-empty">Data belum tersedia</div>
            ) : null}

            {loaded && groups.length > 0 ? (
              <>
                <div className="rsi-summary">
                  <div className="rsi-summary-row">
                    <div className="rsi-summary-title">TOTAL ALL</div>
                    <div className="rsi-summary-value">{fmtNum(grandTotal)}</div>
                  </div>
                </div>

                <div className="rsi-tree">
                  {groups.map((g) => {
                    const open = openGroups[g.StorePulau] !== false;
                    return (
                      <div key={g.StorePulau} className="rsi-group">
                        <div className="rsi-group-header">
                          <div className="rsi-group-left">
                            <button
                              type="button"
                              className="rsi-toggle"
                              onClick={() => toggleGroup(g.StorePulau)}
                              aria-label={open ? "Collapse" : "Expand"}
                            >
                              {open ? "−" : "+"}
                            </button>
                            <span className="rsi-group-name">{g.StorePulau}</span>
                          </div>
                          <div className="rsi-group-total">{fmtNum(g.Total)}</div>
                        </div>
                        {open ? (
                          <div className="rsi-group-items">
                            {g.Stores.map((s) => (
                              <div key={s.ID_Store} className="rsi-store-row">
                                <div className="rsi-store-name">{s.ID_Store}</div>
                                <div className="rsi-store-total">{fmtNum(s.TOTAL)}</div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="rsi-divider" />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}

            {loading ? <div className="rsi-loading">Loading…</div> : null}
          </div>
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default RegSalesIslandPage;
