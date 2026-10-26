import api from "../lib/api";
import { getActorId } from "../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

export const branchService = {
  list: (params) => api.get("/rbac/branches", { params }),
  get: (branchId) => api.get(`/rbac/branches/${encodeURIComponent(branchId)}`),
  create: (payload) => api.post("/rbac/branches", withActor(payload, "create")),
  update: (branchId, payload) =>
    api.put(`/rbac/branches/${encodeURIComponent(branchId)}`, withActor(payload, "update")),
  remove: (branchId) =>
    api.delete(`/rbac/branches/${encodeURIComponent(branchId)}`, {
      data: withActor({}, "update"),
    }),
};
