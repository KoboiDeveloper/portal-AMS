import { normalizeStoreMenuLink } from "./storePaths";
import { apiPathToFrontendRoute, normalizePublicPath } from "./routePaths";

const pick = (row, ...keys) => {
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return row[key];
  }
  return "";
};

export const normalizeEndpointPath = (path) => normalizePublicPath(path);

const PARENT_MODULE_ALIASES = {
  SECURITY: "ADMIN_SECURITY",
  REPORT: "ADMIN_DASHBOARD",
  AUDIT: "ADMIN_SYSTEM",
};

/** Fallback labels when a parent folder row is missing from the API payload. */
const FOLDER_LABELS = {
  SECURITY: "Security",
  REPORT: "Report",
  AUDIT: "Audit",
  ADMIN_MASTER_DATA: "Master Data",
  ADMIN_SECURITY: "Security / RBAC",
  ADMIN_ACCESS_TOOLS: "Access Tools",
  ADMIN_SYSTEM: "System",
  HRD: "HRD",
  HRD_ABS: "Absensi",
  HRD_CAB: "Benefit",
  HRD_RPT: "Laporan",
  HRD_PAR: "Utility",
  HRD_GRP_ATTENDANCE: "Attendance",
  HRD_GRP_PERSONEL: "Personel",
  HRD_GRP_GENERATE: "Generate",
  HRD_GRP_PAYROLL: "Payroll",
  HRD_GRP_PROCESS: "Process",
  HRD_GRP_REPORT: "Report",
  HRD_GRP_SYS_PARAM: "System Param",
  HRD_GRP_MASTER: "Master",
  HRD_GRP_EOM: "End Of Month",
  REG_DASHBOARD: "Dashboard",
  REG_OPS: "Ops",
  REG_COMMERCE: "Commerce",
  REG_MP: "Marketplace",
  REG_RPT: "Laporan",
  REG_UTIL: "Utility",
  REG_GRP_MOBILE: "Mobile",
  REG_GRP_ABSEN: "Absen Store",
  REG_GRP_PLU: "Plu",
  REG_GRP_SLIP: "Slip",
  REG_GRP_OFFICE: "Office",
  REG_GRP_SALES: "Sales",
  REG_GRP_INV: "Inventory",
  REG_GRP_SO: "Stock Opname",
  REG_GRP_VOUCHER: "Voucher",
  REG_GRP_WORO: "Dr.Woro",
  REG_GRP_OMNI: "Omnichannel",
  REG_GRP_MEMBER: "Member",
  REG_GRP_SCAN: "Scan Selisih Harga",
  REG_GRP_TOOLS: "Tools",
  REG_GRP_PRINT: "Print",
};

/** Known folder codes (also: any module with empty/# endpoint is treated as folder). */
const FOLDER_MODULE_CODES = new Set([
  "ADMIN_MASTER_DATA",
  "ADMIN_SECURITY",
  "ADMIN_ACCESS_TOOLS",
  "ADMIN_SYSTEM",
  "HRD",
  "HRD_ABS",
  "HRD_PAR",
  "HRD_RPT",
  "HRD_CAB",
  "HRD_GRP_ATTENDANCE",
  "HRD_GRP_PERSONEL",
  "HRD_GRP_GENERATE",
  "HRD_GRP_PAYROLL",
  "HRD_GRP_PROCESS",
  "HRD_GRP_REPORT",
  "HRD_GRP_SYS_PARAM",
  "HRD_GRP_MASTER",
  "HRD_GRP_EOM",
  /* REG_DASHBOARD is a leaf page — keep path /admin/regional/dashboard */
  "REG_OPS",
  "REG_COMMERCE",
  "REG_MP",
  "REG_RPT",
  "REG_UTIL",
  "REG_GRP_MOBILE",
  "REG_GRP_ABSEN",
  "REG_GRP_PLU",
  "REG_GRP_SLIP",
  "REG_GRP_OFFICE",
  "REG_GRP_SALES",
  "REG_GRP_INV",
  "REG_GRP_SO",
  "REG_GRP_VOUCHER",
  "REG_GRP_WORO",
  "REG_GRP_OMNI",
  "REG_GRP_MEMBER",
  "REG_GRP_SCAN",
  "REG_GRP_TOOLS",
  "REG_GRP_PRINT",
]);

const ADMIN_FOLDER_PATHS = new Set([
  "/admin/master",
  "/admin/security",
  "/admin/access",
  "/admin/system",
  "/admin/hrd",
  "/admin/hrd/abs",
  "/admin/hrd/par",
  "/admin/hrd/rpt",
  "/admin/hrd/cab",
  "/admin/regional",
  "/admin/regional/ops",
  "/admin/regional/mp",
  "/admin/regional/rpt",
  "/admin/regional/util",
  "/admin/regional/commerce",
]);

const LEGACY_MODULE_GROUPS = [
  {
    adminParent: "ADMIN_MASTER_DATA",
    adminChildren: new Set(["ADMIN_BRANCH", "ADMIN_STORE", "ADMIN_EMPLOYEE"]),
    legacy: new Set(["MASTER_BRANCH", "MASTER_STORE", "MASTER_EMPLOYEE", "REPORT_STORE", "REPORT_BRANCH"]),
  },
  {
    adminParent: "ADMIN_SECURITY",
    adminChildren: new Set([
      "ADMIN_ROLE",
      "ADMIN_MODULE",
      "ADMIN_PERMISSION",
      "ADMIN_USER_ROLE",
      "ADMIN_ROLE_PERMISSION",
      "ADMIN_AREA_STORE",
    ]),
    legacy: new Set([
      "SEC_ROLE",
      "SEC_MODULE",
      "SEC_PERMISSION",
      "SEC_USER_ROLE",
      "SEC_ROLE_PERMISSION",
      "SEC_AREA_STORE",
    ]),
  },
  {
    adminParent: "ADMIN_SYSTEM",
    adminChildren: new Set(["ADMIN_AUDIT_LOG", "ADMIN_PASSWORD_RESET_LOG"]),
    legacy: new Set(["AUDIT_DAILY_BANK", "AUDIT_PAYROLL"]),
  },
];

const adminNavigationFallback = () => [
  { text: "Dashboard", link: "/admin/dashboard", icon: "dashboard", sortNo: 0 },
  { text: "Profile", link: "/profile", icon: "user", sortNo: 1 },
];

const storeNavigationFallback = () => [
  { text: "Store Home", link: "/store", icon: "home", sortNo: 0 },
];

const guessIcon = (moduleCode = "") => {
  const code = String(moduleCode).toUpperCase();
  if (code.includes("SALES") || code.startsWith("STORE_")) return "bag";
  if (code.includes("INVENTORY") || code.includes("STOCK")) return "box";
  if (code.includes("SETORAN") || code.includes("DCR")) return "wallet";
  if (code.startsWith("MASTER_") || code.startsWith("ADMIN_")) return "building";
  if (code.startsWith("SEC_")) return "shield";
  if (code.startsWith("HRD_")) return "users";
  if (code.includes("USER") || code.includes("KARYAWAN") || code.includes("EMPLOYEE")) return "users";
  return "file-docs";
};

const isFolderEndpoint = (rawLink) => {
  const s = String(rawLink || "").trim();
  return !s || s === "#" || s === "/";
};

const resolveParentCode = (parentCode, availableCodes) => {
  if (!parentCode) return null;
  const upper = String(parentCode).toUpperCase();
  if (availableCodes.has(upper)) return upper;
  const alias = PARENT_MODULE_ALIASES[upper];
  if (alias && availableCodes.has(alias)) return alias;
  return upper;
};

const resolveLegacyAdminDuplicates = (nodes) => {
  let result = [...nodes];
  LEGACY_MODULE_GROUPS.forEach(({ adminParent, adminChildren, legacy }) => {
    const hasAdminTree = result.some(
      (node) => node.parentCode === adminParent || adminChildren.has(node.moduleCode)
    );
    if (hasAdminTree) {
      result = result.filter((node) => !legacy.has(node.moduleCode));
    }
  });

  const hasAdminDashboard = result.some((node) => node.moduleCode === "ADMIN_DASHBOARD");
  if (hasAdminDashboard) {
    result = result.filter((node) => node.moduleCode !== "DASHBOARD");
  }

  return result;
};

const normalizeMenuRow = (row, options = {}) => {
  const rawLink = pick(row, "endpoint_path", "endpointPath", "ENDPOINT_PATH");
  let link = apiPathToFrontendRoute(rawLink);
  if (options.storeOnly) {
    link = normalizeStoreMenuLink(link);
  }
  const moduleCode = String(pick(row, "module_code", "moduleCode", "MODULE_CODE") || "").toUpperCase();
  const asFolder =
    isFolderEndpoint(rawLink) ||
    FOLDER_MODULE_CODES.has(moduleCode) ||
    ADMIN_FOLDER_PATHS.has(link);
  if (asFolder) {
    link = "#";
  }
  return {
    text: pick(row, "module_name", "moduleName", "MODULE_NAME") || pick(row, "module_code", "moduleCode"),
    link,
    moduleCode,
    isFolder: asFolder,
    parentCode: (() => {
      const raw = pick(row, "parent_module_code", "parentModuleCode", "PARENT_MODULE_CODE");
      return raw ? String(raw).toUpperCase() : null;
    })(),
    sortNo: Number(pick(row, "sort_no", "sortNo", "SORT_NO") || 0),
    icon: pick(row, "icon_name", "iconName", "icon") || guessIcon(pick(row, "module_code", "moduleCode")),
  };
};

const cleanSubMenu = (item) => {
  if (!item.subMenu?.length) {
    const { subMenu, ...rest } = item;
    return rest;
  }
  return { ...item, subMenu: item.subMenu.map(cleanSubMenu) };
};

const sortMenuItems = (items) => {
  items.sort((a, b) => a.sortNo - b.sortNo || a.text.localeCompare(b.text));
  items.forEach((item) => {
    if (item.subMenu?.length) sortMenuItems(item.subMenu);
  });
};

/** Mark mega when a node has 2+ children that themselves have children (columns). */
const markMegaMenus = (items) => {
  items.forEach((item) => {
    const cols = (item.subMenu || []).filter((c) => c.subMenu?.length);
    if (cols.length >= 2) {
      item.mega = true;
    }
    if (item.subMenu?.length) markMegaMenus(item.subMenu);
  });
  return items;
};

const buildMenuTree = (nodes) => {
  const availableCodes = new Set(nodes.map((node) => node.moduleCode));
  const normalizedNodes = nodes.map((node) => ({
    ...node,
    parentCode: resolveParentCode(node.parentCode, availableCodes),
  }));

  const byCode = {};
  normalizedNodes.forEach((node) => {
    byCode[node.moduleCode] = { ...node, subMenu: [] };
  });

  const GRP_TOP = {
    HRD_GRP_ATTENDANCE: "HRD_ABS",
    HRD_GRP_PERSONEL: "HRD_ABS",
    HRD_GRP_GENERATE: "HRD_ABS",
    HRD_GRP_PAYROLL: "HRD_CAB",
    HRD_GRP_PROCESS: "HRD_CAB",
    HRD_GRP_REPORT: "HRD_RPT",
    HRD_GRP_SYS_PARAM: "HRD_PAR",
    HRD_GRP_MASTER: "HRD_PAR",
    HRD_GRP_EOM: "HRD_PAR",
  };

  const ensureFolder = (code, parentOfFolder = null, sortNo = 999) => {
    if (!code || byCode[code]) return;
    byCode[code] = {
      text: FOLDER_LABELS[code] || code.replace(/_/g, " "),
      link: "#",
      moduleCode: code,
      parentCode: parentOfFolder,
      isFolder: true,
      sortNo,
      icon: guessIcon(code),
      subMenu: [],
    };
  };

  normalizedNodes.forEach((node) => {
    const parentCode = node.parentCode;
    if (parentCode && !byCode[parentCode]) {
      const sampleChild = normalizedNodes.find((item) => item.parentCode === parentCode);
      const parentOfFolder = GRP_TOP[parentCode] || null;
      if (parentOfFolder) ensureFolder(parentOfFolder, null, 100);
      ensureFolder(parentCode, parentOfFolder, sampleChild?.sortNo ?? 999);
    }
  });

  const roots = [];
  Object.values(byCode).forEach((item) => {
    const parentCode = item.parentCode;
    const parent = parentCode && byCode[parentCode];
    if (parent && parent !== item) {
      parent.subMenu.push(item);
    } else if (!parentCode || !byCode[parentCode]) {
      roots.push(item);
    }
  });

  sortMenuItems(roots);
  markMegaMenus(roots);
  return roots.map(cleanSubMenu);
};

export const buildNavigationFromMenuRows = (menuRows, options = {}) => {
  const { storeOnly = false, excludeStore = false } = options;

  let nodes = (menuRows || [])
    .map((row) => normalizeMenuRow(row, { storeOnly }))
    .filter((node) => node.moduleCode && node.link)
    .filter((node) => {
      if (storeOnly) return node.moduleCode.startsWith("STORE_");
      if (excludeStore) return !node.moduleCode.startsWith("STORE_");
      return true;
    });

  if (!storeOnly) {
    nodes = resolveLegacyAdminDuplicates(nodes);
  }

  if (!nodes.length) {
    if (storeOnly) return storeNavigationFallback();
    if (excludeStore) return adminNavigationFallback();
    return [];
  }

  const result = buildMenuTree(nodes);
  if (!result.length) {
    if (storeOnly) return storeNavigationFallback();
    if (excludeStore) return adminNavigationFallback();
  }

  return result;
};

/** @deprecated kept for imports — navigation is fully API-driven now. */
export const RBAC_MENU_DEFINITION = [];

export const collectModuleCodes = (menuRows) => {
  const codes = new Set();
  (menuRows || []).forEach((row) => {
    const code = row.module_code || row.moduleCode || row.MODULE_CODE;
    if (code) codes.add(String(code).toUpperCase());
  });
  return codes;
};

export const buildAdminNavigation = (menuRows) =>
  buildNavigationFromMenuRows(menuRows, { excludeStore: true });

export const buildStoreNavigation = (menuRows) =>
  buildNavigationFromMenuRows(menuRows, { storeOnly: true });

/** Legacy helper — prefer buildAdminNavigation / buildStoreNavigation. */
export const filterMenuByAccess = (menuRows) => buildAdminNavigation(menuRows);
