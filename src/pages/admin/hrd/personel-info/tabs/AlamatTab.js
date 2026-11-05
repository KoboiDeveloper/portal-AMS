import React from "react";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { PersonelScForm, fld } from "../shared";

const addressFields = (prefix) => [
  fld(`${prefix}_jalan`, "Jalan", 12, "textarea", { rows: 2 }),
  fld(`${prefix}_kelurahan`, "Kelurahan", 4),
  fld(`${prefix}_kecamatan`, "Kecamatan", 4),
  fld(`${prefix}_kota_id`, "Kota", 4, "select", { lookup: "kota" }),
  fld(`${prefix}_provinsi_id`, "Provinsi", 4, "select", { lookup: "provinsi" }),
  fld(`${prefix}_kode_pos`, "Kode pos", 4),
  fld(`${prefix}_telp`, "Telepon", 4),
];

const SECTIONS = [
  {
    title: "Kontak utama",
    fields: [
      fld("telp_utama", "Telepon / HP", 4),
      fld("email_utama", "Email", 8),
    ],
  },
  {
    title: "Kontak darurat",
    fields: [
      fld("nama_darurat", "Nama", 4),
      fld("telp_darurat", "Telepon / HP", 4),
      fld("email_darurat", "Email", 4),
    ],
  },
  { title: "Alamat tinggal", fields: addressFields("tinggal") },
  { title: "Alamat KTP", fields: addressFields("ktp") },
];

const AlamatTab = ({ pegawai }) => (
  <PersonelScForm
    pegawaiId={pegawai.id}
    service={hrdPersonelInfoService.alamat}
    sections={SECTIONS}
    savedMessage="Alamat tersimpan"
  />
);

export default AlamatTab;
