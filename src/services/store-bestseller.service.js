import api from "../lib/api";

export const storeBestsellerService = {
  listInstore: (params) => api.get("/store/sales/bestseller/instore", { params }),
  listAllstore: (params) => api.get("/store/sales/bestseller/allstore", { params }),
};
