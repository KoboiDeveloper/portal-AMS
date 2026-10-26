/** Convert RBAC API endpoint_path values to frontend React Router paths. */

const API_VERSION_PREFIX = /^\/api\/v[\d.]+/i;

const FRONTEND_ROUTE_ALIASES = {
  "/dashboard": "/admin/dashboard",

  "/reports/stores": "/admin/master/stores",
  "/reports/branches": "/admin/master/branches",
  "/reports/employees": "/admin/master/employees",
  "/rbac/reports/stores": "/admin/master/stores",
  "/rbac/reports/branches": "/admin/master/branches",
  "/rbac/stores": "/admin/master/stores",
  "/rbac/branches": "/admin/master/branches",
  "/rbac/employees": "/admin/master/employees",

  "/rbac/roles": "/admin/security/roles",
  "/rbac/modules": "/admin/security/modules",
  "/rbac/permissions": "/admin/security/permissions",
  "/rbac/role-permissions": "/admin/security/role-permissions",
  "/rbac/user-roles": "/admin/security/user-roles",
  "/rbac/area-stores": "/admin/security/area-stores",

  "/rbac/access-check": "/admin/access/access-check",
  "/rbac/effective-access": "/admin/access/effective-access",
  "/rbac/users/menu-preview": "/admin/access/user-menu-preview",
  "/rbac/users/store-scope-preview": "/admin/access/store-scope-preview",
};

export const normalizePublicPath = (path = "") => {
  if (!path) return "";
  let value = String(path).trim();
  if (!value.startsWith("/")) value = `/${value}`;
  const base = process.env.PUBLIC_URL || "";
  if (base && value.startsWith(base)) {
    value = value.slice(base.length) || "/";
  }
  return value.replace(/\/+$/, "") || "/";
};

export const apiPathToFrontendRoute = (path = "") => {
  let value = normalizePublicPath(path);
  if (API_VERSION_PREFIX.test(value)) {
    value = value.replace(API_VERSION_PREFIX, "") || "/";
    value = value.replace(/\/+$/, "") || "/";
  }
  return FRONTEND_ROUTE_ALIASES[value] || value;
};
