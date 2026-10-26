import api from "../lib/api";
import { getActorId } from "../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

export const employeeService = {
  list: (params) => api.get("/rbac/employees", { params }),
  get: (nik) => api.get(`/rbac/employees/${encodeURIComponent(nik)}`),
  create: (payload) => api.post("/rbac/employees", withActor(payload, "create")),
  update: (nik, payload) =>
    api.put(`/rbac/employees/${encodeURIComponent(nik)}`, withActor(payload, "update")),
  remove: (nik) =>
    api.delete(`/rbac/employees/${encodeURIComponent(nik)}`, {
      data: withActor({}, "update"),
    }),
  resetPassword: (nik, payload) =>
    api.post(`/rbac/employees/${encodeURIComponent(nik)}/reset-password`, payload),
};
