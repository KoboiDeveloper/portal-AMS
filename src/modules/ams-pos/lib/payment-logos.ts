/** Logo bank EDC */
export const BANK_LOGO: Record<string, string> = {
  BCA: "/banks/bca.png",
  BNI: "/banks/bni.png",
  BRI: "/banks/bri.png",
  Mandiri: "/banks/mandiri.png",
};

/** Logo dompet digital */
export const WALLET_LOGO: Record<string, string> = {
  OVO: "/wallets/ovo.png?v=2",
  INDODANA: "/wallets/indodana.png",
};

export function logoForPaymentMethod(method: string): string | null {
  if (WALLET_LOGO[method]) return WALLET_LOGO[method];
  const parts = method.split(" - ");
  const bank = parts.length >= 2 ? parts[parts.length - 1] : "";
  return bank && BANK_LOGO[bank] ? BANK_LOGO[bank] : null;
}
