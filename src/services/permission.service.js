import api from "../lib/api";
import { getActorId } from "../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

export const permissionService = {
  list: (params) => api.get("/rbac/permissions", { params }),
  create: (payload) => api.post("/rbac/permissions", withActor(payload, "create")),
  update: (permissionCode, payload) =>
    api.put(`/rbac/permissions/${encodeURIComponent(permissionCode)}`, withActor(payload, "update")),
  remove: (permissionCode) =>
    api.delete(`/rbac/permissions/${encodeURIComponent(permissionCode)}`, {
      data: withActor({}, "update"),
    }),
};
