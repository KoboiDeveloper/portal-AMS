
import { useState } from "react";
import { AlertTriangle, CreditCard, User, UserX } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import { MemberDialog } from "./MemberDialog";
import { StoreTypeIcon, WhatsAppTypeIcon } from "./TransactionTypeIcons";
import { logoForPaymentMethod } from "../../lib/payment-logos";
import type { Member, PaymentMethod, TransactionType, RedeemVoucher } from "../../types/pos";

type ConfirmOrderDialogProps = {
  open: boolean;
  transactionType: TransactionType;
  member: Member | null;
  redeemVoucher?: RedeemVoucher | null;
  paymentNominals: Record<string, number>;
  grandTotal: number;
  maxRedeemAmount?: number;
  processLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onMemberChange: (member: Member | null) => void;
  onRedeemApply?: (voucher: RedeemVoucher) => void;
  onRedeemClear?: () => void;
};

function fmt(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function getShortLabel(method: PaymentMethod): string {
  if (method === "Cash") return "Tunai";
  if (method.startsWith("Debit - ")) return `Debit ${method.replace("Debit - ", "")}`;
  if (method.startsWith("Credit Card - ")) return `Credit ${method.replace("Credit Card - ", "")}`;
  if (method.startsWith("QRIS - ")) return `QRIS ${method.replace("QRIS - ", "")}`;
  return method;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ConfirmOrderDialog({
  open,
  transactionType,
  member,
  redeemVoucher = null,
  paymentNominals,
  grandTotal,
  maxRedeemAmount,
  processLoading,
  onConfirm,
  onCancel,
  onMemberChange,
  onRedeemApply,
  onRedeemClear,
}: ConfirmOrderDialogProps) {
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);

  const paymentEntries = Object.entries(paymentNominals).filter(([, v]) => v > 0);
  const totalPaid = paymentEntries.reduce((sum, [, v]) => sum + v, 0);
  const change = totalPaid - grandTotal;
  const isSufficient = totalPaid >= grandTotal;
  const hasPayment = paymentEntries.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
        <DialogContent
          className="pos-confirm-dialog"
          overlayClassName="bg-black/55"
          hideCloseButton
          accessibleTitle="Konfirmasi pembayaran"
          zIndex={10100}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="pos-confirm__header">
            <p className="pos-confirm__eyebrow">Konfirmasi Pembayaran</p>
            <strong className="pos-confirm__title">Periksa kembali pesanan</strong>
          </div>

          <div className="pos-confirm__body">
            <div className="pos-confirm__row">
              <span className="pos-confirm__label">
                <span
                  className={`pos-confirm__type-icon is-${transactionType === "ONLINE" ? "online" : "offline"}`}
                >
                  {transactionType === "ONLINE" ? (
                    <WhatsAppTypeIcon size={16} />
                  ) : (
                    <StoreTypeIcon size={16} />
                  )}
                </span>
                Tipe transaksi
              </span>
              <strong>{transactionType}</strong>
            </div>

            <div className={`pos-confirm__member${member ? "" : " is-empty"}`}>
              <span className="pos-confirm__label">
                <User size={14} />
                Member
              </span>
              {member ? (
                <div className="pos-confirm__member-row">
                  <div className="pos-confirm__avatar">{initials(member.name)}</div>
                  <div className="pos-confirm__member-text">
                    <strong>{member.name}</strong>
                    <span>
                      {member.tier} · {member.points.toLocaleString("id-ID")} pts
                    </span>
                  </div>
                  <div className="pos-confirm__member-actions">
                    <button type="button" onClick={() => setMemberDialogOpen(true)}>
                      Ganti
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      title="Hapus member"
                      onClick={() => onMemberChange(null)}
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pos-confirm__guest">
                  <AlertTriangle size={14} />
                  <div>
                    <p>Belum ada member — lanjut sebagai guest.</p>
                    <button type="button" onClick={() => setMemberDialogOpen(true)}>
                      Tambah member
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pos-confirm__pay">
              <span className="pos-confirm__label">
                <CreditCard size={14} />
                Metode pembayaran
              </span>

              {!hasPayment ? (
                <p className="pos-confirm__warn">
                  Belum ada metode pembayaran. Pilih minimal satu sebelum lanjut.
                </p>
              ) : (
                <>
                  {paymentEntries.map(([method, amount]) => {
                    const logo = logoForPaymentMethod(method);
                    return (
                      <div key={method} className="pos-confirm__payrow">
                        {logo ? (
                          <img src={logo} alt={method} />
                        ) : (
                          <span className="pos-confirm__pay-fallback">
                            {method.slice(0, 5).toUpperCase()}
                          </span>
                        )}
                        <p>{getShortLabel(method as PaymentMethod)}</p>
                        <strong>{fmt(amount)}</strong>
                      </div>
                    );
                  })}

                  <div className="pos-confirm__sum">
                    <div>
                      <span>Total tagihan</span>
                      <strong>{fmt(grandTotal)}</strong>
                    </div>
                    <div>
                      <span>Total dibayar</span>
                      <strong className={isSufficient ? "is-ok" : "is-short"}>{fmt(totalPaid)}</strong>
                    </div>
                    <div className="is-total">
                      <span>{change >= 0 ? "Kembalian" : "Kurang bayar"}</span>
                      <strong className={change >= 0 ? "is-ok" : "is-short"}>
                        {fmt(Math.abs(change))}
                      </strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pos-confirm__footer">
            <button
              type="button"
              onClick={onCancel}
              disabled={processLoading}
            >
              Kembali
            </button>
            <button
              type="button"
              className="is-primary"
              onClick={onConfirm}
              disabled={processLoading || !hasPayment || !isSufficient}
            >
              {processLoading ? "Memproses…" : "Ya, lanjutkan"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <MemberDialog
        selectedMember={member}
        onSelect={onMemberChange}
        redeemVoucher={redeemVoucher}
        onRedeemApply={onRedeemApply}
        onRedeemClear={onRedeemClear}
        maxRedeemAmount={maxRedeemAmount}
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        hideDefaultTrigger
        zIndex={10200}
      />
    </>
  );
}
