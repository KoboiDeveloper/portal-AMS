import { Dialog, DialogContent } from "../ui/dialog";
import type { TransactionType } from "../../types/pos";
import { cn } from "../../lib/utils";
import { StoreTypeIcon, WhatsAppTypeIcon } from "./TransactionTypeIcons";

type TransactionTypeDialogProps = {
  open: boolean;
  onSelect: (type: TransactionType) => void;
  onCancel: () => void;
};

const OPTIONS: {
  type: TransactionType;
  title: string;
  desc: string;
  icon: typeof StoreTypeIcon;
}[] = [
  {
    type: "OFFLINE",
    title: "Offline",
    desc: "Tunai, kartu debit/kredit, QRIS via EDC toko",
    icon: StoreTypeIcon,
  },
  {
    type: "ONLINE",
    title: "Online",
    desc: "Pembayaran digital / QRIS static online",
    icon: WhatsAppTypeIcon,
  },
];

export function TransactionTypeDialog({
  open,
  onSelect,
  onCancel,
}: TransactionTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent
        className="pos-txtype-dialog"
        hideCloseButton
        accessibleTitle="Pilih tipe transaksi"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="pos-txtype-dialog__head">
          <p className="pos-txtype-dialog__eyebrow">Proses Pembayaran</p>
          <p className="pos-txtype-dialog__title">Pilih Tipe Transaksi</p>
          <p className="pos-txtype-dialog__sub">
            Tentukan dulu transaksi offline atau online sebelum memilih metode bayar.
          </p>
        </div>

        <div className="pos-txtype-dialog__options">
          {OPTIONS.map(({ type, title, desc, icon: Icon }) => (
            <button
              key={type}
              type="button"
              className={cn("pos-txtype-dialog__option", type === "ONLINE" && "is-online")}
              onClick={() => onSelect(type)}
            >
              <span
                className={cn(
                  "pos-txtype-dialog__option-icon",
                  type === "ONLINE" ? "is-online" : "is-offline"
                )}
              >
                <Icon size={26} />
              </span>
              <span className="pos-txtype-dialog__option-body">
                <strong>{title}</strong>
                <small>{desc}</small>
              </span>
            </button>
          ))}
        </div>

        <button type="button" className="pos-txtype-dialog__cancel" onClick={onCancel}>
          Batal
        </button>
      </DialogContent>
    </Dialog>
  );
}
