import React from "react";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { PersonelScForm, fld } from "../shared";

const SECTIONS = [
  {
    title: "Kondisi fisik",
    fields: [
      fld("gol_darah_id", "Golongan darah", 4, "select", { lookup: "golongan_darah" }),
      fld("tinggi", "Tinggi badan (cm)", 4, "number"),
      fld("berat", "Berat badan (kg)", 4, "number"),
    ],
  },
  {
    title: "Kacamata",
    fields: [
      fld("kacamata", "Berkacamata", 4, "yesno"),
      fld("kacamata_kiri", "Minus / plus kiri", 4),
      fld("kacamata_kanan", "Minus / plus kanan", 4),
    ],
  },
  {
    title: "Riwayat penyakit",
    fields: [
      fld("sakit_keras", "Pernah sakit keras", 4, "yesno"),
      fld("jenis_penyakit", "Jenis penyakit", 4),
      fld("lama_perawatan", "Lama perawatan", 4),
      fld("diperiksa_dokter", "Diperiksa dokter perusahaan", 4, "yesno"),
      fld("alasan", "Alasan / catatan", 12, "textarea"),
    ],
  },
];

const KesehatanTab = ({ pegawai }) => (
  <PersonelScForm
    pegawaiId={pegawai.id}
    service={hrdPersonelInfoService.kesehatan}
    sections={SECTIONS}
    savedMessage="Kesehatan tersimpan"
  />
);

export default KesehatanTab;
