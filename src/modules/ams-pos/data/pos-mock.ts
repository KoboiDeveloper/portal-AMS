import type {
  Category,
  Member,
  PaymentMethod,
  Product,
  ProductVariant,
  StoreStockAvailability,
  TransactionType,
} from "../types/pos";

const VARIANT_COLORS = [
  { color: "Putih",   colorHex: "#FFFFFF" },
  { color: "Hitam",   colorHex: "#1A1A1A" },
  { color: "Navy",    colorHex: "#1B2A4A" },
  { color: "Abu",     colorHex: "#9CA3AF" },
  { color: "Merah",   colorHex: "#DC2626" },
  { color: "Krem",    colorHex: "#F5F0E8" },
];

const VARIANT_SIZES = ["S", "M", "L", "XL", "XXL"];

const MOCK_OTHER_STORES = [
  { storeId: "BDG01", storeName: "AMS Bandung Riau", kota: "Bandung", provinsi: "Jawa Barat" },
  { storeId: "JKT01", storeName: "AMS Jakarta PI", kota: "Jakarta Selatan", provinsi: "DKI Jakarta" },
  { storeId: "SBY01", storeName: "AMS Surabaya Tunjungan", kota: "Surabaya", provinsi: "Jawa Timur" },
  { storeId: "YGY01", storeName: "AMS Yogyakarta Malioboro", kota: "Yogyakarta", provinsi: "DI Yogyakarta" },
  { storeId: "SMG01", storeName: "AMS Semarang Paragon", kota: "Semarang", provinsi: "Jawa Tengah" },
];

/** Generate variants — sebagian size sengaja stok 0 untuk demo OOS lintas toko */
export function getProductVariants(productId: string): ProductVariant[] {
  const seed = productId.charCodeAt(productId.length - 2) + productId.charCodeAt(productId.length - 1);
  const colorCount = 2 + (seed % 3); // 2-4 warna
  const colors = VARIANT_COLORS.slice(seed % 3, seed % 3 + colorCount);
  const variants: ProductVariant[] = [];
  for (const c of colors) {
    for (const size of VARIANT_SIZES) {
      const skip = (seed + c.color.length + size.length) % 5 === 0;
      if (skip && size === "XXL") continue;
      // Demo OOS: XXL selalu habis; L pada warna pertama juga habis
      let stock = ((seed + c.color.length * size.length) % 10) + 1;
      if (size === "XXL") stock = 0;
      if (size === "L" && c.color === colors[0]?.color) stock = 0;
      const sizeCode = size.replace("X", "x");
      const colorCode = c.color.slice(0, 3).toUpperCase();
      variants.push({
        plu: `${productId}-${colorCode}-${sizeCode}`,
        size,
        color: c.color,
        colorHex: c.colorHex,
        stock,
      });
    }
  }
  return variants;
}

/** Stok di toko lain untuk PLU yang habis di toko kasir (mock) */
export function getOtherStoreStock(plu: string): StoreStockAvailability[] {
  const seed = plu.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return MOCK_OTHER_STORES.map((store, idx) => {
    const qty = ((seed + idx * 17) % 9) + (idx % 2 === 0 ? 2 : 0);
    return { ...store, qty };
  })
    .filter((s) => s.qty > 0)
    .sort((a, b) => b.qty - a.qty);
}

export const categories: Category[] = [
  "TSHIRT",
  "SHIRT",
  "TANKTOP",
  "JACKET",
  "CARDIGAN",
  "VEST",
  "PANTS",
  "SHORT",
  "DRESS",
  "BAG",
];

export const products: Product[] = [
  // ─── TSHIRT ──────────────────────────────────────────────────────────────
  { id: "ts01", barcode: "8990101", name: "Basic White Tee",         category: "TSHIRT",   price: 99000,  image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80" },
  { id: "ts02", barcode: "8990102", name: "Oversized Black Tee",     category: "TSHIRT",   price: 129000, image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80" },
  { id: "ts03", barcode: "8990103", name: "Graphic Print Tee",       category: "TSHIRT",   price: 149000, image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&q=80" },
  { id: "ts04", barcode: "8990104", name: "Striped Cotton Tee",      category: "TSHIRT",   price: 139000, image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80" },
  { id: "ts05", barcode: "8990105", name: "V-Neck Essential Tee",    category: "TSHIRT",   price: 119000, image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&q=80" },
  { id: "ts06", barcode: "8990106", name: "Crop Tie-Dye Tee",        category: "TSHIRT",   price: 169000, image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80" },
  { id: "ts07", barcode: "8990107", name: "Long Sleeve Pocket Tee",  category: "TSHIRT",   price: 179000, image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&q=80" },
  { id: "ts08", barcode: "8990108", name: "Polo Casual Tee",         category: "TSHIRT",   price: 189000, image: "https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=600&q=80" },

  // ─── SHIRT ───────────────────────────────────────────────────────────────
  { id: "sh01", barcode: "8990201", name: "Slim Fit Oxford Shirt",   category: "SHIRT",    price: 249000, image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80" },
  { id: "sh02", barcode: "8990202", name: "Classic Linen Shirt",     category: "SHIRT",    price: 269000, image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4c7a?w=600&q=80" },
  { id: "sh03", barcode: "8990203", name: "Flannel Check Shirt",     category: "SHIRT",    price: 289000, image: "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=600&q=80" },
  { id: "sh04", barcode: "8990204", name: "Mandarin Collar Shirt",   category: "SHIRT",    price: 259000, image: "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=600&q=80" },
  { id: "sh05", barcode: "8990205", name: "Batik Lengan Panjang",    category: "SHIRT",    price: 319000, image: "https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=600&q=80" },
  { id: "sh06", barcode: "8990206", name: "Casual Oversized Shirt",  category: "SHIRT",    price: 239000, image: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80" },
  { id: "sh07", barcode: "8990207", name: "Denim Shirt",             category: "SHIRT",    price: 279000, image: "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=600&q=80" },
  { id: "sh08", barcode: "8990208", name: "Hawaiian Print Shirt",    category: "SHIRT",    price: 229000, image: "https://images.unsplash.com/photo-1602573991155-21f0143bb571?w=600&q=80" },

  // ─── TANKTOP ─────────────────────────────────────────────────────────────
  { id: "tt01", barcode: "8990301", name: "Ribbed Tank Top",         category: "TANKTOP",  price: 99000,  image: "https://images.unsplash.com/photo-1618677603286-0ec56cb6e1b5?w=600&q=80" },
  { id: "tt02", barcode: "8990302", name: "Basic Strap Top",         category: "TANKTOP",  price: 89000,  image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&q=80" },
  { id: "tt03", barcode: "8990303", name: "Cami Satin Top",          category: "TANKTOP",  price: 119000, image: "https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=600&q=80" },
  { id: "tt04", barcode: "8990304", name: "Muscle Tank",             category: "TANKTOP",  price: 109000, image: "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=600&q=80" },
  { id: "tt05", barcode: "8990305", name: "Square Neck Tank",        category: "TANKTOP",  price: 129000, image: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=600&q=80" },
  { id: "tt06", barcode: "8990306", name: "Racerback Sport Top",     category: "TANKTOP",  price: 139000, image: "https://images.unsplash.com/photo-1506629905607-d405b7a2f34a?w=600&q=80" },
  { id: "tt07", barcode: "8990307", name: "Lace Trim Cami",          category: "TANKTOP",  price: 149000, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80" },
  { id: "tt08", barcode: "8990308", name: "Halter Neck Top",         category: "TANKTOP",  price: 159000, image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&q=80" },

  // ─── JACKET ──────────────────────────────────────────────────────────────
  { id: "jk01", barcode: "8990401", name: "Denim Jacket",            category: "JACKET",   price: 399000, image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80" },
  { id: "jk02", barcode: "8990402", name: "Bomber Jacket",           category: "JACKET",   price: 449000, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80" },
  { id: "jk03", barcode: "8990403", name: "Leather Biker Jacket",    category: "JACKET",   price: 699000, image: "https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&q=80" },
  { id: "jk04", barcode: "8990404", name: "Windbreaker Jacket",      category: "JACKET",   price: 359000, image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80" },
  { id: "jk05", barcode: "8990405", name: "Oversized Blazer",        category: "JACKET",   price: 489000, image: "https://images.unsplash.com/photo-1550639525-c97d455acf70?w=600&q=80" },
  { id: "jk06", barcode: "8990406", name: "Varsity Jacket",          category: "JACKET",   price: 429000, image: "https://images.unsplash.com/photo-1544441893-675973e31985?w=600&q=80" },
  { id: "jk07", barcode: "8990407", name: "Puffer Jacket",           category: "JACKET",   price: 549000, image: "https://images.unsplash.com/photo-1608063615781-e2ef8c73d114?w=600&q=80" },
  { id: "jk08", barcode: "8990408", name: "Trench Coat",             category: "JACKET",   price: 599000, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80" },

  // ─── CARDIGAN ────────────────────────────────────────────────────────────
  { id: "cg01", barcode: "8990501", name: "Soft Knit Cardigan",      category: "CARDIGAN", price: 319000, image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80" },
  { id: "cg02", barcode: "8990502", name: "Button Down Cardigan",    category: "CARDIGAN", price: 289000, image: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&q=80" },
  { id: "cg03", barcode: "8990503", name: "Longline Cardigan",       category: "CARDIGAN", price: 349000, image: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=600&q=80" },
  { id: "cg04", barcode: "8990504", name: "Chunky Knit Cardi",       category: "CARDIGAN", price: 379000, image: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=600&q=80" },
  { id: "cg05", barcode: "8990505", name: "Cropped Cardigan",        category: "CARDIGAN", price: 259000, image: "https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600&q=80" },
  { id: "cg06", barcode: "8990506", name: "Open Front Cardigan",     category: "CARDIGAN", price: 299000, image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80" },
  { id: "cg07", barcode: "8990507", name: "Striped Knit Cardi",      category: "CARDIGAN", price: 309000, image: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600&q=80" },
  { id: "cg08", barcode: "8990508", name: "Neutral Oversized Cardi", category: "CARDIGAN", price: 339000, image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80" },

  // ─── VEST ────────────────────────────────────────────────────────────────
  { id: "vs01", barcode: "8990601", name: "Utility Vest",            category: "VEST",     price: 279000, image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80" },
  { id: "vs02", barcode: "8990602", name: "Knitted Sweater Vest",    category: "VEST",     price: 249000, image: "https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=600&q=80" },
  { id: "vs03", barcode: "8990603", name: "Puffer Down Vest",        category: "VEST",     price: 329000, image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80" },
  { id: "vs04", barcode: "8990604", name: "Tailored Blazer Vest",    category: "VEST",     price: 359000, image: "https://images.unsplash.com/photo-1550639525-c97d455acf70?w=600&q=80" },
  { id: "vs05", barcode: "8990605", name: "Denim Vest",              category: "VEST",     price: 269000, image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80" },
  { id: "vs06", barcode: "8990606", name: "Cargo Vest",              category: "VEST",     price: 299000, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80" },
  { id: "vs07", barcode: "8990607", name: "Linen Button Vest",       category: "VEST",     price: 239000, image: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80" },
  { id: "vs08", barcode: "8990608", name: "Minimalist Slim Vest",    category: "VEST",     price: 259000, image: "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=600&q=80" },

  // ─── PANTS ───────────────────────────────────────────────────────────────
  { id: "pt01", barcode: "8990701", name: "Wide Leg Pants",          category: "PANTS",    price: 289000, image: "https://images.unsplash.com/photo-1506629905607-d405b7a2f34a?w=600&q=80" },
  { id: "pt02", barcode: "8990702", name: "Slim Chino Pants",        category: "PANTS",    price: 269000, image: "https://images.unsplash.com/photo-1542840410-b8d5c52dca9e?w=600&q=80" },
  { id: "pt03", barcode: "8990703", name: "Cargo Pants",             category: "PANTS",    price: 319000, image: "https://images.unsplash.com/photo-1560243563-062bfc001d68?w=600&q=80" },
  { id: "pt04", barcode: "8990704", name: "High Waist Trousers",     category: "PANTS",    price: 299000, image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4c7a?w=600&q=80" },
  { id: "pt05", barcode: "8990705", name: "Straight Denim Jeans",    category: "PANTS",    price: 349000, image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80" },
  { id: "pt06", barcode: "8990706", name: "Jogger Pants",            category: "PANTS",    price: 229000, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80" },
  { id: "pt07", barcode: "8990707", name: "Palazzo Wide Pants",      category: "PANTS",    price: 309000, image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&q=80" },
  { id: "pt08", barcode: "8990708", name: "Linen Relaxed Pants",     category: "PANTS",    price: 279000, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80" },

  // ─── SHORT ───────────────────────────────────────────────────────────────
  { id: "st01", barcode: "8990801", name: "Casual Shorts",           category: "SHORT",    price: 179000, image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&q=80" },
  { id: "st02", barcode: "8990802", name: "Denim Cut-Off Shorts",    category: "SHORT",    price: 199000, image: "https://images.unsplash.com/photo-1560243563-062bfc001d68?w=600&q=80" },
  { id: "st03", barcode: "8990803", name: "Chino Bermuda Shorts",    category: "SHORT",    price: 219000, image: "https://images.unsplash.com/photo-1542840410-b8d5c52dca9e?w=600&q=80" },
  { id: "st04", barcode: "8990804", name: "Linen Short Pants",       category: "SHORT",    price: 189000, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80" },
  { id: "st05", barcode: "8990805", name: "Mini Biker Shorts",       category: "SHORT",    price: 149000, image: "https://images.unsplash.com/photo-1506629905607-d405b7a2f34a?w=600&q=80" },
  { id: "st06", barcode: "8990806", name: "Cargo Shorts",            category: "SHORT",    price: 229000, image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4c7a?w=600&q=80" },
  { id: "st07", barcode: "8990807", name: "High Waist Mom Shorts",   category: "SHORT",    price: 209000, image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&q=80" },
  { id: "st08", barcode: "8990808", name: "Sporty Track Shorts",     category: "SHORT",    price: 159000, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80" },

  // ─── DRESS ───────────────────────────────────────────────────────────────
  { id: "dr01", barcode: "8990901", name: "Floral Midi Dress",       category: "DRESS",    price: 349000, image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80" },
  { id: "dr02", barcode: "8990902", name: "Wrap Maxi Dress",         category: "DRESS",    price: 389000, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80" },
  { id: "dr03", barcode: "8990903", name: "Slip Mini Dress",         category: "DRESS",    price: 299000, image: "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=600&q=80" },
  { id: "dr04", barcode: "8990904", name: "Bodycon Dress",           category: "DRESS",    price: 329000, image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80" },
  { id: "dr05", barcode: "8990905", name: "Boho Off Shoulder Dress", category: "DRESS",    price: 369000, image: "https://images.unsplash.com/photo-1554412933-514a83d2f3cd?w=600&q=80" },
  { id: "dr06", barcode: "8990906", name: "Linen Shirt Dress",       category: "DRESS",    price: 319000, image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80" },
  { id: "dr07", barcode: "8990907", name: "Flowy Sundress",          category: "DRESS",    price: 279000, image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&q=80" },
  { id: "dr08", barcode: "8990908", name: "Formal Midi Dress",       category: "DRESS",    price: 419000, image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80" },

  // ─── BAG ─────────────────────────────────────────────────────────────────
  { id: "bg01", barcode: "8991001", name: "Leather Tote Bag",        category: "BAG",      price: 429000, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80" },
  { id: "bg02", barcode: "8991002", name: "Canvas Backpack",         category: "BAG",      price: 349000, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80" },
  { id: "bg03", barcode: "8991003", name: "Mini Crossbody Bag",      category: "BAG",      price: 299000, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80" },
  { id: "bg04", barcode: "8991004", name: "Woven Rattan Bag",        category: "BAG",      price: 319000, image: "https://images.unsplash.com/photo-1575032617751-6ddec2089882?w=600&q=80" },
  { id: "bg05", barcode: "8991005", name: "Clutch Evening Bag",      category: "BAG",      price: 259000, image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80" },
  { id: "bg06", barcode: "8991006", name: "Drawstring Bucket Bag",   category: "BAG",      price: 279000, image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80" },
  { id: "bg07", barcode: "8991007", name: "Structured Top Handle",   category: "BAG",      price: 499000, image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&q=80" },
  { id: "bg08", barcode: "8991008", name: "Quilted Chain Bag",       category: "BAG",      price: 539000, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80" },
];

export const members: Member[] = [
  { id: "m1", name: "Ariel Hikmat",   address: "Bandung, Jawa Barat",    points: 85000,  tier: "Gold"     },
  { id: "m2", name: "Dina Putri",     address: "Jakarta Selatan",        points: 12000,  tier: "Bronze"   },
  { id: "m3", name: "Rizky Pratama",  address: "Surabaya, Jawa Timur",   points: 150000, tier: "Platinum" },
];

export const paymentMethodsByType: Record<TransactionType, PaymentMethod[]> = {
  OFFLINE: [
    "Debit - BCA",
    "Debit - BNI",
    "Debit - BRI",
    "Debit - Mandiri",
    "Credit Card - BCA",
    "Credit Card - BNI",
    "Credit Card - BRI",
    "Credit Card - Mandiri",
    "QRIS - BCA",
    "QRIS - BNI",
    "QRIS - BRI",
    "QRIS - Mandiri",
    "OVO",
    "INDODANA",
    "Cash",
  ],
  ONLINE: ["QRIS Static"],
};
