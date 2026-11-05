import React from "react";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { PersonelScForm, PersonelSubTable, fld, mf } from "../shared";

const ORGANISASI_COLUMNS = [
  { key: "organisasi", label: "Organisasi" },
  { key: "jabatan", label: "Jabatan" },
  { key: "periode", label: "Periode" },
];

const ORGANISASI_FIELDS = [
  mf("organisasi", "Organisasi", 12),
  mf("jabatan", "Jabatan", 6),
  mf("periode", "Periode", 6),
];

const KEGEMARAN_SECTIONS = [
  {
    title: "Kegemaran & kegiatan",
    fields: [
      fld("kegemaran", "Kegemaran", 6, "textarea", { rows: 2 }),
      fld("kegiatan_luang", "Kegiatan waktu luang", 6, "textarea", { rows: 2 }),
      fld("surat_kabar", "Surat kabar / majalah yang dibaca", 12),
      fld("pernah_berurusan", "Pernah berurusan dengan polisi", 4, "yesno"),
      fld("kapan_dimana", "Kapan & di mana", 8),
    ],
  },
];

const AktifitasTab = ({ pegawai }) => (
  <>
    <PersonelSubTable
      title="Organisasi"
      service={hrdPersonelInfoService.organisasi}
      pegawaiId={pegawai.id}
      columns={ORGANISASI_COLUMNS}
      fields={ORGANISASI_FIELDS}
    />
    <PersonelScForm
      pegawaiId={pegawai.id}
      service={hrdPersonelInfoService.aktifitasForm}
      sections={KEGEMARAN_SECTIONS}
      savedMessage="Aktifitas tersimpan"
    />
  </>
);

export default AktifitasTab;
