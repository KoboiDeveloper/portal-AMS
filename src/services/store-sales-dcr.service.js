import api from "../lib/api";

/** Daily Collection Report — GET /store/sales/dcr (RBCA SP xsp_api_store_sales_dcr_getrow) */
export const storeSalesDcrService = {
  get: (params) => api.get("/store/sales/dcr", { params }),
};
