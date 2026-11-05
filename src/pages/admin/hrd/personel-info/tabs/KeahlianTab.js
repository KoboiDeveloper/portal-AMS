import React from "react";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { PersonelSubTable, mf } from "../shared";

const BAHASA_COLUMNS = [
  { key: "bahasa_id", label: "Bahasa", lookup: "bahasa", labelKey: "bahasa" },
  { key: "bicara_id", label: "Berbicara", lookup: "tingkat_keahlian", labelKey: "bicara" },
  { key: "menulis_id", label: "Menulis", lookup: "tingkat_keahlian", labelKey: "menulis" },
];

const BAHASA_FIELDS = [
  mf("bahasa_id", "Bahasa", 4, "select", { lookupKey: "bahasa" }),
  mf("bicara_id", "Berbicara", 4, "select", { lookupKey: "tingkat_keahlian" }),
  mf("menulis_id", "Menulis", 4, "select", { lookupKey: "tingkat_keahlian" }),
];

const KEAHLIAN_COLUMNS = [
  { key: "keahlian", label: "Keahlian" },
  { key: "kemampuan", label: "Kemampuan" },
];

const KEAHLIAN_FIELDS = [
  mf("keahlian", "Keahlian", 6),
  mf("kemampuan", "Kemampuan", 6),
];

const KeahlianTab = ({ pegawai }) => (
  <>
    <PersonelSubTable
      title="Bahasa"
      service={hrdPersonelInfoService.bahasa}
      pegawaiId={pegawai.id}
      columns={BAHASA_COLUMNS}
      fields={BAHASA_FIELDS}
      modalSize="lg"
    />
    <PersonelSubTable
      title="Keahlian"
      service={hrdPersonelInfoService.keahlian}
      pegawaiId={pegawai.id}
      columns={KEAHLIAN_COLUMNS}
      fields={KEAHLIAN_FIELDS}
    />
  </>
);

export default KeahlianTab;
