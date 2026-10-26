const CACHE_NAME = "ams-pos-product-images-v1";
const MAX_CACHE_ITEMS = 120;
const memoryCache = new Map<string, string>();
const FETCH_TIMEOUT_MS = 4500;

async function trimCache(cache: Cache): Promise<void> {
  const keys = await cache.keys();
  const excess = keys.length - MAX_CACHE_ITEMS;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache",
      signal: ctrl.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Cache Storage membuat gambar tetap tersedia setelah reload.
 * Jika image host tidak mengizinkan CORS / Cache API gagal, URL asli dikembalikan.
 */
export async function getCachedProductImage(url: string): Promise<string> {
  const normalized = url.trim();
  if (!normalized) throw new Error("Image URL kosong");

  const memoryHit = memoryCache.get(normalized);
  if (memoryHit) return memoryHit;

  if (!("caches" in window)) {
    return normalized;
  }

  try {
    const cache = await window.caches.open(CACHE_NAME);
    let response = await cache.match(normalized);

    if (!response) {
      response = await fetchWithTimeout(normalized);
      if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
      await cache.put(normalized, response.clone());
      void trimCache(cache);
    }

    const blob = await response.blob();
    if (!blob.size) return normalized;

    const objectUrl = URL.createObjectURL(blob);
    memoryCache.set(normalized, objectUrl);
    return objectUrl;
  } catch {
    return normalized;
  }
}
