// Helper kecil untuk pengecekan permission (VIEW/CREATE/UPDATE/DELETE) berbasis list string.
export const PERMISSION_ACTIONS = ["VIEW", "CREATE", "UPDATE", "DELETE"];

export const normalizePermission = (value) => String(value ?? "").trim().toUpperCase();

export const hasPermission = (permissions, action) => {
  const target = normalizePermission(action);
  if (!target) return false;
  const list = Array.isArray(permissions) ? permissions : [];
  return list.some((p) => normalizePermission(p) === target);
};
