import React from "react";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { PersonelScForm, fld } from "../shared";

const SECTIONS = [
  {
    title: "Rekening pegawai",
    fields: [
      fld("bank_id", "Bank", 4, "select", { lookup: "bank" }),
      fld("no_rekening", "No. rekening", 4),
      fld("jenis_bayar_id", "Jenis pembayaran", 4, "select", { lookup: "jenis_pembayaran" }),
    ],
  },
  {
    title: "Rekening pasangan",
    fields: [
      fld("pasangan_nama", "Nama pasangan", 4),
      fld("pasangan_hubungan_id", "Hubungan", 4, "select", { lookup: "hubungan_keluarga" }),
      fld("pasangan_bank_id", "Bank", 4, "select", { lookup: "bank" }),
      fld("pasangan_no_rekening", "No. rekening", 4),
      fld("pasangan_jenis_bayar_id", "Jenis pembayaran", 4, "select", {
        lookup: "jenis_pembayaran",
      }),
    ],
  },
  {
    title: "Pajak & jaminan",
    fields: [
      fld("npwp", "NPWP", 4),
      fld("jamsostek", "Jamsostek", 4),
      fld("bpjs", "BPJS Kesehatan", 4),
      fld("asuransi", "Asuransi", 4),
    ],
  },
];

const BankTab = ({ pegawai }) => (
  <PersonelScForm
    pegawaiId={pegawai.id}
    service={hrdPersonelInfoService.bank}
    sections={SECTIONS}
    savedMessage="Bank tersimpan"
  />
);

export default BankTab;
