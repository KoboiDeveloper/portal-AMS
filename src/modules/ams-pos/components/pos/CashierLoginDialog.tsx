import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, Lock, UserRound } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import {
  authenticateCashierDummy,
  DUMMY_CASHIER_HINT,
} from "../../lib/cashier-auth-dummy";
import type { CashierSession } from "../../types/pos";

type CashierLoginDialogProps = {
  open: boolean;
  reason?: "open-pos" | "transaction";
  /** Kasir tersimpan — mode unlock password saja */
  knownCashier?: CashierSession | null;
  onSuccess: (cashier: CashierSession) => void;
  onCancel?: () => void;
  allowCancel?: boolean;
  /** Label tombol batal/kembali */
  cancelLabel?: string;
  /** Buka Ringkasan Shift sebelum ganti kasir */
  onRequestSwitchCashier?: () => void;
};

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "CS";
}

export function CashierLoginDialog({
  open,
  reason = "open-pos",
  knownCashier = null,
  onSuccess,
  onCancel,
  allowCancel = false,
  cancelLabel = "Kembali",
  onRequestSwitchCashier,
}: CashierLoginDialogProps) {
  const [cashierId, setCashierId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const unlockMode = Boolean(knownCashier);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError("");
    setBusy(false);
    setCashierId(knownCashier?.id ?? "");
  }, [open, knownCashier?.id]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    const id = unlockMode ? knownCashier!.id : cashierId.trim();
    if (!id || !password.trim()) {
      setError(unlockMode ? "Masukkan password kasir" : "Isi ID kasir dan password");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 280));
    const session = authenticateCashierDummy(id, password);
    setBusy(false);
    if (!session) {
      setError(unlockMode ? "Password salah" : "ID atau password salah");
      return;
    }
    if (unlockMode && knownCashier && session.id !== knownCashier.id) {
      setError("Password salah");
      return;
    }
    setPassword("");
    onSuccess(session);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && allowCancel) onCancel?.();
      }}
    >
      <DialogContent
        className="pos-cashier-login"
        hideCloseButton
        accessibleTitle={unlockMode ? "Konfirmasi password kasir" : "Login kasir"}
        zIndex={10300}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (!allowCancel) e.preventDefault();
        }}
      >
        <div className="pos-cashier-login__head">
          <span className="pos-cashier-login__icon">
            <Lock size={18} />
          </span>
          <div>
            <p className="pos-cashier-login__eyebrow">
              {reason === "transaction"
                ? "Konfirmasi transaksi"
                : unlockMode
                  ? "Buka kembali POS"
                  : "Buka POS"}
            </p>
            <strong className="pos-cashier-login__title">
              {unlockMode ? "Masukkan Password" : "Sign in Kasir"}
            </strong>
          </div>
        </div>

        <form className="pos-cashier-login__body" onSubmit={(e) => void submit(e)}>
          {unlockMode && knownCashier ? (
            <div className="pos-cashier-login__profile">
              <div className="pos-cashier-login__avatar">{initials(knownCashier.name)}</div>
              <div className="pos-cashier-login__profile-text">
                <span>CASHIER · Shift {knownCashier.shift}</span>
                <strong>{knownCashier.name}</strong>
                <em>{knownCashier.id}</em>
              </div>
            </div>
          ) : (
            <p className="pos-cashier-login__desc">
              Store aktif memakai 2 shift. Masukkan ID &amp; password kasir untuk
              membuka POS.
            </p>
          )}

          {!unlockMode && (
            <label className="pos-cashier-login__field">
              <span>ID Kasir</span>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={cashierId}
                onChange={(e) => setCashierId(e.target.value)}
                placeholder="contoh: kasir1"
              />
            </label>
          )}

          <label className="pos-cashier-login__field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              autoFocus={unlockMode}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
            />
          </label>

          {error ? <p className="pos-cashier-login__error">{error}</p> : null}
          {!unlockMode ? <p className="pos-cashier-login__hint">{DUMMY_CASHIER_HINT}</p> : null}

          <div className="pos-cashier-login__actions">
            {allowCancel && onCancel ? (
              <button type="button" className="is-back" onClick={onCancel} disabled={busy}>
                <ArrowLeft size={15} />
                {cancelLabel}
              </button>
            ) : null}
            <button type="submit" className="is-primary" disabled={busy}>
              <KeyRound size={15} />
              {busy ? "Memeriksa…" : unlockMode ? "Buka POS" : "Masuk"}
            </button>
          </div>

          {knownCashier && onRequestSwitchCashier ? (
            <button
              type="button"
              className="pos-cashier-login__switch"
              disabled={busy}
              onClick={onRequestSwitchCashier}
            >
              <UserRound size={14} />
              Ganti kasir
            </button>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
