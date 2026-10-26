import type { PaymentMethod } from "../types/pos";

export type EdcLineStatus =
  | "draft"
  | "pending"
  | "success"
  | "failed"
  | "cancelled";

export type PaymentLine = {
  method: PaymentMethod;
  amount: number;
  status: EdcLineStatus;
  /** ECR / partner ref / trx id */
  ecrTransId?: string;
  partnerReferenceNo?: string;
  bankKey?: string;
  tipeBayar?: string;
  storeId?: string;
  locked: boolean;
  message?: string;
};

export type EdcBankKey = "BCA" | "MDR" | "BNI" | "BRI";

export type EdcStartPayload = {
  method: PaymentMethod;
  amount: number;
  bankKey: EdcBankKey;
  tipeBayar: string;
  storeId?: string;
};

export type EdcStartResult = {
  ok: boolean;
  pending?: boolean;
  status: EdcLineStatus;
  ecrTransId?: string;
  partnerReferenceNo?: string;
  storeId?: string;
  bankKey: EdcBankKey;
  tipeBayar: string;
  amount: number;
  message?: string;
  error?: string;
};

export type EdcStatusResult = {
  ok: boolean;
  status: EdcLineStatus;
  message?: string;
  ecrTransId?: string;
  raw?: unknown;
};

/** Methods that go through EDC hardware/API */
export function isEdcMethod(method: PaymentMethod): boolean {
  return (
    method.startsWith("Debit - ") ||
    method.startsWith("Credit Card - ") ||
    method.startsWith("QRIS - ")
  );
}

export function bankKeyFromMethod(method: PaymentMethod): EdcBankKey | null {
  const name = method.includes(" - ")
    ? method.split(" - ").pop()!.trim().toUpperCase()
    : "";
  if (name === "BCA") return "BCA";
  if (name === "MANDIRI") return "MDR";
  if (name === "BNI") return "BNI";
  if (name === "BRI") return "BRI";
  return null;
}

export function tipeBayarFromMethod(method: PaymentMethod): string {
  if (method.startsWith("QRIS - ")) return "QRIS";
  if (method.startsWith("Debit - ")) return "DEBIT";
  if (method.startsWith("Credit Card - ")) return "CREDIT";
  return method;
}

export function methodTypeLabel(method: PaymentMethod): string {
  if (method.startsWith("Debit - ")) return "Debit";
  if (method.startsWith("Credit Card - ")) return "Credit";
  if (method.startsWith("QRIS - ")) return "QRIS";
  return "Lainnya";
}

export function bankLabelFromMethod(method: PaymentMethod): string {
  if (method.includes(" - ")) return method.split(" - ").pop()!.trim();
  return method;
}

/** Amount counts toward totalPaid / Bayar & Proses */
export function lineCountsTowardPaid(line: PaymentLine): boolean {
  if (line.amount <= 0) return false;
  if (line.status === "cancelled" || line.status === "failed") return false;
  if (isEdcMethod(line.method)) return line.status === "success";
  return true;
}

export function isLineLocked(line: PaymentLine): boolean {
  return Boolean(line.locked) || (isEdcMethod(line.method) && line.status === "success");
}

/** Shown on bank tiles (include pending EDC) */
export function lineDisplayAmount(line: PaymentLine): boolean {
  return line.amount > 0 && line.status !== "cancelled";
}

export function paymentLinesToNominals(lines: PaymentLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lines) {
    if (lineCountsTowardPaid(line)) out[line.method] = line.amount;
  }
  return out;
}

export function paymentLinesToDisplayNominals(lines: PaymentLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lines) {
    if (lineDisplayAmount(line)) out[line.method] = line.amount;
  }
  return out;
}
