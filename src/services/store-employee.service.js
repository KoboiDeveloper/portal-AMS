import api from "../lib/api";

export const storeEmployeeService = {
  list: (params) => api.get("/store/employee", { params }),
};
