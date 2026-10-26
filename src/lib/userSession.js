export const STORE_LOGIN_ROLE = "STORE_LOGIN";

export const normalizeRoleCode = (role) => {
  if (!role) return "";
  if (typeof role === "string") return role.toUpperCase();
  return String(role.role_code || role.roleCode || role.code || "").toUpperCase();
};

export const getUserRoleCodes = (user) => {
  if (!user) return [];
  if (user.roleCode || user.role_code) {
    return [String(user.roleCode || user.role_code).toUpperCase()];
  }
  return (user.roles || []).map(normalizeRoleCode).filter(Boolean);
};

export const getEmployeeType = (user) =>
  String(user?.employeeType || user?.employee_type || "").toUpperCase();

export const isStoreLoginUser = (user) => {
  if (!user) return false;
  if (getEmployeeType(user) === STORE_LOGIN_ROLE) return true;
  return getUserRoleCodes(user).includes(STORE_LOGIN_ROLE);
};

export const isAdminUser = (user) => {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return getUserRoleCodes(user).includes("SUPERADMIN");
};

export const getDefaultHomePath = (user, navigation) => {
  if (isStoreLoginUser(user)) {
    return "/store";
  }
  if (isAdminUser(user)) {
    return "/admin/dashboard";
  }
  const roles = getUserRoleCodes(user);
  if (roles.includes("REGIONAL")) {
    return "/admin/regional/dashboard";
  }
  if (roles.includes("HRD")) {
    return "/admin/hrd/dashboard";
  }
  const firstLink = collectMenuLinks(navigation)[0];
  return firstLink || "/admin/dashboard";
};

export const collectMenuLinks = (items, links = []) => {
  (items || []).forEach((item) => {
    if (item.link && item.link !== "#") links.push(item.link);
    if (item.subMenu?.length) collectMenuLinks(item.subMenu, links);
  });
  return links;
};

export const isPathAllowedByMenu = (pathname, navigation) => {
  const base = process.env.PUBLIC_URL || "";
  const normalized = pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;
  const allowed = collectMenuLinks(navigation);
  if (!allowed.length) return true;
  return allowed.some(
    (link) => normalized === link || normalized.startsWith(`${link}/`)
  );
};

export const pickActiveStore = (storeScope, preferredStoreId = null) => {
  if (!Array.isArray(storeScope) || !storeScope.length) return null;

  const toStore = (row) => ({
    store_id: row.store_id || row.storeId,
    store_name: row.store_name || row.storeName || row.store_id || row.storeId,
    branch_id: row.branch_id || row.branchId,
  });

  if (preferredStoreId) {
    const preferred = String(preferredStoreId).toUpperCase();
    const match = storeScope.find((row) => {
      const id = String(row.store_id || row.storeId || "").toUpperCase();
      return id === preferred;
    });
    if (match) return toStore(match);
  }

  return toStore(storeScope[0]);
};
