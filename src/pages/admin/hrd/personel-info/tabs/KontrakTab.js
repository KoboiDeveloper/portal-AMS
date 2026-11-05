import React from "react";
import { hrdAbsKontrak } from "../../hrdConfigs";
import { PersonelHistoryPanel } from "../shared";

const COLUMNS = [
  { key: "no_kontrak", label: "No. kontrak" },
  { key: "tgl_mulai", label: "Mulai", type: "date" },
  { key: "tanggal_berakhir", label: "Selesai", type: "date" },
  { key: "status_pegawai", label: "Status" },
  { key: "jabatan_name", label: "Jabatan" },
];

const SORT_KEYS = ["tgl_mulai", "tanggal_berakhir"];

const snapshotItems = (r) => [
  ["No. kontrak", r.no_kontrak],
  ["Mulai", r.tgl_mulai, "date"],
  ["Selesai", r.tanggal_berakhir, "date"],
  ["Status", r.status_pegawai],
  ["Jabatan", r.jabatan_name],
  ["Departemen", r.department_name],
];

const KontrakTab = ({ pegawai }) => (
  <PersonelHistoryPanel
    title="Riwayat kontrak"
    snapshotTitle="Kontrak saat ini"
    config={hrdAbsKontrak}
    pegawai={pegawai}
    columns={COLUMNS}
    sortKeys={SORT_KEYS}
    snapshotItems={snapshotItems}
  />
);

export default KontrakTab;
