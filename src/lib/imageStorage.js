const LEGACY_IMAGE_STORAGE_BASE = (
  process.env.REACT_APP_IMAGE_STORAGE_BASE_URL || "https://web.amscorp.id:3060/imagestorage/"
).replace(/\/?$/, "/");

/**
 * Dropbox paths from DCR insert/update API (buildDropboxPath → /uploads/dcr/...).
 * Everything else is treated as legacy ImageStorage filename/path.
 */
export const isDropboxStoragePath = (value) => {
  const v = String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .toLowerCase();
  if (!v) return false;
  return v.startsWith("/uploads/") || v.startsWith("uploads/");
};

/** API/DB default untuk slot kosong (contoh: "no_image") — jangan ditampilkan. */
export const isMissingImagePath = (value) => {
  const v = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/");
  if (!v) return true;
  if (v === "null" || v === "undefined" || v === "-" || v === "n/a" || v === "none") return true;
  const base = v.split("/").pop() || v;
  return (
    base === "no_image" ||
    base.startsWith("no_image.") ||
    /no[_-]?image/.test(base) ||
    /image[_-]?not[_-]?available/.test(base)
  );
};

/**
 * Legacy ImageStorage URL (old DCR / AMS images).
 * Do NOT use this for Dropbox paths — those need temporary-link API.
 */
export const buildImageStorageUrl = (filename) => {
  const value = String(filename ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (isDropboxStoragePath(value)) return "";

  let relative = value.replace(/\\/g, "/").replace(/^\/+/, "");
  // Hindari double prefix kalau DB sudah simpan "imagestorage/..." atau "ImageStorage/..."
  relative = relative.replace(/^(imagestorage|image\s*storage)\//i, "");

  return `${LEGACY_IMAGE_STORAGE_BASE}${encodeURI(relative)}`;
};

export const getLegacyImageStorageBase = () => LEGACY_IMAGE_STORAGE_BASE;
