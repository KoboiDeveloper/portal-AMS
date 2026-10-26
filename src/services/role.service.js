import api from "../lib/api";
import { getActorId } from "../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

export const roleService = {
  list: (params) => api.get("/rbac/roles", { params }),
  create: (payload) => api.post("/rbac/roles", withActor(payload, "create")),
  update: (roleCode, payload) =>
    api.put(`/rbac/roles/${encodeURIComponent(roleCode)}`, withActor(payload, "update")),
  remove: (roleCode) =>
    api.delete(`/rbac/roles/${encodeURIComponent(roleCode)}`, {
      data: withActor({}, "update"),
    }),
};
