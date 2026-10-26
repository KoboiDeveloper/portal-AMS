import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Crown,
  Gift,
  Search,
  ShieldCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import { members } from "../../data/pos-mock";
import type { Member, RedeemVoucher } from "../../types/pos";

const REDEEM_PRESETS = [5000, 10000, 20000, 50000, 100000] as const;
const MIN_REDEEM = 5000;
/** Mock OTP untuk kasir demo — ganti API nyata nanti */
const DEMO_OTP = "123456";
/** 1 poin = Rp1 (sesuaikan rate backend nanti) */
const POINT_TO_RUPIAH = 1;

type Step = "list" | "mode" | "amount" | "otp";

type MemberDialogProps = {
  selectedMember: Member | null;
  onSelect: (member: Member | null) => void;
  redeemVoucher?: RedeemVoucher | null;
  onRedeemApply?: (voucher: RedeemVoucher) => void;
  onRedeemClear?: () => void;
  /** Sisa tagihan yang boleh di-cover redeem (setelah promo) */
  maxRedeemAmount?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideDefaultTrigger?: boolean;
  zIndex?: number;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function tierClass(tier: string): string {
  const key = tier.toLowerCase();
  if (key.includes("gold")) return "is-gold";
  if (key.includes("silver")) return "is-silver";
  if (key.includes("platinum")) return "is-platinum";
  return "is-default";
}

function fmtRp(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function makeVoucherCode(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RDM-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export function MemberDialog({
  selectedMember,
  onSelect,
  redeemVoucher = null,
  onRedeemApply,
  onRedeemClear,
  maxRedeemAmount = Number.POSITIVE_INFINITY,
  open: controlledOpen,
  onOpenChange,
  hideDefaultTrigger = false,
  zIndex,
}: MemberDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>("list");
  const [pendingMember, setPendingMember] = useState<Member | null>(null);
  const [amount, setAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const filtered = useMemo(
    () =>
      members.filter((m) =>
        `${m.name} ${m.address}`.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  const maxByPoints = pendingMember
    ? Math.floor(pendingMember.points * POINT_TO_RUPIAH)
    : 0;
  const billCap = Number.isFinite(maxRedeemAmount) ? maxRedeemAmount : Number.POSITIVE_INFINITY;
  const redeemCeiling = Math.max(0, Math.min(maxByPoints, billCap));
  const redeemBlockedByBill = maxByPoints >= MIN_REDEEM && billCap < MIN_REDEEM;
  const redeemBlockedByPoints = maxByPoints < MIN_REDEEM;

  const amountValid =
    amount >= MIN_REDEEM && amount <= redeemCeiling && amount % 1000 === 0;

  const resetWizard = () => {
    setQuery("");
    setStep("list");
    setPendingMember(null);
    setAmount(0);
    setCustomAmount("");
    setOtpSent(false);
    setOtpCode("");
    setOtpError("");
    setSendingOtp(false);
    setVerifying(false);
    setResendIn(0);
  };

  useEffect(() => {
    if (!open) resetWizard();
  }, [open]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const handleOpenChange = (v: boolean) => {
    if (!v) resetWizard();
    setOpen(v);
  };

  const pickMember = (m: Member) => {
    setPendingMember(m);
    setStep("mode");
  };

  const addMemberOnly = () => {
    if (!pendingMember) return;
    onSelect(pendingMember);
    setOpen(false);
  };

  const goRedeem = () => {
    setAmount(0);
    setCustomAmount("");
    setOtpSent(false);
    setOtpCode("");
    setOtpError("");
    setStep("amount");
  };

  const selectPreset = (value: number) => {
    if (value > redeemCeiling) return;
    setAmount(value);
    setCustomAmount("");
    // Ubah nominal → OTP lama tidak berlaku
    setOtpSent(false);
    setOtpCode("");
    setOtpError("");
  };

  const onCustomChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    setCustomAmount(digits);
    const n = digits ? Number(digits) : 0;
    setAmount(n);
    setOtpSent(false);
    setOtpCode("");
    setOtpError("");
  };

  const sendOtp = async () => {
    if (!amountValid || !pendingMember) return;
    setSendingOtp(true);
    setOtpError("");
    await new Promise((r) => setTimeout(r, 450));
    setSendingOtp(false);
    setOtpSent(true);
    setResendIn(60);
    setStep("otp");
  };

  const verifyOtp = async () => {
    if (!pendingMember || !amountValid) return;
    setVerifying(true);
    setOtpError("");
    await new Promise((r) => setTimeout(r, 400));
    if (otpCode.trim() !== DEMO_OTP) {
      setOtpError("OTP tidak valid. Coba lagi.");
      setVerifying(false);
      return;
    }
    const voucher: RedeemVoucher = {
      code: makeVoucherCode(),
      memberId: pendingMember.id,
      memberName: pendingMember.name,
      amount,
      pointsUsed: Math.ceil(amount / POINT_TO_RUPIAH),
    };
    onSelect(pendingMember);
    onRedeemApply?.(voucher);
    setVerifying(false);
    setOpen(false);
  };

  const clearMember = () => {
    onSelect(null);
    onRedeemClear?.();
  };

  const stepTitle =
    step === "list"
      ? "Pilih Member"
      : step === "mode"
        ? "Aksi Member"
        : step === "amount"
          ? "Redeem Point"
          : "Verifikasi OTP";

  return (
    <>
      {!hideDefaultTrigger &&
        (selectedMember ? (
          <div className="pos-member-chip">
            <div className="pos-member-avatar">{getInitials(selectedMember.name)}</div>
            <button type="button" className="pos-member-chip__name" onClick={() => setOpen(true)}>
              <span className="pos-member-chip__label">{selectedMember.name}</span>
              {redeemVoucher ? (
                <span className="pos-member-chip__redeem">
                  Redeem {fmtRp(redeemVoucher.amount)}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="pos-member-chip__clear"
              title="Hapus member"
              onClick={clearMember}
            >
              <UserX size={16} />
            </button>
          </div>
        ) : (
          <button type="button" className="pos-member-trigger" onClick={() => setOpen(true)}>
            <UserPlus size={16} />
            Tambah Member
          </button>
        ))}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="pos-member-dialog"
          hideCloseButton
          accessibleTitle={stepTitle}
          zIndex={zIndex}
        >
          <div className="pos-member-dialog__header">
            <div className="pos-member-dialog__title">
              {step !== "list" ? (
                <button
                  type="button"
                  className="pos-member-dialog__back"
                  onClick={() => {
                    if (step === "mode") setStep("list");
                    else if (step === "amount") setStep("mode");
                    else if (step === "otp") setStep("amount");
                  }}
                  aria-label="Kembali"
                >
                  <ArrowLeft size={16} />
                </button>
              ) : (
                <Crown size={18} />
              )}
              <span>{stepTitle}</span>
            </div>
            <button
              type="button"
              className="pos-member-dialog__close"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>

          {step === "list" && (
            <>
              <div className="pos-member-dialog__search">
                <div className="pos-member-dialog__search-wrap">
                  <Search size={16} className="pos-member-dialog__search-icon" />
                  <input
                    type="text"
                    className="pos-member-dialog__input"
                    placeholder="Cari nama, alamat, atau telepon…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <p className="pos-member-dialog__count">
                  {filtered.length} hasil dari {members.length} member
                </p>
              </div>

              <div className="pos-member-dialog__list">
                {filtered.length === 0 ? (
                  <div className="pos-member-dialog__empty">
                    <Search size={28} strokeWidth={1.5} />
                    <p>Tidak ditemukan</p>
                  </div>
                ) : (
                  filtered.map((m) => {
                    const isActive = selectedMember?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`pos-member-dialog__item${isActive ? " is-active" : ""}`}
                        onClick={() => pickMember(m)}
                      >
                        <div className="pos-member-avatar">{getInitials(m.name)}</div>
                        <div className="pos-member-dialog__item-body">
                          <div className="pos-member-dialog__item-top">
                            <strong className="pos-member-dialog__item-name">{m.name}</strong>
                            <span className={`pos-member-dialog__tier ${tierClass(m.tier)}`}>
                              {m.tier}
                            </span>
                          </div>
                          <div className="pos-member-dialog__item-addr">{m.address}</div>
                          <div className="pos-member-dialog__item-pts">
                            {m.points.toLocaleString("id-ID")} pts · {fmtRp(m.points * POINT_TO_RUPIAH)}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {step === "mode" && pendingMember && (
            <div className="pos-member-dialog__panel">
              <div className="pos-member-dialog__picked">
                <div className="pos-member-avatar is-lg">{getInitials(pendingMember.name)}</div>
                <div className="pos-member-dialog__picked-body">
                  <strong>{pendingMember.name}</strong>
                  <p className="pos-member-dialog__picked-meta">{pendingMember.address}</p>
                  <div className="pos-member-dialog__picked-stats">
                    <div className="pos-member-dialog__stat">
                      <span>Tier</span>
                      <strong>{pendingMember.tier}</strong>
                    </div>
                    <div className="pos-member-dialog__stat is-points">
                      <span>Poin</span>
                      <strong>{pendingMember.points.toLocaleString("id-ID")}</strong>
                    </div>
                    <div className="pos-member-dialog__stat">
                      <span>Nilai</span>
                      <strong>{fmtRp(pendingMember.points * POINT_TO_RUPIAH)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <p className="pos-member-dialog__hint">Pilih aksi untuk member ini</p>

              <div className="pos-member-dialog__actions">
                <button type="button" className="pos-member-action" onClick={addMemberOnly}>
                  <UserPlus size={22} />
                  <span>
                    <strong>Tambah Member</strong>
                    <small>Pasang ke transaksi · akumulasi poin belanja</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="pos-member-action is-redeem"
                  onClick={goRedeem}
                  disabled={redeemCeiling < MIN_REDEEM}
                >
                  <Gift size={22} />
                  <span>
                    <strong>Redeem Point</strong>
                    <small>
                      {redeemBlockedByPoints
                        ? `Poin kurang (min ${fmtRp(MIN_REDEEM)})`
                        : redeemBlockedByBill
                          ? `Tambah produk dulu — sisa tagihan ${fmtRp(
                              Number.isFinite(billCap) ? billCap : 0
                            )} (min ${fmtRp(MIN_REDEEM)})`
                          : `Maks ${fmtRp(redeemCeiling)} · butuh OTP`}
                    </small>
                  </span>
                </button>
              </div>
            </div>
          )}

          {step === "amount" && pendingMember && (
            <div className="pos-member-dialog__panel">
              <div className="pos-member-dialog__picked is-compact">
                <div className="pos-member-avatar is-lg">{getInitials(pendingMember.name)}</div>
                <div className="pos-member-dialog__picked-body">
                  <strong>{pendingMember.name}</strong>
                  <p className="pos-member-dialog__picked-meta">{pendingMember.address}</p>
                  <div className="pos-member-dialog__picked-stats">
                    <div className="pos-member-dialog__stat is-points">
                      <span>Saldo</span>
                      <strong>{fmtRp(maxByPoints)}</strong>
                    </div>
                    <div className="pos-member-dialog__stat">
                      <span>Maks redeem</span>
                      <strong>{fmtRp(redeemCeiling)}</strong>
                    </div>
                    <div className="pos-member-dialog__stat">
                      <span>Tier</span>
                      <strong>{pendingMember.tier}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <p className="pos-member-dialog__hint">Pilih nominal redeem (min {fmtRp(MIN_REDEEM)})</p>

              <div className="pos-member-dialog__chips">
                {REDEEM_PRESETS.map((preset) => {
                  const disabled = preset > redeemCeiling;
                  const active = amount === preset && !customAmount;
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`pos-member-chip-amt${active ? " is-active" : ""}`}
                      disabled={disabled}
                      onClick={() => selectPreset(preset)}
                    >
                      {fmtRp(preset)}
                    </button>
                  );
                })}
              </div>

              <label className="pos-member-dialog__field">
                <span>Atau ketik nominal</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="pos-member-dialog__input is-plain"
                  placeholder="Contoh: 15000"
                  value={customAmount}
                  onChange={(e) => onCustomChange(e.target.value)}
                />
              </label>

              {amount > 0 && !amountValid && (
                <p className="pos-member-dialog__error">
                  {amount < MIN_REDEEM
                    ? `Minimal ${fmtRp(MIN_REDEEM)}`
                    : amount > redeemCeiling
                      ? `Maksimal ${fmtRp(redeemCeiling)}`
                      : "Nominal harus kelipatan Rp1.000"}
                </p>
              )}

              <button
                type="button"
                className="pos-member-dialog__primary"
                disabled={!amountValid || sendingOtp}
                onClick={() => void sendOtp()}
              >
                <ShieldCheck size={16} />
                {sendingOtp ? "Mengirim OTP…" : `Kirim OTP · ${fmtRp(amount || 0)}`}
              </button>
            </div>
          )}

          {step === "otp" && pendingMember && (
            <div className="pos-member-dialog__panel">
              <div className="pos-member-dialog__otp-head">
                <ShieldCheck size={22} />
                <div>
                  <strong>Verifikasi redeem {fmtRp(amount)}</strong>
                  <p>
                    OTP dikirim ke nomor terdaftar {pendingMember.name}. Kode terkunci ke
                    nominal ini.
                  </p>
                </div>
              </div>

              <label className="pos-member-dialog__field">
                <span>Kode OTP</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="pos-member-dialog__input is-otp"
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setOtpError("");
                  }}
                  autoFocus
                />
              </label>

              {otpError && <p className="pos-member-dialog__error">{otpError}</p>}

              <p className="pos-member-dialog__demo">Demo OTP: {DEMO_OTP}</p>

              <div className="pos-member-dialog__otp-actions">
                <button
                  type="button"
                  className="pos-member-dialog__ghost"
                  disabled={resendIn > 0 || sendingOtp}
                  onClick={() => void sendOtp()}
                >
                  {resendIn > 0 ? `Kirim ulang (${resendIn}s)` : "Kirim ulang OTP"}
                </button>
                <button
                  type="button"
                  className="pos-member-dialog__primary"
                  disabled={otpCode.length < 6 || verifying || !otpSent}
                  onClick={() => void verifyOtp()}
                >
                  {verifying ? "Memverifikasi…" : "Verifikasi & Pakai Voucher"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
