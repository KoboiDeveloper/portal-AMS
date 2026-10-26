import Dcr from "../pages/store-sales/dailyCollectionReport";
import DailySalesSummary from "../pages/store-sales/dailySalesSummary";
import SalesDetail from "../pages/store-sales/salesDetail";
import AsbcNilai from "../pages/store-sales/asbcNilai";
import SalesBatch from "../pages/store-sales/batch";
import SalesByManPower from "../pages/store-sales/salesByManPower";
import BestSeller from "../pages/store-sales/bestSeller";
import Promosi from "../pages/store-sales/promosi";
import Refund from "../pages/store-sales/salesRefund";
import InfoKaryawan from "../pages/store/user/info-karyawan";
import StoreCashierPage from "../pages/store/cashier";
import { normalizeStoreMenuLink } from "./storePaths";

/** Maps store portal routes to page components. */
export const STORE_PAGE_REGISTRY = {
  "/store/sales-detail": SalesDetail,
  "/store/daily-collection-report": Dcr,
  "/store/daily-sales-summary": DailySalesSummary,
  "/store/sales/daily-sales-summary": DailySalesSummary,
  "/store/sales/asbc-nilai": AsbcNilai,
  "/store/sales/batch": SalesBatch,
  "/store/sales/sales-by-man-power": SalesByManPower,
  "/store/sales/item-best-seller": BestSeller,
  "/store/sales/promosi": Promosi,
  "/store/sales/sales-refund": Refund,
  "/store/user/info-karyawan": InfoKaryawan,
  "/store/cashier": StoreCashierPage,
};

export const getStorePageComponent = (endpointPath) => {
  const key = normalizeStoreRoute(endpointPath);
  return STORE_PAGE_REGISTRY[key] || null;
};

export const normalizeStoreRoute = (path = "") => normalizeStoreMenuLink(path);

export const routePathFromEndpoint = (endpointPath) => {
  const normalized = normalizeStoreRoute(endpointPath);
  return normalized.replace(/^\//, "");
};

export const collectStoreRoutePaths = (navigation) => {
  const paths = new Set();
  const walk = (items) => {
    (items || []).forEach((item) => {
      if (item.link) {
        const routePath = routePathFromEndpoint(item.link);
        if (routePath) paths.add(routePath);
      }
      if (item.subMenu?.length) walk(item.subMenu);
    });
  };
  walk(navigation);
  return paths;
};
