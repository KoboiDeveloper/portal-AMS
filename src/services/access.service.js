import api from "../lib/api";

export const accessService = {
  check: (payload) => api.post("/rbac/access-check", payload),
  getUserMenu: (nik) => api.get(`/rbac/users/${encodeURIComponent(nik)}/menu`),
  getUserStoreScope: (nik) => api.get(`/rbac/users/${encodeURIComponent(nik)}/store-scope`),
  getEffectiveAccess: (params) => api.get("/rbac/effective-access", { params }),
};
