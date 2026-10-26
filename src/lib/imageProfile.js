const IMAGE_PROFILE_BASE = (
  process.env.REACT_APP_IMAGE_PROFILE_BASE_URL || "https://web.amscorp.id:3060/ImageProfile/"
).replace(/\/?$/, "/");

/** Build full profile image URL from API `Photo` / `photo` field. */
export const buildImageProfileUrl = (photo) => {
  const value = String(photo ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${IMAGE_PROFILE_BASE}${encodeURI(value.replace(/^\//, ""))}`;
};
