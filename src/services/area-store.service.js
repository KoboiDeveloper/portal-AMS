import api from "../lib/api";
import { getActorId } from "../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

export const areaStoreService = {
  list: (params) => api.get("/rbac/area-stores", { params }),
  create: (payload) => api.post("/rbac/area-stores", withActor(payload, "create")),
  remove: (payload) => api.delete("/rbac/area-stores", { data: withActor(payload, "update") }),
};
