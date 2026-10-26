import api from "../../lib/api";
import { getActorId } from "../../lib/auth";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

/** Factory for Regional API resources under /regional/... */
export const createRegionalService = (resourcePath, { crud = true } = {}) => {
  const base = `/regional/${resourcePath}`;
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

export const getRegionalDashboardSummary = (params = {}) =>
  api.get("/regional/dashboard/summary", { params });

/** SSE URL for live dashboard (EventSource — pass access_token in query). */
export const regionalDashboardStreamUrl = (params = {}) => {
  const base = `${process.env.REACT_APP_API_BASE_URL || "http://localhost:8000"}/api/v1`;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && String(v) !== "") qs.set(k, String(v));
  });
  return `${base}/regional/dashboard/stream?${qs.toString()}`;
};

/** Legacy Reg_Tot_Sales.aspx — GET /regional/mobile/total-sales */
export const getRegionalTotalSales = (params = {}) =>
  api.get("/regional/mobile/total-sales", { params });

/** Legacy Ar_List.aspx — view-only AR list endpoints (RBCA SPs) */
export const getRegMpArListByStore = (params = {}) =>
  api.get("/regional/mp/ar-list/by-store", { params });

export const getRegMpArListTotal = (params = {}) =>
  api.get("/regional/mp/ar-list/total", { params });

export const getRegMpArListDetailRealisasi = (params = {}) =>
  api.get("/regional/mp/ar-list/detail-realisasi", { params });

export const getRegMpArListPluSummary = (params = {}) =>
  api.get("/regional/mp/ar-list/plu-summary", { params });

export const getRegMpArListTransaksiDetail = (params = {}) =>
  api.get("/regional/mp/ar-list/transaksi-detail", { params });

/** Legacy cart.aspx AR detail — GET /regional/mp/ar-list/{id}/info */
export const getRegMpArListDetail = (id) =>
  api.get(`/regional/mp/ar-list/${encodeURIComponent(id)}/info`);

/** Legacy Ar_Realisasi.aspx — view-only */
export const getRegMpArRealisasiList = (params = {}) =>
  api.get("/regional/mp/ar-realisasi/list", { params });

/** Legacy MP_gudang.aspx — view-only list + badge */
export const getRegMpReturList = (params = {}) =>
  api.get("/regional/mp/retur/list", { params });

export const getRegMpReturBadge = (params = {}) =>
  api.get("/regional/mp/retur/badge", { params });

/** Legacy Rpt_Last_stock.aspx BindTglBatchAkhir — xsp_rpt_last_tanggal_batch_getrow */
export const getLastStockBatchDate = (storeId) =>
  api.get(`/regional/rpt/inv/last-stock/${encodeURIComponent(storeId)}/batch-date`);

export const regionalLookup = (type, params = {}) =>
  api.get(`/regional/lookups/${encodeURIComponent(type)}`, { params });

const lookupCache = new Map();

/** Same shape as hrdLookupOptions — used by AdminProjectListPage via config.lookupOptionsFn */
export const regionalLookupOptions = async (
  type,
  { parentId = "", keywords = "", force = false } = {}
) => {
  if (!type) return [];
  if (type === "brand_mobile") {
    return [
      { value: "all", label: "ALL" },
      { value: "discount", label: "DISCOUNT" },
      { value: "celcius", label: "CELCIUS" },
      { value: "online", label: "ONLINE" },
    ];
  }
  /* brand_all = BindidbrandAll2 — no forced ALL prefix */
  if (type === "brand_all") {
    const key = `reg::brand_all::${keywords || ""}`;
    if (!force && lookupCache.has(key)) return lookupCache.get(key);
    try {
      const res = await regionalLookup("brand_all", {
        ...(keywords ? { keywords } : {}),
      });
      const rows = Array.isArray(res?.data) ? res.data : [];
      const options = rows
        .map((r) => ({
          value: String(r.value ?? r.code ?? r.id ?? r.brand ?? ""),
          label: String(r.label ?? r.description ?? r.name ?? r.brand ?? r.value ?? ""),
        }))
        .filter((o) => o.value);
      lookupCache.set(key, options);
      return options;
    } catch {
      return [];
    }
  }
  const key = `reg::${type}::${parentId || ""}::${keywords || ""}`;
  if (!force && lookupCache.has(key)) return lookupCache.get(key);
  try {
    const res = await regionalLookup(type, {
      ...(parentId ? { parent_id: parentId } : {}),
      ...(keywords ? { keywords } : {}),
    });
    const rows = Array.isArray(res?.data) ? res.data : [];
    const options = [
      { value: "ALL", label: "ALL" },
      ...rows
        .map((r) => ({
          value: String(r.value ?? r.code ?? r.id ?? r.brand ?? r.store ?? ""),
          label: String(r.label ?? r.description ?? r.name ?? r.brand ?? r.store_desc ?? r.value ?? ""),
        }))
        .filter((o) => o.value && o.value !== "ALL"),
    ];
    lookupCache.set(key, options);
    return options;
  } catch {
    return [{ value: "ALL", label: "ALL" }];
  }
};
