import api from "../lib/api";

/** Daily Sales Summary — GET /store/sales/dcr-detail (RBCA SP xsp_api_store_sales_dcr_detail_getrows) */
export const storeSalesDcrDetailService = {
  list: (params) => api.get("/store/sales/dcr-detail", { params }),
};
