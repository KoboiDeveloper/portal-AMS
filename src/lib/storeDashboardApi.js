import axios from "axios";

const apiBase = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export const storeDashboardUrl = (path) => `${apiBase}/v1.0/store/dashboard/${path}`;

export const fetchStoreDashboard = (path, storeId) => {
  if (!storeId) return Promise.reject(new Error("storeId required"));
  return axios.get(storeDashboardUrl(path), {
    params: { storeID: storeId },
    headers: { "Content-Type": "multipart/form-data" },
  });
};
