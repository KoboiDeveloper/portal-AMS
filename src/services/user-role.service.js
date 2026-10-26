import api from "../lib/api";
import { getActorId } from "../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

export const userRoleService = {
  list: (params) => api.get("/rbac/user-roles", { params }),
  create: (payload) => api.post("/rbac/user-roles", withActor(payload, "create")),
  update: (userRoleId, payload) =>
    api.put(`/rbac/user-roles/${encodeURIComponent(userRoleId)}`, withActor(payload, "update")),
  remove: (userRoleId) =>
    api.delete(`/rbac/user-roles/${encodeURIComponent(userRoleId)}`, {
      data: withActor({}, "update"),
    }),
};
