import api from "../../lib/api";
import { getActorId } from "../../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

/** Factory for HRD API resources under /hrd/... */
export const createHrdService = (resourcePath, { crud = true } = {}) => {
  const base = `/hrd/${resourcePath}`;
  const service = {
    list: (params) => api.get(base, { params }),
  };
  if (crud) {
    service.get = (id) => api.get(`${base}/${encodeURIComponent(id)}`);
    service.create = (payload) => api.post(base, withActor(payload, "create"));
    service.update = (id, payload) =>
      api.put(`${base}/${encodeURIComponent(id)}`, withActor(payload, "update"));
    service.remove = (id) =>
      api.delete(`${base}/${encodeURIComponent(id)}`, { data: withActor({}, "update") });
  }
  return service;
};

/** Used by HrdProcessPage — POST /hrd/{processPath} */
export const hrdProcess = (processPath, payload = {}) =>
  api.post(`/hrd/${processPath}`, withActor(payload, "create"));

export const hrdProcessService = {
  generateAbsenStore: (payload) => hrdProcess("abs/generate-store", payload),
  generateAbsenNasional: (payload) => hrdProcess("abs/generate-nasional", payload),
  eom: (payload) => hrdProcess("par/eom", payload),
  monthlyPayroll: (payload) => hrdProcess("cab/monthly-process", payload),
};

/** HRD dashboard summary — GET /hrd/dashboard/summary */
export const getHrdDashboardSummary = (params = {}) =>
  api.get("/hrd/dashboard/summary", { params });

/** Shared HRD dropdown lookups — GET /hrd/lookups/{type}?parent_id= */
export const hrdLookup = (type, params = {}) =>
  api.get(`/hrd/lookups/${encodeURIComponent(type)}`, { params });

const lookupCache = new Map();

export const hrdLookupOptions = async (type, { parentId = "", keywords = "", force = false } = {}) => {
  if (!type) return [];
  const key = `${type}::${parentId || ""}::${keywords || ""}`;
  if (!force && lookupCache.has(key)) return lookupCache.get(key);
  try {
    const res = await hrdLookup(type, {
      ...(parentId ? { parent_id: parentId } : {}),
      ...(keywords ? { keywords } : {}),
    });
    const rows = Array.isArray(res?.data) ? res.data : [];
    const options = rows.map((r) => ({
      value: String(r.value ?? r.code ?? r.id ?? ""),
      label: String(r.label ?? r.description ?? r.name ?? r.value ?? ""),
    }));
    lookupCache.set(key, options);
    return options;
  } catch {
    return [];
  }
};
