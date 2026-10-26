import type { Product, ScanExactHit } from "../types/pos";

const EXACT_MIN_LEN = 7;

function normalize(code: string): string {
  return code.trim().toLowerCase();
}

function articleKey(product: Product): string {
  return (product.article || product.barcode || product.id).trim().toLowerCase();
}

function defaultVariant(product: Product) {
  const variants = product.variants ?? [];
  return variants.find((v) => v.stock > 0) ?? variants[0] ?? null;
}

/** Exact: PLU variant ATAU kode article/barcode produk */
export function resolveExact(code: string, products: Product[]): ScanExactHit | null {
  const q = normalize(code);
  if (!q) return null;

  for (const product of products) {
    const variants = product.variants ?? [];
    const variant = variants.find((v) => v.plu.toLowerCase() === q);
    if (variant) {
      return {
        product,
        variant,
        matchType: "plu",
        otherStores: [],
      };
    }
  }

  const product = products.find((p) => articleKey(p) === q) ?? null;
  if (!product) return null;

  const variant = defaultVariant(product);
  if (!variant) return null;

  return {
    product,
    variant,
    matchType: "article",
    otherStores: [],
  };
}

/** Partial: filter produk by barcode / nama / id (untuk grid) */
export function resolvePartial(query: string, products: Product[]): Product[] {
  const q = normalize(query);
  if (!q) return [];

  return products.filter((p) => {
    const hay = `${p.barcode} ${p.name} ${p.id} ${p.article ?? ""}`.toLowerCase();
    if (hay.includes(q)) return true;
    // Juga match jika ada PLU variant yang mengandung query
    return (p.variants ?? []).some((v) => v.plu.toLowerCase().includes(q));
  });
}

/** Apakah input layak diperlakukan sebagai commit scan exact */
export function looksLikeExactScan(code: string, products: Product[]): boolean {
  const q = code.trim();
  if (!q) return false;
  if (resolveExact(q, products)) return true;
  // Scanner biasanya kirim kode panjang sekaligus
  return q.length >= EXACT_MIN_LEN && /^\S+$/.test(q);
}
