export type CashDrawerResult = {
  ok: boolean;
  mode?: string;
  message?: string;
};

type AmsPosBridge = {
  isElectron: true;
  openCashDrawer: () => Promise<CashDrawerResult>;
  getEnv?: () => Promise<{
    isElectron: boolean;
    cashDrawerMode: string;
    hasPrinterShare: boolean;
  }>;
};

declare global {
  interface Window {
    amsPos?: AmsPosBridge;
  }
}

export function isElectronShell(): boolean {
  return Boolean(window.amsPos?.isElectron);
}

/**
 * Web: dummy / pesan saja.
 * Electron: IPC → main process (simulate atau raw ESC/POS ke printer).
 */
export async function openCashDrawer(): Promise<CashDrawerResult> {
  if (window.amsPos?.openCashDrawer) {
    try {
      return await window.amsPos.openCashDrawer();
    } catch (e: any) {
      return {
        ok: false,
        mode: "electron",
        message: e?.message || "Gagal memanggil cash drawer (Electron)",
      };
    }
  }

  return {
    ok: true,
    mode: "web",
    message: "Mode browser — cash drawer hanya aktif di app Electron",
  };
}
