import React from "react";
import { Col, Row } from "reactstrap";
import { Icon } from "../../../../../components/Component";
import {
  ListSection,
  NoteBlock,
  ProfileList,
  ProfileSection,
  TabBlock,
} from "./components/Shared";

const noop = () => {};

export const IdentitasTab = ({ data }) => {
  const d = data.identitas;
  return (
    <>
      <TabBlock
        title="Informasi Identitas"
        description="Data identitas dan status kepegawaian pegawai."
        icon="user-circle"
        onSave={noop}
      >
        <ProfileSection
          title="Status Kepegawaian"
          divider
          items={[
            { label: "Aktif Date", value: d.aktifDate },
            { label: "Resign Date", value: d.resignDate },
            { label: "Lokasi", value: d.lokasi },
            { label: "Status", value: d.statusKerja },
          ]}
        />
        <ProfileSection
          title="Data Pegawai"
          divider
          topDivider
          items={[
            { label: "Nomor Induk", value: d.nomorInduk },
            { label: "Nama Lengkap", value: d.namaLengkap },
            { label: "Nama Panggilan", value: d.namaPanggilan },
            { label: "Tempat Lahir", value: d.tempatLahir },
            { label: "Tanggal Lahir", value: d.tanggalLahir },
            { label: "Jenis Kelamin", value: d.jenisKelamin },
            { label: "Agama", value: d.agama },
            { label: "Warga Negara", value: d.wargaNegara },
            { label: "Nomor KTP", value: d.nomorKtp },
            { label: "Masa Berlaku KTP", value: d.masaBerlakuKtp },
          ]}
        />
        <NoteBlock title="Catatan Pegawai" text={d.catatan} topDivider />
      </TabBlock>
    </>
  );
};

export const AlamatTab = ({ data }) => {
  const d = data.alamat;
  return (
    <TabBlock title="Alamat & Kontak" description="Informasi kontak dan alamat tinggal pegawai." icon="map-pin" onSave={noop}>
      <ProfileSection
        title="Kontak Utama"
        divider
        items={[
          { label: "Telepon", value: d.telepon },
          { label: "Email", value: d.email || data.email },
        ]}
      />
      <ProfileSection
        title="Kontak Darurat"
        divider
        topDivider
        items={[
          { label: "Nama", value: d.daruratNama },
          { label: "Telepon", value: d.daruratTelepon },
          { label: "Email", value: d.daruratEmail },
        ]}
      />
      <ProfileSection
        title="Alamat Tinggal"
        divider
        topDivider
        items={[
          { label: "Alamat", value: d.tinggalAlamat },
          { label: "Kelurahan", value: d.tinggalKelurahan },
          { label: "Kecamatan", value: d.tinggalKecamatan },
          { label: "Kota", value: d.tinggalKota },
          { label: "Kode Pos", value: d.tinggalKodePos },
          { label: "Provinsi", value: d.tinggalProvinsi },
          { label: "Telepon", value: d.tinggalTelepon },
        ]}
      />
      <ProfileSection
        title="Alamat Sesuai KTP"
        divider
        topDivider
        items={[
          { label: "Alamat", value: d.ktpAlamat },
          { label: "Kelurahan", value: d.ktpKelurahan },
          { label: "Kecamatan", value: d.ktpKecamatan },
          { label: "Kota", value: d.ktpKota },
          { label: "Kode Pos", value: d.ktpKodePos },
          { label: "Provinsi", value: d.ktpProvinsi },
          { label: "Telepon", value: d.ktpTelepon },
        ]}
      />
    </TabBlock>
  );
};

export const SipilTab = ({ data }) => {
  const d = data.sipil;
  const familyCols = [
    { key: "hubungan", label: "Hubungan", size: "md" },
    { key: "nama", label: "Nama" },
    { key: "usia", label: "Usia", size: "sm" },
    { key: "pendidikan", label: "Pendidikan", size: "md" },
    { key: "pekerjaan", label: "Pekerjaan", size: "md" },
    { key: "alamat", label: "Alamat", size: "lg" },
  ];
  return (
    <TabBlock title="Data Sipil" description="Keluarga, tempat tinggal, transportasi, dan SIM." icon="users" onSave={noop}>
      <ListSection title="Keluarga Inti" icon="user-list" columns={familyCols} rows={d.keluargaInti} />
      <ListSection title="Keluarga Kandung" icon="users" columns={familyCols} rows={d.keluargaKandung} topDivider />
      <ProfileSection
        title="Tempat Tinggal"
        divider
        topDivider
        items={[
          { label: "Tempat Tinggal", value: d.tempatTinggal },
          { label: "Lainnya", value: d.tempatTinggalLain },
        ]}
      />
      <ProfileSection
        title="Transportasi"
        divider
        topDivider
        items={[
          { label: "Transportasi", value: d.transportasi },
          { label: "Lainnya", value: d.transportasiLain },
        ]}
      />
      <ProfileSection
        title="Surat Izin Mengemudi"
        divider
        topDivider
        items={(d.sim || []).flatMap((item, index) => [
          { label: `Tipe SIM #${index + 1}`, value: item.tipe },
          { label: `Berlaku s/d #${index + 1}`, value: item.berlaku },
          { label: `Diterbitkan #${index + 1}`, value: item.daerah },
        ])}
      />
    </TabBlock>
  );
};

export const PendidikanTab = ({ data }) => {
  const d = data.pendidikan;
  const ft = d.formalTerakhir;
  const formalCols = [
    { key: "pendidikan", label: "Pendidikan", size: "md" },
    { key: "sekolah", label: "Sekolah/Universitas", size: "lg" },
    { key: "periode", label: "Periode", size: "md" },
    { key: "jurusan", label: "Jurusan", size: "lg" },
    { key: "kota", label: "Kota", size: "md" },
  ];
  return (
    <TabBlock title="Pendidikan" description="Riwayat pendidikan formal dan nonformal." icon="book-read" onSave={noop}>
      <ProfileSection
        title="Pendidikan Formal Terakhir"
        divider
        items={[
          { label: "Jenjang Pendidikan", value: ft.jenjang },
          { label: "Sekolah / Universitas", value: ft.sekolah },
          { label: "Kota", value: ft.kota },
          { label: "Negara", value: ft.negara },
          { label: "Tahun Masuk", value: ft.tahunMasuk },
          { label: "Tahun Keluar", value: ft.tahunKeluar },
          { label: "IPK", value: ft.ipk },
          { label: "LULUS", value: ft.lulus ? "Ya" : "Tidak" },
        ]}
      />
      <NoteBlock title="Catatan Pendidikan" text={ft.catatan} topDivider />
      <ListSection title="Pendidikan Formal" icon="book" columns={formalCols} rows={d.formal} topDivider />
      <ListSection title="Pendidikan Nonformal" icon="file-docs" columns={formalCols} rows={d.nonformal} topDivider />
    </TabBlock>
  );
};

export const KeahlianTab = ({ data }) => {
  const d = data.keahlian;
  const cols = [
    { key: "nama", label: "Nama", size: "lg" },
    { key: "level", label: "Level", size: "md" },
    { key: "keterangan", label: "Keterangan", size: "lg" },
  ];
  return (
    <TabBlock title="Keahlian" description="Bahasa dan keahlian lainnya." icon="bulb" onSave={noop}>
      <ListSection title="Bahasa Asing & Daerah" icon="globe" columns={cols} rows={d.bahasa} />
      <ListSection title="Keahlian Lainnya" icon="star" columns={cols} rows={d.lainnya} topDivider />
    </TabBlock>
  );
};

export const PekerjaanTab = ({ data }) => {
  const d = data.pekerjaan;
  const k = d.kondisi;
  const cols = [
    { key: "perusahaan", label: "Perusahaan", size: "lg" },
    { key: "periode", label: "Periode", size: "md" },
    { key: "alamat", label: "Alamat", size: "lg" },
    { key: "jabatan", label: "Jabatan", size: "md" },
    { key: "alasanResign", label: "Alasan Resign", size: "lg" },
  ];
  return (
    <TabBlock title="Pekerjaan" description="Pengalaman kerja dan kondisi pekerjaan." icon="briefcase" onSave={noop}>
      <ListSection title="Pengalaman Kerja" icon="building" columns={cols} rows={d.pengalaman} />
      <ProfileSection
        title="Kondisi Pekerjaan"
        divider
        topDivider
        items={[
          { label: "Masih aktif bekerja saat melamar", value: k.masihAktif },
          { label: "Kerja shift apabila diperlukan", value: k.kerjaShift },
          { label: "Ganti pekerjaan (rotasi)", value: k.rotasi },
          { label: "Lembur bila diperlukan", value: k.lembur },
          { label: "Kerja malam bila diperlukan", value: k.kerjaMalam },
          { label: "Ditempatkan di daerah", value: k.ditempatkanDaerah },
          { label: "Dinas ke daerah", value: k.dinasDaerah },
          { label: "Gaji all in sebelumnya (IDR)", value: k.gajiSebelumnya },
          { label: "Struktur Organisasi", value: k.strukturOrganisasi },
          { label: "Pekerjaan dahulu yang mirip", value: k.pekerjaanMirip },
          { label: "Pekerjaan yang dapat membantu", value: k.pekerjaanMembantu },
          { label: "Tunjangan yang diharapkan", value: k.tunjangan },
          { label: "Tanggal mulai bergabung", value: k.tanggalMulai },
          { label: "Kenalan di perusahaan", value: k.kenalan },
          { label: "Referensi di luar perusahaan", value: k.referensi },
        ]}
      />
    </TabBlock>
  );
};

export const AktifitasTab = ({ data }) => {
  const d = data.aktifitas;
  const cols = [
    { key: "organisasi", label: "Organisasi", size: "lg" },
    { key: "jabatan", label: "Jabatan", size: "md" },
    { key: "periode", label: "Periode", size: "md" },
  ];
  return (
    <TabBlock title="Aktifitas" description="Organisasi, kegemaran, dan catatan hukum." icon="activity" onSave={noop}>
      <ListSection title="Organisasi" icon="users" columns={cols} rows={d.organisasi} />
      <ProfileSection
        title="Kegemaran"
        divider
        topDivider
        items={[
          { label: "Kegemaran / Hobby", value: d.kegemaran },
          { label: "Kegiatan waktu luang", value: d.waktuLuang },
          { label: "Surat kabar / Majalah", value: d.mediaBaca },
        ]}
      />
      <ProfileSection
        title="Hukum"
        divider
        topDivider
        items={[
          { label: "Pernah berurusan dengan pihak berwajib", value: d.berurusanHukum },
          { label: "Kapan, dimana, perihal apa", value: d.detailHukum },
        ]}
      />
    </TabBlock>
  );
};

export const KesehatanTab = ({ data }) => {
  const d = data.kesehatan;
  return (
    <TabBlock title="Kesehatan" description="Data kesehatan dan pemeriksaan dokter." icon="heart" onSave={noop}>
      <ProfileList
        items={[
          { label: "Golongan Darah", value: d.golonganDarah },
          { label: "Tinggi Badan (cm)", value: d.tinggiBadan },
          { label: "Berat Badan (kg)", value: d.beratBadan },
          { label: "Memakai Kaca Mata", value: d.kacaMata },
          { label: "Ukuran Kiri", value: d.ukuranKiri },
          { label: "Ukuran Kanan", value: d.ukuranKanan },
          { label: "Sakit keras yang cukup lama", value: d.sakitKeras },
          { label: "Jenis penyakit dan kapan", value: d.jenisPenyakit },
          { label: "Lamanya perawatan", value: d.lamaPerawatan },
          { label: "Bersedia diperiksa dokter", value: d.periksaDokter },
          { label: "Alasan", value: d.alasan },
        ]}
      />
    </TabBlock>
  );
};

export const BankTab = ({ data }) => {
  const d = data.bank;
  return (
    <TabBlock title="Bank & Pajak" description="Rekening bank, NPWP, dan asuransi." icon="coins" onSave={noop}>
      <ProfileSection
        title="Bank Pegawai"
        divider
        items={[
          { label: "Kode Bank", value: d.kodeBank },
          { label: "No. Rekening", value: d.noRekening },
          { label: "Pembayaran", value: d.pembayaran },
        ]}
      />
      <ProfileSection
        title="Pajak & Asuransi"
        divider
        topDivider
        items={[
          { label: "Nomor NPWP", value: d.npwp },
          { label: "Tanggal NPWP", value: d.tanggalNpwp },
          { label: "Nomor Jamsostek", value: d.jamsostek },
          { label: "Tanggal Jamsostek", value: d.tanggalJamsostek },
          { label: "Nomor Asuransi", value: d.asuransi },
          { label: "Tanggal Asuransi", value: d.tanggalAsuransi },
        ]}
      />
    </TabBlock>
  );
};

export const UploadDocumentTab = ({ data }) => {
  const docs = [
    { key: "ktp", label: "KTP", icon: "file-text" },
    { key: "kartuKeluarga", label: "Kartu Keluarga", icon: "users" },
    { key: "npwp", label: "NPWP", icon: "file-docs" },
    { key: "ijazah", label: "Ijazah Terakhir", icon: "award" },
  ];
  return (
    <TabBlock title="Upload Document" description="Dokumen identitas dan pendukung pegawai." icon="upload" onSave={noop}>
      <Row className="g-gs">
        {docs.map((doc) => (
          <Col sm={6} lg={3} key={doc.key}>
            <div className="card card-bordered h-100">
              <div className="card-inner text-center">
                <div
                  className="d-flex align-items-center justify-content-center mx-auto mb-3 bg-lighter rounded"
                  style={{ width: 120, height: 120 }}
                >
                  <Icon name={doc.icon} className="fs-2 text-soft" />
                </div>
                <h6 className="title mb-1">{doc.label}</h6>
                <span className="sub-text">No image available</span>
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </TabBlock>
  );
};
