
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { paymentMethodsByType } from "../../data/pos-mock";
import type { PaymentMethod, SalesPartner, TransactionType } from "../../types/pos";
import { cn } from "../../lib/utils";
import { AmountNumpad } from "./NumpadModal";
import {
  EdcPaymentPanel,
  EdcVerifyDialog,
  bankKeyFromMethod,
  edcCancel,
  edcStart,
  edcStatus,
  isEdcMethod,
  isLineLocked,
  paymentLinesToDisplayNominals,
  tipeBayarFromMethod,
  type PaymentLine,
} from "../../payment";
import { useStoreScope } from "../../../../hooks/useStoreScope";
import { BANK_LOGO, WALLET_LOGO, logoForPaymentMethod } from "../../lib/payment-logos";

const BANK_ORDER = ["BCA", "BNI", "BRI", "Mandiri"] as const;
const EWALLET_ORDER = ["OVO", "INDODANA"] as const;

type BankKey = (typeof BANK_ORDER)[number];
type PayKind = "Debit" | "Credit" | "QRIS";

const KIND_METHODS: Record<PayKind, (bank: BankKey) => PaymentMethod> = {
  Debit: (bank) => `Debit - ${bank}` as PaymentMethod,
  Credit: (bank) => `Credit Card - ${bank}` as PaymentMethod,
  QRIS: (bank) => `QRIS - ${bank}` as PaymentMethod,
};

function bankFromMethod(method: PaymentMethod): string | null {
  const parts = method.split(" - ");
  return parts.length >= 2 ? parts[parts.length - 1] : null;
}

type PaymentPanelProps = {
  transactionType: TransactionType;
  paymentMethod: PaymentMethod | null;
  paymentLines: PaymentLine[];
  grandTotal: number;
  salesPartner?: SalesPartner | null;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onUpsertLine: (line: PaymentLine) => void;
  onRemoveLine: (method: PaymentMethod) => void;
};

type GroupKey = "tunai" | "non-tunai";

const getGroupKey = (method: PaymentMethod): GroupKey => {
  if (method === "Cash") return "tunai";
  return "non-tunai";
};

const getShortLabel = (method: PaymentMethod): string => {
  if (method === "Cash") return "Tunai";
  if (method.startsWith("Debit - ")) return method.replace("Debit - ", "");
  if (method.startsWith("Credit Card - ")) return method.replace("Credit Card - ", "");
  if (method.startsWith("QRIS - ")) return method.replace("QRIS - ", "");
  return method;
};

const getMethodType = (method: PaymentMethod): string => {
  if (method === "Cash") return "Tunai";
  if (method.startsWith("Debit - ")) return "Debit";
  if (method.startsWith("Credit Card - ")) return "Credit";
  if (method.startsWith("QRIS - ")) return "QRIS";
  if (method === "OVO" || method === "INDODANA") return "Dompet digital";
  return "Lainnya";
};

function fmt(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function totalForBank(bank: string, nominals: Record<string, number>) {
  return Object.entries(nominals)
    .filter(([k, v]) => v > 0 && k.endsWith(` - ${bank}`))
    .reduce((s, [, v]) => s + v, 0);
}

function lineByMethod(lines: PaymentLine[], method: PaymentMethod) {
  return lines.find((l) => l.method === method);
}

/* ── Provider tile: bank logo / e-wallet ── */
function ProviderTile({
  label,
  logoSrc,
  selected,
  paidAmount,
  hideLabel,
  locked,
  onClick,
}: {
  label: string;
  logoSrc?: string | null;
  selected?: boolean;
  paidAmount?: number;
  hideLabel?: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  const hasPaid = (paidAmount ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn(
        "pos-pay-tile",
        locked && "is-locked",
        selected && !locked && "is-selected",
        hasPaid && !selected && "is-paid"
      )}
    >
      {locked && (
        <span className="pos-pay-tile__lock">
          <Lock size={12} strokeWidth={2.5} />
        </span>
      )}
      {selected && !locked && (
        <span className="pos-pay-tile__check">
          <Check size={12} />
        </span>
      )}
      {logoSrc ? (
        <img src={logoSrc} alt={label} />
      ) : (
        <span
          style={{
            borderRadius: 4,
            background: "#364a63",
            color: "#fff",
            padding: "0.4rem 0.7rem",
            fontSize: "0.8125rem",
            fontWeight: 800,
          }}
        >
          {label}
        </span>
      )}

      {!hideLabel && logoSrc && (
        <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 800, color: "#364a63" }}>
          {label}
        </p>
      )}

      {hasPaid ? (
        <div style={{ textAlign: "center" }}>
          <p className="pos-pay-tile__paid-label">Sudah masuk</p>
          <p className="pos-pay-tile__paid-amt">{fmt(paidAmount ?? 0)}</p>
        </div>
      ) : null}
    </button>
  );
}

/* ── Kind card: Debit / Credit / QRIS for selected bank ── */
function KindCard({
  kind,
  bank,
  nominal,
  selected,
  locked,
  onClick,
}: {
  kind: PayKind;
  bank: string;
  nominal: number;
  selected: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  const logo = BANK_LOGO[bank];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn("pos-pay-card", selected && !locked && "is-selected")}
    >
      <div className="pos-pay-card__rail" />
      <div className="pos-pay-card__logo">
        {logo ? <img src={logo} alt={bank} /> : <span>{bank.slice(0, 3)}</span>}
      </div>
      <div className="pos-pay-card__body">
        <p className="pos-pay-card__name">{bank}</p>
        <p className="pos-pay-card__sub">
          {kind === "Debit" && "Kartu debit"}
          {kind === "Credit" && "Kartu kredit"}
          {kind === "QRIS" && "Scan QRIS"}
        </p>
        {nominal > 0 && <p className="pos-pay-card__amt">{fmt(nominal)}</p>}
        {locked && (
          <p className="pos-pay-card__sub" style={{ color: "#0f9f7a", fontWeight: 700 }}>
            Terkunci
          </p>
        )}
      </div>
      <span className="pos-pay-card__kind">{kind}</span>
    </button>
  );
}

function PaymentCardH({
  method,
  selected,
  nominal,
  locked,
  onClick,
}: {
  method: PaymentMethod;
  selected: boolean;
  nominal: number;
  locked?: boolean;
  onClick: () => void;
}) {
  const short = getShortLabel(method);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn("pos-pay-card", selected && !locked && "is-selected")}
    >
      <div className="pos-pay-card__rail" />
      <div
        className="pos-pay-card__logo"
        style={{ minWidth: "3.5rem", fontSize: "0.6875rem", fontWeight: 800, color: "#6576ff" }}
      >
        {short}
      </div>
      <div className="pos-pay-card__body">
        <p className="pos-pay-card__name">{method === "Cash" ? "Tunai / Cash" : method}</p>
        {nominal > 0 ? (
          <p className="pos-pay-card__amt">{fmt(nominal)}</p>
        ) : (
          <p className="pos-pay-card__sub">Tap untuk input</p>
        )}
      </div>
    </button>
  );
}

export function PaymentPanel({
  transactionType,
  paymentMethod,
  paymentLines,
  grandTotal,
  salesPartner = null,
  onPaymentMethodChange,
  onUpsertLine,
  onRemoveLine,
}: PaymentPanelProps) {
  const { storeId: scopedStoreId } = useStoreScope();
  const methods = paymentMethodsByType[transactionType];
  const paymentNominals = useMemo(
    () => paymentLinesToDisplayNominals(paymentLines),
    [paymentLines]
  );

  const allGroups: { key: GroupKey; label: string; items: PaymentMethod[] }[] = [
    { key: "tunai", label: "TUNAI", items: methods.filter((m) => getGroupKey(m) === "tunai") },
    { key: "non-tunai", label: "NON TUNAI", items: methods.filter((m) => getGroupKey(m) === "non-tunai") },
  ];
  const groups = allGroups.filter((g) => g.items.length > 0);

  const [activeTab, setActiveTab] = useState<GroupKey>(() =>
    paymentMethod ? getGroupKey(paymentMethod) : (groups[0]?.key ?? "tunai")
  );
  const [selectedBank, setSelectedBank] = useState<BankKey | null>(null);
  const [numpadTarget, setNumpadTarget] = useState<PaymentMethod | null>(null);
  const [confirmPick, setConfirmPick] = useState<{ kind: PayKind; bank: BankKey } | null>(null);
  const [edcVerify, setEdcVerify] = useState<{ method: PaymentMethod; amount: number } | null>(null);
  const [edcSession, setEdcSession] = useState<PaymentLine | null>(null);
  const [edcBusy, setEdcBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [edcError, setEdcError] = useState<string | null>(null);

  const effectiveTab: GroupKey = groups.some((g) => g.key === activeTab)
    ? activeTab
    : (groups[0]?.key ?? "tunai");

  const currentGroup = groups.find((g) => g.key === effectiveTab);
  const available = useMemo(() => new Set(methods), [methods]);

  const banks = BANK_ORDER.filter((b) =>
    (["Debit", "Credit", "QRIS"] as PayKind[]).some((k) => available.has(KIND_METHODS[k](b)))
  );
  const ewallets = EWALLET_ORDER.filter((e) => available.has(e as PaymentMethod));

  const totalPaid = Object.values(paymentNominals).reduce((s, v) => s + v, 0);
  const isLunas = totalPaid >= grandTotal && grandTotal > 0;

  const paidBanks = useMemo(() => {
    const set = new Set<string>();
    for (const [k, v] of Object.entries(paymentNominals)) {
      if (v <= 0) continue;
      const bank = bankFromMethod(k as PaymentMethod);
      if (bank) set.add(bank);
    }
    return set;
  }, [paymentNominals]);

  const isBankLocked = (bank: string) => isLunas && !paidBanks.has(bank);
  const isWalletLocked = (wallet: string) =>
    isLunas && (paymentNominals[wallet] ?? 0) <= 0;

  const openNumpad = (m: PaymentMethod) => {
    const existing = lineByMethod(paymentLines, m);
    if (existing && isLineLocked(existing)) return;
    onPaymentMethodChange(m);
    setNumpadTarget(m);
  };

  const closeNumpad = () => setNumpadTarget(null);

  const remainingFor = (m: PaymentMethod): number => {
    const otherPaid = Object.entries(paymentNominals)
      .filter(([key]) => key !== m)
      .reduce((sum, [, val]) => sum + val, 0);
    return Math.max(0, grandTotal - otherPaid);
  };

  const pickBank = (bank: BankKey) => {
    if (isBankLocked(bank)) return;
    setSelectedBank(bank);
  };

  const pickKind = (kind: PayKind, bank: BankKey) => {
    const method = KIND_METHODS[kind](bank);
    if (!available.has(method)) return;
    const existing = lineByMethod(paymentLines, method);
    if (existing && isLineLocked(existing)) {
      onPaymentMethodChange(method);
      return;
    }
    onPaymentMethodChange(method);
    setConfirmPick({ kind, bank });
  };

  const confirmKind = () => {
    if (!confirmPick) return;
    const method = KIND_METHODS[confirmPick.kind](confirmPick.bank);
    setConfirmPick(null);
    openNumpad(method);
  };

  const handleNumpadConfirm = (amount: number) => {
    if (!numpadTarget) return;
    if (isEdcMethod(numpadTarget) && transactionType === "OFFLINE") {
      setEdcVerify({ method: numpadTarget, amount });
      setEdcError(null);
      closeNumpad();
      return;
    }
    onUpsertLine({
      method: numpadTarget,
      amount,
      status: "success",
      locked: false,
    });
    closeNumpad();
  };

  const handleEdcVerifyConfirm = async () => {
    if (!edcVerify) return;
    const bankKey = bankKeyFromMethod(edcVerify.method);
    if (!bankKey) {
      setEdcError("Bank EDC tidak dikenali untuk metode ini");
      return;
    }
    const tipeBayar = tipeBayarFromMethod(edcVerify.method);
    setEdcBusy(true);
    setEdcError(null);
    try {
      const result = await edcStart({
        method: edcVerify.method,
        amount: edcVerify.amount,
        bankKey,
        tipeBayar,
        storeId: scopedStoreId || undefined,
      });
      const line: PaymentLine = {
        method: edcVerify.method,
        amount: edcVerify.amount,
        status: result.status === "failed" ? "failed" : "pending",
        ecrTransId: result.ecrTransId,
        partnerReferenceNo: result.partnerReferenceNo || result.ecrTransId,
        bankKey: result.bankKey || bankKey,
        tipeBayar: result.tipeBayar || tipeBayar,
        storeId: result.storeId || scopedStoreId || undefined,
        locked: false,
        message: result.message || result.error,
      };
      onUpsertLine(line);
      setEdcSession(line);
      setEdcVerify(null);
    } catch (err) {
      setEdcError(err instanceof Error ? err.message : String(err));
    } finally {
      setEdcBusy(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!edcSession?.bankKey) return;
    setChecking(true);
    setEdcError(null);
    try {
      const result = await edcStatus({
        bankKey: edcSession.bankKey,
        amount: edcSession.amount,
        tipeBayar: edcSession.tipeBayar || tipeBayarFromMethod(edcSession.method),
        ecrTransId: edcSession.ecrTransId,
        partnerReferenceNo: edcSession.partnerReferenceNo || edcSession.ecrTransId,
        storeId: edcSession.storeId,
      });
      const next: PaymentLine = {
        ...edcSession,
        status: result.status,
        message: result.message,
        ecrTransId: result.ecrTransId || edcSession.ecrTransId,
        locked: result.status === "success",
      };
      onUpsertLine(next);
      setEdcSession(next);
    } catch (err) {
      setEdcError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  const handleEdcCancel = async () => {
    if (!edcSession?.bankKey) return;
    setCancelling(true);
    setEdcError(null);
    try {
      await edcCancel({
        bankKey: edcSession.bankKey,
        amount: edcSession.amount,
        tipeBayar: edcSession.tipeBayar || tipeBayarFromMethod(edcSession.method),
        ecrTransId: edcSession.ecrTransId,
        storeId: edcSession.storeId,
      });
      onRemoveLine(edcSession.method);
      setEdcSession(null);
      setSelectedBank(null);
    } catch (err) {
      setEdcError(err instanceof Error ? err.message : String(err));
    } finally {
      setCancelling(false);
    }
  };

  if (edcSession) {
    return (
      <div className="relative h-full min-h-0">
        <EdcPaymentPanel
          method={edcSession.method}
          amount={edcSession.amount}
          status={edcSession.status}
          message={edcError || edcSession.message}
          ecrTransId={edcSession.ecrTransId || edcSession.partnerReferenceNo}
          checking={checking}
          cancelling={cancelling}
          onCheckStatus={() => void handleCheckStatus()}
          onCancel={() => void handleEdcCancel()}
          onDone={() => {
            setEdcSession(null);
            setSelectedBank((bankFromMethod(edcSession.method) as BankKey) || null);
          }}
        />
      </div>
    );
  }

  if (numpadTarget) {
    const logo = logoForPaymentMethod(numpadTarget);
    return (
      <AmountNumpad
        key={numpadTarget}
        bankLabel={getShortLabel(numpadTarget)}
        methodType={getMethodType(numpadTarget)}
        logoSrc={logo}
        remaining={remainingFor(numpadTarget)}
        initialValue={paymentNominals[numpadTarget] ?? 0}
        onConfirm={handleNumpadConfirm}
        onCancel={closeNumpad}
      />
    );
  }

  const confirmMethod = confirmPick
    ? KIND_METHODS[confirmPick.kind](confirmPick.bank)
    : null;

  return (
    <div className="pos-pay" style={{ position: "relative" }}>
      <div className="pos-pay__head" style={{ flexShrink: 0 }}>
        <p className="pos-pay__head-label">
          Pilih Metode - Transaksi {transactionType}
        </p>
        <p className="pos-pay__head-title">Pembayaran</p>
      </div>

      <div className="pos-pay__tabs">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => {
              setActiveTab(g.key);
              setSelectedBank(null);
            }}
            className={cn("pos-pay__tab", effectiveTab === g.key && "is-active")}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="pos-pay__body">
        {effectiveTab === "non-tunai" &&
          (transactionType === "ONLINE" ? (
            <div className="pos-pay__scroll">
              {methods
                .filter((m) => getGroupKey(m) === "non-tunai")
                .map((m) => {
                  const line = lineByMethod(paymentLines, m);
                  return (
                    <PaymentCardH
                      key={m}
                      method={m}
                      selected={m === paymentMethod}
                      nominal={paymentNominals[m] ?? 0}
                      locked={line ? isLineLocked(line) : false}
                      onClick={() => openNumpad(m)}
                    />
                  );
                })}
            </div>
          ) : selectedBank ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
              <div className="pos-pay-bankbar">
                <button
                  type="button"
                  onClick={() => setSelectedBank(null)}
                  className="pos-pay-bankbar__back"
                >
                  <ArrowLeft size={14} />
                  Ganti bank
                </button>
                <div className="pos-pay-bankbar__divider" />
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0, flex: 1 }}>
                  <div className="pos-pay-card__logo">
                    <img src={BANK_LOGO[selectedBank]} alt={selectedBank} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="pos-pay__head-label">Bank dipilih</p>
                    <p className="pos-pay-card__name">{selectedBank}</p>
                  </div>
                </div>
              </div>

              <p className="pos-pay__section-label">Pilih jenis pembayaran</p>

              <div className="pos-pay__scroll" style={{ flex: 1 }}>
                {(["Debit", "Credit", "QRIS"] as PayKind[]).map((kind) => {
                  const method = KIND_METHODS[kind](selectedBank);
                  if (!available.has(method)) return null;
                  const line = lineByMethod(paymentLines, method);
                  const locked = line ? isLineLocked(line) : false;
                  const isPicked =
                    paymentMethod === method ||
                    (confirmPick?.bank === selectedBank && confirmPick?.kind === kind);
                  return (
                    <KindCard
                      key={kind}
                      kind={kind}
                      bank={selectedBank}
                      nominal={paymentNominals[method] ?? 0}
                      selected={isPicked}
                      locked={locked}
                      onClick={() => pickKind(kind, selectedBank)}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pos-pay__scroll">
              <p className="pos-pay__section-label">Pilih bank</p>
              <div className="pos-pay__grid">
                {banks.map((bank) => {
                  const paid = totalForBank(bank, paymentNominals);
                  const locked = isBankLocked(bank);
                  return (
                    <ProviderTile
                      key={bank}
                      label={bank}
                      logoSrc={BANK_LOGO[bank]}
                      hideLabel
                      paidAmount={paid}
                      locked={locked}
                      onClick={() => pickBank(bank)}
                    />
                  );
                })}
              </div>

              {ewallets.length > 0 && (
                <>
                  <p className="pos-pay__section-label" style={{ marginTop: "1rem" }}>
                    Dompet digital
                  </p>
                  <div className="pos-pay__grid">
                    {ewallets.map((wallet) => {
                      const locked = isWalletLocked(wallet);
                      return (
                        <ProviderTile
                          key={wallet}
                          label={wallet}
                          logoSrc={WALLET_LOGO[wallet]}
                          hideLabel
                          selected={paymentMethod === wallet}
                          paidAmount={paymentNominals[wallet] ?? 0}
                          locked={locked}
                          onClick={() => {
                            if (locked) return;
                            openNumpad(wallet as PaymentMethod);
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}

        {effectiveTab === "tunai" && (
          <div className="pos-pay__scroll">
            {(currentGroup?.items ?? []).map((m) => {
              const line = lineByMethod(paymentLines, m);
              return (
                <PaymentCardH
                  key={m}
                  method={m}
                  selected={m === paymentMethod}
                  nominal={paymentNominals[m] ?? 0}
                  locked={line ? isLineLocked(line) : false}
                  onClick={() => openNumpad(m)}
                />
              );
            })}
          </div>
        )}
      </div>

      {salesPartner && (
        <div className="pos-pay__sp-foot">
          <div className="pos-pay__sp">
            <div className="pos-pay__sp-avatar">
              {salesPartner.photoUrl ? (
                <img src={salesPartner.photoUrl} alt="" />
              ) : (
                salesPartner.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
              )}
            </div>
            <div className="pos-pay__sp-text">
              <span>Sales Partner</span>
              <strong>{salesPartner.name}</strong>
              <em>{salesPartner.nik}</em>
            </div>
          </div>
        </div>
      )}

      {confirmPick && confirmMethod && (
        <div className="pos-pay-confirm">
          <div className="pos-pay-confirm__card">
            <div className="pos-pay-confirm__bar" />
            <div className="pos-pay-confirm__body">
              <p className="pos-pay-confirm__label">Konfirmasi metode</p>
              <div className="pos-pay-confirm__logo">
                <img src={BANK_LOGO[confirmPick.bank]} alt={confirmPick.bank} />
              </div>
              <p className="pos-pay-confirm__bank">{confirmPick.bank}</p>
              <p className="pos-pay-confirm__kind">{confirmPick.kind}</p>
              <p className="pos-pay-confirm__method">{confirmMethod}</p>
              <p className="pos-pay-confirm__hint">
                Pastikan bank &amp; jenis bayar sudah benar sebelum input nominal.
              </p>
              <div className="pos-pay-confirm__actions">
                <button type="button" onClick={() => setConfirmPick(null)}>
                  Batal
                </button>
                <button type="button" className="is-primary" onClick={confirmKind}>
                  Ya, lanjut
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {edcVerify && (
        <>
          <EdcVerifyDialog
            method={edcVerify.method}
            amount={edcVerify.amount}
            busy={edcBusy}
            onConfirm={() => void handleEdcVerifyConfirm()}
            onCancel={() => {
              if (edcBusy) return;
              setEdcVerify(null);
              setEdcError(null);
            }}
          />
          {edcError && (
            <div
              style={{
                position: "absolute",
                bottom: "1rem",
                left: "1rem",
                right: "1rem",
                zIndex: 50,
                borderRadius: 4,
                background: "#e85347",
                color: "#fff",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {edcError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
