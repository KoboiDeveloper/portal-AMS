import React from "react";
import { hrdAbsResign } from "./hrdConfigs";
import HrdPersonelTxPage from "./HrdPersonelTxPage";

const SORT_COLS = [
  { key: "employee_name", label: "Pegawai", type: "str" },
  { key: "department", label: "Departemen", type: "str" },
  { key: "tgl_resign", label: "Tgl. resign", type: "date" },
  { key: "cabang", label: "Cabang", type: "str" },
];

const HrdPersonelResignPage = () => (
  <HrdPersonelTxPage
    config={hrdAbsResign}
    pageTitle="Pengunduran diri"
    description="Input resign pegawai · pilih karyawan saat tambah"
    searchPlaceholder="NIK / nama"
    emptyTitle="Belum ada data resign"
    emptyHint="Tambah pengunduran diri pegawai."
    sortCols={SORT_COLS}
    defaultSort={{ key: "tgl_resign", dir: "desc" }}
    sectionColumns={[["Resign"], ["Catatan"]]}
    pickSubtitle="Cari by NIK atau nama, lalu isi data resign"
    entityLabel="Resign"
    buildPickPrefill={() => ({})}
    mapDetailAliases={(detail, mapped) => {
      if (!mapped.effective) {
        mapped.effective = detail.tgl_resign || detail.effective || detail.tanggal_efektif || "";
      }
      if (!mapped.remark && detail.remark) mapped.remark = detail.remark;
      if (!mapped.sk_no && detail.sk_no) mapped.sk_no = detail.sk_no;
      return mapped;
    }}
  />
);

export default HrdPersonelResignPage;
