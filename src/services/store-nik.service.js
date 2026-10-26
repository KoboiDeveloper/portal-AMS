import api from "../lib/api";

export const storeNikService = {
  list: (params) => api.get("/store/nik", { params }),
};
