import { useEffect, useRef } from "react";
import { Gift, Minus, Plus, ShoppingBag, Sparkles, Trash2, Zap } from "lucide-react";
import { cn } from "../../lib/utils";
import type { CartItem, Member, Promo, RedeemVoucher } from "../../types/pos";
import { ProductImage } from "./ProductImage";

type CartPanelProps = {
  items: CartItem[];
  promo: Promo | null;
  redeemVoucher?: RedeemVoucher | null;
  member: Member | null;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  onProcess: () => void;
  canProcess: boolean;
  processLoading: boolean;
  processHint?: string;
  flat?: boolean;
};

export function CartPanel({
  items,
  promo,
  redeemVoucher = null,
  member,
  onIncrease,
  onDecrease,
  onProcess,
  canProcess,
  processLoading,
  processHint,
}: CartPanelProps) {
  const prevItemsRef = useRef<CartItem[]>([]);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    const prev = prevItemsRef.current;
    const prevQty = new Map(prev.map((item) => [item.productId, item.qty]));
    const added = items.filter((item) => item.qty > (prevQty.get(item.productId) ?? 0));
    prevItemsRef.current = items;
    if (added.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const restart = (el: HTMLElement | null, className: string) => {
      if (!el) return;
      el.classList.remove(className);
      void el.offsetWidth;
      el.classList.add(className);
    };

    added.forEach((item, index) => {
      const el = itemRefs.current.get(item.productId) ?? null;
      restart(el, "is-blink");
      if (index === added.length - 1) {
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }, [items]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const promoDisc = promo?.amount ?? 0;
  const redeemDisc = redeemVoucher?.amount ?? 0;
  const grandTotal = Math.max(0, subtotal - promoDisc - redeemDisc);

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="pos-cart">
      <div className="pos-cart__head">
        <div className="pos-cart__head-row">
          <div className="pos-cart__brand">
            <div className="pos-cart__icon">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <p className="pos-cart__title">Keranjang</p>
              <p className="pos-cart__sub">
                {dateStr} · {timeStr}
                {member ? ` · ${member.name.split(" ")[0]}` : ""}
              </p>
            </div>
          </div>
          <span className={cn("pos-cart__count", items.length === 0 && "is-empty")}>
            {items.length}
          </span>
        </div>
      </div>

      <div className="pos-cart__list">
        {items.length === 0 ? (
          <div className="pos-cart__empty">
            <ShoppingBag className="h-7 w-7 opacity-40" />
            <div>
              <p className="mb-0 fw-semibold" style={{ color: "#8091a7" }}>
                Keranjang kosong
              </p>
              <p className="mb-0 small" style={{ color: "#8091a7" }}>
                Scan barcode atau pilih produk
              </p>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.productId}
              ref={(el) => {
                if (el) itemRefs.current.set(item.productId, el);
                else itemRefs.current.delete(item.productId);
              }}
              className="pos-cart__item"
              onAnimationEnd={(event) => {
                if (event.currentTarget === event.target) {
                  event.currentTarget.classList.remove("is-blink");
                }
              }}
            >
              <div className="pos-cart__item-thumb">
                <ProductImage
                  src={item.image}
                  alt={item.name}
                  category={item.category || "PR"}
                />
              </div>
              <div className="pos-cart__item-body">
                <p className="pos-cart__item-name">{item.name}</p>
                <p className="pos-cart__item-plu">
                  {item.plu || item.productId}
                  <span className="pos-cart__unit">
                    {" "}@ Rp{item.price.toLocaleString("id-ID")}
                  </span>
                </p>
                <div className="pos-qty">
                  <button type="button" onClick={() => onDecrease(item.productId)}>
                    {item.qty === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  </button>
                  <span>{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => onIncrease(item.productId)}
                    disabled={item.qty >= item.stock}
                    title={
                      item.qty >= item.stock
                        ? `Stok toko hanya ${item.stock}`
                        : "Tambah qty"
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <p className="pos-cart__item-total">
                  Rp{(item.price * item.qty).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {promo && (
        <div className="pos-cart__promo">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <strong>{promo.code}</strong>
          <span className="flex-grow-1 text-truncate">{promo.description}</span>
          <strong>−Rp{promo.amount.toLocaleString("id-ID")}</strong>
        </div>
      )}

      {redeemVoucher && (
        <div className="pos-cart__promo is-redeem">
          <Gift className="h-3.5 w-3.5 shrink-0" />
          <strong>{redeemVoucher.code}</strong>
          <span className="flex-grow-1 text-truncate">Redeem poin</span>
          <strong>−Rp{redeemVoucher.amount.toLocaleString("id-ID")}</strong>
        </div>
      )}

      <div className="pos-cart__totals">
        <div className="pos-cart__row">
          <span>Subtotal</span>
          <span>Rp{subtotal.toLocaleString("id-ID")}</span>
        </div>
        {promoDisc > 0 && (
          <div className="pos-cart__row">
            <span style={{ color: "#0b8f6e" }}>Diskon ({promo?.code})</span>
            <span style={{ color: "#0b8f6e" }}>−Rp{promoDisc.toLocaleString("id-ID")}</span>
          </div>
        )}
        {redeemDisc > 0 && (
          <div className="pos-cart__row">
            <span style={{ color: "#6576ff" }}>Redeem ({redeemVoucher?.code})</span>
            <span style={{ color: "#6576ff" }}>−Rp{redeemDisc.toLocaleString("id-ID")}</span>
          </div>
        )}
        <div className="pos-cart__grand">
          <div>
            <p className="pos-cart__grand-label">Total Bayar</p>
            <p className="pos-cart__grand-meta">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <p className="pos-cart__grand-amount">Rp{grandTotal.toLocaleString("id-ID")}</p>
        </div>
      </div>

      <div className="pos-cart__footer">
        <button
          type="button"
          className="pos-cart__pay"
          onClick={onProcess}
          disabled={!canProcess}
          title={processHint || undefined}
        >
          <Zap className="h-4 w-4" />
          {processLoading
            ? "Memproses…"
            : processHint || "Proses Pembayaran"}
        </button>
      </div>
    </div>
  );
}
