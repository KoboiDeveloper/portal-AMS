import React from "react";
import { hrdAbsPromosi } from "./hrdConfigs";
import HrdPersonelTxPage from "./HrdPersonelTxPage";

const SORT_COLS = [
  { key: "employee_name", label: "Pegawai", type: "str" },
  { key: "nomor", label: "Nomor", type: "str" },
  { key: "jabatan_sebelum", label: "Jabatan lama", type: "str" },
  { key: "jabatan_sekarang", label: "Jabatan baru", type: "str" },
  { key: "tanggal_efektif", label: "Tgl. efektif", type: "date" },
];

const HrdPersonelPromosiPage = () => (
  <HrdPersonelTxPage
    config={hrdAbsPromosi}
    pageTitle="Personel promosi"
    description="Ubah jabatan pegawai · pilih karyawan saat tambah"
    searchPlaceholder="NIK / nama / no. jabatan"
    emptyTitle="Belum ada data promosi"
    emptyHint="Tambah perubahan jabatan pegawai."
    sortCols={SORT_COLS}
    sectionColumns={[
      ["Dokumentasi", "Tanggal"],
      ["Jabatan sebelumnya"],
      ["Jabatan sekarang"],
    ]}
    modalClassName="hrd-kontrak-form-anim hrd-form-modal--cols3"
    pickSubtitle="Cari by NIK atau nama, lalu isi promosi jabatan"
    entityLabel="Promosi"
    buildPickPrefill={(emp, det) => ({
      department_sebelum: det?.department || emp?.department || "—",
      pangkat_sebelum: det?.pangkat || emp?.pangkat || "—",
      jabatan_sebelum: det?.jabatan || emp?.job_title || "—",
      golongan_sebelum: det?.golongan || "—",
      tingkat_sebelum: det?.tingkat || "—",
    })}
    mapDetailAliases={(detail, mapped) => {
      const pick = (...vals) =>
        vals.find((v) => v != null && String(v).trim() !== "" && v !== "—" && v !== " - ");
      mapped.no_promosi = pick(mapped.no_promosi, detail.no_promosi, detail.nomor) || "";
      mapped.tanggal_surat_promosi =
        pick(mapped.tanggal_surat_promosi, detail.tanggal_surat_promosi) || "";
      mapped.tanggal_aktif =
        pick(mapped.tanggal_aktif, detail.tanggal_aktif, detail.tanggal_efektif) || "";
      mapped.percobaan_dari = pick(mapped.percobaan_dari, detail.percobaan_dari) || "";
      mapped.percobaan_sampai = pick(mapped.percobaan_sampai, detail.percobaan_sampai) || "";
      mapped.catatan = pick(mapped.catatan, detail.catatan) || "";
      mapped.department_sebelum =
        pick(mapped.department_sebelum, detail.department_sebelum) || "—";
      mapped.pangkat_sebelum = pick(mapped.pangkat_sebelum, detail.pangkat_sebelum) || "—";
      mapped.jabatan_sebelum =
        pick(mapped.jabatan_sebelum, detail.jabatan_sebelum, detail.jabatan_lama) || "—";
      mapped.golongan_sebelum = pick(mapped.golongan_sebelum, detail.golongan_sebelum) || "—";
      mapped.tingkat_sebelum = pick(mapped.tingkat_sebelum, detail.tingkat_sebelum) || "—";
      mapped.department = pick(mapped.department, detail.department) || "";
      mapped.pangkat = pick(mapped.pangkat, detail.pangkat) || "";
      mapped.jabatan =
        pick(mapped.jabatan, detail.jabatan, detail.jabatan_sekarang_id) || "";
      mapped.golongan = pick(mapped.golongan, detail.golongan) || "";
      mapped.tingkat = pick(mapped.tingkat, detail.tingkat) || "";
      if (detail.pegawai_id) mapped.pegawai_id = detail.pegawai_id;
      if (detail.nik) mapped.nik = detail.nik;
      if (detail.employee_name) mapped.employee_name = detail.employee_name;
      return mapped;
    }}
  />
);

export default HrdPersonelPromosiPage;
