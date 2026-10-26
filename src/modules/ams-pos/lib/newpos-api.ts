import api from "../../../lib/api";
import type { PosCategory, Product, ProductVariant } from "../types/pos";
import { colorHexFor } from "./color-palette";

type ApiResponse<T> = {
  responseCode: string;
  responseMessage: string;
  store: string;
  itemData: T[];
};

type CategoryApiItem = {
  kode: string;
  kategori: string;
};

type StockApiItem = {
  article: string;
  plu: string;
  deskripsi: string;
  deskripsiB?: string;
  color?: string;
  size?: string;
  imgUrl?: string;
  Price?: number;
  price?: number;
  stock?: number;
};

const apiBase = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

export function cleanCategoryLabel(value: string): string {
  return value.replace(/^\s*\d+\s*-\s*/, "").trim();
}

function ensureSuccess<T>(response: ApiResponse<T>): ApiResponse<T> {
  if (!response || !String(response.responseCode).startsWith("200")) {
    throw new Error(response?.responseMessage || "Gagal memuat data POS");
  }
  return response;
}

function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    if (value && String(value).trim()) return String(value).trim();
  }
  return "";
}

/** Kelompokkan baris PLU menjadi satu produk per article. */
export function groupStockItemsToProducts(
  items: StockApiItem[],
  category: PosCategory
): Product[] {
  const order: string[] = [];
  const groups = new Map<string, StockApiItem[]>();

  for (const item of items) {
    const article = firstNonEmpty(item.article, item.plu) || `row-${order.length}`;
    const key = article.toUpperCase();
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  return order.map((key) => {
    const rows = groups.get(key) || [];
    const first = rows[0];
    const article = firstNonEmpty(first?.article, first?.plu);
    const variants: ProductVariant[] = rows.map((row) => {
      const color = firstNonEmpty(row.color) || "-";
      const size = firstNonEmpty(row.size) || "-";
      return {
        plu: String(row.plu || ""),
        size,
        color,
        colorHex: colorHexFor(color),
        stock: Number(row.stock) || 0,
        image: firstNonEmpty(row.imgUrl),
      };
    });

    const cover =
      variants.find((v) => v.image)?.image ||
      firstNonEmpty(first?.imgUrl) ||
      "";
    const stockTotal = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    const preferred = variants.find((v) => v.stock > 0) ?? variants[0];

    return {
      id: article,
      article,
      barcode: article,
      name: firstNonEmpty(first?.deskripsi, first?.deskripsiB, article),
      category: category.label,
      price: Number(first?.Price ?? first?.price) || 0,
      image: cover,
      color: preferred?.color,
      stock: stockTotal,
      variants,
    };
  });
}

export async function getPosCategories(
  storeId: string,
  signal?: AbortSignal
): Promise<PosCategory[]> {
  const response = (await api.get(`${apiBase}/api/newpos/master/kategori`, {
    params: { store_id: storeId },
    signal,
  })) as ApiResponse<CategoryApiItem>;

  return ensureSuccess(response).itemData.map((item) => ({
    code: String(item.kode),
    label: cleanCategoryLabel(String(item.kategori)),
  }));
}

export async function getPosProductsByCategory(
  storeId: string,
  category: PosCategory,
  signal?: AbortSignal
): Promise<Product[]> {
  const response = (await api.get(`${apiBase}/api/newpos/stock/kategori`, {
    params: {
      store_id: storeId,
      // Endpoint menerima kode yang berasal dari master kategori.
      kategori: category.code,
    },
    signal,
  })) as ApiResponse<StockApiItem>;

  return groupStockItemsToProducts(ensureSuccess(response).itemData, category);
}
