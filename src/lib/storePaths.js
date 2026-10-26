/** Store route normalization — no React component imports. */

export const STORE_REPORT_PATHS = [
  "/store/sales-detail",
  "/store/daily-collection-report",
  "/store/daily-sales-summary",
  "/store/sales/daily-sales-summary",
  "/store/sales/asbc-nilai",
  "/store/sales/batch",
  "/store/sales/sales-by-man-power",
  "/store/sales/item-best-seller",
  "/store/sales/promosi",
  "/store/sales/sales-refund",
  "/store/setoran/slip-setoran-bank",
  "/store/kas-kecil/kas-list",
  "/store/user/info-karyawan",
];

export const STORE_STATIC_PATHS = ["/store", "/store/profile", "/store/403", "/store/cashier"];

/** Map RBAC module endpoint_path → registered React routes under /store. */
const STORE_MENU_ROUTE_ALIASES = {
  "/store/cashier": "/store/cashier",
  "/cashier": "/store/cashier",
  "/store/pos": "/store/cashier",
  "/store/sales/sales-detail": "/store/sales-detail",
  "/store/sales/daily-collection-report": "/store/daily-collection-report",
  "/store/daily-collection-report": "/store/daily-collection-report",
  "/store/sales/daily-sales-summary": "/store/daily-sales-summary",
  "/store/daily-sales-summary": "/store/daily-sales-summary",
  "/daily-sales-summary": "/store/daily-sales-summary",
  "/store/asbc-nilai": "/store/sales/asbc-nilai",
  "/store/sales/asbc-nilai": "/store/sales/asbc-nilai",
  "/store/batch": "/store/sales/batch",
  "/store/sales/batch": "/store/sales/batch",
  "/store/sales-by-man-power": "/store/sales/sales-by-man-power",
  "/store/sales/sales-by-man-power": "/store/sales/sales-by-man-power",
  "/store/sales/item-best-seller": "/store/sales/item-best-seller",
  "/store/item-best-seller": "/store/sales/item-best-seller",
  "/item-best-seller": "/store/sales/item-best-seller",
  "/best-seller-in-store": "/store/sales/item-best-seller",
  "/store/promosi": "/store/sales/promosi",
  "/store/sales/promosi": "/store/sales/promosi",
  "/promosi": "/store/sales/promosi",
  "/store/sales/sales-refund": "/store/sales/sales-refund",
  "/store/sales-refund": "/store/sales/sales-refund",
  "/sales-refund": "/store/sales/sales-refund",
  "/store/setoran/slip-setoran-bank": "/store/setoran/slip-setoran-bank",
  "/store/slip-setoran-bank": "/store/setoran/slip-setoran-bank",
  "/slip-setoran-bank": "/store/setoran/slip-setoran-bank",
  "/store/kas-kecil/kas-list": "/store/kas-kecil/kas-list",
  "/store/kas-list": "/store/kas-kecil/kas-list",
  "/kas-kecil/kas-list": "/store/kas-kecil/kas-list",
  "/kas-list": "/store/kas-kecil/kas-list",
};

export const normalizeStoreMenuLink = (path = "") => {
  if (!path) return "";
  let value = String(path).trim();
  if (!value.startsWith("/")) value = `/${value}`;
  const base = process.env.PUBLIC_URL || "";
  if (base && value.startsWith(base)) {
    value = value.slice(base.length) || "/";
  }
  value = value.replace(/\/+$/, "") || "/";

  if (STORE_MENU_ROUTE_ALIASES[value]) {
    return STORE_MENU_ROUTE_ALIASES[value];
  }

  return value;
};

export const isRoutableStorePath = (path) => {
  const normalized = normalizeStoreMenuLink(path);
  if (!normalized) return false;
  if (STORE_STATIC_PATHS.includes(normalized)) return true;
  return STORE_REPORT_PATHS.includes(normalized);
};

export const resolveStoreHomePath = () => "/store";

export const isStorePortalPath = (path = "") => {
  const normalized = normalizeStoreMenuLink(path);
  return normalized === "/store" || normalized.startsWith("/store/");
};
