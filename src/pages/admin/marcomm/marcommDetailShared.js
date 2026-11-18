/** Pick first non-empty value. SP columns are often a different case (JUDUL, to_DATE). */
export const pick = (row, ...keys) => {
  if (!row) return "";
  const entries = Object.entries(row);
  for (const k of keys) {
    const hit = entries.find(([rk]) => rk.toLowerCase() === String(k).toLowerCase());
    if (hit && hit[1] !== undefined && hit[1] !== null && hit[1] !== "") return hit[1];
  }
  return "";
};

export const createdIdFromRes = (res) => {
  const data = res?.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return pick(data, "id", "ID", "no_urut", "id_mission", "id_voucher");
  }
  return "";
};