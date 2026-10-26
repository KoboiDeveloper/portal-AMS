import api from "../lib/api";

const multipartConfig = (onUploadProgress) => ({
  headers: { "Content-Type": "multipart/form-data" },
  onUploadProgress,
  transformRequest: [
    (data, headers) => {
      if (typeof FormData !== "undefined" && data instanceof FormData) {
        delete headers["Content-Type"];
      }
      return data;
    },
  ],
});

/** Kas kecil — GET/POST/DELETE /store/kas + master COA */
export const storeKasService = {
  list: (params) => api.get("/store/kas", { params }),

  /** Dropdown kategori COA — xsp_api_store_kas_master_coa */
  masterCoa: () => api.get("/store/kas/master-coa"),

  /**
   * Insert kas — multipart: photo + brand_id, store_id, date, datetime,
   * remarks, amount_out, coa, cre_by, ...
   */
  create: (formData, onUploadProgress) =>
    api.post("/store/kas", formData, multipartConfig(onUploadProgress)),

  /**
   * Update kas — multipart: id, date, remarks, amount_out, coa, mod_by,
   * photo file atau photo (path existing)
   */
  update: (formData, onUploadProgress) =>
    api.put("/store/kas", formData, multipartConfig(onUploadProgress)),

  /** Hapus kas — hanya status Baru */
  remove: (params) => api.delete("/store/kas", { params }),

  /** Kas realisasi finance + manual — xsp_api_store_kas_realisasi_finance_getrows */
  realisasiFinance: (params) => api.get("/store/kas/realisasi/finance", { params }),
};
