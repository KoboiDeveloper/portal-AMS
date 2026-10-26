export const appPath = (path = "") => {
  const base = process.env.PUBLIC_URL || "";
  if (!path) return base || "/";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};
