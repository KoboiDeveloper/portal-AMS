import React from "react";
import {
  createMarcommService,
  marcommAppVoucherService,
  marcommLookupOptions,
  marcommMasterSpecialHolidayService,
  marcommMasterTierService,
  marcommPromoService,
  marcommVoucherGeneratedService,
} from "../../../services/marcomm/marcomm.service";
import { appPath } from "../../../lib/paths";
import { isDropboxStoragePath } from "../../../lib/imageStorage";
import { extractRows } from "../../../lib/response";
import MarcommFaqContactPanel from "./MarcommFaqContactPanel";

const col = (key, label, size = "md", extra = {}) => ({ key, label, size, ...extra });
const fd = (name, label, type = "text", extra = {}) => ({ name, label, type, ...extra });
const f = (name, label, type = "text", extra = {}) => ({ name, label, type, ...extra });
const badgeColumn = (key, label, size = "sm") => ({ key, label, size, type: "badge" });

const titleColumn = (titleKey, subtitleKey, label = "Member") => ({
  key: titleKey,
  label,
  type: "title",
  titleKey,
  subtitleKey,
});

const pad = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const firstOfMonth = () => toYmd(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const lastOfMonth = () =>
  toYmd(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
const todayYmd = () => toYmd(new Date());

const OPT_GIFT_STATUS = [
  { value: "", label: "ALL" },
  { value: "TERPAKAI", label: "TERPAKAI" },
  { value: "BELUM TERPAKAI", label: "BELUM TERPAKAI" },
  { value: "EXPIRED", label: "EXPIRED" },
];

/** reedem_rpt.aspx ddlCategoryVoucher — value harus exact match SP */
const OPT_REDEMPTION_KATEGORI = [
  { value: "All Voucher", label: "All Voucher" },
  { value: "Reguler in POS", label: "Reguler - POS" },
  { value: "Reguler", label: "Reguler" },
  { value: "Special", label: "Special" },
  { value: "Lucky Draw", label: "Lucky Draw" },
  { value: "Cashback", label: "Cashback" },
];

const dateRangeFilters = () => [
  fd("from_date", "From", "date", { defaultValue: firstOfMonth() }),
  fd("to_date", "To", "date", { defaultValue: todayYmd() }),
];

const dateRangeFilterPlain = [
  fd("from_date", "From", "date"),
  fd("to_date", "To", "date"),
];

const defaultMonthRange = { from_date: firstOfMonth(), to_date: todayYmd() };
/** ASP daterangepicker: startOf('month') … endOf('month') */
const defaultFullMonthRange = { from_date: firstOfMonth(), to_date: lastOfMonth() };

const emptyForm = (fields) =>
  fields.reduce((acc, field) => {
    if (field.type === "checkbox") acc[field.name] = false;
    else if (field.type === "hidden") acc[field.name] = "";
    else acc[field.name] = field.defaultValue ?? "";
    return acc;
  }, {});

const rowPrimaryId = (row, keys = ["id", "ID"]) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
};

/** Member / master CMS lists (optional CRUD via API) */
const cmsCfg = ({
  title,
  moduleCode,
  path,
  crud = false,
  columns,
  fields = [],
  filterDefs = [],
  hideSearch = false,
  hideStatusFilter = true,
  pageSize = 15,
  idField = "id",
  initialExtraFilters,
  requireFilters,
  description,
  addButtonLabel,
  modalSubtitle,
  modalSize,
  autoLoad = false,
}) => {
  const initialForm = emptyForm(fields);
  return {
    title,
    moduleCode,
    service: createMarcommService(path, { crud }),
    idField,
    pageSize,
    hideSearch,
    hideStatusFilter,
    filterDefs,
    extraListParams: filterDefs.map((x) => x.name),
    readOnly: !crud,
    columns,
    projectListColumns: columns,
    fields,
    initialForm,
    lookupOptionsFn: marcommLookupOptions,
    ...(initialExtraFilters ? { initialExtraFilters } : {}),
    ...(requireFilters ? { requireFilters } : {}),
    ...(description ? { description } : {}),
    ...(addButtonLabel ? { addButtonLabel } : {}),
    modalSubtitle: modalSubtitle || `Lengkapi data ${title}`,
    modalSize: modalSize || (fields.filter((x) => x.type !== "hidden").length <= 3 ? "md" : "lg"),
    ...(autoLoad ? { autoLoad: true } : {}),
    modalVariant: "sc",
    modalClassName: "hrd-form-modal--fit",
  };
};

const cfg = ({
  title,
  moduleCode,
  path,
  columns,
  filterDefs = [],
  hideSearch = true,
  pageSize = 25,
  requireFilters,
  description,
  initialExtraFilters,
  autoLoad,
  exportExcel,
  stickyHeader,
}) => ({
  title,
  moduleCode,
  idField: "id",
  pageSize,
  hideSearch,
  hideStatusFilter: true,
  columns,
  projectListColumns: columns,
  fields: [],
  filterDefs,
  extraListParams: filterDefs.map((x) => x.name),
  initialForm: {},
  readOnly: true,
  service: createMarcommService(path, { crud: false }),
  lookupOptionsFn: marcommLookupOptions,
  ...(requireFilters ? { requireFilters } : {}),
  ...(description ? { description } : {}),
  ...(initialExtraFilters ? { initialExtraFilters } : {}),
  ...(autoLoad ? { autoLoad: true } : {}),
  ...(exportExcel ? { exportExcel } : {}),
  // sticky tanpa stickyMaxHeight = scroll halaman saja (hindari dobel scroll)
  ...(stickyHeader ? { stickyHeader: true } : {}),
  modalVariant: "sc",
});

/** Legacy gift_rpt.aspx — xsp_header_gift_marcomm_rpt_getrows */
export const marcommReportGift = cfg({
  title: "Laporan Gift",
  moduleCode: "MAR_RPT_GIFT",
  path: "report/gift",
  description: "Filter kategori, status, dan kata kunci; klik Cari untuk memuat.",
  columns: [
    col("no_voucher", "Gift Code", "md"),
    titleColumn("nama", "id_member", "Member"),
    col("nominal", "Nominal", "sm", { align: "right" }),
    col("tgl_digunakan", "Tgl. Pakai", "md"),
    col("store_pengguna", "Store Pakai", "lg"),
    { key: "status", label: "Status", size: "sm", type: "badge" },
  ],
  filterDefs: [
    fd("kategori", "Kategori", "select", { lookupKey: "gift_category" }),
    fd("status", "Status", "select", { options: OPT_GIFT_STATUS }),
    fd("keywords", "Keywords", "text"),
    ...dateRangeFilters(),
  ],
});

/** Legacy reedem_rpt.aspx — XSP_APP_MEMBER_REEDEMPTION_REPORT */
export const marcommReportRedemption = cfg({
  title: "Report Redemption",
  moduleCode: "MAR_RPT_REDEEM",
  path: "report/redemption",
  description: "Filter kategori voucher & tanggal (bulan berjalan), lalu Filter / Export.",
  requireFilters: ["from_date", "to_date"],
  pageSize: 100,
  initialExtraFilters: {
    ...defaultFullMonthRange,
    kategori: "All Voucher",
  },
  columns: [
    titleColumn("nama", "id_member", "Member"),
    col("tanggal_redeem", "Tanggal", "md"),
    col("nohp", "No. HP", "md"),
    col("email", "Email", "lg"),
    col("total_point", "Point", "sm", { align: "right" }),
    col("tanggal_pakai", "Tanggal Pakai", "md"),
    col("store_pakai", "Store Pakai", "lg"),
  ],
  filterDefs: [
    fd("kategori", "Kategori", "select", {
      options: OPT_REDEMPTION_KATEGORI,
      defaultValue: "All Voucher",
    }),
    fd("from_date", "Tanggal", "date", { defaultValue: firstOfMonth() }),
    fd("to_date", "Tanggal", "date", { defaultValue: lastOfMonth() }),
  ],
  exportExcel: {
    fileName: "Member_redeemption.xlsx",
    sheetName: "Member",
    columns: [
      { key: "id_member", label: "Id Member", width: 16 },
      { key: "nama", label: "Nama", width: 28 },
      { key: "tanggal_redeem", label: "Tanggal", width: 14 },
      { key: "nohp", label: "No.Hp", width: 14 },
      { key: "email", label: "email", width: 24 },
      { key: "total_point", label: "Point", width: 12, align: "right" },
      { key: "tanggal_pakai", label: "Tanggal Pakai", width: 14 },
      { key: "store_pakai", label: "Store Pakai", width: 18 },
    ],
  },
});

/** Legacy Vbirthday.aspx — XSP_APP_MEMBER_BIRTHDAY_VOUCHER_REPORT
 * ASP hanya filter tanggal (ddl kategori di-comment); SP: p_from_date, p_to_date.
 */
export const marcommReportBirthdayVoucher = cfg({
  title: "Report Birthday Voucher",
  moduleCode: "MAR_RPT_BDAY",
  path: "report/birthday-voucher",
  description: "Filter tanggal (bulan berjalan), lalu Filter / Export.",
  requireFilters: ["from_date", "to_date"],
  pageSize: 100,
  stickyHeader: true,
  initialExtraFilters: { ...defaultFullMonthRange },
  columns: [
    titleColumn("nama", "id_member", "Member"),
    col("tanggal_redeem", "Tgl. Lahir", "md"),
    col("nohp", "No. HP", "md"),
    col("email", "Email", "lg"),
    col("nilai_voucher", "Nominal", "sm", { align: "right" }),
    col("tanggal_pakai", "Tanggal Pakai", "md"),
    col("store_pakai", "Store Pakai", "lg"),
  ],
  filterDefs: [
    fd("from_date", "Tanggal", "date", { defaultValue: firstOfMonth() }),
    fd("to_date", "Tanggal", "date", { defaultValue: lastOfMonth() }),
  ],
  exportExcel: {
    fileName: "Birthday_Voucher.xlsx",
    sheetName: "Member",
    columns: [
      { key: "id_member", label: "Id Member", width: 16 },
      { key: "nama", label: "Nama", width: 28 },
      { key: "tanggal_redeem", label: "Tgl.Lahir", width: 14 },
      { key: "nohp", label: "No.Hp", width: 14 },
      { key: "email", label: "email", width: 24 },
      { key: "nilai_voucher", label: "Nominal", width: 12, align: "right" },
      { key: "tanggal_pakai", label: "Tanggal Pakai", width: 14 },
      { key: "store_pakai", label: "Store Pakai", width: 18 },
    ],
  },
});

const voucherGeneratedRowId = (row) =>
  row?.no_urut ?? row?.NO_URUT ?? row?.id ?? row?.ID ?? "";

const fmtNum = (v, digits = 0) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return v == null || v === "" ? "-" : String(v);
  return n.toLocaleString("id-ID", { maximumFractionDigits: digits, minimumFractionDigits: digits });
};

const fmtDateCell = (v) => {
  if (v == null || v === "") return "-";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
};

/** Legacy generate_voucher_list.aspx — xsp_voucher_list_getrows */
export const marcommVoucherGenerated = {
  ...cfg({
    title: "Voucher Generated",
    moduleCode: "MAR_VCR_GENERATED",
    path: "voucher/generated",
    pageSize: 100,
    columns: [
      {
        key: "cre_date",
        label: "Tgl. Generate",
        size: "md",
        render: (row) => fmtDateCell(row?.cre_date ?? row?.CRE_DATE),
      },
      col("keterangan", "Keterangan", "lg"),
      col("tipe", "Tipe", "sm"),
      {
        key: "qty",
        label: "Qty",
        size: "sm",
        align: "right",
        render: (row) => fmtNum(row?.qty ?? row?.QTY),
      },
      {
        key: "nominal_pervoucher",
        label: "Nilai Voucher",
        size: "md",
        align: "right",
        render: (row) =>
          fmtNum(row?.nominal_pervoucher ?? row?.NOMINAL_PERVOUCHER ?? row?.nominal_per_voucher),
      },
      {
        key: "nominal",
        label: "Total Nilai",
        size: "md",
        align: "right",
        render: (row) => fmtNum(row?.nominal ?? row?.NOMINAL),
      },
      {
        key: "masa_berlaku",
        label: "Tgl. Berlaku",
        size: "md",
        render: (row) => fmtDateCell(row?.masa_berlaku ?? row?.MASA_BERLAKU),
      },
      {
        key: "sudah_digunakan",
        label: "Digunakan",
        size: "sm",
        align: "right",
        render: (row) => fmtNum(row?.sudah_digunakan ?? row?.SUDAH_DIGUNAKAN),
      },
    ],
    filterDefs: [...dateRangeFilters(), fd("keywords", "Keywords", "text")],
  }),
  idField: "no_urut",
  rowKey: (row, idx) => voucherGeneratedRowId(row) || idx,
  service: marcommVoucherGeneratedService,
  readOnly: true,
  disableUpdate: true,
  footerSumKeys: ["qty", "nominal", "sudah_digunakan"],
  initialExtraFilters: { ...defaultMonthRange },
  autoLoad: true,
  requireFilters: ["from_date", "to_date"],
  description: "Klik baris untuk melihat detail kode voucher.",
  addButtonLabel: "Tambah",
  addMenu: [
    { key: "pr", label: "Voucher Promo (PR)", to: appPath("/admin/marcomm/voucher/generated/new?vType=pr") },
    { key: "fs", label: "Voucher Fisik (FS)", to: appPath("/admin/marcomm/voucher/generated/new?vType=fs") },
  ],
  getDetailHref: (row) => {
    const id = voucherGeneratedRowId(row);
    if (!id) return null;
    const raw = String(
      row?.tipe ?? row?.TIPE ?? row?.tipe_voucher ?? row?.jenis_voucher ?? "pr"
    ).toLowerCase();
    const vType = raw.includes("fs") || raw === "fisik" || raw === "sewa" ? "fs" : "pr";
    return appPath(`/admin/marcomm/voucher/generated/${encodeURIComponent(id)}?vType=${vType}`);
  },
};

/** Legacy voucher_used.aspx — xsp_early_voucher_getrows */
export const marcommVoucherUsed = {
  ...cfg({
    title: "Voucher Used",
    moduleCode: "MAR_VCR_USED",
    path: "voucher/used",
    pageSize: 100,
    requireFilters: ["from_date", "to_date"],
    description: "Pemakaian early / POS voucher per store dan tanggal.",
    columns: [
      col("id_voucher", "ID Voucher", "md"),
      col("store_id", "Store ID", "md"),
      {
        key: "tanggal_input",
        label: "Tgl. Input",
        size: "md",
        render: (row) => fmtDateCell(row?.tanggal_input ?? row?.TANGGAL_INPUT),
      },
      {
        key: "description_value",
        label: "Amount",
        size: "md",
        align: "right",
        render: (row) => fmtNum(row?.description_value ?? row?.DESCRIPTION_VALUE, 2),
      },
      col("pos", "POS Tipe", "sm"),
    ],
    filterDefs: [
      ...dateRangeFilters(),
      fd("store", "Store", "select", { lookupKey: "store", defaultValue: "ALL" }),
      fd("keywords", "Keywords", "text"),
    ],
  }),
  initialExtraFilters: { ...defaultMonthRange, store: "ALL" },
};

/* ===================== MEMBER CMS ===================== */

export const marMemberTransactions = cmsCfg({
  title: "Member Transaction",
  moduleCode: "MAR_MBR_TX",
  path: "member/transactions",
  columns: [
    col("id_member", "ID Member", "sm"),
    titleColumn("nama", "email", "Member"),
    col("tanggal", "Tanggal", "md"),
    col("store", "Store", "md"),
    col("nominal", "Nominal", "sm", { align: "right" }),
    col("point", "Point", "sm", { align: "right" }),
    col("no_transaksi", "No. Transaksi", "lg"),
  ],
  filterDefs: dateRangeFilterPlain,
  initialExtraFilters: defaultMonthRange,
  requireFilters: ["from_date", "to_date"],
  description: "Transaksi member aplikasi pada rentang tanggal.",
});

const OPT_PROMO_CATEGORY = [
  { value: "DISKON", label: "DISKON" },
  { value: "INFO", label: "INFO" },
  { value: "LUCKY DRAW", label: "LUCKY DRAW" },
];

const dmyToYmd = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (!m) return raw;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

const PROMO_IMAGE_BASE = "https://web.amscorp.id:3060/imagestorage/promo/";

const promoImageUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isDropboxStoragePath(raw)) return raw.startsWith("/") ? raw : `/${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  const name = raw.replace(/^~?\/*imagestorage\/promo\//i, "").replace(/^\/+/, "");
  return `${PROMO_IMAGE_BASE}${name}`;
};

const promoImageFile = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isDropboxStoragePath(raw)) return raw.startsWith("/") ? raw : `/${raw}`;
  const marker = "/imagestorage/promo/";
  const at = raw.toLowerCase().indexOf(marker);
  if (at >= 0) {
    const name = raw.slice(at + marker.length).split(/[?#]/)[0];
    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  }
  return raw.replace(/^~?\/*imagestorage\/promo\//i, "");
};

export const marMemberPromo = {
  ...cmsCfg({
    title: "Promo",
    moduleCode: "MAR_MBR_PROMO",
    path: "promo",
    crud: true,
    pageSize: 100,
    hideSearch: false,
    columns: [
      { key: "no", label: "No", type: "index" },
      titleColumn("promo_title", "promo_location", "Title"),
      col("promo_start_date", "Start Date", ""),
      col("promo_end_date", "End Date", ""),
      {
        key: "STATUS",
        label: "STATUS",
        render: (row) => {
          const status = String(row.STATUS || row.status || "").trim();
          const on = status.toUpperCase() === "AKTIF" || row.is_active === true;
          return (
            <span
              className={`badge ${on ? "bg-success" : "bg-secondary"}`}
              style={{ color: "#fff" }}
            >
              {status || (on ? "AKTIF" : "NONAKTIF")}
            </span>
          );
        },
      },
    ],
    filterDefs: [],
    fields: [
      f("id", "ID", "hidden"),
      f("promo_title", "Promo Title", "text", { required: true, section: "Promo", col: 12 }),
      f("promo_detail", "Promo Detail", "textarea", { section: "Promo", col: 12, rows: 10 }),
      f("promo_location", "Promo Location", "text", { section: "Promo", col: 12 }),
      f("category", "Category", "select", { options: OPT_PROMO_CATEGORY, required: true, section: "Promo", col: 12 }),
      f("brand", "Brand", "select", { lookupKey: "brand_fix_all", section: "Promo", col: 12 }),
      f("image_title", "Image Title", "text", { section: "Media", col: 12 }),
      f("image_subtitle", "Image Subtitle", "textarea", { section: "Media", col: 12 }),
      f("promo_start_date", "Start Date", "date", { required: true, section: "Media", col: 6 }),
      f("promo_end_date", "End Date", "date", { required: true, section: "Media", col: 6 }),
      f("image_url", "Image URL", "text", {
        section: "Media",
        col: 12,
        preview: true,
        upload: { module: "promo", accept: "image/*" },
      }),
    ],
    addButtonLabel: "Add",
    description: "Daftar promo aplikasi member.",
    modalSubtitle: "Form promo aplikasi member (lookup_promo).",
  }),
  service: marcommPromoService,
  autoLoad: true,
  loadDetailOnEdit: true,
  editLabel: "Detail",
  searchPlaceholder: "Keywords",
  statusDefault: "AKTIF",
  statusOptions: [
    { value: "", label: "Semua Status" },
    { value: "AKTIF", label: "AKTIF" },
    { value: "NONAKTIF", label: "NONAKTIF" },
  ],
  statusToggle: true,
  modalSize: "xl",
  sectionColumns: [["Promo"], ["Media"]],
  modalClassName: "hrd-form-modal--fit",
  mapRowToForm: (row) => ({
    ...row,
    promo_start_date: dmyToYmd(row.promo_start_date || row.PROMO_START_DATE),
    promo_end_date: dmyToYmd(row.promo_end_date || row.PROMO_END_DATE),
    image_url: promoImageUrl(row.image_url || row.IMAGE_URL),
  }),
  mapFormToPayload: (payload) => ({
    ...payload,
    image_url: promoImageFile(payload.image_url),
  }),
};

const OPT_VOUCHER_CATEGORY = [
  { value: "VCR", label: "VOUCHER NORMAL" },
  { value: "VCRSPCL", label: "SPECIAL OFFER" },
  { value: "LUCKY", label: "COUPON LUCKY DRAW" },
];

const VOUCHER_IMAGE_BASE = "https://web.amscorp.id:3060/imagestorage/voucher/";

const cleanText = (value) => {
  const s = String(value ?? "").trim();
  if (!s || s.toUpperCase() === "NULL") return "";
  return s;
};

const voucherImageUrl = (value) => {
  const raw = cleanText(value);
  if (!raw) return "";
  if (isDropboxStoragePath(raw)) return raw.startsWith("/") ? raw : `/${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  const name = raw.replace(/^~?\/*imagestorage\/voucher\//i, "").replace(/^\/+/, "");
  return `${VOUCHER_IMAGE_BASE}${name}`;
};

const voucherImageFile = (value) => {
  const raw = cleanText(value);
  if (!raw) return "";
  if (isDropboxStoragePath(raw)) return raw.startsWith("/") ? raw : `/${raw}`;
  const marker = "/imagestorage/voucher/";
  const at = raw.toLowerCase().indexOf(marker);
  if (at >= 0) {
    const name = raw.slice(at + marker.length).split(/[?#]/)[0];
    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  }
  return raw.replace(/^~?\/*imagestorage\/voucher\//i, "");
};

const isNormalVoucher = (data) => cleanText(data?.category || "VCR").toUpperCase() === "VCR";

export const marMemberVoucher = {
  ...cmsCfg({
    title: "Voucher",
    moduleCode: "MAR_MBR_VOUCHER",
    path: "app-vouchers",
    crud: true,
    pageSize: 100,
    hideSearch: false,
    columns: [
      { key: "no", label: "No", type: "index" },
      col("voucherCode", "Code", ""),
      col("category", "Category", ""),
      col("nominal", "Nominal", "", { align: "right" }),
      col("pointVoucher", "Point Voucher", "", { align: "right" }),
      {
        key: "fromDate",
        label: "Show on App",
        render: (row) => {
          const from = cleanText(row.fromDate);
          const to = cleanText(row.toDate);
          return from && to ? `${from} - ${to}` : from || to;
        },
      },
      col("Normal_expired_month", "Expired", ""),
      {
        key: "STATUS",
        label: "STATUS",
        render: (row) => {
          const status = cleanText(row.STATUS || row.status);
          const on = status.toUpperCase() === "AKTIF" || row.isAktif === 1 || row.isAktif === true;
          return (
            <span
              className={`badge ${on ? "bg-success" : "bg-secondary"}`}
              style={{ color: "#fff" }}
            >
              {status || (on ? "AKTIF" : "NONAKTIF")}
            </span>
          );
        },
      },
    ],
    fields: [
      f("id", "ID", "hidden"),
      f("vouchercode", "Voucher Code", "text", { required: true, section: "Voucher", col: 12 }),
      f("category", "Category", "select", {
        options: OPT_VOUCHER_CATEGORY,
        required: true,
        defaultValue: "VCR",
        section: "Voucher",
        col: 12,
      }),
      f("nominal", "Nominal", "number", { section: "Voucher", col: 6 }),
      f("pointVoucher", "Point Voucher", "number", { section: "Voucher", col: 6 }),
      f("maxReedem", "Max Redeem", "number", { section: "Voucher", col: 12 }),
      f("voucher_title", "Voucher Title", "text", { section: "Voucher", col: 12 }),
      f("voucher_detail", "Voucher Detail", "textarea", { section: "Voucher", col: 12 }),
      f("fromDate", "Show From", "date", { required: true, section: "Masa", col: 6 }),
      f("toDate", "Show To", "date", { required: true, section: "Masa", col: 6 }),
      f("normal_expired_month", "Expired Month", "number", {
        section: "Masa",
        col: 12,
        defaultValue: "1",
        visible: (data) => isNormalVoucher(data),
      }),
      f("expired_from_Date", "Expired From", "date", {
        section: "Masa",
        col: 6,
        visible: (data) => !isNormalVoucher(data),
      }),
      f("expired_to_Date", "Expired To", "date", {
        section: "Masa",
        col: 6,
        visible: (data) => !isNormalVoucher(data),
      }),
      // Image URL + Ganti gambar disembunyikan dulu. Balik ke type "text"
      // plus preview/upload kalau gambar voucher dipakai lagi.
      f("image_url", "Image URL", "hidden"),
    ],
    addButtonLabel: "Add",
    description: "Master voucher aplikasi member.",
    modalSubtitle: "Form voucher aplikasi member (lookup_voucher).",
  }),
  service: marcommAppVoucherService,
  autoLoad: true,
  loadDetailOnEdit: true,
  editLabel: "Detail",
  searchPlaceholder: "Keywords",
  statusDefault: "AKTIF",
  statusOptions: [
    { value: "", label: "Semua Status" },
    { value: "AKTIF", label: "AKTIF" },
    { value: "NONAKTIF", label: "NONAKTIF" },
  ],
  statusToggle: true,
  modalSize: "xl",
  sectionColumns: [["Voucher"], ["Masa"]],
  modalClassName: "hrd-form-modal--fit",
  mapRowToForm: (row) => ({
    id: row.id ?? row.ID,
    vouchercode: cleanText(row.vouchercode || row.voucherCode),
    category: cleanText(row.category),
    nominal: cleanText(row.nominal),
    pointVoucher: cleanText(row.pointVoucher ?? row.point_voucher),
    fromDate: dmyToYmd(cleanText(row.fromDate ?? row.from_date)),
    toDate: dmyToYmd(cleanText(row.toDate ?? row.to_date)),
    expired_from_Date: dmyToYmd(
      cleanText(row.expired_from_Date ?? row.Special_over_Expired_from_date)
    ),
    expired_to_Date: dmyToYmd(cleanText(row.expired_to_Date ?? row.Special_over_Expired_to_date)),
    normal_expired_month: cleanText(row.normal_expired_month ?? row.Normal_expired_month).replace(
      /\s*month.*/i,
      ""
    ),
    maxReedem: cleanText(row.maxReedem ?? row.max_reedem),
    voucher_title: cleanText(row.voucher_title),
    voucher_detail: cleanText(row.voucher_detail),
    image_url: voucherImageUrl(row.image_url),
  }),
  mapFormToPayload: (payload) => ({
    ...payload,
    image_url: voucherImageFile(payload.image_url),
  }),
};

const giftMoney = (value) => {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return cleanText(value);
  return n.toLocaleString("id-ID");
};

export const marMemberRewards = {
  ...cmsCfg({
    title: "Rewards",
    moduleCode: "MAR_MBR_REWARDS",
    path: "gifts",
    idField: "no_urut",
    pageSize: 1000,
    hideSearch: false,
    columns: [
      { key: "no", label: "No", type: "index" },
      col("KETERANGAN", "Keterangan", "", { sortable: true }),
      col("qty", "Qty", "", { align: "right", sortable: true }),
      {
        key: "NOMINAL_PERVOUCHER",
        label: "Nilai Gift",
        align: "right",
        sortable: true,
        render: (row) => giftMoney(row.NOMINAL_PERVOUCHER),
      },
      {
        key: "nominal",
        label: "Total Nilai",
        align: "right",
        sortable: true,
        render: (row) => giftMoney(row.nominal),
      },
      col("masa_berlaku", "Tgl Berlaku", "", { sortable: true }),
      col("sudah_digunakan", "Digunakan", "", { align: "right", sortable: true }),
    ],
    filterDefs: dateRangeFilterPlain,
    initialExtraFilters: defaultMonthRange,
    description: "Daftar reward aplikasi member.",
  }),
  autoLoad: true,
  persistListState: true,
  stickyHeader: true,
  searchPlaceholder: "Keywords",
  addPath: "/admin/marcomm/member/rewards/new",
  addButtonLabel: "Add",
  getDetailHref: (row) =>
    `/admin/marcomm/member/rewards/${encodeURIComponent(
      rowPrimaryId(row, ["no_urut", "NO_URUT", "id", "ID"])
    )}`,
};

export const marMemberMission = {
  ...cmsCfg({
    title: "Mission",
    moduleCode: "MAR_MBR_MISSION",
    path: "missions",
    idField: "MissionID",
    pageSize: 1000,
    hideSearch: false,
    columns: [
      { key: "no", label: "No", type: "index" },
      col("KATEGORI", "Kategori", ""),
      col("JUDUL", "Judul", ""),
      col("DESKRIPSI", "Deskripsi", ""),
      col("BRAND", "Brand", ""),
      col("TGL_BERLAKU", "Tgl Berlaku", ""),
    ],
    filterDefs: dateRangeFilterPlain,
    initialExtraFilters: defaultMonthRange,
    description: "Daftar mission aplikasi member.",
  }),
  autoLoad: true,
  searchPlaceholder: "Keywords",
  addButtonLabel: "Add",
  addMenu: [
    { key: "1", label: "Mission by total amount", to: "/admin/marcomm/member/mission/new?category=1" },
    { key: "2", label: "Mission by total transaksi", to: "/admin/marcomm/member/mission/new?category=2" },
    { key: "3", label: "Mission Survey", to: "/admin/marcomm/member/mission/new?category=3" },
  ],
  getDetailHref: (row) =>
    `/admin/marcomm/member/mission/${encodeURIComponent(
      rowPrimaryId(row, ["MissionID", "id_mission", "id", "ID"])
    )}`,
};

export const marMemberNotification = {
  ...cmsCfg({
  title: "Notification",
  moduleCode: "MAR_MBR_NOTIF",
  path: "notifications",
  idField: "ID",
  columns: [
    titleColumn("TITLE", "KETERANGAN", "Title"),
    badgeColumn("STATUS", "Status"),
  ],
}),
  addPath: "/admin/marcomm/member/notification/new",
  addButtonLabel: "Tambah",
  getDetailHref: (row) =>
    `/admin/marcomm/member/notification/${encodeURIComponent(rowPrimaryId(row, ["ID", "id"]))}`,
};

/* ===================== MASTER ===================== */

const OPT_STORE_STATUS = [
  { value: "ALL", label: "All" },
  { value: "AKTIF", label: "AKTIF STORE" },
  { value: "NONAKTIF", label: "NONAKTIF STORE" },
];

const OPT_STORE_BRAND = [
  { value: "all", label: "All Brand" },
  { value: "Aeesha", label: "Aeesha" },
  { value: "Flies", label: "Flies" },
  { value: "Celcius", label: "Celcius" },
  { value: "Celcius Woman", label: "Celcius Woman" },
  { value: "Iwan Fashion", label: "Iwan Fashion" },
  { value: "Mississippi", label: "Mississippi" },
  { value: "Queensland", label: "Queensland" },
];

const jenisCategoryFields = (section = "Category") => [
  f("code", "Code", "text", { required: true, disabledOnEdit: true, col: 12, section }),
  f("description", "Description", "text", { required: true, col: 12, section }),
];

const mapJenisCategoryRow = (row) => ({
  id: row?.id ?? row?.ID ?? "",
  code: row?.code ?? row?.CODE ?? "",
  description: row?.description ?? row?.DESCRIPTION ?? row?.keterangan ?? row?.KETERANGAN ?? "",
});

export const marMasterPointRegister = {
  ...cmsCfg({
    title: "Point Register",
    moduleCode: "MAR_MST_POINT",
    path: "master/point-register",
    crud: true,
    autoLoad: true,
    pageSize: 100,
    columns: [
      col("keterangan", "Description", "lg"),
      col("point", "Bonus Point", "sm", { align: "right" }),
      col("from_date", "From Date", "md"),
      col("to_date", "To Date", "md"),
    ],
    fields: [
      f("id", "ID", "hidden", { section: "Point Register" }),
      f("keterangan", "Description", "textarea", {
        required: true,
        col: 12,
        rows: 3,
        section: "Point Register",
      }),
      f("from_date", "From Date", "date", {
        required: true,
        col: 12,
        rangeLabel: "Masa Berlaku",
        rangeCol: 12,
        section: "Point Register",
      }),
      f("to_date", "To Date", "date", { required: true, col: 12, section: "Point Register" }),
      f("point", "Point", "number", { required: true, col: 12, section: "Point Register" }),
    ],
    modalSubtitle: "Deskripsi, bonus point, dan periode berlaku",
    modalSize: "md",
  }),
  modalVariant: "sc",
  modalClassName: "hrd-form-modal--fit hrd-form-modal--cols-compact",
  modalSectionTitle: "Point Register",
  sectionColumns: [["Point Register"]],
  modalAddTitle: "Tambah Point Register",
  modalEditTitle: "Ubah Point Register",
  modalSubtitle: "Deskripsi, bonus point, dan periode berlaku",
  mapRowToForm: (row) => ({
    id: row?.id ?? row?.ID ?? "",
    keterangan: row?.keterangan ?? row?.KETERANGAN ?? row?.description ?? row?.DESCRIPTION ?? "",
    point: row?.point ?? row?.POINT ?? "",
    from_date: dmyToYmd(row?.from_date ?? row?.FROM_DATE ?? ""),
    to_date: dmyToYmd(row?.to_date ?? row?.TO_DATE ?? ""),
  }),
};

export const marMasterStoreLocation = {
  ...cmsCfg({
    title: "Store Location",
    moduleCode: "MAR_MST_STORE",
    path: "master/store-location",
    crud: true,
    autoLoad: true,
    pageSize: 100,
    hideSearch: false,
    idField: "store",
    columns: [
      col("brand", "Brand", "sm"),
      col("store", "Store", "md"),
      col("provinsi", "Provinsi", "md"),
      col("kota", "Kota", "md"),
      col("alamat", "Alamat", "xl"),
      {
        key: "status",
        label: "Status",
        size: "sm",
        render: (row) => row?.status ?? row?.STATUS ?? "-",
      },
    ],
    filterDefs: [
      fd("status", "Status Store", "select", {
        options: OPT_STORE_STATUS,
        defaultValue: "AKTIF",
      }),
      fd("brand", "Brand", "select", { options: OPT_STORE_BRAND, defaultValue: "all" }),
      fd("provinsi", "Provinsi", "text"),
      fd("kota", "Kota", "text"),
    ],
    fields: [
      f("store", "Store", "hidden", { section: "Store" }),
      f("provinsi", "Provinsi", "select", {
        required: true,
        section: "Store",
        col: 12,
        lookupKey: "member_provinsi",
      }),
      f("kota", "Kota", "select", {
        required: true,
        section: "Store",
        col: 12,
        lookupKey: "member_kota",
      }),
      f("alamat", "Alamat", "textarea", { required: true, rows: 4, section: "Store", col: 12 }),
      f("location_map", "Location Map", "textarea", {
        section: "Location Map",
        col: 12,
        rows: 4,
        placeholder: "iframe HTML embed",
        helpLink: {
          href: "https://codebeautify.org/html-encode-string",
          label: "open encode Map",
        },
      }),
      f("link_map", "Link Map", "textarea", {
        section: "Location Map",
        col: 12,
        rows: 2,
        placeholder: "input map link",
      }),
      f("map_preview", "Preview", "html_preview", {
        section: "Location Map",
        col: 12,
        source: "location_map",
        hideLabel: true,
      }),
    ],
    initialExtraFilters: { status: "AKTIF", brand: "all" },
    description: "Edit lokasi store & toggle status aktif (tanpa tambah/hapus).",
    modalSubtitle: "Update alamat, peta, dan lokasi store",
    modalSize: "xl",
  }),
  service: createMarcommService("master/store-location", { crud: true, status: true }),
  disableCreate: true,
  disableDelete: true,
  statusToggle: true,
  loadDetailOnEdit: true,
  modalVariant: "sc",
  modalClassName: "hrd-form-modal--fit",
  modalEditTitle: "Ubah Store Location",
  modalSubtitle: "Update alamat, peta, dan lokasi store",
  modalSize: "xl",
  sectionColumns: [["Store"], ["Location Map"]],
  resolveSectionTitle: (title, formData) => {
    if (title === "Store") {
      const store = String(formData?.store || "").trim();
      return store ? `STORE ${store}` : "Store";
    }
    if (title === "Location Map") return "LOCATION MAP";
    return title;
  },
  mapRowToForm: (row) => ({
    store: row?.store ?? row?.STORE ?? "",
    provinsi: row?.provinsi ?? row?.PROVINSI ?? "",
    kota: row?.kota ?? row?.KOTA ?? "",
    alamat: row?.alamat ?? row?.ALAMAT ?? "",
    location_map: row?.location_map ?? row?.LOCATION_MAP ?? "",
    link_map: row?.link_map ?? row?.LINK_MAP ?? "",
  }),
};

export const marMasterFaq = {
  ...cmsCfg({
    title: "FAQ",
    moduleCode: "MAR_MST_FAQ",
    path: "master/faq",
    crud: true,
    autoLoad: true,
    pageSize: 100,
    columns: [
      titleColumn("title", "id", "Title"),
      col("description", "Description", "lg"),
      col("category", "Category", "md"),
    ],
    filterDefs: [
      fd("category", "Category", "select", {
        lookupKey: "faq_category",
        defaultValue: "ALL",
      }),
    ],
    fields: [
      f("id", "ID", "hidden", { section: "FAQ" }),
      f("title", "Title", "text", { required: true, col: 12, section: "FAQ" }),
      f("category", "Category", "select", {
        lookupKey: "faq_category_form",
        required: true,
        col: 12,
        section: "FAQ",
      }),
      f("description", "Description", "textarea", { col: 12, rows: 12, section: "FAQ" }),
    ],
    initialExtraFilters: { category: "ALL" },
    description: "FAQ aplikasi member + update contact info di atas list.",
    modalSubtitle: "Judul, kategori, dan isi FAQ member",
    modalSize: "lg",
  }),
  modalVariant: "sc",
  modalClassName: "hrd-form-modal--fit hrd-form-modal--wide",
  modalSectionTitle: "FAQ",
  sectionColumns: [["FAQ"]],
  modalAddTitle: "Tambah FAQ",
  modalEditTitle: "Ubah FAQ",
  modalSubtitle: "Judul, kategori, dan isi FAQ member",
  modalSize: "lg",
  mapRowToForm: (row) => ({
    id: row?.id ?? row?.ID ?? "",
    title: row?.title ?? row?.TITLE ?? "",
    description: row?.description ?? row?.DESCRIPTION ?? "",
    category: row?.category ?? row?.CATEGORY ?? row?.code ?? row?.CODE ?? "",
  }),
  renderAboveList: ({ perms }) =>
    React.createElement(MarcommFaqContactPanel, {
      canUpdate: Boolean(perms?.UPDATE),
    }),
};

export const marMasterVoucherCategory = {
  ...cmsCfg({
    title: "Voucher Category",
    moduleCode: "MAR_MST_VCR_CAT",
    path: "master/voucher-category",
    crud: true,
    autoLoad: true,
    pageSize: 100,
    idField: "code",
    columns: [
      col("code", "Code", "sm"),
      {
        key: "description",
        label: "Description",
        size: "lg",
        render: (row) =>
          row?.description ?? row?.DESCRIPTION ?? row?.keterangan ?? row?.KETERANGAN ?? "-",
      },
    ],
    fields: jenisCategoryFields("Voucher Category"),
    addButtonLabel: "Add Category",
    modalSubtitle: "Kode dan deskripsi kategori voucher",
    modalSize: "md",
  }),
  modalVariant: "sc",
  modalClassName: "hrd-form-modal--fit hrd-form-modal--cols-compact",
  modalSectionTitle: "Voucher Category",
  sectionColumns: [["Voucher Category"]],
  modalAddTitle: "Add Voucher Category",
  modalEditTitle: "Ubah Voucher Category",
  modalSubtitle: "Kode dan deskripsi kategori voucher",
  modalSize: "md",
  mapRowToForm: mapJenisCategoryRow,
  onDelete: (row) =>
    createMarcommService("master/voucher-category", { crud: true }).remove(
      row?.id ?? row?.ID ?? row?.code
    ),
};

export const marMasterGiftCategory = {
  ...cmsCfg({
    title: "Gift Category",
    moduleCode: "MAR_MST_GIFT_CAT",
    path: "master/gift-category",
    crud: true,
    autoLoad: true,
    pageSize: 100,
    idField: "code",
    columns: [
      col("code", "Code", "sm"),
      {
        key: "description",
        label: "Description",
        size: "lg",
        render: (row) =>
          row?.description ?? row?.DESCRIPTION ?? row?.keterangan ?? row?.KETERANGAN ?? "-",
      },
    ],
    fields: jenisCategoryFields("Gift Category"),
    addButtonLabel: "Add Category",
    modalSubtitle: "Kode dan deskripsi kategori gift",
    modalSize: "md",
  }),
  modalVariant: "sc",
  modalClassName: "hrd-form-modal--fit hrd-form-modal--cols-compact",
  modalSectionTitle: "Gift Category",
  sectionColumns: [["Gift Category"]],
  modalAddTitle: "Add Gift Category",
  modalEditTitle: "Ubah Gift Category",
  modalSubtitle: "Kode dan deskripsi kategori gift",
  modalSize: "md",
  mapRowToForm: mapJenisCategoryRow,
  onDelete: (row) =>
    createMarcommService("master/gift-category", { crud: true }).remove(
      row?.id ?? row?.ID ?? row?.code
    ),
};

export const marMasterFaqCategory = {
  ...cmsCfg({
    title: "FAQ Category",
    moduleCode: "MAR_MST_FAQ_CAT",
    path: "master/faq-category",
    crud: true,
    autoLoad: true,
    pageSize: 100,
    idField: "code",
    columns: [col("description", "Description", "lg"), col("code", "Code", "sm")],
    fields: jenisCategoryFields("FAQ Category"),
    addButtonLabel: "Add Category",
    modalSubtitle: "Kode dan deskripsi kategori FAQ",
    modalSize: "md",
  }),
  modalVariant: "sc",
  modalClassName: "hrd-form-modal--fit hrd-form-modal--cols-compact",
  modalSectionTitle: "FAQ Category",
  sectionColumns: [["FAQ Category"]],
  modalAddTitle: "Add FAQ Category",
  modalEditTitle: "Ubah FAQ Category",
  modalSubtitle: "Kode dan deskripsi kategori FAQ",
  modalSize: "md",
  mapRowToForm: mapJenisCategoryRow,
  onDelete: (row) =>
    createMarcommService("master/faq-category", { crud: true }).remove(
      row?.id ?? row?.ID ?? row?.code
    ),
};

export const marMasterSpecialHoliday = {
  ...cmsCfg({
    title: "Special Holiday",
    moduleCode: "MAR_MST_HOLIDAY",
    path: "master/special-holiday",
    crud: true,
    autoLoad: true,
    pageSize: 100,
    columns: [
      col("date", "Tanggal", "md"),
      col("hari", "Hari", "sm"),
      col("description", "Description", "lg"),
      {
        key: "status",
        label: "Status",
        size: "sm",
        render: (row) => row?.status ?? row?.STATUS ?? "-",
      },
    ],
    filterDefs: [],
    fields: [
      f("id", "ID", "hidden", { section: "Special Holiday" }),
      f("date", "Tanggal", "date", { required: true, col: 12, section: "Special Holiday" }),
      f("name", "Description", "text", { required: true, col: 12, section: "Special Holiday" }),
    ],
    addButtonLabel: "Tambah Hari Libur",
    modalSubtitle: "Tanggal dan deskripsi hari libur khusus",
    modalSize: "md",
  }),
  service: marcommMasterSpecialHolidayService,
  statusToggle: true,
  modalVariant: "sc",
  modalClassName: "hrd-form-modal--fit hrd-form-modal--cols-compact",
  modalSectionTitle: "Special Holiday",
  sectionColumns: [["Special Holiday"]],
  modalAddTitle: "Tambah Hari Libur",
  modalEditTitle: "Ubah Hari Libur",
  modalSubtitle: "Tanggal dan deskripsi hari libur khusus",
  mapRowToForm: (row) => ({
    id: row.id ?? row.ID ?? row.NO_URUT ?? row.no_urut,
    date: dmyToYmd(row.date ?? row.DATE ?? ""),
    name: row.name ?? row.description ?? row.DESCRIPTION ?? "",
  }),
};

export const marMasterTier = {
  ...cmsCfg({
    title: "Member Tier",
    moduleCode: "MAR_MST_TIER",
    path: "master/tier",
    autoLoad: true,
    pageSize: 100,
    columns: [
      titleColumn("tier_name", "id", "Tier"),
      col("range_amount", "Total Belanja", "md"),
      {
        key: "tags",
        label: "Tags",
        size: "lg",
        render: (row) => {
          const tags = row?._tags || row?.tags || [];
          if (!Array.isArray(tags) || !tags.length) return "-";
          return tags
            .map(
              (t) =>
                t?.tags ??
                t?.TAGS ??
                t?.tag_name ??
                t?.TAG_NAME ??
                t?.name ??
                t?.NAME ??
                ""
            )
            .filter(Boolean)
            .join(", ");
        },
      },
      col("min_purchase_amount", "Min Purchase", "sm", { align: "right" }),
      col("point_persen", "Point %", "sm", { align: "right" }),
      {
        key: "status",
        label: "Status",
        size: "sm",
        render: (row) => row?.status ?? row?.STATUS ?? "-",
      },
    ],
    description: "Klik baris untuk ubah benefit di drawer kanan.",
  }),
  service: marcommMasterTierService,
  readOnly: true,
  customLoad: async () => {
    const res = await marcommMasterTierService.list();
    const rows = extractRows(res);
    await Promise.all(
      rows.map(async (row) => {
        const id = row?.id ?? row?.ID ?? row?.id_tier_header;
        if (id === undefined || id === null || id === "") {
          row._tags = [];
          return;
        }
        try {
          const tagRes = await marcommMasterTierService.listTags(id);
          row._tags = extractRows(tagRes);
        } catch {
          row._tags = [];
        }
      })
    );
    return rows;
  },
};