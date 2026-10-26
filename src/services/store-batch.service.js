import api from "../lib/api";

export const storeBatchService = {
  list: (params) => api.get("/store/sales/batch", { params }),
};
