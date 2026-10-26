import axios from "axios";
import { storage } from "./storage";
import { appPath } from "./paths";

const baseURL = `${process.env.REACT_APP_API_BASE_URL || "http://localhost:8000"}/api/v1`;

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const onLoginPage = window.location.pathname.includes("/login");
      storage.clearAll();
      if (!onLoginPage) {
        window.location.href = appPath("/login");
      }
    }
    const data = error.response?.data;
    return Promise.reject(
      data || { responseCode: "5000001", responseMessage: error.message || "Network error" }
    );
  }
);

export default api;
