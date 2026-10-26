import api from "../lib/api";

export const storeAsbcService = {
  list: (params) => api.get("/store/sales/asbc", { params }),
};
