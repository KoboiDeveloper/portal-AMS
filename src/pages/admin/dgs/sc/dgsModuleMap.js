/**
 * DigitalSales (DGS) ↔ Seller Center module mapping.
 * Routes & AccessGuard codes stay unchanged — design/navigation reference only.
 */
export const DGS_SC_MODULES = [
  {
    sc: "Beranda",
    dgs: "Ringkasan Marketplace",
    route: "/dgs/dashboard",
    moduleCode: "DGS_DASH",
    page: "DgsDashboardPage",
  },
  {
    sc: "Pesanan",
    dgs: "Prasales / Confirm Sales",
    route: "/dgs/prasales",
    moduleCode: "DGS_PRASALES",
    page: "DgsPrasalesPage",
  },
  {
    sc: "Pengembalian",
    dgs: "Retur Marketplace (list)",
    route: "/dgs/retur-list",
    moduleCode: "DGS_RETUR_LIST",
    page: "RegMpArListPage (dgsReturOnly)",
  },
  {
    sc: "Pengembalian · Dashboard",
    dgs: "Dashboard Retur",
    route: "/dgs/retur-dashboard",
    moduleCode: "DGS_RETUR_DASH",
    page: "DgsReturDashboardPage",
  },
  {
    sc: "Pengembalian · Gudang",
    dgs: "Retur Gudang",
    route: "/dgs/retur",
    moduleCode: "DGS_RETUR",
    moduleCodes: ["DGS_RETUR", "DGS_RETUR_GUDANG"],
    page: "DgsGudangReturPage → RegMpReturPage(dgs)",
  },
  {
    sc: "Keuangan · Piutang",
    dgs: "AR Marketplace",
    route: "/dgs/ar-list",
    moduleCode: "DGS_AR_LIST",
    page: "RegMpArListPage (dgs)",
  },
  {
    sc: "Keuangan · Realisasi",
    dgs: "Realisasi AR",
    route: "/dgs/ar-realisasi",
    moduleCode: "DGS_AR_REALISASI",
    page: "RegMpArRealisasiPage (dgs)",
  },
  {
    sc: "Produk · Analisa",
    dgs: "Analisa Barang",
    route: "/dgs/analisa-barang",
    moduleCode: "DGS_ANALISA_BARANG",
    page: "DgsProductAnalysisPage",
  },
  {
    sc: "Pengaturan · Komisi",
    dgs: "Setting Komisi",
    route: "/dgs/komisi-setting",
    moduleCode: "DGS_KOMISI",
    page: "DgsKomisiSettingPage",
  },
];

const codesOf = (mod) => {
  if (Array.isArray(mod.moduleCodes) && mod.moduleCodes.length) return mod.moduleCodes;
  return mod.moduleCode ? [mod.moduleCode] : [];
};

/** Lookup route → module codes (untuk filter nav / akses cepat). */
export const DGS_ROUTE_ACCESS = DGS_SC_MODULES.reduce((acc, m) => {
  acc[m.route] = codesOf(m);
  return acc;
}, {});

/**
 * Nav sidebar bergaya Seller Center:
 * - item top-level pakai icon
 * - children indent tanpa icon (active = teal + soft bg)
 * - moduleCodes: AccessGuard VIEW (OR)
 */
export const DGS_NAV_GROUPS = [
  {
    id: "home",
    label: "Beranda",
    icon: "home",
    route: "/dgs/dashboard",
    moduleCodes: ["DGS_DASH"],
  },
  /**
   * DigitalSales Retur: Beranda di atas Akses cepat → retur-dashboard.
   * Hanya tampil jika user tidak punya DGS_DASH (lihat DgsSubNav).
   */
  {
    id: "home-retur",
    label: "Beranda",
    icon: "home",
    route: "/dgs/retur-dashboard",
    moduleCodes: ["DGS_RETUR_DASH"],
  },
  {
    id: "orders",
    label: "Pesanan",
    icon: "orders",
    items: [{ label: "Kelola prasales", route: "/dgs/prasales", moduleCodes: ["DGS_PRASALES"] }],
  },
  {
    id: "returns",
    label: "Pengembalian",
    icon: "returns",
    items: [
      /* Dashboard retur diganti Beranda (home-retur) untuk role retur */
      { label: "Daftar retur", route: "/dgs/retur-list", moduleCodes: ["DGS_RETUR_LIST"] },
      { label: "Gudang retur", route: "/dgs/retur", moduleCodes: ["DGS_RETUR", "DGS_RETUR_GUDANG"] },
    ],
  },
  {
    id: "product",
    label: "Produk",
    icon: "product",
    items: [{ label: "Analisa barang", route: "/dgs/analisa-barang", moduleCodes: ["DGS_ANALISA_BARANG"] }],
  },
  {
    id: "finance",
    label: "Keuangan",
    icon: "finance",
    items: [
      { label: "AR Marketplace", route: "/dgs/ar-list", moduleCodes: ["DGS_AR_LIST"] },
      { label: "Realisasi AR", route: "/dgs/ar-realisasi", moduleCodes: ["DGS_AR_REALISASI"] },
    ],
  },
  {
    id: "settings",
    label: "Pengaturan",
    icon: "settings",
    items: [{ label: "Setting komisi", route: "/dgs/komisi-setting", moduleCodes: ["DGS_KOMISI"] }],
  },
];

/** Flatten semua moduleCodes yang dipakai nav (untuk batch access-check). */
export const collectNavModuleCodes = (groups = DGS_NAV_GROUPS) => {
  const out = [];
  groups.forEach((g) => {
    (g.moduleCodes || []).forEach((c) => out.push(c));
    (g.items || []).forEach((it) => (it.moduleCodes || []).forEach((c) => out.push(c)));
  });
  return out;
};

export default DGS_SC_MODULES;
