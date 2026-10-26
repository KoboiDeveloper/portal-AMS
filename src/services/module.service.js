import api from "../lib/api";
import { getActorId } from "../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

export const moduleService = {
  list: (params) => api.get("/rbac/modules", { params }),
  create: (payload) => api.post("/rbac/modules", withActor(payload, "create")),
  update: (moduleCode, payload) =>
    api.put(`/rbac/modules/${encodeURIComponent(moduleCode)}`, withActor(payload, "update")),
  remove: (moduleCode) =>
    api.delete(`/rbac/modules/${encodeURIComponent(moduleCode)}`, {
      data: withActor({}, "update"),
    }),
};
