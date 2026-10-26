import { create } from "zustand";
import { paymentMethodsByType } from "../data/pos-mock";
import type {
  CartItem,
  Category,
  Member,
  PaymentMethod,
  Product,
  Promo,
  RedeemVoucher,
  SalesPartner,
  TransactionType,
} from "../types/pos";

type HeldOrder = {
  id: string;
  createdAt: number;
  items: CartItem[];
  promo: Promo | null;
  member: Member | null;
  salesPartner: SalesPartner | null;
  redeemVoucher: RedeemVoucher | null;
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
};

interface PosState {
  activeCategory: Category;
  showProducts: boolean;
  cart: CartItem[];
  heldOrders: HeldOrder[];
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  promo: Promo | null;
  member: Member | null;
  salesPartner: SalesPartner | null;
  redeemVoucher: RedeemVoucher | null;
  setActiveCategory: (category: Category) => void;
  toggleProducts: () => void;
  setTransactionType: (type: TransactionType) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setMember: (member: Member | null) => void;
  setSalesPartner: (partner: SalesPartner | null) => void;
  setPromo: (promo: Promo | null) => void;
  setRedeemVoucher: (voucher: RedeemVoucher | null) => void;
  increaseQty: (product: Product) => void;
  increaseLineQty: (productId: string) => void;
  decreaseQty: (productId: string) => void;
  newOrder: () => void;
  holdOrder: () => void;
  restoreOrder: (orderId: string) => void;
}

const defaultTransactionType: TransactionType = "OFFLINE";

export const usePosStore = create<PosState>((set) => ({
  activeCategory: "",
  showProducts: true,
  cart: [],
  heldOrders: [],
  transactionType: defaultTransactionType,
  paymentMethod: paymentMethodsByType[defaultTransactionType][0],
  promo: null,
  member: null,
  salesPartner: null,
  redeemVoucher: null,
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  toggleProducts: () => set((state) => ({ showProducts: !state.showProducts })),
  setTransactionType: (transactionType) =>
    set({
      transactionType,
      paymentMethod: paymentMethodsByType[transactionType][0],
    }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setMember: (member) =>
    set((state) => ({
      member,
      redeemVoucher:
        member && state.redeemVoucher?.memberId === member.id
          ? state.redeemVoucher
          : null,
    })),
  setSalesPartner: (salesPartner) => set({ salesPartner }),
  setPromo: (promo) => set({ promo }),
  setRedeemVoucher: (redeemVoucher) => set({ redeemVoucher }),
  increaseQty: (product) =>
    set((state) => {
      const lineId = product.barcode || product.id;
      const maxStock = Math.max(0, Number(product.stock) || 0);
      if (maxStock <= 0) return state;

      const found = state.cart.find((item) => item.productId === lineId);
      if (found) {
        if (found.qty >= (found.stock || maxStock)) return state;
        return {
          cart: state.cart.map((item) =>
            item.productId === lineId
              ? { ...item, qty: item.qty + 1, stock: found.stock || maxStock }
              : item
          ),
        };
      }

      return {
        cart: [
          ...state.cart,
          {
            productId: lineId,
            plu: lineId,
            name: product.name,
            price: product.price,
            qty: 1,
            stock: maxStock,
            image: product.image || "",
            category: product.category || "",
          },
        ],
      };
    }),
  increaseLineQty: (productId) =>
    set((state) => {
      const found = state.cart.find((item) => item.productId === productId);
      if (!found) return state;
      if (found.qty >= found.stock) return state;
      return {
        cart: state.cart.map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + 1 } : item
        ),
      };
    }),
  decreaseQty: (productId) =>
    set((state) => {
      const next = state.cart
        .map((item) =>
          item.productId === productId ? { ...item, qty: Math.max(0, item.qty - 1) } : item
        )
        .filter((item) => item.qty > 0);
      return { cart: next };
    }),
  newOrder: () => set({ cart: [], promo: null, member: null, salesPartner: null, redeemVoucher: null }),
  holdOrder: () =>
    set((state) => {
      if (state.cart.length === 0) return state;
      const held: HeldOrder = {
        id: `HOLD-${Date.now()}`,
        createdAt: Date.now(),
        items: state.cart,
        promo: state.promo,
        member: state.member,
        salesPartner: state.salesPartner,
        redeemVoucher: state.redeemVoucher,
        transactionType: state.transactionType,
        paymentMethod: state.paymentMethod,
      };
      return {
        heldOrders: [held, ...state.heldOrders],
        cart: [],
        promo: null,
        member: null,
        salesPartner: null,
        redeemVoucher: null,
      };
    }),
  restoreOrder: (orderId) =>
    set((state) => {
      const selected = state.heldOrders.find((order) => order.id === orderId);
      if (!selected) return state;
      return {
        cart: selected.items,
        promo: selected.promo,
        member: selected.member,
        salesPartner: selected.salesPartner ?? null,
        redeemVoucher: selected.redeemVoucher,
        transactionType: selected.transactionType,
        paymentMethod: selected.paymentMethod,
        heldOrders: state.heldOrders.filter((order) => order.id !== orderId),
      };
    }),
}));
