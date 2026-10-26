/**
 * Regenerates regConfigs.js with legacy-accurate filters (wcmenu_REGIONAL parity).
 * Run: node src/pages/admin/regional/_gen_regConfigs.js
 */
const fs = require("fs");
const path = require("path");

const fd = (name, label, type = "text", extra = {}) => ({ name, label, type, ...extra });

const brandStoreDate = [
  fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
  fd("id_store", "Store", "select", { lookupKey: "store" }),
  fd("from_date", "From", "date"),
  fd("to_date", "To", "date"),
];

const brandStoreDateKw = [
  ...brandStoreDate.slice(0, 2),
  fd("keywords", "Search", "text"),
  ...brandStoreDate.slice(2),
];

const brandFromTo = [
  fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
  fd("from_date", "From", "date"),
  fd("to_date", "To", "date"),
];

const brandOnly = [fd("id_brand", "Brand", "select", { lookupKey: "brand" })];

const pages = [
  // Ops
  {
    key: "regTotalSales",
    title: "Total Sales",
    code: "REG_MOBILE_TOT_SALES",
    path: "rpt/sales/total-sales",
    filters: [
      fd("id_brand", "Brand", "select", {
        lookupKey: "brand_mobile",
        options: [
          { value: "all", label: "ALL" },
          { value: "discount", label: "DISCOUNT" },
          { value: "celcius", label: "CELCIUS" },
          { value: "online", label: "ONLINE" },
        ],
      }),
      fd("from_date", "From", "date"),
      fd("to_date", "To", "date"),
    ],
  },
  {
    key: "regAbsenList",
    title: "Absen List",
    code: "REG_ABSEN_LIST",
    path: "absen/list",
    filters: brandStoreDate,
    cols: [
      { key: "nik", label: "NIK", size: "md" },
      { key: "store_id", label: "Store", size: "md" },
      { key: "brand_id", label: "Brand", size: "md" },
      { key: "jenis", label: "Jenis", size: "sm" },
      { key: "waktu", label: "Waktu", size: "lg" },
      { key: "status", label: "Status", size: "sm", type: "badge" },
    ],
  },
  {
    key: "regPluScan",
    title: "Scan Plu",
    code: "REG_PLU_SCAN",
    path: "util/scan-plu",
    filters: [fd("plu", "PLU", "text")],
    hideSearch: true,
  },
  {
    key: "regSlipDcr",
    title: "Slip Setoran Bank",
    code: "REG_SLIP_DCR",
    path: "slip/dcr",
    filters: [
      ...brandStoreDate,
      fd("multi_store", "Multi Store", "text"),
      fd("keywords", "Search", "text"),
    ],
  },

  // Marketplace
  {
    key: "regArList",
    title: "Ar List",
    code: "REG_MP_AR_LIST",
    path: "mp/ar-list",
    crud: true,
    filters: [
      fd("id_store", "Store", "select", { lookupKey: "store" }),
      fd("marketplace", "Marketplace", "text"),
      fd("tipe", "Date Type", "text"),
      fd("from_date", "From", "date"),
      fd("to_date", "To", "date"),
      fd("invoice", "Invoice", "text"),
      fd("confirm_status", "Confirm Status", "text"),
    ],
  },
  {
    key: "regArRealisasi",
    title: "Ar Realisasi",
    code: "REG_MP_AR_REALISASI",
    path: "mp/ar-realisasi",
    crud: true,
    filters: [
      fd("status", "Status", "text"),
      fd("marketplace", "Marketplace", "text"),
      fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
      fd("invoice", "Invoice", "text"),
      fd("from_date", "From", "date"),
      fd("to_date", "To", "date"),
    ],
  },
  {
    key: "regMpRetur",
    title: "Retur",
    code: "REG_MP_RETUR",
    path: "mp/retur",
    crud: true,
    filters: [
      fd("marketplace", "Marketplace", "text"),
      fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
      fd("from_date", "From", "date"),
      fd("to_date", "To", "date"),
      fd("keywords", "Search", "text"),
    ],
  },

  // Sales — full REG2 parity
  { key: "regRptSalesArticle", title: "Sales By Article", code: "REG_RPT_SALES_ARTICLE", path: "rpt/sales/sales-article", filters: brandStoreDate },
  { key: "regRptSalesIsland", title: "Sales By Island", code: "REG_RPT_SALES_ISLAND", path: "rpt/sales/sales-island", filters: brandStoreDate },
  { key: "regRptGrossMargin", title: "Gross Margin", code: "REG_RPT_GROSS_MARGIN", path: "rpt/sales/gross-margin", filters: brandStoreDate },
  {
    key: "regRptDailySales",
    title: "Daily Sales Summary",
    code: "REG_RPT_DAILY_SALES",
    path: "rpt/sales/daily-sales",
    // Legacy Daily_s_sales.aspx (REG). Page = RegDailySalesPage (custom). Param map:
    // plu=digit(FULL|3|1) tipe=mode(1|2|3) confirm_status=hide_date is_active=online
    filters: [
      fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
      fd("id_store", "Store", "select", { lookupKey: "store", extraOptions: [{ value: "GROUP_BRAND", label: "GROUP BRAND" }] }),
      fd("plu", "PLU Digit", "select", {
        options: [
          { value: "FULL", label: "PLU" },
          { value: "3", label: "CLASS" },
          { value: "1", label: "DEPT" },
        ],
      }),
      fd("tipe", "Mode", "select", {
        options: [
          { value: "1", label: "DETAIL" },
          { value: "2", label: "TOTAL" },
          { value: "3", label: "GRAND TOTAL" },
        ],
      }),
      fd("from_date", "From", "date"),
      fd("to_date", "To", "date"),
      fd("confirm_status", "Hide date", "select", {
        options: [
          { value: "0", label: "No" },
          { value: "1", label: "Yes" },
        ],
      }),
      fd("is_active", "Online", "select", {
        options: [
          { value: "0", label: "No" },
          { value: "1", label: "Yes" },
        ],
      }),
    ],
    cols: [
      { key: "Store_ID", label: "STORE", size: "md" },
      { key: "tanggal", label: "TANGGAL", size: "md" },
      { key: "PLU", label: "PLU", size: "md" },
      { key: "PRICE", label: "PRICE", size: "md", align: "right" },
      { key: "QTY", label: "QTY", size: "sm", align: "right" },
      { key: "HPP", label: "HPP", size: "md", align: "right" },
      { key: "HPP_TOTAL", label: "HPP TOTAL", size: "md", align: "right" },
      { key: "SALES", label: "SALES", size: "md", align: "right" },
      { key: "DISCOUNT", label: "DISCOUNT", size: "md", align: "right" },
      { key: "PP", label: "PP", size: "sm", align: "right" },
      { key: "NET_SALES", label: "NET SALES", size: "md", align: "right" },
      { key: "LABA", label: "LABA", size: "md", align: "right" },
      { key: "NET_LABA", label: "NET LABA", size: "md", align: "right" },
      { key: "MARGIN", label: "MARGIN", size: "md", align: "right" },
      { key: "NET_PERSENTASE", label: "NET PERSENTASE (%)", size: "md", align: "right" },
    ],
  },
  {
    key: "regRptDcr",
    title: "Daily Collection Report",
    code: "REG_RPT_DCR",
    path: "rpt/sales/dcr",
    // Legacy Dcr_rpt.aspx (REG). Page = RegDcrPage (custom, composite response: batch/data/payment/cash_detail)
    filters: [
      fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
      fd("id_store", "Store", "select", { lookupKey: "store" }),
      fd("from_date", "From Date", "date"),
      fd("to_date", "To Date", "date"),
    ],
    cols: [
      { key: "Store_ID", label: "STORE", size: "md" },
      { key: "PLU", label: "DEPT", size: "lg" },
      { key: "QTY", label: "QTY", size: "sm", align: "right" },
      { key: "LABA", label: "LABA", size: "md", align: "right" },
      { key: "SALES", label: "GROSS SALES", size: "md", align: "right" },
      { key: "DISCOUNT", label: "DISCOUNT", size: "md", align: "right" },
      { key: "PP", label: "PRICE POINT", size: "md", align: "right" },
      { key: "NET_SALES", label: "NET SALES", size: "md", align: "right" },
      { key: "NET_LABA", label: "NET LABA", size: "md", align: "right" },
    ],
  },
  {
    key: "regRptSalesDetail",
    title: "Sales Detail",
    code: "REG_RPT_SALES_DETAIL",
    path: "rpt/sales/sales-detail",
    filters: [
      ...brandStoreDate,
      fd("multi_store", "Multi Store", "text"),
      fd("brand_filter", "Brand Filter", "text"),
    ],
  },
  {
    key: "regRptPaymentDetail",
    title: "Payment Detail",
    code: "REG_RPT_PAYMENT",
    path: "rpt/sales/payment-detail",
    filters: brandStoreDate,
  },
  { key: "regRptArDetail", title: "Ar Detail", code: "REG_RPT_AR_DETAIL", path: "rpt/sales/ar-detail", filters: brandStoreDate },
  {
    key: "regRptPromosi",
    title: "Promosi",
    code: "REG_RPT_PROMOSI",
    path: "rpt/sales/promosi",
    filters: [...brandStoreDate, fd("plu", "PLU", "text")],
  },
  {
    key: "regRptAsbcQty",
    title: "Asbc Qty",
    code: "REG_RPT_ASBC_QTY",
    path: "rpt/sales/asbc-qty",
    // Page = RegAsbcQtyPage (custom). Param map: from_date=anchor date, id_brand, id_store, id_gh
    filters: [
      fd("id_gh", "Group Head", "text"),
      fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
      fd("id_store", "Store", "select", { lookupKey: "store" }),
      fd("from_date", "Date", "date"),
    ],
  },
  { key: "regRptKoleksi", title: "Koleksi", code: "REG_RPT_KOLEKSI", path: "rpt/sales/koleksi", filters: brandStoreDate },
  { key: "regRptSalesManpower", title: "Sales By Man Power", code: "REG_RPT_SALES_MANPOWER", path: "rpt/sales/sales-manpower", filters: brandStoreDate },

  // Inventory
  { key: "regRptTrStIn", title: "Tr St In", code: "REG_RPT_TR_ST_IN", path: "rpt/inv/tr-st-in", filters: brandStoreDate },
  {
    key: "regRptOutstanding",
    title: "Outstanding Stock",
    code: "REG_RPT_OUTSTANDING",
    path: "rpt/inv/outstanding",
    filters: [
      ...brandStoreDate,
      fd("brand_to", "Brand To", "select", { lookupKey: "brand" }),
      fd("store_to", "Store To", "select", { lookupKey: "store" }),
    ],
  },
  { key: "regRptTrStOut", title: "Tr St Out", code: "REG_RPT_TR_ST_OUT", path: "rpt/inv/tr-st-out", filters: brandStoreDate },
  {
    key: "regRptStList",
    title: "St List",
    code: "REG_RPT_ST_LIST",
    path: "rpt/inv/st-list",
    filters: [
      ...brandStoreDate,
      fd("brand_to", "Brand To", "select", { lookupKey: "brand" }),
      fd("store_to", "Store To", "select", { lookupKey: "store" }),
    ],
  },
  {
    key: "regRptLbppBrand",
    title: "Lbpp By Brand",
    code: "REG_RPT_LBPP_BRAND",
    path: "rpt/inv/lbpp-brand",
    filters: brandFromTo,
  },
  {
    key: "regRptLastStock",
    title: "Last Stock",
    code: "REG_RPT_LAST_STOCK",
    path: "rpt/inv/last-stock",
    filters: [
      fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
      fd("id_store", "Store", "select", { lookupKey: "store" }),
      fd("from_date", "Date", "date"),
      fd("article", "Article", "text"),
    ],
  },
  /* regRptLastStockAll → custom RegLastStockAllPage (stockALlS.aspx) */
  /* regRptDailyStock → custom RegDailyStockPage (Daily_s_stock2.aspx) */
  /* regRptCekMutasi → custom RegCekMutasiPage (Chk_Mutasi.aspx) */

  {
    key: "regRptMutasiHarian",
    title: "Mutasi Harian",
    code: "REG_RPT_MUTASI_HARIAN",
    path: "rpt/inv/mutasi-harian",
    filters: [
      fd("id_store", "Store", "select", { lookupKey: "store" }),
      fd("from_date", "From", "date"),
      fd("to_date", "To", "date"),
    ],
  },
  { key: "regRptCekQty0", title: "Cek Qty 0", code: "REG_RPT_CEK_QTY0", path: "rpt/inv/cek-qty0", filters: brandStoreDate },

  // SO
  { key: "regRptTrSo", title: "Tr So", code: "REG_RPT_TR_SO", path: "rpt/so/tr-so", filters: brandStoreDate },
  { key: "regRptSoDiff", title: "So Different", code: "REG_RPT_SO_DIFF", path: "rpt/so/so-diff", filters: brandStoreDate },
  { key: "regRptSoAdj", title: "So Adjustment", code: "REG_RPT_SO_ADJ", path: "rpt/so/so-adj", filters: brandStoreDate },
  { key: "regRptTrSoPartial", title: "Tr So Partial", code: "REG_RPT_TR_SO_PARTIAL", path: "rpt/so/tr-so-partial", filters: brandStoreDate },
  { key: "regRptSoDiffPartial", title: "So Different Partial", code: "REG_RPT_SO_DIFF_PARTIAL", path: "rpt/so/so-diff-partial", filters: brandStoreDate },
  { key: "regRptSoAdjPartial", title: "So Adjustment Partial", code: "REG_RPT_SO_ADJ_PARTIAL", path: "rpt/so/so-adj-partial", filters: brandStoreDate },

  // Voucher / Woro / Omni / Member
  {
    key: "regRptVoucherFisik",
    title: "Voucher Fisik",
    code: "REG_RPT_VOUCHER_FISIK",
    path: "rpt/voucher/fisik",
    filters: [fd("status", "Status", "text"), fd("keywords", "Search", "text")],
  },
  {
    key: "regRptVoucherImlek",
    title: "Voucher Imlek",
    code: "REG_RPT_VOUCHER_IMLEK",
    path: "rpt/voucher/imlek",
    filters: [fd("status", "Status", "text")],
  },
  {
    key: "regRptWoro1",
    title: "Rpt1",
    code: "REG_RPT_WORO1",
    path: "rpt/woro/rpt1",
    filters: [fd("from_date", "From", "date"), fd("to_date", "To", "date"), fd("keywords", "Search", "text")],
  },
  {
    key: "regRptWoro2",
    title: "Rpt2",
    code: "REG_RPT_WORO2",
    path: "rpt/woro/rpt2",
    filters: [fd("from_date", "From", "date"), fd("to_date", "To", "date")],
  },
  {
    key: "regRptOmniRt",
    title: "Realtime Stock",
    code: "REG_RPT_OMNI_RT",
    path: "rpt/omni/realtime-stock",
    filters: [fd("article", "Article", "text")],
    hideSearch: true,
  },
  {
    key: "regRptOmniVarian",
    title: "Varian Stock",
    code: "REG_RPT_OMNI_VARIAN",
    path: "rpt/omni/varian-stock",
    filters: [fd("provinsi", "Provinsi", "text"), fd("article", "Article", "text")],
    hideSearch: true,
  },
  {
    key: "regRptOmniOrder",
    title: "Order Online",
    code: "REG_RPT_OMNI_ORDER",
    path: "rpt/omni/order-online",
    filters: [
      fd("id_store", "Store", "select", { lookupKey: "store" }),
      fd("keywords", "Search", "text"),
      fd("plu", "PLU", "text"),
    ],
  },
  {
    key: "regRptMember",
    title: "Member",
    code: "REG_RPT_MEMBER",
    path: "rpt/member/list",
    filters: [
      fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
      fd("provinsi", "Provinsi", "text"),
      fd("kota", "Kota", "text"),
      fd("from_date", "From", "date"),
      fd("to_date", "To", "date"),
      fd("id_member", "Member ID", "text"),
      fd("keywords", "Search", "text"),
    ],
  },
  {
    key: "regRptMemberInfo",
    title: "Member Info",
    code: "REG_RPT_MEMBER_INFO",
    path: "rpt/member/info",
    filters: [fd("keywords", "Search", "text")],
  },

  // Tools
  {
    key: "regScanSelisih",
    title: "Tools Scan Selisih",
    code: "REG_SCAN_SELISIH",
    path: "util/scan-selisih",
    crud: true,
    filters: [
      fd("plu", "PLU", "text"),
      fd("id_store", "Store", "select", { lookupKey: "store" }),
    ],
  },
  {
    key: "regAdjSoPartial",
    title: "Adj So Parsial",
    code: "REG_TOOLS_ADJ_SO",
    path: "util/adj-so-partial",
    crud: true,
    filters: [fd("status", "Status", "text")],
  },
  {
    key: "regGroupHead",
    title: "Group Head",
    code: "REG_TOOLS_GH",
    path: "util/group-head",
    crud: true,
    filters: [fd("keywords", "Search", "text")],
  },
  {
    key: "regStoreList",
    title: "Store List",
    code: "REG_TOOLS_STORE",
    path: "util/store-list",
    filters: [fd("keywords", "Search", "text"), fd("id_brand", "Brand", "select", { lookupKey: "brand" })],
    cols: [
      { key: "store_id", label: "Store", size: "md" },
      { key: "brand_id", label: "Brand", size: "md" },
      { key: "kota", label: "Kota", size: "md" },
      { key: "pulau", label: "Pulau", size: "md" },
      { key: "is_active", label: "Active", size: "sm", type: "badge" },
    ],
  },
  {
    key: "regPrintOutstanding",
    title: "Outstanding Stock Print",
    code: "REG_PRINT_OUTSTANDING",
    path: "util/print-outstanding",
    filters: [],
    hideSearch: true,
  },
];

const defaultCols = [
  { key: "id", label: "ID", size: "sm" },
  { key: "store_id", label: "Store", size: "md" },
  { key: "brand_id", label: "Brand", size: "md" },
  { key: "status", label: "Status", size: "sm", type: "badge" },
];

let out = `import { createRegionalService, regionalLookupOptions } from "../../../services/regional/regional.service";

const emptyForm = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? "";
    return acc;
  }, {});

const cfg = ({
  title,
  moduleCode,
  path,
  crud = false,
  columns,
  fields = [],
  filterDefs = [],
  hideSearch = false,
  hideStatusFilter = true,
  pageSize = 25,
}) => {
  const initialForm = emptyForm(fields);
  return {
    title,
    moduleCode,
    idField: "id",
    pageSize,
    hideSearch,
    hideStatusFilter,
    columns,
    projectListColumns: columns,
    fields,
    filterDefs,
    extraListParams: filterDefs.map((x) => x.name),
    initialForm,
    readOnly: !crud,
    service: createRegionalService(path, { crud }),
    lookupOptionsFn: regionalLookupOptions,
  };
};

`;

for (const p of pages) {
  const cols = p.cols || defaultCols;
  out += `export const ${p.key} = cfg({
  title: ${JSON.stringify(p.title)},
  moduleCode: ${JSON.stringify(p.code)},
  path: ${JSON.stringify(p.path)},
  crud: ${!!p.crud},
  hideSearch: ${!!p.hideSearch},
  columns: ${JSON.stringify(cols, null, 2)},
  filterDefs: ${JSON.stringify(p.filters || [], null, 2)},
});

`;
}

fs.writeFileSync(path.join(__dirname, "regConfigs.js"), out);
console.log("Wrote regConfigs.js with", pages.length, "pages");
