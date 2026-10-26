export const statusClass = (status) => {
  const value = String(status || "").toLowerCase();
  if (["aktif", "active", "kontrak"].includes(value)) return "success";
  if (["noaktif", "inactive", "resign"].includes(value)) return "danger";
  return "warning";
};

export const getEmploymentStatusDisplay = (employee) => {
  const identitas = employee?.identitas || {};
  const isInactive = String(identitas.statusKerja || "").toLowerCase() === "noaktif";
  const statusKey = isInactive ? "noaktif" : identitas.statusKerja;
  return {
    label: isInactive ? "NONAKTIF" : (identitas.statusKerja || "AKTIF").toUpperCase(),
    color: statusClass(statusKey),
  };
};
