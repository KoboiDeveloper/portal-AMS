import api from "../lib/api";
import { getActorId } from "../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

export const rolePermissionService = {
  list: (params) => api.get("/rbac/role-permissions", { params }),
  save: (payload) => api.post("/rbac/role-permissions", withActor(payload, "create")),
  remove: (payload) => api.delete("/rbac/role-permissions", { data: withActor(payload, "update") }),
};
