import api from "../lib/api";
import { getActorId } from "../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

export const storeService = {
  list: (params) => api.get("/rbac/stores", { params }),
  get: (storeId) => api.get(`/rbac/stores/${encodeURIComponent(storeId)}`),
  create: (payload) => api.post("/rbac/stores", withActor(payload, "create")),
  update: (storeId, payload) =>
    api.put(`/rbac/stores/${encodeURIComponent(storeId)}`, withActor(payload, "update")),
  remove: (storeId) =>
    api.delete(`/rbac/stores/${encodeURIComponent(storeId)}`, {
      data: withActor({}, "update"),
    }),
};
