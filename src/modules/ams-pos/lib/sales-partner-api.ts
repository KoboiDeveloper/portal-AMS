import { storeEmployeeService } from "../../../services/store-employee.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { buildImageProfileUrl } from "../../../lib/imageProfile";
import type { SalesPartner } from "../types/pos";

type EmployeeApiRow = {
  ID?: string | number;
  NomorIndukStr?: string;
  NamaLengkapStr?: string;
  JabatanStr?: string;
  Photo?: string;
  photo?: string;
  PegawaiNonAktifInt?: number | string;
};

type EmployeeListResponse = {
  responseCode?: string;
  responseMessage?: string;
  data?: unknown;
  rows?: unknown;
};

function isActiveEmployee(row: EmployeeApiRow): boolean {
  return Number(row?.PegawaiNonAktifInt) !== 1;
}

export async function getActiveSalesPartners(
  storeId: string,
  keywords = ""
): Promise<SalesPartner[]> {
  const res = (await storeEmployeeService.list({
    keywords: keywords.trim(),
    store_id: storeId,
  })) as EmployeeListResponse;
  if (!isSuccess(res)) {
    throw new Error(res.responseMessage || "Gagal memuat data karyawan");
  }

  return (extractRows(res) as EmployeeApiRow[])
    .filter(isActiveEmployee)
    .map((row) => {
      const nik = String(row.NomorIndukStr || "").trim();
      const name = String(row.NamaLengkapStr || "").trim();
      return {
        nik,
        name: name || nik || "-",
        photoUrl: buildImageProfileUrl(row.Photo ?? row.photo ?? ""),
        jabatan: String(row.JabatanStr || "").trim(),
      };
    })
    .filter((item) => item.nik);
}
