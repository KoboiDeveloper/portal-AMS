import React, { useCallback } from "react";
import { hrdAbsMutasi } from "../../hrdConfigs";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { extractRow } from "../../../../../lib/response";
import { PersonelHistoryPanel } from "../shared";

const COLUMNS = [
  { key: "nomor", label: "Nomor" },
  { key: "cabang_sebelum", label: "Cabang sebelum" },
  { key: "cabang_sekarang", label: "Cabang baru" },
  { key: "tanggal_efektif", label: "Tgl. efektif", type: "date" },
];

const SORT_KEYS = ["tanggal_efektif", "tanggal_aktif"];

/** Match ASP employeeinfo Penempatan Saat ini (personel_penempatan field order). */
const snapshotItems = (r) => [
  ["Brand", r.kode],
  ["Kode", r.cabang],
  ["Kota", r.kota],
  ["Alamat", r.alamat],
  ["Provinsi", r.provinsi],
  ["Negara", r.negara],
];

const PenempatanTab = ({ pegawai }) => {
  const loadCurrent = useCallback(async (pegawaiId) => {
    const res = await hrdPersonelInfoService.penempatan(pegawaiId);
    return extractRow(res);
  }, []);

  return (
    <PersonelHistoryPanel
      title="Riwayat penempatan"
      snapshotTitle="Penempatan saat ini"
      config={hrdAbsMutasi}
      pegawai={pegawai}
      columns={COLUMNS}
      sortKeys={SORT_KEYS}
      snapshotItems={snapshotItems}
      loadCurrent={loadCurrent}
      sectionColumns={[
        ["Dokumentasi"],
        ["Penempatan sebelumnya"],
        ["Penempatan sekarang"],
      ]}
      hideSections={["Pegawai"]}
      modalClassName="hrd-kontrak-form-anim hrd-form-modal--cols3"
      listMode="stack"
      formAuto="mutasi"
    />
  );
};

export default PenempatanTab;
