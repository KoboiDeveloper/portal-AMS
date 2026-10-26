import { useRef, useState } from "react";
import { ArrowLeft, Check, Delete } from "lucide-react";

type AmountNumpadProps = {
  bankLabel: string;
  methodType: string;
  logoSrc?: string | null;
  remaining: number;
  initialValue?: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
};

const QUICK_AMOUNTS = [50_000, 100_000, 200_000] as const;
const PAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "del"] as const;
const MAX_AMOUNT = 100_000_000;

function fmt(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function quickLabel(q: number) {
  if (q >= 1_000_000) return `${q / 1_000_000}Jt`;
  return `${q / 1_000}K`;
}

/**
 * Kalkulator nominal pembayaran — Softnio / DashLite tone.
 */
export function AmountNumpad({
  bankLabel,
  methodType,
  logoSrc,
  remaining,
  initialValue = 0,
  onConfirm,
  onCancel,
}: AmountNumpadProps) {
  const [display, setDisplay] = useState(initialValue > 0 ? String(initialValue) : "");
  const [blink, setBlink] = useState(false);
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxAllowed = Math.min(MAX_AMOUNT, Math.max(0, remaining));
  const amount = parseInt(display || "0", 10);
  const change = amount - remaining;
  const canConfirm = amount <= maxAllowed;

  const triggerBlink = () => {
    setBlink(false);
    requestAnimationFrame(() => {
      setBlink(true);
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
      blinkTimer.current = setTimeout(() => setBlink(false), 480);
    });
  };

  const press = (key: string) => {
    if (key === "del") {
      setDisplay((prev) => (prev.length <= 1 ? "" : prev.slice(0, -1)));
      return;
    }
    if (key === "00" && display === "") return;
    if (key === "0" && display === "") return;

    const next = key === "00" ? display + "00" : display + key;
    if (next.length > 12) {
      triggerBlink();
      return;
    }
    const n = parseInt(next || "0", 10);
    if (n > maxAllowed) {
      triggerBlink();
      return;
    }
    setDisplay(next.replace(/^0+(?=\d)/, ""));
  };

  const setAmount = (n: number) => {
    if (n < 0) return;
    if (n > maxAllowed) {
      triggerBlink();
      return;
    }
    setDisplay(n > 0 ? String(n) : "");
  };

  const confirm = () => {
    if (amount > maxAllowed) {
      triggerBlink();
      return;
    }
    onConfirm(amount);
  };

  let statusText = `Sisa tagihan ${fmt(remaining)}`;
  let statusClass = "is-muted";
  if (blink) {
    statusText = `Melebihi sisa — maksimal ${fmt(maxAllowed)}`;
    statusClass = "is-error";
  } else if (change >= 0 && amount > 0) {
    statusText = `Kembalian ${fmt(change)}`;
    statusClass = "is-ok";
  } else if (change < 0 && amount > 0) {
    statusText = `Kurang ${fmt(Math.abs(change))}`;
    statusClass = "is-warn";
  }

  return (
    <div className="pos-numpad">
      {/* Side nav */}
      <aside className="pos-numpad__nav">
        <p className="pos-numpad__nav-label">Navigasi</p>
        <button type="button" className="pos-numpad__back" onClick={onCancel}>
          <ArrowLeft size={16} />
          <span>Ganti metode bayar</span>
        </button>

        <div className="pos-numpad__nav-foot">
          <p className="pos-numpad__nav-label">Sedang input</p>
          <span className="pos-numpad__chip">{methodType}</span>
          <p className="pos-numpad__nav-bank">{bankLabel}</p>
        </div>
      </aside>

      {/* Main calc */}
      <div className="pos-numpad__main">
        <div className="pos-numpad__accent" />

        <div className="pos-numpad__method">
          <div className="pos-numpad__logo">
            {logoSrc ? (
              <img src={logoSrc} alt={bankLabel} />
            ) : (
              <span>{bankLabel.slice(0, 4)}</span>
            )}
          </div>
          <div className="pos-numpad__method-info">
            <div className="pos-numpad__method-meta">
              <span className="pos-numpad__chip">{methodType}</span>
              <span className="pos-numpad__method-hint">Metode aktif</span>
            </div>
            <p className="pos-numpad__method-name">{bankLabel}</p>
            <p className="pos-numpad__method-sub">Cek ulang bank &amp; tipe sebelum konfirmasi</p>
          </div>
        </div>

        <div className={`pos-numpad__display${blink ? " is-blink" : ""}`}>
          <div className="pos-numpad__display-top">
            <div>
              <p className="pos-numpad__display-label">Nominal bayar</p>
              <p className="pos-numpad__display-max">Maks {fmt(maxAllowed)}</p>
            </div>
            <p className={`pos-numpad__display-amount${amount > 0 ? "" : " is-empty"}`}>
              {amount > 0 ? fmt(amount) : "Rp0"}
            </p>
          </div>
          <p className={`pos-numpad__display-status ${statusClass}`}>{statusText}</p>
        </div>

        <div className="pos-numpad__quick">
          {QUICK_AMOUNTS.map((q) => (
            <button key={q} type="button" className="pos-numpad__quick-btn" onClick={() => setAmount(q)}>
              {quickLabel(q)}
            </button>
          ))}
          <button
            type="button"
            className="pos-numpad__quick-btn is-exact"
            onClick={() => setAmount(remaining)}
          >
            Exact
          </button>
        </div>

        <div className="pos-numpad__pad-wrap">
          <div className="pos-numpad__pad">
            {PAD.map((key) => {
              const isDel = key === "del";
              return (
                <button
                  key={key}
                  type="button"
                  className={`pos-numpad__key${isDel ? " is-del" : ""}`}
                  onClick={() => press(key)}
                >
                  {isDel ? <Delete size={20} /> : key}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={`pos-numpad__confirm${amount > 0 ? " is-ready" : ""}`}
            onClick={confirm}
          >
            <Check size={16} strokeWidth={3} />
            {amount > 0 ? `Konfirmasi ${fmt(amount)}` : "Hapus Nominal"}
          </button>

          {!canConfirm && amount > 0 && (
            <p className="pos-numpad__error">Nominal melebihi sisa tagihan</p>
          )}
        </div>
      </div>
    </div>
  );
}
