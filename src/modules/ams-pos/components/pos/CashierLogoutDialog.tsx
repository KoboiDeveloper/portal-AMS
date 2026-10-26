import { useEffect, useRef, useState } from "react";
import { Banknote, ClipboardList, CreditCard, Printer, QrCode, Wallet } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import { groupShiftPayments } from "../../lib/shift-payment-groups";
import { printShiftPaymentReceipt } from "../../lib/print-shift-receipt";
import { openCashDrawer as triggerCashDrawer } from "../../lib/cash-drawer";
import type { CashierSession, CashierShiftSummary } from "../../types/pos";
import { SmoothScrollArea } from "./SmoothScrollArea";

type CashierLogoutDialogProps = {
  open: boolean;
  cashier: CashierSession;
  summary: CashierShiftSummary;
  signedInAt: number | null;
  intent?: "logout" | "switch";
  storeName?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const HOLD_MS = 1600;

function fmt(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function fmtTime(ts: number | null) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(from: number | null) {
  if (!from) return null;
  const mins = Math.max(0, Math.floor((Date.now() - from) / 60000));
  if (mins < 60) return `${mins} mnt`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "CS"
  );
}

function GroupGlyph({ kind, label }: { kind: string; label: string }) {
  if (kind === "cash" || label.toLowerCase().includes("tunai")) {
    return <Banknote size={16} strokeWidth={2.2} />;
  }
  if (kind === "bank") return <CreditCard size={16} strokeWidth={2.2} />;
  if (label.toUpperCase().includes("QRIS")) return <QrCode size={16} strokeWidth={2.2} />;
  return <Wallet size={16} strokeWidth={2.2} />;
}

export function CashierLogoutDialog({
  open,
  cashier,
  summary,
  signedInAt,
  intent = "logout",
  storeName,
  onCancel,
  onConfirm,
}: CashierLogoutDialogProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drawerMsg, setDrawerMsg] = useState("");
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const drawerTimerRef = useRef<number | null>(null);

  const stopHold = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHolding(false);
    setProgress(0);
    startRef.current = 0;
  };

  useEffect(() => {
    if (!open) {
      stopHold();
      doneRef.current = false;
      setDrawerMsg("");
      if (drawerTimerRef.current != null) {
        window.clearTimeout(drawerTimerRef.current);
        drawerTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(
    () => () => {
      stopHold();
      if (drawerTimerRef.current != null) window.clearTimeout(drawerTimerRef.current);
    },
    []
  );

  const tick = (now: number) => {
    if (!startRef.current) startRef.current = now;
    const elapsed = now - startRef.current;
    const p = Math.min(1, elapsed / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      if (!doneRef.current) {
        doneRef.current = true;
        stopHold();
        onConfirm();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startHold = () => {
    if (doneRef.current) return;
    stopHold();
    setHolding(true);
    startRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  };

  const openCashDrawer = () => {
    void (async () => {
      setDrawerMsg("Mengirim perintah cash drawer…");
      const result = await triggerCashDrawer();
      setDrawerMsg(
        result.ok
          ? result.message || "Cash drawer OK"
          : result.message || "Gagal membuka cash drawer"
      );
      if (drawerTimerRef.current != null) window.clearTimeout(drawerTimerRef.current);
      drawerTimerRef.current = window.setTimeout(() => setDrawerMsg(""), 3200);
    })();
  };

  const printPayments = () => {
    printShiftPaymentReceipt({
      cashier,
      summary,
      signedInAt,
      storeName,
    });
  };

  const groups = groupShiftPayments(summary.byMethod);
  const paidTotal = groups.reduce((s, g) => s + g.total, 0);
  const duration = fmtDuration(signedInAt);
  const holdPct = Math.round(progress * 100);
  const lineCount = groups.reduce((s, g) => s + g.lines.length, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          stopHold();
          onCancel();
        }
      }}
    >
      <DialogContent
        className="pos-cashier-logout"
        hideCloseButton
        accessibleTitle={
          intent === "switch"
            ? "Ringkasan shift sebelum ganti kasir"
            : "Ringkasan shift dan logout kasir"
        }
        zIndex={10400}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          stopHold();
          onCancel();
        }}
      >
        <div className="pos-cashier-logout__head">
          <span className="pos-cashier-logout__icon" aria-hidden>
            <ClipboardList size={18} />
          </span>
          <div>
            <p className="pos-cashier-logout__eyebrow">
              {intent === "switch" ? "Ganti kasir" : "Tutup shift"}
            </p>
            <strong className="pos-cashier-logout__title">Ringkasan Shift</strong>
          </div>
        </div>

        <div className="pos-cashier-logout__grid">
          <aside className="pos-cashier-logout__left">
            <div className="pos-cashier-logout__left-top">
              <div className="pos-cashier-logout__cashier">
                <span className="pos-cashier-logout__avatar" aria-hidden>
                  {initials(cashier.name)}
                </span>
                <div className="pos-cashier-logout__cashier-text">
                  <strong>{cashier.name}</strong>
                  <span>ID {cashier.id}</span>
                </div>
                <span className="pos-cashier-logout__shift">Shift {cashier.shift}</span>
              </div>

              <dl className="pos-cashier-logout__meta">
                <div>
                  <dt>Mulai shift</dt>
                  <dd>{fmtTime(signedInAt)}</dd>
                </div>
                <div>
                  <dt>Durasi</dt>
                  <dd>{duration || "-"}</dd>
                </div>
                <div>
                  <dt>Transaksi</dt>
                  <dd>{summary.txCount}</dd>
                </div>
              </dl>

              <div className="pos-cashier-logout__hero">
                <span className="pos-cashier-logout__hero-label">Total penjualan</span>
                <strong className="pos-cashier-logout__hero-amount">
                  {fmt(summary.totalAmount)}
                </strong>
              </div>
            </div>

            <div className="pos-cashier-logout__actions">
              <button
                type="button"
                className="pos-cashier-logout__drawer"
                onClick={openCashDrawer}
              >
                <Banknote size={15} />
                Open cash drawer
              </button>
              {drawerMsg ? (
                <p className="pos-cashier-logout__drawer-msg">{drawerMsg}</p>
              ) : null}

              <button
                type="button"
                className={`pos-cashier-logout__hold${holding ? " is-holding" : ""}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  startHold();
                }}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span
                  className="pos-cashier-logout__hold-fill"
                  style={{ transform: `scaleX(${progress})` }}
                />
                <span className="pos-cashier-logout__hold-label">
                  {holding
                    ? `Tahan… ${holdPct}%`
                    : intent === "switch"
                      ? "Tahan untuk ganti kasir"
                      : "Tahan untuk logout"}
                </span>
              </button>

              <button
                type="button"
                className="pos-cashier-logout__cancel"
                onClick={() => {
                  stopHold();
                  onCancel();
                }}
              >
                Kembali
              </button>
            </div>
          </aside>

          <section className="pos-cashier-logout__right">
            <div className="pos-cashier-logout__section-row">
              <p className="pos-cashier-logout__section">Rincian pembayaran</p>
              <div className="pos-cashier-logout__section-tools">
                {groups.length > 0 ? (
                  <span className="pos-cashier-logout__section-count">
                    {groups.length} kanal · {lineCount} metode
                  </span>
                ) : null}
                <button
                  type="button"
                  className="pos-cashier-logout__print"
                  title="Print rincian pembayaran"
                  aria-label="Print rincian pembayaran"
                  onClick={printPayments}
                >
                  <Printer size={15} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <SmoothScrollArea
              className="pos-cashier-logout__scroll"
              revision={`${open}|${cashier.id}|${summary.txCount}|${lineCount}|${paidTotal}`}
            >
              {groups.length === 0 ? (
                <p className="pos-cashier-logout__empty">
                  Belum ada transaksi di shift ini.
                </p>
              ) : (
                <div className="pos-cashier-logout__methods">
                  {groups.map((group) => {
                    const share =
                      paidTotal > 0 ? Math.round((group.total / paidTotal) * 100) : 0;
                    const showSubrows = group.kind === "bank" || group.lines.length > 1;
                    return (
                      <div
                        key={group.key}
                        className={`pos-cashier-logout__group${
                          showSubrows ? " is-multi" : ""
                        }${group.total <= 0 && group.kind === "bank" ? " is-zero" : ""}`}
                      >
                        <div className="pos-cashier-logout__group-head">
                          <span className="pos-cashier-logout__method-icon" aria-hidden>
                            {group.logo ? (
                              <img src={group.logo} alt="" />
                            ) : (
                              <GroupGlyph kind={group.kind} label={group.label} />
                            )}
                          </span>
                          <div className="pos-cashier-logout__group-title">
                            <strong>{group.label}</strong>
                            <span>
                              {group.kind === "bank"
                                ? `${group.lines.length} metode · ${share}%`
                                : showSubrows
                                  ? `${group.lines.length} metode · ${share}%`
                                  : `${share}% dari total`}
                            </span>
                          </div>
                          <em className="pos-cashier-logout__group-total">
                            {fmt(group.total)}
                          </em>
                        </div>

                        {showSubrows ? (
                          <div className="pos-cashier-logout__subrows">
                            {group.lines.map((line) => (
                              <div
                                key={line.method}
                                className={`pos-cashier-logout__subrow${
                                  line.amount <= 0 ? " is-zero" : ""
                                }`}
                              >
                                <span>{line.label}</span>
                                <strong>{fmt(line.amount)}</strong>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="pos-cashier-logout__bar" aria-hidden>
                          <span style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pos-cashier-logout__row is-total">
                    <span>Total diterima</span>
                    <strong>{fmt(paidTotal)}</strong>
                  </div>
                </div>
              )}
            </SmoothScrollArea>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
