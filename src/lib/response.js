import { toast } from "react-toastify";

export const SUCCESS_CODE = "2002500";

export const isSuccess = (res) => String(res?.responseCode) === SUCCESS_CODE;

export const extractRows = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.rows)) return res.rows;
  if (res.data && Array.isArray(res.data.rows)) return res.data.rows;
  if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
    const values = Object.values(res.data).find(Array.isArray);
    if (values) return values;
  }
  return [];
};

export const extractRow = (res) => {
  if (!res) return null;
  if (res.data && !Array.isArray(res.data)) return res.data;
  const rows = extractRows(res);
  return rows[0] || null;
};

export const notifyResponse = (res, successMessage) => {
  if (isSuccess(res)) {
    toast.success(successMessage || res.responseMessage || "Success");
    return true;
  }
  toast.error(res?.responseMessage || "Request failed");
  return false;
};
