import api from "../lib/api";

export const filesService = {
  /**
   * Upload a file to Dropbox via Go API.
   * @param {File} file
   * @param {{ module?: string, path?: string }} options
   * @param {(event: ProgressEvent) => void} [onUploadProgress]
   */
  upload: (file, options = {}, onUploadProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    if (options.module) formData.append("module", options.module);
    if (options.path) formData.append("path", options.path);

    return api.post("/files/upload", formData, {
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
  },

  getTemporaryLink: (path) => api.get("/files/temporary-link", { params: { path } }),
};
