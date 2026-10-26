/** Softnio / DashLite tones for payment kinds */

export type MethodTone = {
  bar: string;
  badge: string;
  soft: string;
  rail: string;
  selectedBorder: string;
  selectedBg: string;
  selectedShadow: string;
  check: string;
  tabActive: string;
  tabRail: string;
  chip: string;
};

export function methodTone(methodType: string): MethodTone {
  const t = methodType.toLowerCase();

  if (t.includes("debit")) {
    return {
      bar: "from-warning to-amber-500",
      badge: "bg-warning text-base",
      soft: "bg-amber-50 text-amber-900 ring-amber-200",
      rail: "bg-warning",
      selectedBorder: "border-warning",
      selectedBg: "bg-amber-50",
      selectedShadow: "shadow-sm",
      check: "bg-warning",
      tabActive: "bg-warning text-base shadow-sm",
      tabRail: "bg-warning",
      chip: "bg-warning text-base",
    };
  }

  if (t.includes("credit")) {
    return {
      bar: "from-primary to-primary-700",
      badge: "bg-primary text-white",
      soft: "bg-primary-50 text-primary-700 ring-primary-200",
      rail: "bg-primary",
      selectedBorder: "border-primary",
      selectedBg: "bg-primary-50",
      selectedShadow: "shadow-sm",
      check: "bg-primary",
      tabActive: "bg-primary text-white shadow-sm",
      tabRail: "bg-primary",
      chip: "bg-primary text-white",
    };
  }

  if (t.includes("qris")) {
    return {
      bar: "from-info to-cyan-600",
      badge: "bg-info text-white",
      soft: "bg-cyan-50 text-cyan-900 ring-cyan-200",
      rail: "bg-info",
      selectedBorder: "border-info",
      selectedBg: "bg-cyan-50",
      selectedShadow: "shadow-sm",
      check: "bg-info",
      tabActive: "bg-info text-white shadow-sm",
      tabRail: "bg-info",
      chip: "bg-info text-white",
    };
  }

  if (t.includes("tunai") || t.includes("cash")) {
    return {
      bar: "from-base to-base-soft",
      badge: "bg-base text-white",
      soft: "bg-slate-100 text-base ring-slate-300",
      rail: "bg-base",
      selectedBorder: "border-base",
      selectedBg: "bg-slate-50",
      selectedShadow: "shadow-sm",
      check: "bg-base",
      tabActive: "bg-base text-white shadow-sm",
      tabRail: "bg-base",
      chip: "bg-base text-white",
    };
  }

  return {
    bar: "from-primary to-primary-700",
    badge: "bg-primary text-white",
    soft: "bg-primary-50 text-primary-800 ring-primary-200",
    rail: "bg-primary",
    selectedBorder: "border-primary",
    selectedBg: "bg-primary-50",
    selectedShadow: "shadow-sm",
    check: "bg-primary",
    tabActive: "bg-primary text-white shadow-sm",
    tabRail: "bg-primary",
    chip: "bg-primary text-white",
  };
}

export function subToMethodType(sub: "DEBIT" | "CREDIT" | "QRIS" | "LAINNYA"): string {
  if (sub === "DEBIT") return "Debit";
  if (sub === "CREDIT") return "Credit";
  if (sub === "QRIS") return "QRIS";
  return "Lainnya";
}
