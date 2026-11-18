import React from "react";
import { hrdAbsMutasi } from "./hrdConfigs";
import HrdPersonelTxPage from "./HrdPersonelTxPage";

const SORT_COLS = [
  { key: "employee_name", label: "Pegawai", type: "str" },
  { key: "nomor", label: "Nomor", type: "str" },
  { key: "cabang_sebelum", label: "Cabang sebelum", type: "str" },
  { key: "cabang_sekarang", label: "Mutasi ke cabang", type: "str" },
  { key: "tanggal_efektif", label: "Efektif", type: "date" },
];

const HrdPersonelMutasiPage = () => (
  <HrdPersonelTxPage
    config={hrdAbsMutasi}
    pageTitle="Personel mutasi"
    description="Ubah penempatan cabang · pilih karyawan saat tambah"
    searchPlaceholder="NIK / nama / no. mutasi"
    emptyTitle="Belum ada data mutasi"
    emptyHint="Tambah mutasi penempatan pegawai."
    sortCols={SORT_COLS}
    sectionColumns={[
      ["Dokumentasi"],
      ["Penempatan sebelumnya"],
      ["Penempatan sekarang"],
    ]}
    modalClassName="hrd-kontrak-form-anim hrd-form-modal--cols3"
    pickSubtitle="Cari by NIK atau nama, lalu isi mutasi cabang"
    entityLabel="Mutasi"
    buildPickPrefill={(emp, det) => ({
      jabatan: det?.jabatan || emp?.job_title || "—",
      cabang_sebelum: det?.branch_name || emp?.branch_name || "—",
      kota_sebelum: det?.kota || "—",
      provinsi_sebelum: det?.provinsi || "—",
      brand_sebelum: det?.brand || emp?.brand || "—",
    })}
    mapDetailAliases={(detail, mapped) => {
      const pick = (...vals) =>
        vals.find((v) => v != null && String(v).trim() !== "" && v !== "—" && v !== " - ");
      mapped.no_mutasi = pick(mapped.no_mutasi, detail.no_mutasi, detail.nomor) || "";
      mapped.tanggal_mutasi = pick(mapped.tanggal_mutasi, detail.tanggal_mutasi) || "";
      mapped.tanggal_aktif =
        pick(mapped.tanggal_aktif, detail.tanggal_aktif, detail.tanggal_efektif) || "";
      mapped.catatan = pick(mapped.catatan, detail.catatan) || "";
      mapped.jabatan = pick(mapped.jabatan, detail.jabatan) || "—";
      mapped.status_sipil = pick(mapped.status_sipil, detail.status_sipil) || "—";
      mapped.cabang_sebelum = pick(mapped.cabang_sebelum, detail.cabang_sebelum) || "—";
      mapped.kota_sebelum = pick(mapped.kota_sebelum, detail.kota_sebelum) || "—";
      mapped.provinsi_sebelum = pick(mapped.provinsi_sebelum, detail.provinsi_sebelum) || "—";
      mapped.brand_sebelum = pick(mapped.brand_sebelum, detail.brand_sebelum) || "—";
      mapped.cabang_sekarang =
        pick(mapped.cabang_sekarang, detail.cabang_sekarang, detail.cabang_sekarang_id) || "";
      mapped.kota_sekarang = pick(mapped.kota_sekarang, detail.kota_sekarang) || "—";
      mapped.provinsi_sekarang =
        pick(mapped.provinsi_sekarang, detail.provinsi_sekarang) || "—";
      mapped.brand_sekarang = pick(mapped.brand_sekarang, detail.brand_sekarang) || "—";
      if (detail.pegawai_id) mapped.pegawai_id = detail.pegawai_id;
      if (detail.nik) mapped.nik = detail.nik;
      if (detail.employee_name) mapped.employee_name = detail.employee_name;
      return mapped;
    }}
  />
);

export default HrdPersonelMutasiPage;
