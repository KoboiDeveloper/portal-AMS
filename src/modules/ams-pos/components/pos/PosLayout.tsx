
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, PauseCircle, Search, Trash2 } from "lucide-react";
import { resolveExact, resolvePartial } from "../../lib/scan-resolve";
import { getPosCategories, getPosProductsByCategory } from "../../lib/newpos-api";
import { usePosStore } from "../../store/use-pos-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent } from "../ui/dialog";
import { CategorySidebar } from "./CategorySidebar";
import { ProductGrid } from "./ProductGrid";
import { ScanProductPanel } from "./ScanProductPanel";
import { CartPanel } from "./CartPanel";
import { PaymentPanel } from "./PaymentPanel";
import { MemberDialog } from "./MemberDialog";
import { SalesPartnerDialog } from "./SalesPartnerDialog";
import { ConfirmOrderDialog } from "./ConfirmOrderDialog";
import { TransactionTypeDialog } from "./TransactionTypeDialog";
import { CashierLoginDialog } from "./CashierLoginDialog";
import { CashierLogoutDialog } from "./CashierLogoutDialog";
import { useStoreScope } from "../../../../hooks/useStoreScope";
import { appPath } from "../../../../lib/paths";
import {
  selectCashierSessionValid,
  selectCashierUnlocked,
  useCashierSession,
} from "../../store/use-cashier-session";
import { getDummyShiftSummary } from "../../lib/cashier-auth-dummy";
import {
  isEdcMethod,
  paymentLinesToNominals,
  type PaymentLine,
} from "../../payment";
import { openCashDrawer } from "../../lib/cash-drawer";
import type { PosCategory, Product, ScanExactHit, TransactionType } from "../../types/pos";

export function PosLayout() {
  const navigate = useNavigate();
  const { storeName, storeId } = useStoreScope();
  const resolvedStoreId = storeId || "rcw032";
  const cashier = useCashierSession((s) => s.cashier);
  const lastActivityAt = useCashierSession((s) => s.lastActivityAt);
  const signedInAt = useCashierSession((s) => s.signedInAt);
  const shiftSummary = useCashierSession((s) => s.shiftSummary);
  const unlocked = useCashierSession((s) => s.unlocked);
  const hasHydrated = useCashierSession((s) => s.hasHydrated);
  const signInCashier = useCashierSession((s) => s.signIn);
  const unlockCashier = useCashierSession((s) => s.unlock);
  const lockCashier = useCashierSession((s) => s.lock);
  const signOutCashier = useCashierSession((s) => s.signOut);
  const touchCashierActivity = useCashierSession((s) => s.touchActivity);
  const recordCashierSale = useCashierSession((s) => s.recordSale);
  const cashierValid = selectCashierSessionValid({ cashier, lastActivityAt });
  const cashierReady = selectCashierUnlocked({ cashier, lastActivityAt, unlocked });

  const logoutSummary = (() => {
    const s = shiftSummary;
    const empty =
      !s ||
      ((s.txCount || 0) <= 0 &&
        (s.totalAmount || 0) <= 0 &&
        Object.keys(s.byMethod || {}).length === 0);
    return empty ? getDummyShiftSummary(cashier?.id) : s;
  })();
  const {
    activeCategory,
    cart,
    promo,
    member,
    salesPartner,
    redeemVoucher,
    heldOrders,
    transactionType,
    paymentMethod,
    setActiveCategory,
    increaseQty,
    increaseLineQty,
    decreaseQty,
    setTransactionType,
    setPaymentMethod,
    setMember,
    setSalesPartner,
    setPromo,
    setRedeemVoucher,
    newOrder,
    holdOrder,
    restoreOrder,
  } = usePosStore();

  const [barcode, setBarcode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanMiss, setScanMiss] = useState("");
  const [scanHit, setScanHit] = useState<ScanExactHit | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"new" | "hold" | null>(null);
  const [processOpen, setProcessOpen] = useState(false);
  const [transactionTypeOpen, setTransactionTypeOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [cashierGate, setCashierGate] = useState<"open-pos" | "transaction" | null>(null);
  const [switchShiftOpen, setSwitchShiftOpen] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    const state = useCashierSession.getState();
    if (!selectCashierSessionValid(state)) {
      state.signOut();
    }
    state.lock();
    setCashierGate("open-pos");
  }, [hasHydrated]);

  useEffect(() => {
    if (!cashierReady) return;
    touchCashierActivity();
  }, [cashierReady, touchCashierActivity]);

  useEffect(() => {
    const controller = new AbortController();
    setCategoriesLoading(true);
    setCatalogError("");

    getPosCategories(resolvedStoreId, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setCategories(items);
        setActiveCategory(items[0]?.code ?? "");
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setCategories([]);
          setProducts([]);
          setCatalogError(error?.responseMessage || error?.message || "Kategori gagal dimuat");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      });

    return () => controller.abort();
  }, [resolvedStoreId, setActiveCategory]);

  useEffect(() => {
    const category = categories.find((item) => item.code === activeCategory);
    if (!category) {
      setProducts([]);
      return;
    }

    const controller = new AbortController();
    setProductsLoading(true);
    setCatalogError("");
    setScanHit(null);
    setScanMiss("");

    getPosProductsByCategory(resolvedStoreId, category, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setProducts(items);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setProducts([]);
          setCatalogError(error?.responseMessage || error?.message || "Produk gagal dimuat");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setProductsLoading(false);
      });

    return () => controller.abort();
  }, [activeCategory, categories, resolvedStoreId]);

  // Auto-collapse category rail on narrower screens (<1100px)
  useEffect(() => {
    const sync = () => setSidebarCollapsed(window.innerWidth < 1100);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  // Partial type → filter grid (debounce); ketik baru → keluar mode scan
  useEffect(() => {
    const t = window.setTimeout(() => {
      const q = barcode.trim();
      setSearchQuery(q);
      if (q) {
        setScanMiss("");
        // Hanya clear scan hit jika user mengetik (bukan setelah commit scan kosong)
        if (scanHit && q.length > 0) setScanHit(null);
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [barcode, scanHit]);

  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newOrderConfirmOpen, setNewOrderConfirmOpen] = useState(false);

  const paymentNominals = useMemo(
    () => paymentLinesToNominals(paymentLines),
    [paymentLines]
  );

  const upsertPaymentLine = (line: PaymentLine) => {
    setPaymentLines((prev) => {
      const idx = prev.findIndex((l) => l.method === line.method);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = line;
        return next;
      }
      return [...prev, line];
    });
  };

  const removePaymentLine = (method: PaymentLine["method"]) => {
    setPaymentLines((prev) => prev.filter((l) => l.method !== method));
  };

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim();
    if (q) return resolvePartial(q, products);
    return products;
  }, [products, searchQuery]);

  const commitScan = async () => {
    const code = barcode.trim();
    if (!code) return;
    setScanning(true);
    setScanMiss("");
    await new Promise((resolve) => setTimeout(resolve, 150));

    const hit = resolveExact(code, products);
    if (hit) {
      setScanHit(hit);
      setBarcode("");
      setSearchQuery("");
    } else {
      setScanMiss(`Barcode tidak ditemukan: ${code}`);
    }
    setScanning(false);
  };

  const handleScanAddToCart = (
    product: Product,
    variant: { plu: string; size: string; color: string; stock: number; image?: string }
  ) => {
    increaseQty({
      ...product,
      id: variant.plu,
      barcode: variant.plu,
      name: `${product.name} (${variant.color} / ${variant.size})`,
      stock: variant.stock,
      image: variant.image || product.image,
    });
  };

  const runNewOrder = async () => {
    if (cart.length > 0) {
      setNewOrderConfirmOpen(true);
      return;
    }
    setLoadingAction("new");
    await new Promise((resolve) => setTimeout(resolve, 250));
    newOrder();
    setLoadingAction(null);
  };

  const confirmHoldAndNew = async () => {
    setNewOrderConfirmOpen(false);
    setLoadingAction("hold");
    await new Promise((resolve) => setTimeout(resolve, 250));
    holdOrder();
    setLoadingAction(null);
  };

  const confirmCancelAndNew = async () => {
    setNewOrderConfirmOpen(false);
    setLoadingAction("new");
    await new Promise((resolve) => setTimeout(resolve, 250));
    newOrder();
    setLoadingAction(null);
  };

  const runHoldOrder = async () => {
    setLoadingAction("hold");
    await new Promise((resolve) => setTimeout(resolve, 250));
    holdOrder();
    setLoadingAction(null);
  };

  const canProcess = cart.length > 0 && !!salesPartner && !processLoading;

  const processOrder = async () => {
    if (cart.length === 0 || !salesPartner) return;
    setProcessLoading(true);
    const salePayments = { ...paymentNominals };
    const saleTotal = grandTotal;
    await new Promise((resolve) => setTimeout(resolve, 600));
    recordCashierSale(salePayments, saleTotal);

    // Tunai / cash → buka drawer (sama seperti cut+kick di thermal)
    const paidCash = Object.entries(salePayments).some(
      ([method, amt]) => amt > 0 && /cash|tunai/i.test(method)
    );
    if (paidCash) {
      void openCashDrawer();
    }

    setProcessLoading(false);
    setConfirmOpen(false);
    setProcessOpen(false);
    setPaymentLines([]);
    newOrder();
  };

  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const afterPromo = Math.max(0, cartSubtotal - (promo?.amount ?? 0));
  const grandTotal = Math.max(0, afterPromo - (redeemVoucher?.amount ?? 0));
  const maxRedeemAmount = afterPromo;

  // Jika keranjang mengecil di bawah voucher redeem → batalkan redeem
  useEffect(() => {
    if (redeemVoucher && redeemVoucher.amount > afterPromo) {
      setRedeemVoucher(null);
    }
  }, [afterPromo, redeemVoucher, setRedeemVoucher]);

  const totalPaid = Object.values(paymentNominals).reduce((s, v) => s + v, 0);
  const hasPayment = Object.values(paymentNominals).some((v) => v > 0);
  const isSufficient = totalPaid >= grandTotal;
  const hasOpenEdc = paymentLines.some(
    (l) =>
      isEdcMethod(l.method) &&
      (l.status === "pending" || l.status === "draft" || l.status === "failed")
  );
  const canPay = canProcess && hasPayment && isSufficient && !hasOpenEdc;

  const startPayment = () => {
    if (!canProcess) return;
    if (!selectCashierUnlocked({ cashier, lastActivityAt, unlocked })) {
      lockCashier();
      setCashierGate("transaction");
      return;
    }
    touchCashierActivity();
    setTransactionTypeOpen(true);
  };

  const handleTransactionTypeSelect = (type: TransactionType) => {
    if (type !== transactionType) {
      setTransactionType(type);
      setPaymentLines([]);
    }
    setTransactionTypeOpen(false);
    setProcessOpen(true);
  };
  return (
    <div className="pos-layout">
      {/* 3 kolom: kategori | toko+search+produk | member+cart */}
      <div
        className={`pos-body${sidebarCollapsed ? " is-cat-collapsed" : ""}`}
        onKeyDown={(event) => {
          if (event.key === "F2") {
            event.preventDefault();
            void runNewOrder();
          }
          if (event.key === "F3") {
            event.preventDefault();
            void runHoldOrder();
          }
        }}
        tabIndex={0}
      >
        <aside className="pos-col pos-col-categories">
          <CategorySidebar
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            categories={categories}
            products={products}
            loading={categoriesLoading || productsLoading}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </aside>

        <main className="pos-col pos-col-products">
          <div className="pos-panel">
            <div className="pos-mid-head">
              <div className="pos-mid-head__store">
                <p className="pos-mid-head__eyebrow">Kasir aktif</p>
                <p className="pos-mid-head__name">{storeName || storeId || "Toko"}</p>
              </div>

              <div className="pos-mid-head__scan">
                <div className="pos-toolbar__scan-wrap">
                  <Search className="pos-toolbar__scan-icon" />
                  <input
                    type="text"
                    value={barcode}
                    placeholder="Scan barcode / ketik kode…"
                    onChange={(e) => {
                      setBarcode(e.target.value);
                      setScanMiss("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void commitScan();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="pos-btn pos-btn--primary"
                  onClick={() => void commitScan()}
                  disabled={scanning}
                >
                  {scanning ? "…" : "Scan"}
                </button>
              </div>

              <div className="pos-mid-head__actions">
                <button
                  type="button"
                  className="pos-btn pos-btn--accent"
                  onClick={() =>
                    setPromo({
                      code: "PROMO10",
                      description: "Fashion Weekend 10%",
                      amount: 10000,
                    })
                  }
                >
                  Promo
                </button>
                {promo && (
                  <button type="button" className="pos-btn" onClick={() => setPromo(null)}>
                    × Promo
                  </button>
                )}
                <button
                  type="button"
                  className="pos-btn"
                  onClick={() => void runNewOrder()}
                  disabled={loadingAction !== null}
                >
                  New (F2)
                </button>
                <button
                  type="button"
                  className="pos-btn pos-btn--warn"
                  onClick={() => void runHoldOrder()}
                  disabled={loadingAction !== null}
                >
                  Hold (F3){heldOrders.length > 0 ? ` (${heldOrders.length})` : ""}
                </button>
              </div>
            </div>

            {scanMiss ? (
              <div className="pos-scan-miss" role="status">
                {scanMiss}
              </div>
            ) : null}

            <div className="pos-mid-body">
              {scanHit ? (
                <ScanProductPanel
                  hit={scanHit}
                  onAddToCart={handleScanAddToCart}
                  onDismiss={() => setScanHit(null)}
                />
              ) : (
                <ProductGrid
                  products={visibleProducts}
                  searchQuery={searchQuery}
                  onAdd={increaseQty}
                  loading={productsLoading}
                  error={catalogError}
                />
              )}
            </div>
          </div>
        </main>

        <aside className="pos-col pos-col-cart">
          <div className="pos-panel">
            <div className="pos-member-slot">
              <SalesPartnerDialog
                selected={salesPartner}
                onSelect={setSalesPartner}
                required={cart.length > 0 && !salesPartner}
              />
              <MemberDialog
                selectedMember={member}
                onSelect={setMember}
                redeemVoucher={redeemVoucher}
                onRedeemApply={setRedeemVoucher}
                onRedeemClear={() => setRedeemVoucher(null)}
                maxRedeemAmount={maxRedeemAmount}
              />
              {heldOrders.length > 0 && (
                <div className="pos-member-slot__held">
                  <Select onValueChange={restoreOrder}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Restore held order…" />
                    </SelectTrigger>
                    <SelectContent>
                      {heldOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.id} · {order.items.length} item
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="pos-cart-wrap">
              <CartPanel
                items={cart}
                promo={promo}
                redeemVoucher={redeemVoucher}
                member={member}
                flat
                onIncrease={increaseLineQty}
                onDecrease={decreaseQty}
                onProcess={startPayment}
                canProcess={canProcess}
                processHint={
                  cart.length > 0 && !salesPartner
                    ? "Pilih sales partner dulu"
                    : undefined
                }
                processLoading={processLoading}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* ── CHECKOUT DIALOG ── */}
      <Dialog open={processOpen} onOpenChange={setProcessOpen}>
        <DialogContent
          className="pos-checkout-dialog"
          hideCloseButton
          accessibleTitle="Checkout pembayaran"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="pos-checkout-dialog__grid">
            {/* LEFT: Ringkasan */}
            <aside className="pos-checkout-summary">
              <div className="pos-checkout-summary__accent" />

              <div className="pos-checkout-summary__head">
                <div>
                  <p className="pos-checkout-summary__eyebrow">Transaksi berjalan</p>
                  <p className="pos-checkout-summary__title">Ringkasan Order</p>
                </div>
                <span className="pos-checkout-summary__badge">{cart.length} item</span>
              </div>

              <div className="pos-checkout-summary__total">
                <span>Total tagihan</span>
                <strong>Rp{grandTotal.toLocaleString("id-ID")}</strong>
              </div>

              <div className="pos-checkout-summary__items">
                <p className="pos-checkout-summary__section-label">Item belanja</p>
                {cart.length === 0 ? (
                  <p className="pos-checkout-summary__empty">Keranjang kosong</p>
                ) : (
                  cart.map((item, idx) => (
                    <div key={item.productId} className="pos-checkout-summary__item">
                      <span className="pos-checkout-summary__item-idx">{idx + 1}</span>
                      <div className="pos-checkout-summary__item-body">
                        <p className="pos-checkout-summary__item-name">{item.name}</p>
                        <p className="pos-checkout-summary__item-meta">
                          ×{item.qty} · Rp{item.price.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <p className="pos-checkout-summary__item-amt">
                        Rp{(item.price * item.qty).toLocaleString("id-ID")}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="pos-checkout-summary__foot">
                {promo?.amount ? (
                  <div className="pos-checkout-summary__promo">
                    <span>Promo {promo.code}</span>
                    <span>−Rp{promo.amount.toLocaleString("id-ID")}</span>
                  </div>
                ) : null}

                {redeemVoucher?.amount ? (
                  <div className="pos-checkout-summary__promo is-redeem">
                    <span>Redeem {redeemVoucher.code}</span>
                    <span>−Rp{redeemVoucher.amount.toLocaleString("id-ID")}</span>
                  </div>
                ) : null}

                {Object.entries(paymentNominals).filter(([, v]) => v > 0).length > 0 ? (
                  <div className="pos-checkout-summary__paybox">
                    <p className="pos-checkout-summary__section-label">Rincian bayar</p>
                    {Object.entries(paymentNominals)
                      .filter(([, v]) => v > 0)
                      .map(([k, v]) => (
                        <div key={k} className="pos-checkout-summary__payrow">
                          <span>{k}</span>
                          <span>Rp{v.toLocaleString("id-ID")}</span>
                        </div>
                      ))}
                    <div className="pos-checkout-summary__payrow is-total">
                      <span>Sudah dibayar</span>
                      <span className={isSufficient ? "is-ok" : "is-short"}>
                        Rp{totalPaid.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="pos-checkout-summary__hint">Belum ada nominal pembayaran</p>
                )}

                {member && (
                  <div className="pos-checkout-summary__member">
                    <div className="pos-checkout-summary__member-avatar">
                      {member.name
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="pos-checkout-summary__member-info">
                      <p>{member.name}</p>
                      <span>
                        {member.tier} · {member.points.toLocaleString("id-ID")} pts
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canPay}
                  className="pos-checkout-summary__pay-btn"
                  title={
                    !canPay && canProcess
                      ? !hasPayment
                        ? "Pilih metode & isi nominal dulu"
                        : hasOpenEdc
                          ? "Selesaikan / batalkan transaksi EDC dulu"
                          : "Nominal kurang dari total tagihan"
                      : undefined
                  }
                >
                  {processLoading ? "Memproses…" : "Bayar & Proses"}
                </button>
                <button
                  type="button"
                  onClick={() => setProcessOpen(false)}
                  disabled={processLoading}
                  className="pos-checkout-summary__close-btn"
                >
                  Tutup
                </button>
              </div>
            </aside>

            {/* RIGHT: Payment */}
            <div className="pos-checkout-dialog__pay">
              <PaymentPanel
                transactionType={transactionType}
                paymentMethod={paymentMethod}
                paymentLines={paymentLines}
                grandTotal={grandTotal}
                salesPartner={salesPartner}
                onPaymentMethodChange={setPaymentMethod}
                onUpsertLine={upsertPaymentLine}
                onRemoveLine={removePaymentLine}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TransactionTypeDialog
        open={transactionTypeOpen}
        onSelect={handleTransactionTypeSelect}
        onCancel={() => setTransactionTypeOpen(false)}
      />

      {/* ── CONFIRMATION DIALOG — sebelum eksekusi pembayaran ── */}
      <ConfirmOrderDialog
        open={confirmOpen}
        transactionType={transactionType}
        member={member}
        redeemVoucher={redeemVoucher}
        paymentNominals={paymentNominals}
        grandTotal={grandTotal}
        maxRedeemAmount={maxRedeemAmount}
        processLoading={processLoading}
        onConfirm={() => void processOrder()}
        onCancel={() => setConfirmOpen(false)}
        onMemberChange={setMember}
        onRedeemApply={setRedeemVoucher}
        onRedeemClear={() => setRedeemVoucher(null)}
      />

      {/* ── NEW ORDER CONFIRM — blok jika ada order berjalan ── */}
      <Dialog open={newOrderConfirmOpen} onOpenChange={setNewOrderConfirmOpen}>
        <DialogContent
          className="pos-neworder-dialog"
          hideCloseButton
          accessibleTitle="Order masih berjalan"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="pos-neworder__header">
            <AlertTriangle className="pos-neworder__header-icon" />
            <div>
              <span className="pos-neworder__eyebrow">Peringatan</span>
              <strong className="pos-neworder__title">Order Masih Berjalan</strong>
            </div>
          </div>

          <div className="pos-neworder__body">
            <p className="pos-neworder__desc">
              Terdapat <strong>{cart.length} item</strong> di keranjang saat ini.
              Pilih tindakan sebelum membuat order baru:
            </p>

            <div className="pos-neworder__actions">
              <button
                type="button"
                onClick={() => void confirmHoldAndNew()}
                disabled={loadingAction !== null}
                className="pos-neworder-action"
              >
                <PauseCircle className="pos-neworder-action__icon" />
                <span className="pos-neworder-action__text">
                  <strong>Hold Transaksi</strong>
                  <small>Simpan ke daftar hold, lanjutkan nanti</small>
                </span>
              </button>

              <button
                type="button"
                onClick={() => void confirmCancelAndNew()}
                disabled={loadingAction !== null}
                className="pos-neworder-action is-danger"
              >
                <Trash2 className="pos-neworder-action__icon" />
                <span className="pos-neworder-action__text">
                  <strong>Batalkan Order</strong>
                  <small>Buang semua item, mulai order kosong</small>
                </span>
              </button>
            </div>
          </div>

          <div className="pos-neworder__footer">
            <button
              type="button"
              onClick={() => setNewOrderConfirmOpen(false)}
              className="pos-neworder__cancel"
            >
              Kembali
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <CashierLoginDialog
        open={hasHydrated && cashierGate !== null && !switchShiftOpen}
        reason={cashierGate === "transaction" ? "transaction" : "open-pos"}
        knownCashier={cashierValid ? cashier : null}
        allowCancel
        cancelLabel={cashierGate === "transaction" && cashierReady ? "Batal" : "Kembali"}
        onCancel={() => {
          if (cashierGate === "transaction" && cashierReady) {
            setCashierGate(null);
            return;
          }
          setCashierGate(null);
          navigate(appPath("/store"));
        }}
        onRequestSwitchCashier={
          cashierValid && cashier
            ? () => setSwitchShiftOpen(true)
            : undefined
        }
        onSuccess={(session) => {
          const sameCashier = cashier?.id === session.id;
          if (sameCashier) unlockCashier();
          else signInCashier(session);
          const wasTx = cashierGate === "transaction";
          setCashierGate(null);
          if (wasTx) setTransactionTypeOpen(true);
        }}
      />

      {cashierValid && cashier ? (
        <CashierLogoutDialog
          open={switchShiftOpen}
          cashier={cashier}
          summary={logoutSummary}
          signedInAt={signedInAt}
          intent="switch"
          storeName={storeName || storeId || undefined}
          onCancel={() => setSwitchShiftOpen(false)}
          onConfirm={() => {
            setSwitchShiftOpen(false);
            signOutCashier();
            if (!cashierGate) setCashierGate("open-pos");
          }}
        />
      ) : null}
    </div>
  );
}
