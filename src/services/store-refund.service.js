import api from "../lib/api";

export const storeRefundService = {
  list: (params) => api.get("/store/sales/refund", { params }),
  detail: (params) => api.get("/store/sales/refund/detail", { params }),
};
