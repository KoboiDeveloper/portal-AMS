import { BANK_LOGO, WALLET_LOGO, logoForPaymentMethod } from "./payment-logos";

export type ShiftPaymentLine = {
  method: string;
  label: string;
  amount: number;
};

export type ShiftPaymentGroup = {
  key: string;
  label: string;
  logo: string | null;
  kind: "bank" | "cash" | "wallet" | "other";
  total: number;
  lines: ShiftPaymentLine[];
};

const BANK_ORDER = ["BCA", "BNI", "BRI", "Mandiri"] as const;
const KIND_ORDER = ["Debit", "Credit", "QRIS"] as const;

function methodForKind(kind: (typeof KIND_ORDER)[number], bank: string): string {
  if (kind === "Debit") return `Debit - ${bank}`;
  if (kind === "Credit") return `Credit Card - ${bank}`;
  return `QRIS - ${bank}`;
}

function displayMethodLabel(method: string): string {
  if (method === "Cash" || method === "Tunai") return "Tunai";
  if (method.startsWith("Debit - ")) return "Debit";
  if (method.startsWith("Credit Card - ")) return "Credit";
  if (method.startsWith("QRIS - ")) return "QRIS";
  if (method.toUpperCase() === "INDODANA") return "Indodana";
  if (method === "OVO") return "OVO";
  if (method.includes(" - ")) return method.split(" - ")[0]!.trim();
  return method;
}

function bankFromMethod(method: string): string | null {
  if (!method.includes(" - ")) return null;
  const bank = method.split(" - ").pop()!.trim();
  if (bank.toUpperCase() === "MDR") return "Mandiri";
  return bank;
}

function groupKeyFor(method: string): {
  key: string;
  label: string;
  kind: ShiftPaymentGroup["kind"];
} {
  if (method === "Cash" || method === "Tunai") {
    return { key: "cash", label: "Tunai", kind: "cash" };
  }
  const bank = bankFromMethod(method);
  if (bank) {
    return { key: `bank:${bank}`, label: bank, kind: "bank" };
  }
  const upper = method.toUpperCase();
  if (upper === "OVO" || upper === "INDODANA") {
    return {
      key: `wallet:${upper}`,
      label: upper === "INDODANA" ? "Indodana" : "OVO",
      kind: "wallet",
    };
  }
  return { key: `other:${method}`, label: method, kind: "other" };
}

function logoForGroup(
  group: Pick<ShiftPaymentGroup, "key" | "label" | "kind">
): string | null {
  if (group.kind === "bank") {
    return BANK_LOGO[group.label] ?? (group.label === "Mandiri" ? BANK_LOGO.Mandiri : null);
  }
  if (group.kind === "wallet") {
    const key = group.label.toUpperCase() === "INDODANA" ? "INDODANA" : group.label.toUpperCase();
    return WALLET_LOGO[key] ?? null;
  }
  return null;
}

function kindRank(label: string): number {
  const i = KIND_ORDER.indexOf(label as (typeof KIND_ORDER)[number]);
  return i >= 0 ? i : 99;
}

function groupRank(group: ShiftPaymentGroup): number {
  if (group.kind === "cash") return 0;
  if (group.kind === "bank") {
    const i = BANK_ORDER.indexOf(group.label as (typeof BANK_ORDER)[number]);
    return 10 + (i >= 0 ? i : 50);
  }
  if (group.kind === "wallet") return 80;
  return 90;
}

function pickAmount(byMethod: Record<string, number>, keys: string[]): number {
  for (const key of keys) {
    if (!key) continue;
    const v = byMethod[key];
    if (typeof v === "number" && v > 0) return v;
  }
  return 0;
}

function bankKindAmount(
  byMethod: Record<string, number>,
  bank: string,
  kind: (typeof KIND_ORDER)[number]
): number {
  const primary = methodForKind(kind, bank);
  const keys = [primary];
  if (bank === "Mandiri") keys.push(methodForKind(kind, "MDR"));
  // Legacy flat EDC — masukkan ke Debit saja
  if (kind === "Debit") {
    keys.push(`EDC - ${bank}`);
    if (bank === "Mandiri") keys.push("EDC - MDR");
  }
  return pickAmount(byMethod, keys);
}

function buildBankGroup(
  bank: string,
  byMethod: Record<string, number>
): ShiftPaymentGroup {
  const lines: ShiftPaymentLine[] = KIND_ORDER.map((kind) => ({
    method: methodForKind(kind, bank),
    label: kind,
    amount: bankKindAmount(byMethod, bank, kind),
  }));
  const group: ShiftPaymentGroup = {
    key: `bank:${bank}`,
    label: bank,
    kind: "bank",
    logo: null,
    total: lines.reduce((s, l) => s + l.amount, 0),
    lines,
  };
  group.logo = logoForGroup(group);
  return group;
}

/** Kelompokkan metode bayar; semua bank selalu tampil (Debit/Credit/QRIS termasuk 0). */
export function groupShiftPayments(byMethod: Record<string, number>): ShiftPaymentGroup[] {
  const map = new Map<string, ShiftPaymentGroup>();

  for (const [method, amount] of Object.entries(byMethod)) {
    if (amount <= 0) continue;
    const meta = groupKeyFor(method);
    if (meta.kind === "bank") continue;

    let group = map.get(meta.key);
    if (!group) {
      group = {
        key: meta.key,
        label: meta.label,
        kind: meta.kind,
        logo: null,
        total: 0,
        lines: [],
      };
      group.logo = logoForGroup(group) ?? logoForPaymentMethod(method);
      map.set(meta.key, group);
    }
    group.total += amount;
    group.lines.push({
      method,
      label: displayMethodLabel(method),
      amount,
    });
  }

  for (const bank of BANK_ORDER) {
    map.set(`bank:${bank}`, buildBankGroup(bank, byMethod));
  }

  const groups = Array.from(map.values());
  for (const g of groups) {
    if (g.kind !== "bank") {
      g.lines.sort((a, b) => kindRank(a.label) - kindRank(b.label) || b.amount - a.amount);
    }
  }
  groups.sort((a, b) => groupRank(a) - groupRank(b) || b.total - a.total);
  return groups;
}
