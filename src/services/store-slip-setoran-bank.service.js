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

/** Slip setoran bank / DCR */
export const storeSlipSetoranBankService = {
  list: (params) => api.get("/store/setoran/slip-setoran-bank", { params }),

  /**
   * Create DCR — multipart: image_1..image_6 + nilai_* + tgl_batch/cre_date + cre_by
   */
  create: (formData, onUploadProgress) =>
    api.post("/store/setoran/slip-setoran-bank", formData, multipartConfig(onUploadProgress)),

  /**
   * Update DCR — multipart: id + image_1..image_6 + nilai_* + mod_by
   * SP: xsp_api_dt_dcr_image_update
   */
  update: (formData, onUploadProgress) =>
    api.put("/store/setoran/slip-setoran-bank", formData, multipartConfig(onUploadProgress)),
};
