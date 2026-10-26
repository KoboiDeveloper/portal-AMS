import { createRegionalService, regionalLookupOptions } from "../../../services/regional/regional.service";

const emptyForm = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? "";
    return acc;
  }, {});

const PREMIUM_SEARCH_ICON = { pack: "premium", name: "pencarian", size: 32 };

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
  filtersBelow = false,
  pageSize = 25,
  requireFilters,
  description,
  defaultSort,
  refreshIcon = PREMIUM_SEARCH_ICON,
}) => {
  const initialForm = emptyForm(fields);
  return {
    title,
    moduleCode,
    idField: "id",
    pageSize,
    hideSearch,
    hideStatusFilter,
    filtersBelow,
    columns,
    projectListColumns: columns,
    fields,
    filterDefs,
    extraListParams: filterDefs.map((x) => x.name),
    initialForm,
    readOnly: !crud,
    service: createRegionalService(path, { crud }),
    lookupOptionsFn: regionalLookupOptions,
    loadOnMount: false,
    refreshIcon,
    ...(requireFilters ? { requireFilters } : {}),
    ...(description ? { description } : {}),
    ...(defaultSort ? { defaultSort } : {}),
  };
};

export const regTotalSales = cfg({
  title: "Total Sales",
  moduleCode: "REG_MOBILE_TOT_SALES",
  path: "rpt/sales/total-sales",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand_mobile",
    "options": [
      {
        "value": "all",
        "label": "ALL"
      },
      {
        "value": "discount",
        "label": "DISCOUNT"
      },
      {
        "value": "celcius",
        "label": "CELCIUS"
      },
      {
        "value": "online",
        "label": "ONLINE"
      }
    ]
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regAbsenList = cfg({
  title: "Absen List",
  moduleCode: "REG_ABSEN_LIST",
  path: "absen/list",
  crud: false,
  hideSearch: true,
  /* Premium pack: 015_Pencarian.png — plain, no colored button cover */
  refreshIcon: { pack: "premium", name: "pencarian", size: 32 },
  /* Hit API only when Brand + Store + date range are filled + Cari clicked */
  requireFilters: ["id_brand", "id_store", "from_date", "to_date"],
  description: "Isi Brand, Store, dan Date Range lalu klik Cari untuk memuat data",
  /* Legacy rpt_attendance.aspx: No | STORE | USER NIK | EMPLOYEE | DATE | TIME IN | TIME OUT */
  defaultSort: { key: "tanggal", direction: "desc" },
  columns: [
  {
    "key": "_no",
    "label": "No",
    "size": "sm",
    "type": "index"
  },
  {
    "key": "store",
    "label": "STORE",
    "size": "md",
    "sortable": true
  },
  {
    "key": "nik",
    "label": "USER NIK",
    "size": "md",
    "sortable": true
  },
  {
    "key": "employee_name",
    "label": "EMPLOYEE",
    "size": "lg",
    "sortable": true
  },
  {
    "key": "tanggal",
    "label": "DATE",
    "size": "md",
    "sortable": true
  },
  {
    "key": "jam_masuk",
    "label": "TIME IN",
    "size": "sm",
    "sortable": true
  },
  {
    "key": "jam_keluar",
    "label": "TIME OUT",
    "size": "sm",
    "sortable": true
  }
],
  filterDefs: [
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regPluScan = cfg({
  title: "Scan Plu",
  moduleCode: "REG_PLU_SCAN",
  path: "util/scan-plu",
  crud: false,
  hideSearch: true,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "plu",
    "label": "PLU",
    "type": "text"
  }
],
});

/* Slip Setoran Bank → custom page RegSlipDcrPage (table + sorting) */

export const regArList = cfg({
  title: "Ar List",
  moduleCode: "REG_MP_AR_LIST",
  path: "mp/ar-list",
  crud: true,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  },
  {
    "name": "marketplace",
    "label": "Marketplace",
    "type": "text"
  },
  {
    "name": "tipe",
    "label": "Date Type",
    "type": "text"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  },
  {
    "name": "invoice",
    "label": "Invoice",
    "type": "text"
  },
  {
    "name": "confirm_status",
    "label": "Confirm Status",
    "type": "text"
  }
],
});

export const regArRealisasi = cfg({
  title: "Ar Realisasi",
  moduleCode: "REG_MP_AR_REALISASI",
  path: "mp/ar-realisasi",
  crud: true,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "status",
    "label": "Status",
    "type": "text"
  },
  {
    "name": "marketplace",
    "label": "Marketplace",
    "type": "text"
  },
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "invoice",
    "label": "Invoice",
    "type": "text"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regMpRetur = cfg({
  title: "Retur",
  moduleCode: "REG_MP_RETUR",
  path: "mp/retur",
  crud: true,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "marketplace",
    "label": "Marketplace",
    "type": "text"
  },
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  },
  {
    "name": "keywords",
    "label": "Search",
    "type": "text"
  }
],
});

export const regRptDailySales = cfg({
  title: "Daily Sales Summary",
  moduleCode: "REG_RPT_DAILY_SALES",
  path: "rpt/sales/daily-sales",
  crud: false,
  hideSearch: true,
  /* Legacy Daily_s_sales.aspx (REG) - page = RegDailySalesPage (custom).
     API params: plu=digit(FULL|3|1) tipe=mode(1|2|3) confirm_status=hide_date(0|1) is_active=online(0|1) */
  columns: [
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
  filterDefs: [
    { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
    {
      name: "id_store",
      label: "Store",
      type: "select",
      lookupKey: "store",
      extraOptions: [{ value: "GROUP_BRAND", label: "GROUP BRAND" }],
    },
    {
      name: "plu",
      label: "PLU Digit",
      type: "select",
      options: [
        { value: "FULL", label: "PLU" },
        { value: "3", label: "CLASS" },
        { value: "1", label: "DEPT" },
      ],
    },
    {
      name: "tipe",
      label: "Mode",
      type: "select",
      options: [
        { value: "1", label: "DETAIL" },
        { value: "2", label: "TOTAL" },
        { value: "3", label: "GRAND TOTAL" },
      ],
    },
    { name: "from_date", label: "From", type: "date" },
    { name: "to_date", label: "To", type: "date" },
    {
      name: "confirm_status",
      label: "Hide date",
      type: "select",
      options: [
        { value: "0", label: "No" },
        { value: "1", label: "Yes" },
      ],
    },
    {
      name: "is_active",
      label: "Online",
      type: "select",
      options: [
        { value: "0", label: "No" },
        { value: "1", label: "Yes" },
      ],
    },
  ],
});

export const regRptDcr = cfg({
  title: "Daily Collection Report",
  moduleCode: "REG_RPT_DCR",
  path: "rpt/sales/dcr",
  crud: false,
  hideSearch: true,
  /* Legacy Dcr_rpt.aspx (REG) - page = RegDcrPage (custom). Composite response:
     { batch, data:[sales], payment, cash_detail } */
  columns: [
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
  filterDefs: [
    { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
    { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
    { name: "from_date", label: "From Date", type: "date" },
    { name: "to_date", label: "To Date", type: "date" },
  ],
});

/* Legacy Seles_Detail.aspx (REG) — page = RegSalesDetailPage (custom).
   Tabs POS/ONLINE/ALL/WOMAN; @p_tipe; receipt-level XSP_RPT_SALES_HEADER_* (not item Sales_Detail). */
export const regRptSalesDetail = cfg({
  title: "Sales Detail",
  moduleCode: "REG_RPT_SALES_DETAIL",
  path: "rpt/sales/sales-detail",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "ID_STORE", label: "STORE", size: "md" },
    { key: "BILLING_CODE", label: "BILLING CODE", size: "md" },
    { key: "TANGGAL_TRANSAKSI", label: "DATE", size: "md" },
    { key: "QTY", label: "TOTAL QTY", size: "sm", align: "right" },
    { key: "GRAND_TOTAL", label: "NET SALES", size: "md", align: "right" },
  ],
  filterDefs: [
    { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
    { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
    { name: "from_date", label: "From", type: "date" },
    { name: "to_date", label: "To", type: "date" },
    { name: "tipe", label: "Tab", type: "text" },
  ],
});

/* Legacy Get_Payment_detail.aspx — page = RegPaymentDetailPage (day cards, hide zeros) */
export const regRptPaymentDetail = cfg({
  title: "Payment Detail",
  moduleCode: "REG_RPT_PAYMENT",
  path: "rpt/sales/payment-detail",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "STORE_ID", label: "STORE", size: "md" },
    { key: "TANGGAL", label: "TANGGAL", size: "md" },
    { key: "CASH", label: "CASH", size: "sm", align: "right" },
    { key: "DBCA", label: "D.BCA", size: "sm", align: "right" },
    { key: "KBCA", label: "K.BCA", size: "sm", align: "right" },
    { key: "DMANDIRI", label: "D.MANDIRI", size: "sm", align: "right" },
    { key: "KMANDIRI", label: "K.MANDIRI", size: "sm", align: "right" },
    { key: "DBNI", label: "D.BNI", size: "sm", align: "right" },
    { key: "KBNI", label: "K.BNI", size: "sm", align: "right" },
    { key: "DBRI", label: "D.BRI", size: "sm", align: "right" },
    { key: "KBRI", label: "K.BRI", size: "sm", align: "right" },
    { key: "VOUCHER", label: "VOUCHER", size: "sm", align: "right" },
    { key: "VOUCHER_ONLINE", label: "VOUCHER ONLINE", size: "sm", align: "right" },
    { key: "KOVO", label: "K.OVO", size: "sm", align: "right" },
    { key: "ATOME", label: "K.ATOME", size: "sm", align: "right" },
    { key: "KINDODANA", label: "K.INDODANA", size: "sm", align: "right" },
    { key: "D_QRIS_BCA", label: "D.QRIS BCA", size: "sm", align: "right" },
    { key: "D_QRIS_BNI", label: "D.QRIS BNI", size: "sm", align: "right" },
    { key: "D_QRIS_BRI", label: "D.QRIS BRI", size: "sm", align: "right" },
    { key: "D_QRIS_MANDIRI", label: "D.QRIS MDR", size: "sm", align: "right" },
    { key: "ONLINE", label: "ONLINE", size: "sm", align: "right" },
    { key: "COD", label: "COD", size: "sm", align: "right" },
    { key: "totalnyaLOH", label: "TOTAL", size: "md", align: "right" },
  ],
  filterDefs: [
    { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
    { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
    { name: "from_date", label: "From", type: "date" },
    { name: "to_date", label: "To", type: "date" },
  ],
});

/* Legacy Seles_ar_Detail.aspx — date range (brand/store hidden for REG) */
export const regRptArDetail = cfg({
  title: "Ar Detail",
  moduleCode: "REG_RPT_AR_DETAIL",
  path: "rpt/sales/ar-detail",
  crud: false,
  hideSearch: true,
  refreshIcon: { pack: "premium", name: "pencarian", size: 32 },
  columns: [
    { key: "ID_Store", label: "STORE", size: "md" },
    { key: "TANGGAL_TRANSAKSI", label: "TANGGAL", size: "md" },
    { key: "CASH", label: "CASH", size: "sm", align: "right" },
    { key: "CARD", label: "CARD", size: "sm", align: "right" },
    { key: "VOUCHER", label: "VOUCHER", size: "sm", align: "right" },
    { key: "OVO", label: "OVO", size: "sm", align: "right" },
    { key: "KQRIS", label: "K.QRIS", size: "sm", align: "right" },
    { key: "KATOME", label: "K.ATOME", size: "sm", align: "right" },
    { key: "SISA_VOUCHER", label: "SISA VOUCHER", size: "sm", align: "right" },
    { key: "refund", label: "REFUND", size: "sm", align: "right" },
    { key: "TOTAL", label: "TOTAL", size: "md", align: "right" },
  ],
  filterDefs: [
    { name: "from_date", label: "From", type: "date" },
    { name: "to_date", label: "To", type: "date" },
  ],
});

/* Legacy Promosi_v.aspx (REG) */
export const regRptPromosi = cfg({
  title: "Promosi",
  moduleCode: "REG_RPT_PROMOSI",
  path: "rpt/sales/promosi",
  crud: false,
  hideSearch: true,
  refreshIcon: { pack: "premium", name: "pencarian", size: 32 },
  columns: [
    { key: "ID_STORE", label: "STORE", size: "md" },
    { key: "PLU", label: "PLU", size: "md" },
    { key: "KETERANGAN", label: "KETERANGAN", size: "lg" },
    { key: "QTY", label: "QTY", size: "sm", align: "right" },
    { key: "POT_HRG", label: "POT HRG", size: "sm", align: "right" },
    { key: "START_DATE", label: "START DATE", size: "md" },
    { key: "END_DATE", label: "END DATE", size: "md" },
    { key: "STATUS_KIRIM", label: "STATUS KIRIM", size: "sm" },
  ],
  filterDefs: [
    { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
    { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
    { name: "from_date", label: "From", type: "date" },
    { name: "to_date", label: "To", type: "date" },
    { name: "plu", label: "PLU", type: "text" },
  ],
});

/* Asbc Qty -> custom RegAsbcQtyPage (legacy ASBC.aspx, REG). Page does NOT use this config's grid;
   kept as metadata only. SP output columns (xsp_ams_new_reg_rpt_asbc_qty_getrows):
   KODE_group, KODE (CLASS), DESKRIPSI, SALES_QTY_TAHUN_SEBELUMNYA, SALES_QTY_BERJALAN, GROWTH,
   PERSEN_GROWTH, KONTRIBUSI, inventory_stock, stock_day, ket
   Rows: detail per CLASS, Sub Total (KODE_group '% total'), GRAND TOTAL (KODE_group has 'totalgRANDtoT').
   Param map: from_date = anchor date (MTD 1st..date, LY same range -1y), id_brand, id_store, id_gh (kode GH). */
export const regRptAsbcQty = cfg({
  title: "Asbc Qty",
  moduleCode: "REG_RPT_ASBC_QTY",
  path: "rpt/sales/asbc-qty",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "KODE", label: "CLASS", size: "sm" },
    { key: "DESKRIPSI", label: "DESKRIPSI", size: "lg" },
    { key: "SALES_QTY_TAHUN_SEBELUMNYA", label: "SALES LY", size: "md", align: "right" },
    { key: "SALES_QTY_BERJALAN", label: "SALES MTD", size: "md", align: "right" },
    { key: "GROWTH", label: "GROWTH", size: "md", align: "right" },
    { key: "PERSEN_GROWTH", label: "% GROWTH", size: "sm", align: "right" },
    { key: "KONTRIBUSI", label: "% KONTRIBUSI", size: "sm", align: "right" },
    { key: "inventory_stock", label: "INV STOCK", size: "md", align: "right" },
    { key: "stock_day", label: "STOCK DAY", size: "sm", align: "right" },
    { key: "ket", label: "KETERANGAN", size: "sm" },
  ],
  filterDefs: [
    { name: "id_gh", label: "Group Head", type: "text" },
    { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
    { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
    { name: "from_date", label: "Date", type: "date" },
  ],
});

const salesBrandStoreDate = [
  { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
  { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
  { name: "from_date", label: "From", type: "date" },
  { name: "to_date", label: "To", type: "date" },
];

const salesStubCols = [
  { key: "id", label: "ID", size: "sm" },
  { key: "store_id", label: "Store", size: "md" },
  { key: "brand_id", label: "Brand", size: "md" },
];

export const regRptSalesArticle = cfg({
  title: "Sales By Article",
  moduleCode: "REG_RPT_SALES_ARTICLE",
  path: "rpt/sales/sales-article",
  crud: false,
  hideSearch: true,
  columns: salesStubCols,
  filterDefs: salesBrandStoreDate,
});

/* Sales By Island → custom RegSalesIslandPage (salesiland.aspx: From/To/Brand only) */
export const regRptSalesIsland = cfg({
  title: "Sales By Island",
  moduleCode: "REG_RPT_SALES_ISLAND",
  path: "rpt/sales/sales-island",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "STORE_PULAU", label: "Pulau", size: "md" },
    { key: "ID_Store", label: "Store", size: "lg" },
    { key: "TOTAL", label: "Total", size: "md", align: "right" },
  ],
  filterDefs: [
    { name: "from_date", label: "From Date", type: "date" },
    { name: "to_date", label: "To Date", type: "date" },
    { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand_all" },
  ],
});

/* Gross Margin → custom RegGrossMarginPage (gross_margin.aspx: Tanggal + Export only) */
export const regRptGrossMargin = cfg({
  title: "Gross Margin",
  moduleCode: "REG_RPT_GROSS_MARGIN",
  path: "rpt/sales/gross-margin",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "STATUS", label: "STATUS", size: "sm" },
    { key: "BRAND", label: "BRAND", size: "md" },
    { key: "QTY", label: "QTY", size: "sm", align: "right" },
    { key: "HPP", label: "HPP", size: "md", align: "right" },
    { key: "NET SALES", label: "NET SALES", size: "md", align: "right" },
    { key: "MARGIN", label: "MARGIN", size: "md", align: "right" },
    { key: "NET PERSENTASE", label: "NET %", size: "sm", align: "right" },
  ],
  filterDefs: [
    { name: "from_date", label: "From", type: "date" },
    { name: "to_date", label: "To", type: "date" },
  ],
});

export const regRptKoleksi = cfg({
  title: "Koleksi",
  moduleCode: "REG_RPT_KOLEKSI",
  path: "rpt/sales/koleksi",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "STORE", label: "Store", size: "md" },
    { key: "ARTICLE", label: "Article", size: "lg" },
    { key: "QTY", label: "Qty", size: "sm", align: "right" },
    { key: "NET_SALES", label: "Net Sales", size: "md", align: "right" },
  ],
  filterDefs: [
    { name: "kategori", label: "Koleksi", type: "text" },
    { name: "from_date", label: "From", type: "date" },
    { name: "to_date", label: "To", type: "date" },
    { name: "tipe", label: "Tipe", type: "text" },
    { name: "article", label: "Article", type: "text" },
  ],
});

export const regRptSalesManpower = cfg({
  title: "Sales By Man Power",
  moduleCode: "REG_RPT_SALES_MANPOWER",
  path: "rpt/sales/sales-manpower",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "TANGGAL_TRANSAKSI", label: "TANGGAL", size: "md" },
    { key: "USER_NIK", label: "USER_NIK", size: "md" },
    { key: "USER_NAME", label: "USER_NAME", size: "md" },
    { key: "JABATAN", label: "JABATAN", size: "md" },
    { key: "TOTAL_QTY", label: "TOTAL_QTY", size: "sm", align: "right" },
    { key: "NILAI_SALES", label: "NILAI_SALES", size: "md", align: "right" },
  ],
  filterDefs: [
    { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
    { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
    { name: "id_member", label: "NIK", type: "text" },
    { name: "from_date", label: "From", type: "date" },
    { name: "to_date", label: "To", type: "date" },
  ],
});

export const regRptTrStIn = cfg({
  title: "Tr St In",
  moduleCode: "REG_RPT_TR_ST_IN",
  path: "rpt/inv/tr-st-in",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "nomor", label: "NOMOR", size: "md" },
    { key: "NO_TR_ST_HEADER", label: "NO TR ST", size: "md" },
    { key: "Brand_OUT", label: "BRAND OUT", size: "sm" },
    { key: "ID_Store_OUT", label: "STORE OUT", size: "sm" },
    { key: "Brand_IN", label: "BRAND IN", size: "sm" },
    { key: "ID_Store_IN", label: "STORE IN", size: "sm" },
    { key: "QTY_REAL", label: "QTY", size: "sm", align: "right" },
    { key: "HPP_REAL", label: "HPP", size: "sm", align: "right" },
    { key: "PRICE_REAL", label: "PRICE", size: "sm", align: "right" },
    { key: "tgl_closed_real", label: "TGL CLOSED", size: "md" },
    { key: "Status_Real", label: "STATUS", size: "sm" },
  ],
  filterDefs: [
      { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
      { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
      { name: "from_date", label: "From", type: "date" },
      { name: "to_date", label: "To", type: "date" },
    ],
});

export const regRptOutstanding = cfg({
  title: "Outstanding Stock",
  moduleCode: "REG_RPT_OUTSTANDING",
  path: "rpt/inv/outstanding",
  crud: false,
  hideSearch: true,
  filtersBelow: true,
  columns: [
    { key: "nomor", label: "NOMOR", size: "md" },
    { key: "NO_TR_ST_HEADER", label: "NO TR ST", size: "md" },
    { key: "tgl_out", label: "TGL OUT", size: "md" },
    { key: "tgl_in", label: "TGL IN", size: "md" },
    { key: "DARI", label: "DARI", size: "lg" },
    { key: "TOss", label: "KE", size: "lg" },
    { key: "EGGING", label: "AGING", size: "sm", align: "right" },
    { key: "EGGING_WARNA", label: "WARNA", size: "sm" },
  ],
  filterDefs: [
      { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
      { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
      { name: "brand_to", label: "Brand To", type: "select", lookupKey: "brand" },
      { name: "store_to", label: "Store To", type: "select", lookupKey: "store", lookupParentField: "brand_to" },
      { name: "from_date", label: "From", type: "date" },
      { name: "to_date", label: "To", type: "date" },
    ],
});

export const regRptTrStOut = cfg({
  title: "Tr St Out",
  moduleCode: "REG_RPT_TR_ST_OUT",
  path: "rpt/inv/tr-st-out",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "nomor", label: "NOMOR", size: "md" },
    { key: "NO_TR_ST_HEADER", label: "NO TR ST", size: "md" },
    { key: "Brand_OUT", label: "BRAND OUT", size: "sm" },
    { key: "ID_Store_OUT", label: "STORE OUT", size: "sm" },
    { key: "Brand_IN", label: "BRAND IN", size: "sm" },
    { key: "ID_Store_IN", label: "STORE IN", size: "sm" },
    { key: "QTY_REAL", label: "QTY", size: "sm", align: "right" },
    { key: "HPP_REAL", label: "HPP", size: "sm", align: "right" },
    { key: "PRICE_REAL", label: "PRICE", size: "sm", align: "right" },
    { key: "tgl_out", label: "TGL OUT", size: "md" },
    { key: "Status_OUT", label: "STATUS OUT", size: "sm" },
  ],
  filterDefs: [
      { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
      { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
      { name: "from_date", label: "From", type: "date" },
      { name: "to_date", label: "To", type: "date" },
    ],
});

export const regRptStList = cfg({
  title: "St List",
  moduleCode: "REG_RPT_ST_LIST",
  path: "rpt/inv/st-list",
  crud: false,
  hideSearch: true,
  filtersBelow: true,
  columns: [
    { key: "NO_TR_ST_HEADER", label: "NO TR ST", size: "md" },
    { key: "Brand_OUT", label: "BRAND OUT", size: "sm" },
    { key: "ID_Store_OUT", label: "STORE OUT", size: "sm" },
    { key: "Brand_IN", label: "BRAND IN", size: "sm" },
    { key: "ID_Store_IN", label: "STORE IN", size: "sm" },
    { key: "QTY_REAL", label: "QTY", size: "sm", align: "right" },
    { key: "tgl_closed_real", label: "TGL", size: "md" },
  ],
  filterDefs: [
      { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
      { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
      { name: "brand_to", label: "Brand To", type: "select", lookupKey: "brand" },
      { name: "store_to", label: "Store To", type: "select", lookupKey: "store", lookupParentField: "brand_to" },
      { name: "from_date", label: "From", type: "date" },
      { name: "to_date", label: "To", type: "date" },
    ],
});

export const regRptLbppBrand = cfg({
  title: "Lbpp By Brand",
  moduleCode: "REG_RPT_LBPP_BRAND",
  path: "rpt/inv/lbpp-brand",
  crud: false,
  hideSearch: true,
  /* Custom page RegLbppBrandPage — Brand + DateRange + Export (lbppReg_Bbrand.aspx) */
  columns: [],
  filterDefs: [
      { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
      { name: "from_date", label: "From", type: "date" },
      { name: "to_date", label: "To", type: "date" },
    ],
});

export const regRptLastStock = cfg({
  title: "Last Stock",
  moduleCode: "REG_RPT_LAST_STOCK",
  path: "rpt/inv/last-stock",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "TANGGAL", label: "TANGGAL", size: "md" },
    { key: "Store_ID", label: "STORE", size: "sm" },
    { key: "PLU", label: "PLU", size: "md" },
    { key: "PRICE", label: "PRICE", size: "sm", align: "right" },
    { key: "HPP", label: "HPP", size: "sm", align: "right" },
    { key: "A", label: "A", size: "sm", align: "right" },
    { key: "ST_IN", label: "ST IN", size: "sm", align: "right" },
    { key: "ST_OUT", label: "ST OUT", size: "sm", align: "right" },
    { key: "SALES", label: "SALES", size: "sm", align: "right" },
    { key: "ADJ", label: "ADJ", size: "sm", align: "right" },
    { key: "Z", label: "Z", size: "sm", align: "right" },
  ],
  filterDefs: [
      { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
      { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
      { name: "status", label: "Preview", type: "select", options: [
        { value: "ALL", label: "ALL" },
        { value: "QTY", label: "Quantity" },
        { value: "HPP", label: "HPP" },
        { value: "PRICE", label: "PRICE" },
      ] },
      { name: "from_date", label: "Date", type: "date" },
      { name: "article", label: "Article", type: "text" },
    ],
  requireFilters: ["id_store","from_date"],
});

/** Custom page: RegLastStockAllPage — stockALlS.aspx parity */

/** Custom page: RegDailyStockPage — Daily_s_stock2.aspx parity */

/** Custom page: RegCekMutasiPage — Chk_Mutasi.aspx parity */

export const regRptMutasiHarian = cfg({
  title: "Mutasi Harian",
  moduleCode: "REG_RPT_MUTASI_HARIAN",
  path: "rpt/inv/mutasi-harian",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "Store_ID", label: "STORE", size: "sm" },
    { key: "TANGGAL", label: "TANGGAL", size: "md" },
    { key: "A", label: "A", size: "sm", align: "right" },
    { key: "ST_IN", label: "ST IN", size: "sm", align: "right" },
    { key: "TRADE_IN", label: "TRADE IN", size: "sm", align: "right" },
    { key: "ST_OUT", label: "ST OUT", size: "sm", align: "right" },
    { key: "TRADE_OUT", label: "TRADE OUT", size: "sm", align: "right" },
    { key: "SALES", label: "SALES", size: "sm", align: "right" },
    { key: "ADJ", label: "ADJ", size: "sm", align: "right" },
    { key: "Z", label: "Z", size: "sm", align: "right" },
    { key: "AA", label: "AA", size: "sm", align: "right" },
    { key: "SELISIH", label: "SELISIH", size: "sm", align: "right" },
  ],
  filterDefs: [
      { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
      { name: "from_date", label: "From", type: "date" },
      { name: "to_date", label: "To", type: "date" },
    ],
  requireFilters: ["id_store", "from_date", "to_date"],
});

export const regRptCekQty0 = cfg({
  title: "Cek Qty 0",
  moduleCode: "REG_RPT_CEK_QTY0",
  path: "rpt/inv/cek-qty0",
  crud: false,
  hideSearch: true,
  columns: [
    { key: "BILLING_CODE", label: "BILLING", size: "md" },
    { key: "ID_Store", label: "STORE", size: "sm" },
    { key: "Store_Brand_ID", label: "BRAND", size: "sm" },
    { key: "TANGGAL_TRANSAKSI", label: "TANGGAL", size: "md" },
    { key: "QTY", label: "QTY", size: "sm", align: "right" },
    { key: "Sub_Total", label: "SUB TOTAL", size: "sm", align: "right" },
    { key: "GRAND_TOTAL", label: "GRAND TOTAL", size: "sm", align: "right" },
    { key: "bon_manual", label: "TIPE", size: "sm" },
    { key: "ID_User", label: "USER", size: "sm" },
  ],
  filterDefs: [
      { name: "id_brand", label: "Brand", type: "select", lookupKey: "brand" },
      { name: "id_store", label: "Store", type: "select", lookupKey: "store" },
      { name: "from_date", label: "From", type: "date" },
      { name: "to_date", label: "To", type: "date" },
    ],
});

export const regRptTrSo = cfg({
  title: "Tr So",
  moduleCode: "REG_RPT_TR_SO",
  path: "rpt/so/tr-so",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regRptSoDiff = cfg({
  title: "So Different",
  moduleCode: "REG_RPT_SO_DIFF",
  path: "rpt/so/so-diff",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regRptSoAdj = cfg({
  title: "So Adjustment",
  moduleCode: "REG_RPT_SO_ADJ",
  path: "rpt/so/so-adj",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regRptTrSoPartial = cfg({
  title: "Tr So Partial",
  moduleCode: "REG_RPT_TR_SO_PARTIAL",
  path: "rpt/so/tr-so-partial",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regRptSoDiffPartial = cfg({
  title: "So Different Partial",
  moduleCode: "REG_RPT_SO_DIFF_PARTIAL",
  path: "rpt/so/so-diff-partial",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regRptSoAdjPartial = cfg({
  title: "So Adjustment Partial",
  moduleCode: "REG_RPT_SO_ADJ_PARTIAL",
  path: "rpt/so/so-adj-partial",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regRptVoucherFisik = cfg({
  title: "Voucher Fisik",
  moduleCode: "REG_RPT_VOUCHER_FISIK",
  path: "rpt/voucher/fisik",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "status",
    "label": "Status",
    "type": "text"
  },
  {
    "name": "keywords",
    "label": "Search",
    "type": "text"
  }
],
});

export const regRptVoucherImlek = cfg({
  title: "Voucher Imlek",
  moduleCode: "REG_RPT_VOUCHER_IMLEK",
  path: "rpt/voucher/imlek",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "status",
    "label": "Status",
    "type": "text"
  }
],
});

export const regRptWoro1 = cfg({
  title: "Rpt1",
  moduleCode: "REG_RPT_WORO1",
  path: "rpt/woro/rpt1",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  },
  {
    "name": "keywords",
    "label": "Search",
    "type": "text"
  }
],
});

export const regRptWoro2 = cfg({
  title: "Rpt2",
  moduleCode: "REG_RPT_WORO2",
  path: "rpt/woro/rpt2",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  }
],
});

export const regRptOmniRt = cfg({
  title: "Realtime Stock",
  moduleCode: "REG_RPT_OMNI_RT",
  path: "rpt/omni/realtime-stock",
  crud: false,
  hideSearch: true,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "article",
    "label": "Article",
    "type": "text"
  }
],
});

export const regRptOmniVarian = cfg({
  title: "Varian Stock",
  moduleCode: "REG_RPT_OMNI_VARIAN",
  path: "rpt/omni/varian-stock",
  crud: false,
  hideSearch: true,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "provinsi",
    "label": "Provinsi",
    "type": "text"
  },
  {
    "name": "article",
    "label": "Article",
    "type": "text"
  }
],
});

export const regRptOmniOrder = cfg({
  title: "Order Online",
  moduleCode: "REG_RPT_OMNI_ORDER",
  path: "rpt/omni/order-online",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  },
  {
    "name": "keywords",
    "label": "Search",
    "type": "text"
  },
  {
    "name": "plu",
    "label": "PLU",
    "type": "text"
  }
],
});

export const regRptMember = cfg({
  title: "Member",
  moduleCode: "REG_RPT_MEMBER",
  path: "rpt/member/list",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  },
  {
    "name": "provinsi",
    "label": "Provinsi",
    "type": "text"
  },
  {
    "name": "kota",
    "label": "Kota",
    "type": "text"
  },
  {
    "name": "from_date",
    "label": "From",
    "type": "date"
  },
  {
    "name": "to_date",
    "label": "To",
    "type": "date"
  },
  {
    "name": "id_member",
    "label": "Member ID",
    "type": "text"
  },
  {
    "name": "keywords",
    "label": "Search",
    "type": "text"
  }
],
});

export const regRptMemberInfo = cfg({
  title: "Member Info",
  moduleCode: "REG_RPT_MEMBER_INFO",
  path: "rpt/member/info",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "keywords",
    "label": "Search",
    "type": "text"
  }
],
});

export const regScanSelisih = cfg({
  title: "Tools Scan Selisih",
  moduleCode: "REG_SCAN_SELISIH",
  path: "util/scan-selisih",
  crud: true,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "plu",
    "label": "PLU",
    "type": "text"
  },
  {
    "name": "id_store",
    "label": "Store",
    "type": "select",
    "lookupKey": "store"
  }
],
});

export const regAdjSoPartial = cfg({
  title: "Adj So Parsial",
  moduleCode: "REG_TOOLS_ADJ_SO",
  path: "util/adj-so-partial",
  crud: true,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "status",
    "label": "Status",
    "type": "text"
  }
],
});

export const regGroupHead = cfg({
  title: "Group Head",
  moduleCode: "REG_TOOLS_GH",
  path: "util/group-head",
  crud: true,
  hideSearch: false,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "keywords",
    "label": "Search",
    "type": "text"
  }
],
});

export const regStoreList = cfg({
  title: "Store List",
  moduleCode: "REG_TOOLS_STORE",
  path: "util/store-list",
  crud: false,
  hideSearch: false,
  columns: [
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "kota",
    "label": "Kota",
    "size": "md"
  },
  {
    "key": "pulau",
    "label": "Pulau",
    "size": "md"
  },
  {
    "key": "is_active",
    "label": "Active",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [
  {
    "name": "keywords",
    "label": "Search",
    "type": "text"
  },
  {
    "name": "id_brand",
    "label": "Brand",
    "type": "select",
    "lookupKey": "brand"
  }
],
});

export const regPrintOutstanding = cfg({
  title: "Outstanding Stock Print",
  moduleCode: "REG_PRINT_OUTSTANDING",
  path: "util/print-outstanding",
  crud: false,
  hideSearch: true,
  columns: [
  {
    "key": "id",
    "label": "ID",
    "size": "sm"
  },
  {
    "key": "store_id",
    "label": "Store",
    "size": "md"
  },
  {
    "key": "brand_id",
    "label": "Brand",
    "size": "md"
  },
  {
    "key": "status",
    "label": "Status",
    "size": "sm",
    "type": "badge"
  }
],
  filterDefs: [],
});

