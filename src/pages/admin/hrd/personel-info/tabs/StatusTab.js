import React from "react";
import { hrdAbsStatus } from "../../hrdConfigs";
import { PersonelHistoryPanel } from "../shared";

const COLUMNS = [
  { key: "nomor", label: "Nomor" },
  { key: "status_lama", label: "Status lama" },
  { key: "status_baru", label: "Status baru" },
  { key: "tanggal_efektif", label: "Tgl. efektif", type: "date" },
];

const SORT_KEYS = ["tanggal_efektif", "tanggal_aktif"];

const snapshotItems = (r) => [
  ["Nomor", r.nomor],
  ["Status lama", r.status_lama],
  ["Status saat ini", r.status_baru],
  ["Tgl. efektif", r.tanggal_efektif, "date"],
];

const StatusTab = ({ pegawai }) => (
  <PersonelHistoryPanel
    title="Riwayat status"
    snapshotTitle="Status saat ini"
    config={hrdAbsStatus}
    pegawai={pegawai}
    columns={COLUMNS}
    sortKeys={SORT_KEYS}
    snapshotItems={snapshotItems}
  />
);

export default StatusTab;
