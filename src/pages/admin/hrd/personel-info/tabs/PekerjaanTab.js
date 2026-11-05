import React from "react";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { PersonelScForm, PersonelSubTable, fld, mf } from "../shared";

const PENGALAMAN_COLUMNS = [
  { key: "perusahaan", label: "Perusahaan" },
  { key: "jabatan", label: "Jabatan" },
  { key: "periode", label: "Periode" },
  { key: "alasan_resign", label: "Alasan resign" },
];

const PENGALAMAN_FIELDS = [
  mf("perusahaan", "Perusahaan", 8),
  mf("periode", "Periode", 4),
  mf("jabatan", "Jabatan", 6),
  mf("alasan_resign", "Alasan resign", 6),
  mf("alamat", "Alamat perusahaan", 12, "textarea", { rows: 2 }),
];

const KONDISI_SECTIONS = [
  {
    title: "Kondisi kerja",
    fields: [
      fld("masih_aktif", "Masih aktif bekerja", 4, "yesno"),
      fld("tgl_bergabung", "Tanggal bergabung", 4, "date"),
      fld("gaji_all_in", "Gaji all in", 4),
      fld("tunjangan", "Tunjangan", 12),
      fld("struktur_organisasi", "Struktur organisasi", 12, "textarea"),
      fld("pekerjaan_mirip", "Pekerjaan yang mirip", 6, "textarea"),
      fld("pekerjaan_membantu", "Pekerjaan yang membantu", 6, "textarea"),
      fld("kenalan", "Kenalan di perusahaan", 6),
      fld("referensi", "Referensi", 6),
      fld("kerja_shift", "Bersedia kerja shift", 4, "yesno"),
      fld("ganti_pekerjaan", "Bersedia ganti pekerjaan", 4, "yesno"),
      fld("lembur", "Bersedia lembur", 4, "yesno"),
      fld("kerja_malam", "Bersedia kerja malam", 4, "yesno"),
      fld("dinas", "Bersedia dinas luar", 4, "yesno"),
      fld("ditempatkan_daerah", "Bersedia ditempatkan di daerah", 4, "yesno"),
    ],
  },
];

const PekerjaanTab = ({ pegawai }) => (
  <>
    <PersonelSubTable
      title="Pengalaman kerja"
      service={hrdPersonelInfoService.pengalaman}
      pegawaiId={pegawai.id}
      columns={PENGALAMAN_COLUMNS}
      fields={PENGALAMAN_FIELDS}
    />
    <PersonelScForm
      pegawaiId={pegawai.id}
      service={hrdPersonelInfoService.kondisiKerja}
      sections={KONDISI_SECTIONS}
      savedMessage="Kondisi kerja tersimpan"
    />
  </>
);

export default PekerjaanTab;
