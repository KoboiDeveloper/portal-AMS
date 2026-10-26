import React, { useCallback, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import DatePicker from "../../components/AppDatePicker";
import { NumericFormat } from "react-number-format";
import CalendarDateInput from "../../components/CalendarDateInput";
import Head from "../../layout/head/Head";
import Content from "../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
  PaginationComponent,
} from "../../components/Component";
import { useStoreScope } from "../../hooks/useStoreScope";
import { storePromoService } from "../../services/store-promo.service";
import { extractRows, isSuccess } from "../../lib/response";
import { exportStyledXlsx } from "../../lib/exportStyledXlsx";
import { PageSmoothScroll } from "../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../components/SalesEmptyState";

const TABS = [
  { id: "promosi", label: "PROMOSI" },
  { id: "bmsm", label: "BMSM" },
  { id: "bundling", label: "BUNDLING" },
];

const PROMO_COLUMNS = [
  { key: "no", label: "No", className: "promosi-col-no" },
  { key: "store", label: "Store", size: "sm", className: "promosi-col-store" },
  { key: "plu", label: "PLU", size: "md", className: "promosi-col-plu", sortable: true },
  { key: "keterangan", label: "Keterangan", size: "lg", className: "promosi-col-keterangan", sortable: true },
  { key: "qty", label: "Qty", size: "sm", className: "promosi-col-qty text-end", sortable: true },
  { key: "potHrg", label: "Potongan Harga", size: "md", className: "promosi-col-pot-hrg text-end", sortable: true },
  { key: "startDate", label: "Start Date", size: "md", className: "promosi-col-date", sortable: true },
  { key: "endDate", label: "End Date", size: "md", className: "promosi-col-date", sortable: true },
  { key: "statusKirim", label: "Status Kirim", size: "sm", className: "promosi-col-status text-center", sortable: true },
];

const getSortIcon = (key, sortConfig) => {
  if (sortConfig.key !== key) return "sort-v";
  return sortConfig.direction === "asc" ? "sort-up-fill" : "sort-down-fill";
};

const parseDateForSort = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const parsed = parseISO(raw.length <= 10 ? raw : raw.slice(0, 10));
  return isValid(parsed) ? parsed.getTime() : 0;
};

const comparePromoRows = (a, b, key, direction) => {
  const mul = direction === "asc" ? 1 : -1;

  if (key === "qty" || key === "potHrg") {
    return ((Number(a[key]) || 0) - (Number(b[key]) || 0)) * mul;
  }

  if (key === "startDate" || key === "endDate") {
    return (parseDateForSort(a[key]) - parseDateForSort(b[key])) * mul;
  }

  if (key === "statusKirim") {
    return ((a.statusKirim ? 1 : 0) - (b.statusKirim ? 1 : 0)) * mul;
  }

  if (key === "plu" || key === "keterangan") {
    return (
      String(a[key] || "").localeCompare(String(b[key] || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * mul
    );
  }

  return 0;
};

const getDefaultSortDirection = (key) => {
  if (key === "plu" || key === "keterangan") return "asc";
  return "desc";
};

const formatDisplayDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = parseISO(raw.length <= 10 ? raw : raw.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "dd/MM/yyyy");
  return raw;
};

const formatDisplayDateLong = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const parsed = parseISO(raw.length <= 10 ? raw : raw.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "dd MMM yyyy");
  return raw;
};

const formatQty = (value) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator=","
    decimalScale={0}
    displayType="text"
    renderText={(text) => text}
  />
);

const formatCurrency = (value) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator=","
    decimalScale={0}
    displayType="text"
    renderText={(text) => text}
  />
);

const mapPromoRow = (row, index) => ({
  id: row?.ID_DT_PROMOSI || `${row?.NO_URUT || "row"}-${index}`,
  store: row?.ID_STORE || "-",
  plu: row?.PLU || "-",
  keterangan: row?.KETERANGAN || "-",
  qty: row?.QTY,
  potHrg: row?.POT_HRG,
  startDate: row?.start_date,
  endDate: row?.end_date,
  statusKirim: row?.Status_Kirim,
});

const mapBmsmRow = (row, index) => {
  const articles = Array.isArray(row?.listArticle)
    ? row.listArticle.map((item) => item?.article || item?.ARTICLE || "").filter(Boolean)
    : [];
  const rules = Array.isArray(row?.listKetentuan)
    ? row.listKetentuan.map((item) => ({
        minQty: Number(item?.min_qty) || 0,
        maxQty: Number(item?.max_qty) || 0,
        discountType: String(item?.discount_type || "").toUpperCase(),
        discountValue: Number(item?.discount_value) || 0,
        description: item?.description || "",
      }))
    : [];

  return {
    id: row?.id || row?.promo_id || `bmsm-${index}`,
    promoId: row?.promo_id || row?.id || "",
    storeId: row?.store_id || "-",
    startDate: row?.start_date,
    endDate: row?.end_date,
    startTime: row?.start_time || "",
    endTime: row?.end_time || "",
    status: row?.status || "-",
    statusColor: row?.status_color || "secondary",
    articles,
    rules,
  };
};

const resolveBmsmStatus = (status, statusColor) => {
  const raw = String(status || "").trim();
  const key = raw.toUpperCase();

  if (key === "SELESAI" || key === "TIDAK AKTIF" || key === "INACTIVE" || key === "NONAKTIF" || key === "NON AKTIF") {
    return { label: "Tidak Aktif", tone: "inactive" };
  }
  if (key === "AKTIF" || key === "ACTIVE" || key === "BERJALAN" || key === "RUNNING") {
    return { label: "Aktif", tone: "active" };
  }
  if (key === "MENUNGGU" || key === "PENDING" || key === "SCHEDULED") {
    return { label: raw || "Menunggu", tone: "pending" };
  }

  const color = String(statusColor || "").toLowerCase();
  if (color === "success") return { label: raw || "Aktif", tone: "active" };
  if (color === "warning") return { label: raw || "Menunggu", tone: "pending" };
  if (color === "danger") return { label: raw || "Tidak Aktif", tone: "inactive" };
  return { label: raw || "—", tone: "neutral" };
};

const formatDiscountLabel = (rule) => {
  if (rule.discountType === "PERCENT") return `${rule.discountValue}%`;
  return formatCurrency(rule.discountValue);
};

const formatQtyRangeLabel = (rule) => {
  const min = Number(rule.minQty) || 0;
  const max = Number(rule.maxQty) || 0;
  if (min > 0 && max > 0 && max !== min) return `Beli ${min}–${max} pcs`;
  if (min > 0) return `Beli ${min} pcs`;
  if (max > 0) return `Sampai ${max} pcs`;
  return "Qty —";
};

const sortBmsmRules = (rules) =>
  [...(rules || [])].sort((a, b) => {
    const minDiff = (Number(a.minQty) || 0) - (Number(b.minQty) || 0);
    if (minDiff !== 0) return minDiff;
    return (Number(a.maxQty) || 0) - (Number(b.maxQty) || 0);
  });

const formatCurrencyText = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("id-ID").format(num);
};

const mapBundlingRow = (row, index) => {
  const articles = Array.isArray(row?.listArticle)
    ? row.listArticle.map((item) => item?.article || item?.ARTICLE || "").filter(Boolean)
    : [];
  const colors = Array.isArray(row?.listWarna)
    ? row.listWarna.map((item) => item?.warna || item?.WARNA || "").filter(Boolean)
    : [];

  return {
    id: row?.id || row?.promo_id || `bundling-${index}`,
    promoId: row?.promo_id || row?.id || "",
    promoType: row?.promo_type || "BUNDLING",
    storeId: row?.store_id || "-",
    startDate: row?.start_date,
    endDate: row?.end_date,
    startTime: row?.start_time || "",
    endTime: row?.end_time || "",
    status: row?.status || "-",
    statusColor: row?.status_color || "secondary",
    minimumQty: Number(row?.minimum_qty) || 0,
    discountType: String(row?.discount_type || "").toUpperCase(),
    discountValue: Number(row?.discount_value) || 0,
    description: row?.description || "",
    hasColorRestriction: Boolean(row?.has_color_restriction),
    articles,
    colors,
  };
};

const formatBundlingOffer = (item) => {
  if (item.discountType === "PERCENT") {
    return { value: `${item.discountValue}%`, kind: "Diskon", unit: "PERCENT" };
  }
  return { value: `Rp${formatCurrencyText(item.discountValue)}`, kind: "Potongan", unit: "AMOUNT" };
};

const BundlingPromoCard = ({ item }) => {
  const [articleQuery, setArticleQuery] = useState("");
  const query = articleQuery.trim().toLowerCase();
  const filteredArticles = useMemo(() => {
    if (!query) return item.articles;
    return item.articles.filter((article) => String(article).toLowerCase().includes(query));
  }, [item.articles, query]);
  const statusInfo = resolveBmsmStatus(item.status, item.statusColor);
  const offer = formatBundlingOffer(item);
  const minQty = item.minimumQty > 0 ? item.minimumQty : 1;

  return (
    <article className="bundle-card">
      <header className="bundle-card__head">
        <div className="bundle-card__title-wrap">
          <span className={`bmsm-status bmsm-status--${statusInfo.tone}`}>{statusInfo.label}</span>
          <h5 className="bundle-card__title">Promo Bundling</h5>
          <p className="bundle-card__meta">
            Store <strong>{item.storeId}</strong>
            <span aria-hidden="true"> · </span>
            {formatDisplayDateLong(item.startDate)} – {formatDisplayDateLong(item.endDate)}
            {item.startTime || item.endTime ? ` · ${item.startTime || "—"}–${item.endTime || "—"}` : ""}
          </p>
        </div>
        <div className="bundle-card__offer" aria-label={`${offer.kind} ${offer.value}`}>
          <span className="bundle-card__offer-kind">{offer.kind}</span>
          <strong className="bundle-card__offer-value">{offer.value}</strong>
          <span className="bundle-card__offer-qty">Min. beli {minQty} pcs</span>
        </div>
      </header>

      <div className="bundle-card__rule">
        <div className="bundle-card__rule-main">
          <Icon name="offer" />
          <div>
            <p className="bundle-card__rule-title">
              Beli minimal <strong>{minQty} pcs</strong> dari artikel di bawah → dapat {offer.kind.toLowerCase()}{" "}
              <strong>{offer.value}</strong>
            </p>
          </div>
        </div>
        {item.hasColorRestriction && item.colors.length > 0 ? (
          <div className="bundle-card__warna-note">
            <span className="bundle-card__warna-label">Batasan warna</span>
            <div className="bundle-card__warna-list">
              {item.colors.map((warna) => (
                <span key={`${item.id}-warna-${warna}`} className="bundle-chip bundle-chip--warna">
                  {warna}
                </span>
              ))}
            </div>
            <p className="bundle-card__warna-hint">Promo hanya berlaku jika artikel berwarna salah satu kode di atas.</p>
          </div>
        ) : (
          <p className="bundle-card__warna-free">Berlaku untuk semua warna artikel di daftar.</p>
        )}
      </div>

      <div className="bundle-card__body">
        <section className="bundle-section">
          <div className="bmsm-section__head">
            <h6 className="bmsm-section__title">
              <Icon name="box" /> Artikel bundling
              <span className="bundle-section__count">
                {query ? `${filteredArticles.length}/${item.articles.length}` : item.articles.length}
              </span>
            </h6>
            {item.articles.length > 0 ? (
              <div className="bmsm-article-search form-control-wrap">
                <div className="form-icon form-icon-left">
                  <Icon name="search" />
                </div>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Cari artikel…"
                  value={articleQuery}
                  onChange={(event) => setArticleQuery(event.target.value)}
                  aria-label="Cari artikel bundling"
                />
              </div>
            ) : null}
          </div>
          <p className="bmsm-section__hint">Campur artikel apa saja dari daftar ini (min. {minQty} pcs) untuk dapat potongan.</p>
          {item.articles.length ? (
            filteredArticles.length ? (
              <div className="bmsm-articles">
                {filteredArticles.map((article) => (
                  <span key={`${item.id}-${article}`} className="bmsm-chip">
                    {article}
                  </span>
                ))}
              </div>
            ) : (
              <p className="bmsm-section__empty">Tidak ada artikel yang cocok dengan “{articleQuery.trim()}”.</p>
            )
          ) : (
            <p className="bmsm-section__empty">Tidak ada artikel</p>
          )}
        </section>
      </div>
    </article>
  );
};

const BmsmPromoCard = ({ item }) => {
  const [articleQuery, setArticleQuery] = useState("");
  const query = articleQuery.trim().toLowerCase();
  const filteredArticles = useMemo(() => {
    if (!query) return item.articles;
    return item.articles.filter((article) => String(article).toLowerCase().includes(query));
  }, [item.articles, query]);
  const statusInfo = resolveBmsmStatus(item.status, item.statusColor);
  const sortedRules = useMemo(() => sortBmsmRules(item.rules), [item.rules]);

  return (
    <article className="bmsm-card">
      <header className="bmsm-card__head">
        <div className="bmsm-card__title-wrap">
          <span className={`bmsm-status bmsm-status--${statusInfo.tone}`}>{statusInfo.label}</span>
          <h5 className="bmsm-card__title">Promo BMSM</h5>
          <p className="bmsm-card__meta">
            Store <strong>{item.storeId}</strong>
            <span aria-hidden="true"> · </span>
            {formatDisplayDateLong(item.startDate)} – {formatDisplayDateLong(item.endDate)}
            {item.startTime || item.endTime ? ` · ${item.startTime || "—"}–${item.endTime || "—"}` : ""}
          </p>
        </div>
        <div className="bmsm-card__stats">
          <div>
            <span className="bmsm-card__stat-label">Artikel</span>
            <strong>
              {query ? `${filteredArticles.length}/${item.articles.length}` : item.articles.length}
            </strong>
          </div>
          <div>
            <span className="bmsm-card__stat-label">Tier</span>
            <strong>{sortedRules.length}</strong>
          </div>
        </div>
      </header>

      <div className="bmsm-card__body">
        <section className="bmsm-section">
          <div className="bmsm-section__head">
            <h6 className="bmsm-section__title">
              <Icon name="box" /> Artikel
            </h6>
            {item.articles.length > 0 ? (
              <div className="bmsm-article-search form-control-wrap">
                <div className="form-icon form-icon-left">
                  <Icon name="search" />
                </div>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Cari artikel…"
                  value={articleQuery}
                  onChange={(event) => setArticleQuery(event.target.value)}
                  aria-label="Cari artikel"
                />
              </div>
            ) : null}
          </div>
          <p className="bmsm-section__hint">Semua artikel di bawah memakai ketentuan diskon yang sama.</p>
          {item.articles.length ? (
            filteredArticles.length ? (
              <div className="bmsm-articles">
                {filteredArticles.map((article) => (
                  <span key={`${item.id}-${article}`} className="bmsm-chip">
                    {article}
                  </span>
                ))}
              </div>
            ) : (
              <p className="bmsm-section__empty">Tidak ada artikel yang cocok dengan “{articleQuery.trim()}”.</p>
            )
          ) : (
            <p className="bmsm-section__empty">Tidak ada artikel</p>
          )}
        </section>

        <section className="bmsm-section">
          <h6 className="bmsm-section__title">
            <Icon name="offer" /> Ketentuan diskon
          </h6>
          <p className="bmsm-section__hint">Urutan dari qty terkecil → terbesar (untuk kasir).</p>
          {sortedRules.length ? (
            <ol className="bmsm-ladder">
              {sortedRules.map((rule, idx) => (
                <li key={`${item.id}-rule-${idx}`} className="bmsm-ladder__item">
                  <div className="bmsm-ladder__step" aria-hidden="true">
                    {idx + 1}
                  </div>
                  <div className="bmsm-ladder__content">
                    <div className="bmsm-ladder__row">
                      <span className="bmsm-ladder__qty">{formatQtyRangeLabel(rule)}</span>
                      <span className="bmsm-ladder__discount">
                        {rule.discountType === "PERCENT" ? "Diskon" : "Potongan"}{" "}
                        <strong>{formatDiscountLabel(rule)}</strong>
                      </span>
                    </div>
                    {rule.description ? <p className="bmsm-ladder__desc">{rule.description}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="bmsm-section__empty">Tidak ada ketentuan</p>
          )}
        </section>
      </div>
    </article>
  );
};

const PromosiPage = () => {
  const { storeId, storeName } = useStoreScope();
  const [activeTab, setActiveTab] = useState("promosi");
  const [sm, setSm] = useState(true);

  const [rows, setRows] = useState([]);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [plu, setPlu] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(25);

  const [bmsmRows, setBmsmRows] = useState([]);
  const [bmsmApplied, setBmsmApplied] = useState(false);
  const [bmsmLoading, setBmsmLoading] = useState(false);
  const [bmsmError, setBmsmError] = useState("");
  const [bmsmDate, setBmsmDate] = useState(new Date());

  const [bundlingRows, setBundlingRows] = useState([]);
  const [bundlingApplied, setBundlingApplied] = useState(false);
  const [bundlingLoading, setBundlingLoading] = useState(false);
  const [bundlingError, setBundlingError] = useState("");
  const [bundlingDate, setBundlingDate] = useState(new Date());

  const isBmsm = activeTab === "bmsm";
  const isBundling = activeTab === "bundling";
  const isCardTab = isBmsm || isBundling;
  const pageLoading = isBmsm ? bmsmLoading : isBundling ? bundlingLoading : loading;
  const cardDate = isBundling ? bundlingDate : bmsmDate;
  const setCardDate = isBundling ? setBundlingDate : setBmsmDate;

  const loadPromosi = useCallback(async () => {
    if (!storeId) return;
    const queryFrom = fromDate;
    const queryTo = toDate || fromDate;

    setLoading(true);
    setError("");
    try {
      const res = await storePromoService.list({
        store_id: storeId,
        from_date: format(queryFrom, "yyyy-MM-dd"),
        to_date: format(queryTo, "yyyy-MM-dd"),
        plu: String(plu || "").trim(),
      });

      if (!isSuccess(res)) {
        throw res;
      }

      setRows(extractRows(res));
      setApplied(true);
      setSortConfig({ key: "", direction: "asc" });
      setCurrentPage(1);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data promosi");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, fromDate, toDate, plu]);

  const loadBmsm = useCallback(async () => {
    if (!storeId) return;
    setBmsmLoading(true);
    setBmsmError("");
    try {
      const res = await storePromoService.listBmsm({
        store: storeId,
        date: format(bmsmDate || new Date(), "yyyy-MM-dd"),
      });

      if (!isSuccess(res)) {
        throw res;
      }

      setBmsmRows(extractRows(res).map(mapBmsmRow));
      setBmsmApplied(true);
    } catch (err) {
      setBmsmError(err?.responseMessage || err?.message || "Gagal memuat data BMSM");
      setBmsmRows([]);
    } finally {
      setBmsmLoading(false);
    }
  }, [storeId, bmsmDate]);

  const loadBundling = useCallback(async () => {
    if (!storeId) return;
    setBundlingLoading(true);
    setBundlingError("");
    try {
      const res = await storePromoService.listBundling({
        store: storeId,
        date: format(bundlingDate || new Date(), "yyyy-MM-dd"),
      });

      if (!isSuccess(res)) {
        throw res;
      }

      setBundlingRows(extractRows(res).map(mapBundlingRow));
      setBundlingApplied(true);
    } catch (err) {
      setBundlingError(err?.responseMessage || err?.message || "Gagal memuat data Bundling");
      setBundlingRows([]);
    } finally {
      setBundlingLoading(false);
    }
  }, [storeId, bundlingDate]);

  const loadData = useCallback(() => {
    if (isBmsm) return loadBmsm();
    if (isBundling) return loadBundling();
    return loadPromosi();
  }, [isBmsm, isBundling, loadBmsm, loadBundling, loadPromosi]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: getDefaultSortDirection(key) };
    });
    setCurrentPage(1);
  }, []);

  const tableRows = useMemo(() => {
    const mapped = rows.map(mapPromoRow);
    if (!sortConfig.key) return mapped;
    return [...mapped].sort((a, b) => comparePromoRows(a, b, sortConfig.key, sortConfig.direction));
  }, [rows, sortConfig]);

  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentItems = useMemo(() => {
    const slice = tableRows.slice(indexOfFirstItem, indexOfLastItem);
    return slice.map((row, index) => ({
      ...row,
      no: indexOfFirstItem + index + 1,
    }));
  }, [tableRows, indexOfFirstItem, indexOfLastItem]);

  const noColumnWidth = useMemo(() => {
    const digits = tableRows.length > 0 ? String(tableRows.length).length : 2;
    if (digits <= 2) return "3.25rem";
    if (digits === 3) return "3.75rem";
    if (digits === 4) return "4.25rem";
    return "4.75rem";
  }, [tableRows.length]);

  const renderHeader = (column) => {
    if (!column.sortable) {
      return <span className="sub-text">{column.label}</span>;
    }

    const isActive = sortConfig.key === column.key;
    const isEnd = column.className?.includes("text-end");
    const isCenter = column.className?.includes("text-center");

    return (
      <button
        type="button"
        className={`promosi-sort-trigger${isActive ? " is-active" : ""}${isEnd ? " is-end" : ""}${isCenter ? " is-center" : ""}`}
        onClick={() => handleSort(column.key)}
      >
        <span className="sub-text">{column.label}</span>
        <Icon name={getSortIcon(column.key, sortConfig)} />
      </button>
    );
  };

  const renderCell = (item, column) => {
    switch (column.key) {
      case "no":
        return <span>{item.no}</span>;
      case "store":
        return <span className="tb-lead">{item.store}</span>;
      case "plu":
        return <span className="tb-lead">{item.plu}</span>;
      case "keterangan":
        return <span>{item.keterangan}</span>;
      case "qty":
        return <span>{formatQty(item.qty)}</span>;
      case "potHrg":
        return <span>{formatCurrency(item.potHrg)}</span>;
      case "startDate":
        return <span>{formatDisplayDate(item.startDate)}</span>;
      case "endDate":
        return <span>{formatDisplayDate(item.endDate)}</span>;
      case "statusKirim":
        return item.statusKirim ? (
          <span className="badge badge-dim rounded-pill bg-outline-success">Sudah Kirim</span>
        ) : (
          <span className="badge badge-dim rounded-pill bg-outline-warning">Belum Kirim</span>
        );
      default:
        return null;
    }
  };

  const canExport = !isCardTab && applied && tableRows.length > 0 && !loading;

  const exportExcel = useCallback(async () => {
    if (!canExport) return;
    const fileName = `promosi-${storeId || "store"}-${format(new Date(), "yyyyMMdd")}`;
    const columns = PROMO_COLUMNS.filter((column) => column.key !== "no").map((column) => ({
      key: column.key,
      label: column.label,
      width:
        column.key === "keterangan"
          ? 34
          : column.key === "plu"
            ? 16
            : column.key === "store"
              ? 12
              : 14,
      align:
        column.key === "qty" || column.key === "potHrg"
          ? "right"
          : column.key === "statusKirim"
            ? "center"
            : "left",
      numFmt: column.key === "qty" || column.key === "potHrg" ? "#,##0" : undefined,
    }));
    const rowsForExport = tableRows.map((row) => ({
      store: row.store || "-",
      plu: row.plu || "-",
      keterangan: row.keterangan || "-",
      qty: Number(row.qty) || 0,
      potHrg: Number(row.potHrg) || 0,
      startDate: formatDisplayDate(row.startDate),
      endDate: formatDisplayDate(row.endDate),
      statusKirim: row.statusKirim ? "Sudah Kirim" : "Belum Kirim",
    }));
    await exportStyledXlsx({ fileName, sheetName: "Promosi", columns, rows: rowsForExport });
  }, [canExport, storeId, tableRows]);

  const revisionKey = isBmsm
    ? `bmsm-${bmsmLoading ? "loading" : "ready"}-${bmsmRows.length}-${bmsmError || "ok"}`
    : isBundling
      ? `bundling-${bundlingLoading ? "loading" : "ready"}-${bundlingRows.length}-${bundlingError || "ok"}`
      : `promosi-${loading ? "loading" : "ready"}-${tableRows.length}-${error || "ok"}`;

  const pageDescription = (() => {
    const storeLabel = storeName ? `${storeName} (${storeId})` : storeId || "-";
    if (isBmsm) {
      return `Promo BMSM store ${storeLabel}${bmsmApplied ? ` — total ${bmsmRows.length} promo.` : ""}`;
    }
    if (isBundling) {
      return `Promo Bundling store ${storeLabel}${bundlingApplied ? ` — total ${bundlingRows.length} promo.` : ""}`;
    }
    return `Daftar promosi item store ${storeLabel}${applied ? ` — total ${tableRows.length} promosi.` : ""}`;
  })();

  return (
    <>
      <Head title="Promosi" />
      <Content>
        <PageSmoothScroll revision={revisionKey}>
          <BlockHead size="sm">
            <BlockBetween className="page-head-stack">
              <BlockHeadContent>
                <BlockTitle tag="h3" page>
                  Promosi
                </BlockTitle>
                <BlockDes className="text-soft">
                  <p>{pageDescription}</p>
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <div className="toggle-wrap nk-block-tools-toggle">
                  <Button
                    className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                    onClick={() => setSm((prev) => !prev)}
                  >
                    <Icon name="menu-alt-r" />
                  </Button>
                  <div className="toggle-expand-content" style={{ display: sm ? "block" : "none" }}>
                    <ul className="nk-block-tools g-3">
                      {isCardTab ? (
                        <li>
                          <DatePicker
                            selected={cardDate}
                            onChange={(date) => setCardDate(date || new Date())}
                            dateFormat="dd MMM yyyy"
                            portalId="sales-datepicker-portal"
                            popperProps={{ strategy: "fixed" }}
                            customInput={<CalendarDateInput className="form-control date-picker sales-filter-date" />}
                          />
                        </li>
                      ) : (
                        <>
                          <li>
                            <div className="sales-filter-range">
                              <DatePicker
                                selected={fromDate}
                                onChange={(d) => {
                                  setFromDate(d);
                                  if (toDate && d && toDate < d) setToDate(d);
                                }}
                                selectsStart
                                startDate={fromDate}
                                endDate={toDate}
                                dateFormat="dd MMM yyyy"
                                portalId="sales-datepicker-portal"
                                popperProps={{ strategy: "fixed" }}
                                customInput={<CalendarDateInput className="form-control date-picker sales-filter-date" />}
                              />
                              <span className="sales-filter-to">s/d</span>
                              <DatePicker
                                selected={toDate}
                                onChange={setToDate}
                                selectsEnd
                                startDate={fromDate}
                                endDate={toDate}
                                minDate={fromDate}
                                dateFormat="dd MMM yyyy"
                                portalId="sales-datepicker-portal"
                                popperProps={{ strategy: "fixed" }}
                                customInput={<CalendarDateInput className="form-control date-picker sales-filter-date" />}
                              />
                            </div>
                          </li>
                          <li>
                            <div className="form-control-wrap">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="PLU (opsional)"
                                value={plu}
                                onChange={(event) => setPlu(event.target.value)}
                              />
                            </div>
                          </li>
                        </>
                      )}
                      <li>
                        <Button color="primary" onClick={loadData} disabled={pageLoading || !storeId}>
                          <Icon name="search" />
                          <span>Load</span>
                        </Button>
                      </li>
                      {!isCardTab ? (
                        <li>
                          <Button
                            color="primary"
                            outline
                            className="btn-icon"
                            onClick={exportExcel}
                            disabled={!canExport}
                            title="Export Excel"
                            aria-label="Export Excel"
                          >
                            <Icon name="download-cloud" />
                          </Button>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block className="sales-promosi-page" style={{ "--promosi-no-col-width": noColumnWidth }}>
            <div className="promosi-tabs card card-bordered">
              <ul className="promosi-tabs__nav">
                {TABS.map((tab) => (
                  <li key={tab.id} className={activeTab === tab.id ? "active" : ""}>
                    <button type="button" onClick={() => setActiveTab(tab.id)}>
                      {tab.label}
                      {tab.id === "promosi" && applied ? <span className="promosi-tabs__count">{tableRows.length}</span> : null}
                      {tab.id === "bmsm" && bmsmApplied ? <span className="promosi-tabs__count">{bmsmRows.length}</span> : null}
                      {tab.id === "bundling" && bundlingApplied ? (
                        <span className="promosi-tabs__count">{bundlingRows.length}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {isBmsm ? (
              bmsmError ? (
                <div className="text-center py-4">
                  <span className="text-danger">{bmsmError}</span>
                </div>
              ) : bmsmRows.length > 0 ? (
                <div className="bmsm-list">
                  {bmsmRows.map((item) => (
                    <BmsmPromoCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <SalesEmptyState
                  description={
                    bmsmApplied ? (
                      <>Tidak ada data BMSM untuk tanggal yang dipilih.</>
                    ) : (
                      <>
                        Pilih tanggal, lalu klik <strong>Load</strong> untuk menampilkan promo BMSM.
                      </>
                    )
                  }
                />
              )
            ) : isBundling ? (
              bundlingError ? (
                <div className="text-center py-4">
                  <span className="text-danger">{bundlingError}</span>
                </div>
              ) : bundlingRows.length > 0 ? (
                <div className="bundle-list">
                  {bundlingRows.map((item) => (
                    <BundlingPromoCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <SalesEmptyState
                  description={
                    bundlingApplied ? (
                      <>Tidak ada data Bundling untuk tanggal yang dipilih.</>
                    ) : (
                      <>
                        Pilih tanggal, lalu klik <strong>Load</strong> untuk menampilkan promo Bundling.
                      </>
                    )
                  }
                />
              )
            ) : error ? (
              <div className="text-center py-4">
                <span className="text-danger">{error}</span>
              </div>
            ) : tableRows.length > 0 ? (
              <div className="page-table-scroll">
                <DataTable className="card-stretch">
                  <DataTableBody>
                    <DataTableHead>
                      {PROMO_COLUMNS.map((column) => (
                        <DataTableRow key={column.key} size={column.size} className={column.className}>
                          {renderHeader(column)}
                        </DataTableRow>
                      ))}
                    </DataTableHead>

                    {currentItems.map((item) => (
                      <DataTableItem key={item.id}>
                        {PROMO_COLUMNS.map((column) => (
                          <DataTableRow key={column.key} size={column.size} className={column.className}>
                            {renderCell(item, column)}
                          </DataTableRow>
                        ))}
                      </DataTableItem>
                    ))}
                  </DataTableBody>

                  <div className="card-inner">
                    <PaginationComponent
                      itemPerPage={itemPerPage}
                      totalItems={tableRows.length}
                      paginate={setCurrentPage}
                      currentPage={currentPage}
                    />
                  </div>
                </DataTable>
              </div>
            ) : (
              <SalesEmptyState
                description={
                  applied ? (
                    <>Tidak ada data promosi untuk filter yang dipilih.</>
                  ) : (
                    <>
                      Atur filter, lalu klik <strong>Load</strong> untuk menampilkan laporan.
                    </>
                  )
                }
              />
            )}
          </Block>
        </PageSmoothScroll>
      </Content>
    </>
  );
};

export default PromosiPage;
