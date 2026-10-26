import { Loader2, RefreshCw, XCircle, CheckCircle2 } from "lucide-react";
import type { EdcLineStatus } from "../types";
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
  status: EdcLineStatus;
  message?: string;
  ecrTransId?: string;
  checking?: boolean;
  cancelling?: boolean;
  onCheckStatus: () => void;
  onCancel: () => void;
  onDone?: () => void;
};

export function EdcPaymentPanel({
  method,
  amount,
  status,
  message,
  ecrTransId,
  checking,
  cancelling,
  onCheckStatus,
  onCancel,
  onDone,
}: Props) {
  const bank = bankLabelFromMethod(method);
  const kind = methodTypeLabel(method);
  const logo = BANK_LOGO[bank];
  const isSuccess = status === "success";
  const isFailed = status === "failed";
  const isPending = status === "pending" || status === "draft";

  return (
    <div className="pos-edc-panel">
      <div className="pos-edc-panel__accent" />

      <div className="pos-edc-panel__head">
        <div className="pos-edc-panel__logo">
          {logo ? <img src={logo} alt={bank} /> : <span>{bank}</span>}
        </div>
        <div className="pos-edc-panel__head-info">
          <span className="pos-edc-panel__chip">{kind}</span>
          <p className="pos-edc-panel__bank">{bank}</p>
          <p className="pos-edc-panel__method">{method}</p>
        </div>
        <p className="pos-edc-panel__amount">{fmt(amount)}</p>
      </div>

      <div className="pos-edc-panel__status">
        {isPending && (
          <>
            <div className="pos-edc-panel__icon is-pending">
              <Loader2 size={36} className="pos-edc-panel__spin" />
            </div>
            <p className="pos-edc-panel__status-title">Menunggu EDC</p>
            <p className="pos-edc-panel__status-msg">
              {message || "Selesaikan transaksi di mesin EDC, lalu tekan Cek Transaksi."}
            </p>
          </>
        )}

        {isSuccess && (
          <>
            <div className="pos-edc-panel__icon is-success">
              <CheckCircle2 size={40} />
            </div>
            <p className="pos-edc-panel__status-title is-success">Pembayaran berhasil</p>
            <p className="pos-edc-panel__status-msg">
              Nominal terkunci dan tidak bisa diedit lagi.
            </p>
          </>
        )}

        {isFailed && (
          <>
            <div className="pos-edc-panel__icon is-failed">
              <XCircle size={40} />
            </div>
            <p className="pos-edc-panel__status-title is-failed">Transaksi gagal</p>
            <p className="pos-edc-panel__status-msg">
              {message || "Coba Cek Transaksi lagi atau batalkan."}
            </p>
          </>
        )}

        {ecrTransId && (
          <p className="pos-edc-panel__ref">REF · {ecrTransId}</p>
        )}
      </div>

      <div className="pos-edc-panel__foot">
        {!isSuccess && (
          <>
            <button
              type="button"
              className="pos-edc-panel__btn is-primary"
              disabled={checking || cancelling}
              onClick={onCheckStatus}
            >
              {checking ? (
                <Loader2 size={16} className="pos-edc-panel__spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Cek Transaksi
            </button>
            <button
              type="button"
              className="pos-edc-panel__btn is-danger"
              disabled={checking || cancelling}
              onClick={onCancel}
            >
              {cancelling ? <Loader2 size={16} className="pos-edc-panel__spin" /> : null}
              Cancel · Batalkan TRANS
            </button>
          </>
        )}
        {isSuccess && (
          <button type="button" className="pos-edc-panel__btn is-success" onClick={onDone}>
            Selesai
          </button>
        )}
      </div>
    </div>
  );
}
