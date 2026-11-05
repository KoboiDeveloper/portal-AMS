import React from "react";
import { hrdAbsMutasi } from "../../hrdConfigs";
import { PersonelHistoryPanel } from "../shared";

const COLUMNS = [
  { key: "nomor", label: "Nomor" },
  { key: "cabang_sebelum", label: "Cabang sebelum" },
  { key: "cabang_sekarang", label: "Cabang baru" },
  { key: "tanggal_efektif", label: "Tgl. efektif", type: "date" },
];

const SORT_KEYS = ["tanggal_efektif", "tanggal_aktif"];

const snapshotItems = (r) => [
  ["Nomor", r.nomor],
  ["Cabang sebelumnya", r.cabang_sebelum],
  ["Penempatan saat ini", r.cabang_sekarang],
  ["Tgl. efektif", r.tanggal_efektif, "date"],
];

const PenempatanTab = ({ pegawai }) => (
  <PersonelHistoryPanel
    title="Riwayat penempatan"
    snapshotTitle="Penempatan saat ini"
    config={hrdAbsMutasi}
    pegawai={pegawai}
    columns={COLUMNS}
    sortKeys={SORT_KEYS}
    snapshotItems={snapshotItems}
  />
);

export default PenempatanTab;
