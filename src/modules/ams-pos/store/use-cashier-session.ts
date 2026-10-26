import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CashierSession, CashierShiftSummary } from "../types/pos";
import { getDummyShiftSummary } from "../lib/cashier-auth-dummy";

/** Identitas kasir hangus jika POS tidak dibuka selama 12 hari */
export const CASHIER_SESSION_MAX_MS = 12 * 24 * 60 * 60 * 1000;

const emptySummary = (): CashierShiftSummary => ({
  txCount: 0,
  totalAmount: 0,
  byMethod: {},
});

function isEmptySummary(summary: CashierShiftSummary | null | undefined): boolean {
  if (!summary) return true;
  return (
    summary.txCount <= 0 &&
    summary.totalAmount <= 0 &&
    Object.keys(summary.byMethod || {}).length === 0
  );
}

type CashierState = {
  cashier: CashierSession | null;
  signedInAt: number | null;
  lastActivityAt: number | null;
  shiftSummary: CashierShiftSummary;
  /** Unlock sesi POS saat ini — tidak di-persist; tiap buka POS harus password lagi */
  unlocked: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  signIn: (cashier: CashierSession) => void;
  unlock: () => void;
  lock: () => void;
  signOut: () => void;
  touchActivity: () => void;
  recordSale: (payments: Record<string, number>, saleTotal: number) => void;
};

function isValid(lastActivityAt: number | null, cashier: CashierSession | null): boolean {
  if (!cashier || !lastActivityAt) return false;
  return Date.now() - lastActivityAt < CASHIER_SESSION_MAX_MS;
}

export const useCashierSession = create<CashierState>()(
  persist(
    (set, get) => ({
      cashier: null,
      signedInAt: null,
      lastActivityAt: null,
      shiftSummary: emptySummary(),
      unlocked: false,
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      signIn: (cashier) => {
        const now = Date.now();
        const prev = get().cashier;
        const keepSummary = prev?.id === cashier.id && !isEmptySummary(get().shiftSummary);
        set({
          cashier,
          signedInAt: now,
          lastActivityAt: now,
          unlocked: true,
          // Sementara pakai dummy sampai API shift summary siap
          shiftSummary: keepSummary ? get().shiftSummary : getDummyShiftSummary(cashier.id),
        });
      },
      unlock: () => {
        const { cashier, shiftSummary } = get();
        if (!cashier) return;
        set({
          unlocked: true,
          lastActivityAt: Date.now(),
          shiftSummary: isEmptySummary(shiftSummary)
            ? getDummyShiftSummary(cashier.id)
            : shiftSummary,
        });
      },
      lock: () => set({ unlocked: false }),
      signOut: () =>
        set({
          cashier: null,
          signedInAt: null,
          lastActivityAt: null,
          unlocked: false,
          shiftSummary: emptySummary(),
        }),
      touchActivity: () => {
        const { cashier, unlocked } = get();
        if (!cashier || !unlocked) return;
        set({ lastActivityAt: Date.now() });
      },
      recordSale: (payments, saleTotal) => {
        const { cashier, unlocked, shiftSummary } = get();
        if (!cashier || !unlocked) return;
        const byMethod = { ...shiftSummary.byMethod };
        for (const [method, amount] of Object.entries(payments)) {
          if (amount <= 0) continue;
          byMethod[method] = (byMethod[method] ?? 0) + amount;
        }
        set({
          shiftSummary: {
            txCount: shiftSummary.txCount + 1,
            totalAmount: shiftSummary.totalAmount + Math.max(0, saleTotal),
            byMethod,
          },
          lastActivityAt: Date.now(),
        });
      },
    }),
    {
      name: "ams-pos-cashier-session",
      partialize: (state) => ({
        cashier: state.cashier,
        signedInAt: state.signedInAt,
        lastActivityAt: state.lastActivityAt,
        shiftSummary: state.shiftSummary,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (isEmptySummary(state.shiftSummary) && state.cashier) {
            state.shiftSummary = getDummyShiftSummary(state.cashier.id);
          } else if (!state.shiftSummary) {
            state.shiftSummary = emptySummary();
          }
          if (!isValid(state.lastActivityAt, state.cashier)) {
            state.signOut();
          } else {
            state.lock();
          }
          state.setHasHydrated(true);
        } else {
          useCashierSession.getState().setHasHydrated(true);
        }
      },
    }
  )
);

export function selectCashierSessionValid(state: {
  cashier: CashierSession | null;
  lastActivityAt: number | null;
}): boolean {
  return isValid(state.lastActivityAt, state.cashier);
}

export function selectCashierUnlocked(state: {
  cashier: CashierSession | null;
  lastActivityAt: number | null;
  unlocked: boolean;
}): boolean {
  return state.unlocked && selectCashierSessionValid(state);
}
