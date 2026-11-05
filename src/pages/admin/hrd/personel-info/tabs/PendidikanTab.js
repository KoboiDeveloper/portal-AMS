import React from "react";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { PersonelScForm, PersonelSubTable, fld, mf } from "../shared";

const TERAKHIR_SECTIONS = [
  {
    title: "Pendidikan terakhir",
    fields: [
      fld("pendidikan_id", "Tingkat pendidikan", 4, "select", { lookup: "pendidikan" }),
      fld("nama_lembaga", "Nama lembaga", 8),
      fld("kota_id", "Kota", 4, "select", { lookup: "kota" }),
      fld("negara_id", "Negara", 4, "select", { lookup: "negara" }),
      fld("lulus", "Lulus", 4, "yesno"),
      fld("tahun_masuk", "Tahun masuk", 4, "number"),
      fld("tahun_keluar", "Tahun keluar", 4, "number"),
      fld("ipk", "IPK / nilai", 4),
      fld("catatan", "Catatan", 12, "textarea"),
    ],
  },
];

const FORMAL_COLUMNS = [
  { key: "pendidikan_id", label: "Tingkat", lookup: "pendidikan", labelKey: "pendidikan" },
  { key: "nama_lembaga", label: "Lembaga" },
  { key: "jurusan", label: "Jurusan" },
  { key: "periode", label: "Periode" },
  { key: "kota_id", label: "Kota", lookup: "kota", labelKey: "kota" },
];

const FORMAL_FIELDS = [
  mf("pendidikan_id", "Tingkat pendidikan", 4, "select", { lookupKey: "pendidikan" }),
  mf("nama_lembaga", "Nama lembaga", 8),
  mf("jurusan", "Jurusan", 4),
  mf("periode", "Periode", 4),
  mf("kota_id", "Kota", 4, "select", { lookupKey: "kota" }),
];

const NONFORMAL_COLUMNS = [
  { key: "materi", label: "Materi" },
  { key: "penyelenggara", label: "Penyelenggara" },
  { key: "tahun", label: "Tahun" },
  { key: "kota_id", label: "Kota", lookup: "kota", labelKey: "kota" },
];

const NONFORMAL_FIELDS = [
  mf("materi", "Materi / pelatihan", 12),
  mf("penyelenggara", "Penyelenggara", 6),
  mf("tahun", "Tahun", 3, "number"),
  mf("kota_id", "Kota", 3, "select", { lookupKey: "kota" }),
];

const PendidikanTab = ({ pegawai }) => (
  <>
    <PersonelScForm
      pegawaiId={pegawai.id}
      service={hrdPersonelInfoService.pendidikanTerakhir}
      sections={TERAKHIR_SECTIONS}
      savedMessage="Pendidikan terakhir tersimpan"
    />
    <PersonelSubTable
      title="Pendidikan formal"
      service={hrdPersonelInfoService.pendidikanFormal}
      pegawaiId={pegawai.id}
      columns={FORMAL_COLUMNS}
      fields={FORMAL_FIELDS}
    />
    <PersonelSubTable
      title="Pendidikan non formal"
      service={hrdPersonelInfoService.pendidikanNonformal}
      pegawaiId={pegawai.id}
      columns={NONFORMAL_COLUMNS}
      fields={NONFORMAL_FIELDS}
    />
  </>
);

export default PendidikanTab;
