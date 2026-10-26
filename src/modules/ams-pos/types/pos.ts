export type Category = string;

export interface PosCategory {
  code: string;
  label: string;
}

export type TransactionType = "OFFLINE" | "ONLINE";

export type PaymentMethod =
  | "Debit - BCA"
  | "Debit - BNI"
  | "Debit - BRI"
  | "Debit - Mandiri"
  | "Credit Card - BCA"
  | "Credit Card - BNI"
  | "Credit Card - BRI"
  | "Credit Card - Mandiri"
  | "QRIS - BCA"
  | "QRIS - BNI"
  | "QRIS - BRI"
  | "QRIS - Mandiri"
  | "Cash"
  | "OVO"
  | "INDODANA"
  | "QRIS Static";

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface Product {
  id: string;
  article?: string;
  barcode: string;
  name: string;
  category: Category;
  price: number;
  image: string;
  color?: string;
  stock?: number;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  plu: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  /** Gambar khusus warna (dari media gateway) */
  image?: string;
}

export interface CartItem {
  productId: string;
  plu: string;
  name: string;
  price: number;
  qty: number;
  /** Stok toko untuk PLU ini; qty cart tidak boleh melebihi nilai ini */
  stock: number;
  image: string;
  category: string;
}

export interface Promo {
  code: string;
  description: string;
  amount: number;
}

export interface Member {
  id: string;
  name: string;
  address: string;
  points: number;
  tier: Tier;
}

/** Voucher hasil redeem poin — langsung dipakai di transaksi berjalan */
export interface RedeemVoucher {
  code: string;
  memberId: string;
  memberName: string;
  amount: number;
  pointsUsed: number;
}

/** Sales partner / manpower yang menangani transaksi */
export interface SalesPartner {
  nik: string;
  name: string;
  photoUrl: string;
  jabatan: string;
}

/** Kasir yang sedang sign-in di POS (shift) */
export interface CashierSession {
  id: string;
  name: string;
  shift: "1" | "2";
}

/** Ringkasan penjualan selama shift kasir aktif */
export interface CashierShiftSummary {
  txCount: number;
  totalAmount: number;
  byMethod: Record<string, number>;
}

/** Ketersediaan stok di toko lain (saran kasir ke customer) */
export interface StoreStockAvailability {
  storeId: string;
  storeName: string;
  kota: string;
  provinsi: string;
  qty: number;
}

export type ScanMatchType = "plu" | "article";

export type ScanExactHit = {
  product: Product;
  variant: ProductVariant;
  matchType: ScanMatchType;
  otherStores: StoreStockAvailability[];
};
