import api from "../lib/api";

export const storePromoService = {
  list: (params) => api.get("/store/item/promo", { params }),
  listBmsm: (params) => api.get("/store/item/promo/bmsm", { params }),
  listBundling: (params) => api.get("/store/item/promo/bundling", { params }),
};
