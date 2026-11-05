import React from "react";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { PersonelScForm, PersonelSubTable, fld, mf } from "../shared";

const FORM_SECTIONS = [
  {
    title: "Status & tempat tinggal",
    fields: [
      fld("status_sipil_id", "Status sipil", 4, "select", { lookup: "status_sipil" }),
      fld("tempat_tinggal_id", "Tempat tinggal", 4, "select", { lookup: "tempat_tinggal" }),
      fld("tempat_tinggal_lain", "Tempat tinggal lainnya", 4),
      fld("transportasi_id", "Transportasi", 4, "select", { lookup: "transportasi" }),
      fld("transportasi_lain", "Transportasi lainnya", 4),
    ],
  },
  {
    title: "SIM",
    fields: [
      fld("sim1_id", "SIM 1", 4, "select", { lookup: "sim" }),
      fld("sim1_tahun", "Tahun terbit SIM 1", 4, "number"),
      fld("sim1_daerah", "Daerah penerbit SIM 1", 4),
      fld("sim2_id", "SIM 2", 4, "select", { lookup: "sim" }),
      fld("sim2_tahun", "Tahun terbit SIM 2", 4, "number"),
      fld("sim2_daerah", "Daerah penerbit SIM 2", 4),
    ],
  },
];

const KELUARGA_COLUMNS = [
  { key: "nama", label: "Nama" },
  { key: "hubungan_id", label: "Hubungan", lookup: "hubungan_keluarga", labelKey: "hubungan" },
  { key: "usia", label: "Usia" },
  { key: "tgl_lahir", label: "Tgl. lahir", type: "date" },
  { key: "pendidikan_id", label: "Pendidikan", lookup: "pendidikan", labelKey: "pendidikan" },
  { key: "pekerjaan", label: "Pekerjaan" },
];

const KELUARGA_FIELDS = [
  mf("nama", "Nama", 6),
  mf("hubungan_id", "Hubungan", 6, "select", { lookupKey: "hubungan_keluarga" }),
  mf("tgl_lahir", "Tanggal lahir", 4, "date"),
  mf("usia", "Usia", 4, "number"),
  mf("pendidikan_id", "Pendidikan", 4, "select", { lookupKey: "pendidikan" }),
  mf("pekerjaan", "Pekerjaan", 6),
  mf("no_ktp", "No. KTP", 6),
  mf("alamat", "Alamat", 12, "textarea", { rows: 2 }),
];

const SipilTab = ({ pegawai }) => (
  <>
    <PersonelScForm
      pegawaiId={pegawai.id}
      service={hrdPersonelInfoService.sipil}
      sections={FORM_SECTIONS}
      savedMessage="Data sipil tersimpan"
    />
    <PersonelSubTable
      title="Keluarga inti"
      service={hrdPersonelInfoService.keluargaInti}
      pegawaiId={pegawai.id}
      columns={KELUARGA_COLUMNS}
      fields={KELUARGA_FIELDS}
      emptyHint="Pasangan dan anak pegawai."
    />
    <PersonelSubTable
      title="Keluarga kandung"
      service={hrdPersonelInfoService.keluargaKandung}
      pegawaiId={pegawai.id}
      columns={KELUARGA_COLUMNS}
      fields={KELUARGA_FIELDS}
      emptyHint="Orang tua dan saudara kandung pegawai."
    />
  </>
);

export default SipilTab;
