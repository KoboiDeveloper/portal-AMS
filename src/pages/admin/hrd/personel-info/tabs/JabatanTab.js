import React from "react";
import { hrdAbsPromosi } from "../../hrdConfigs";
import { PersonelHistoryPanel } from "../shared";

const COLUMNS = [
  { key: "nomor", label: "Nomor" },
  { key: "jabatan_sebelum", label: "Jabatan lama" },
  { key: "jabatan_sekarang", label: "Jabatan baru" },
  { key: "tanggal_efektif", label: "Tgl. efektif", type: "date" },
];

const SORT_KEYS = ["tanggal_efektif", "tanggal_aktif"];

const snapshotItems = (r) => [
  ["Nomor", r.nomor],
  ["Jabatan sebelumnya", r.jabatan_sebelum],
  ["Jabatan saat ini", r.jabatan_sekarang],
  ["Tgl. efektif", r.tanggal_efektif, "date"],
];

const JabatanTab = ({ pegawai }) => (
  <PersonelHistoryPanel
    title="Riwayat jabatan"
    snapshotTitle="Jabatan saat ini"
    config={hrdAbsPromosi}
    pegawai={pegawai}
    columns={COLUMNS}
    sortKeys={SORT_KEYS}
    snapshotItems={snapshotItems}
  />
);

export default JabatanTab;
