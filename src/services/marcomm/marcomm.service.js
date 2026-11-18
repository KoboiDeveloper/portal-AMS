import api from "../../lib/api";
import { getActorId } from "../../lib/auth";
import { regionalLookupOptions } from "../regional/regional.service";
import { hrdLookupOptions } from "../hrd/hrd.service";
import { extractRows } from "../../lib/response";

const withActor = (payload, mode = "create") => ({
  ...payload,
  ...(mode === "create" ? { created_by: getActorId() } : { updated_by: getActorId() }),
});

/** Factory for Marcomm API resources under /marcomm/... */
export const createMarcommService = (resourcePath, { crud = true, status = false } = {}) => {
  const base = `/marcomm/${resourcePath}`;
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
  if (status) {
    service.updateStatus = (id, ngapain) =>
      api.put(`${base}/${encodeURIComponent(id)}/status`, withActor({ status: ngapain, ngapain }, "update"));
  }
  return service;
};

/** GET /marcomm/export-data-member — sheets Member + Sales (date range). Timeout 5m like ASP. */
export const exportDataMember = (params = {}) =>
  api.get("/marcomm/export-data-member", { params, timeout: 300000 });

/** Brand / store lookups (shared with regional until marcomm-specific lookups exist).
 * brand_fix_all matches lookup_promo BindidbrandFixAll2: ALL plus brand names.
 */
export const marcommLookupOptions = async (type, opts = {}) => {
  if (type === "brand_fix_all") {
    const rows = await regionalLookupOptions("brand_all", opts);
    const rest = rows.filter((o) => String(o.value).toUpperCase() !== "ALL");
    return [{ value: "ALL", label: "ALL" }, ...rest];
  }
  if (type === "faq_category" || type === "faq_category_form") {
    const res = await api.get("/marcomm/master/faq-category", {
      params: { keywords: opts.keywords || "" },
    });
    const list = extractRows(res);
    const optsOut = list
      .map((row) => {
        const code = String(row?.code ?? row?.CODE ?? "").trim();
        const desc = String(
          row?.description ?? row?.DESCRIPTION ?? row?.keterangan ?? row?.KETERANGAN ?? code
        ).trim();
        if (!code && !desc) return null;
        return { value: code || desc, label: desc || code };
      })
      .filter(Boolean);
    if (type === "faq_category_form") return optsOut;
    return [{ value: "ALL", label: "ALL" }, ...optsOut];
  }
  /* ASP BindProvinsimember / BindKotamember: simpan Text nama, bukan ID */
  if (type === "member_provinsi" || type === "member_kota") {
    const base = await hrdLookupOptions(type === "member_provinsi" ? "provinsi" : "kota", opts);
    const seen = new Set();
    return base
      .map((o) => {
        const label = String(o?.label || o?.value || "").trim();
        if (!label || seen.has(label.toUpperCase())) return null;
        seen.add(label.toUpperCase());
        return { value: label, label };
      })
      .filter(Boolean);
  }
  return regionalLookupOptions(type, opts);
};

/** FAQ.aspx contact panel */
export const getMarcommContactInfo = () => api.get("/marcomm/master/contact-info");
export const updateMarcommContactInfo = (payload) =>
  api.put("/marcomm/master/contact-info", withActor(payload, "update"));

export const marcommReportGiftService = createMarcommService("report/gift", { crud: false });
export const marcommReportRedemptionService = createMarcommService("report/redemption", { crud: false });
export const marcommReportBirthdayVoucherService = createMarcommService("report/birthday-voucher", {
  crud: false,
});
export const marcommVoucherGeneratedService = {
  list: (params) => api.get("/marcomm/voucher/generated", { params }),
  get: (id) => api.get(`/marcomm/voucher/generated/${encodeURIComponent(id)}`),
  create: (payload) => api.post("/marcomm/voucher/generated", withActor(payload, "create")),
  listDetails: (id) =>
    api.get(`/marcomm/voucher/generated/${encodeURIComponent(id)}/details`),
};

export const marcommPromoService = createMarcommService("promo", { crud: true, status: true });
export const marcommMemberRptService = createMarcommService("member/rpt", { crud: false });
export const marcommAppVoucherService = createMarcommService("app-vouchers", { crud: true, status: true });
export const marcommMasterSpecialHolidayService = createMarcommService("master/special-holiday", {
  crud: true,
  status: true,
});

export const marcommMasterTierService = {
  list: (params) => api.get("/marcomm/master/tier", { params }),
  get: (id) => api.get(`/marcomm/master/tier/${encodeURIComponent(id)}`),
  update: (id, payload) =>
    api.put(`/marcomm/master/tier/${encodeURIComponent(id)}`, withActor(payload, "update")),
  listTags: (id) => api.get(`/marcomm/master/tier/${encodeURIComponent(id)}/tags`),
};
export const marcommVoucherReportService = createMarcommService("voucher/report", { crud: false });
export const marcommVoucherUsedService = createMarcommService("voucher/used", { crud: false });

/** GET /marcomm/dashboard/summary */
export const getMarcommDashboardSummary = (params = {}) =>
  api.get("/marcomm/dashboard/summary", { params });

/**
 * GET /marcomm/analytics/member/{section} — Analisa Member per brand.
 * section: meta | overview | trend | retention | segment | crossbrand | voucher | birthday |
 *          tier | profile | category | quality | segment-members
 * params: from_date, to_date (YYYY-MM-DD), brand, refresh; segment-members: segment, page, page_size.
 * Timeout 3 menit: tiap bagian dihitung langsung dari data transaksi.
 */
export const getMarcommMemberAnalytics = (section, params = {}) =>
  api.get(`/marcomm/analytics/member/${encodeURIComponent(section)}`, { params, timeout: 180000 });

/** membertransaction.aspx — list + badge */
export const getMarcommMemberTransactions = (params = {}) =>
  api.get("/marcomm/member/transactions", { params });

export const getMarcommMemberTransactionBadge = (params = {}) =>
  api.get("/marcomm/member/transactions/badge", { params });

/** Syarat & ketentuan — single-document master */
export const getSyaratKetentuan = () => api.get("/marcomm/master/syarat-ketentuan");

export const updateSyaratKetentuan = (payload) =>
  api.put("/marcomm/master/syarat-ketentuan", withActor(payload, "update"));

/** Mission editor */
const missionBase = "/marcomm/missions";
export const marcommMissionService = {
  ...createMarcommService("missions"),
  listMilestones: (id) => api.get(`${missionBase}/${encodeURIComponent(id)}/milestones`),
  createMilestone: (id, payload) =>
    api.post(`${missionBase}/${encodeURIComponent(id)}/milestones`, withActor(payload, "create")),
  updateMilestone: (id, mid, payload) =>
    api.put(
      `${missionBase}/${encodeURIComponent(id)}/milestones/${encodeURIComponent(mid)}`,
      withActor(payload, "update")
    ),
  deleteMilestone: (id, mid) =>
    api.delete(`${missionBase}/${encodeURIComponent(id)}/milestones/${encodeURIComponent(mid)}`, {
      data: withActor({}, "update"),
    }),
  listMembers: (id, params) =>
    api.get(`${missionBase}/${encodeURIComponent(id)}/members`, { params }),
  listMemberBarang: (id, params) =>
    api.get(`${missionBase}/${encodeURIComponent(id)}/members/barang`, { params }),
};

/** Gift (rewards) editor */
const giftBase = "/marcomm/gifts";
export const marcommGiftService = {
  ...createMarcommService("gifts"),
  listDetails: (id, idVoucher) =>
    api.get(`${giftBase}/${encodeURIComponent(id)}/details`, {
      params: idVoucher ? { id_voucher: idVoucher } : {},
    }),
  tempMembers: (payload) => api.post(`${giftBase}/temp-members`, withActor(payload, "create")),
  listCategories: () => api.get(`${giftBase}/lookups/categories`),
  listBrands: () => api.get(`${giftBase}/lookups/brands`),
  listStores: (brand) => api.get(`${giftBase}/lookups/stores`, { params: { brand } }),
};

/** Push notification editor */
const notifBase = "/marcomm/notifications";
export const marcommNotificationService = {
  ...createMarcommService("notifications"),
  listMembers: (id) => api.get(`${notifBase}/${encodeURIComponent(id)}/members`),
  memberPool: (id, params) =>
    api.get(`${notifBase}/${encodeURIComponent(id)}/member-pool`, { params }),
  addMembers: (id, payload) =>
    api.post(`${notifBase}/${encodeURIComponent(id)}/members`, withActor(payload, "create")),
  removeMember: (id, memberId, payload = {}) =>
    api.delete(`${notifBase}/${encodeURIComponent(id)}/members/${encodeURIComponent(memberId)}`, {
      data: withActor(payload, "update"),
    }),
  send: (id) => api.post(`${notifBase}/${encodeURIComponent(id)}/send`, withActor({}, "create")),
};