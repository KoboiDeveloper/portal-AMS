import api from "../lib/api";

export const storeManpowerService = {
  list: (params) => api.get("/store/sales/manpower", { params }),
};
