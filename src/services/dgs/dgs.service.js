import api from "../../lib/api";

/** DigitalSales — /dgs/mp/* (role DIGITAL_SALES / SUPERADMIN, guarded server side). */
const base = "/dgs/mp";

export const getDgsDashboard = (params = {}) => api.get(`${base}/dashboard`, { params });
export const getDgsMarketplaces = () => api.get(`${base}/marketplaces`);

export const getDgsPrasales = (params = {}) => api.get(`${base}/prasales`, { params });
export const getDgsPrasalesItems = (id) =>
  api.get(`${base}/prasales/${encodeURIComponent(id)}/items`);
export const postDgsPrasalesItemAction = (payload) =>
  api.post(`${base}/prasales/items/action`, payload);
export const postDgsPrasalesProses = (payload) => api.post(`${base}/prasales/proses`, payload);

export const getDgsAr = (idTrSalesHeader) =>
  api.get(`${base}/ar/${encodeURIComponent(idTrSalesHeader)}`);
export const postDgsArSave = (payload) => api.post(`${base}/ar/save`, payload);
export const postDgsArTemplate = (invoices) => api.post(`${base}/ar/template`, { invoices });
export const postDgsArUpload07E = (payload) =>
  api.post(`${base}/ar/upload-07e`, payload, { timeout: 300000 });

export const postDgsArRealisasiSave = (payload) => api.post(`${base}/ar-realisasi/save`, payload);

export const getDgsKomisiInfo = () => api.get(`${base}/komisi/info`);
export const getDgsKomisi = (params = {}) => api.get(`${base}/komisi`, { params });
export const postDgsKomisi = (payload) => api.post(`${base}/komisi`, payload);
export const putDgsKomisi = (id, payload) =>
  api.put(`${base}/komisi/${encodeURIComponent(id)}`, payload);
export const postDgsKomisiDelete = (ids) => api.post(`${base}/komisi/delete`, { ids });

export const getDgsReturItem = (params = {}) => api.get(`${base}/retur/item`, { params });
export const getDgsReturImageLink = (path) =>
  api.get(`${base}/retur/image-link`, { params: { path } });
export const postDgsReturConfirm = (formData) =>
  api.post(`${base}/retur/confirm`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 180000,
  });
