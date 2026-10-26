import type { CashierSession, CashierShiftSummary } from "../types/pos";

/** Dummy akun kasir — ganti API nyata nanti */
const DUMMY_CASHIERS: Array<CashierSession & { password: string }> = [
  { id: "kasir1", password: "1234", name: "Budi Santoso", shift: "1" },
  { id: "kasir2", password: "1234", name: "Siti Aminah", shift: "2" },
];

/** Ringkasan shift dummy — method key mengikuti format POS (Debit/Credit/QRIS - Bank) */
const DUMMY_SHIFT_BY_CASHIER: Record<string, CashierShiftSummary> = {
  kasir1: {
    txCount: 12,
    totalAmount: 4_875_000,
    byMethod: {
      Cash: 1_250_000,
      "Debit - BCA": 980_000,
      "Credit Card - BCA": 620_000,
      "QRIS - BCA": 450_000,
      "Debit - Mandiri": 420_000,
      "Credit Card - Mandiri": 180_000,
      "QRIS - BNI": 320_000,
      OVO: 355_000,
      INDODANA: 300_000,
    },
  },
  kasir2: {
    txCount: 8,
    totalAmount: 3_210_000,
    byMethod: {
      Cash: 780_000,
      "Debit - BNI": 540_000,
      "Credit Card - BNI": 260_000,
      "QRIS - BNI": 310_000,
      "Debit - BRI": 400_000,
      "QRIS - BRI": 240_000,
      "Debit - BCA": 300_000,
      OVO: 280_000,
      INDODANA: 100_000,
    },
  },
};

const FALLBACK_DUMMY_SHIFT: CashierShiftSummary = {
  txCount: 5,
  totalAmount: 1_575_000,
  byMethod: {
    Cash: 500_000,
    "Debit - BCA": 450_000,
    "Credit Card - BCA": 300_000,
    "QRIS - BCA": 325_000,
  },
};

export function authenticateCashierDummy(
  cashierId: string,
  password: string
): CashierSession | null {
  const id = cashierId.trim().toLowerCase();
  const pwd = password.trim();
  const hit = DUMMY_CASHIERS.find(
    (row) => row.id.toLowerCase() === id && row.password === pwd
  );
  if (!hit) return null;
  return { id: hit.id, name: hit.name, shift: hit.shift };
}

export function getDummyShiftSummary(cashierId?: string | null): CashierShiftSummary {
  if (!cashierId) {
    return {
      ...FALLBACK_DUMMY_SHIFT,
      byMethod: { ...FALLBACK_DUMMY_SHIFT.byMethod },
    };
  }
  const hit = DUMMY_SHIFT_BY_CASHIER[cashierId.toLowerCase()];
  if (!hit) {
    return {
      ...FALLBACK_DUMMY_SHIFT,
      byMethod: { ...FALLBACK_DUMMY_SHIFT.byMethod },
    };
  }
  return {
    txCount: hit.txCount,
    totalAmount: hit.totalAmount,
    byMethod: { ...hit.byMethod },
  };
}

export const DUMMY_CASHIER_HINT =
  "Demo: kasir1 / 1234 (Shift 1) · kasir2 / 1234 (Shift 2)";
