import { bankLabelFromMethod, methodTypeLabel } from "../types";
import type { PaymentMethod } from "../../types/pos";

const BANK_LOGO: Record<string, string> = {
  BCA: "/banks/bca.png",
  BNI: "/banks/bni.png",
  BRI: "/banks/bri.png",
  Mandiri: "/banks/mandiri.png",
};

function fmt(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

type Props = {
  method: PaymentMethod;
  amount: number;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Verifikasi sebelum kirim ke mesin EDC — Softnio tone */
export function EdcVerifyDialog({ method, amount, busy, onConfirm, onCancel }: Props) {
  const bank = bankLabelFromMethod(method);
  const kind = methodTypeLabel(method);
  const logo = BANK_LOGO[bank];

  return (
    <div className="pos-edc-verify">
      <div className="pos-edc-verify__card">
        <div className="pos-edc-verify__accent" />

        <div className="pos-edc-verify__body">
          <p className="pos-edc-verify__eyebrow">Verifikasi ke EDC</p>

          <div className="pos-edc-verify__logo">
            {logo ? <img src={logo} alt={bank} /> : <span>{bank}</span>}
          </div>

          <p className="pos-edc-verify__bank">{bank}</p>
          <p className="pos-edc-verify__kind">{kind}</p>
          <p className="pos-edc-verify__amount">{fmt(amount)}</p>
          <p className="pos-edc-verify__method">{method}</p>

          <p className="pos-edc-verify__hint">
            Pastikan bank, jenis bayar, dan nominal sudah benar. Transaksi akan dikirim ke mesin EDC.
          </p>

          <div className="pos-edc-verify__actions">
            <button type="button" disabled={busy} onClick={onCancel}>
              Batal
            </button>
            <button type="button" className="is-primary" disabled={busy} onClick={onConfirm}>
              {busy ? "Mengirim…" : "Kirim ke EDC"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
