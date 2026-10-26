import { buildImageProfileUrl } from "../../../../../lib/imageProfile";

/** Sample profile photo from employee list API — used until detail API is ready. */
export const DUMMY_EMPLOYEE_PHOTO =
  "RePPpqjqO0iGsUiwOa4ZVgnikRC032nameWhatsApp Image 2022-01-11 at 12.39.41.jpeg";

export const resolveEmployeePhotoUrl = (employee = {}) =>
  employee.photoUrl ||
  buildImageProfileUrl(employee.photo) ||
  buildImageProfileUrl(DUMMY_EMPLOYEE_PHOTO);

/** Dummy employee detail — replace with API when ready. */
export const DUMMY_EMPLOYEE_DETAIL = {
  id: 25040,
  nik: "30323325",
  namaLengkap: "PRILIA V.TUMOBER",
  photo: DUMMY_EMPLOYEE_PHOTO,
  photoUrl: buildImageProfileUrl(DUMMY_EMPLOYEE_PHOTO),
  email: "prilia.vtumober@example.com",
  jabatan: "SECTION HEAD",
  divisi: "INFORMATION TECH",
  departemen: "STORE",
  pegawaiStatus: "MANAGER ASSISTANT",
  statusLabel: "Status 25040",
  identitas: {
    aktifDate: "2021/11/15",
    resignDate: "2022/03/20",
    lokasi: "Toko",
    statusKerja: "Noaktif",
    nomorInduk: "30323325",
    namaLengkap: "PRILIA V.TUMOBER",
    namaPanggilan: "PRILIA",
    tempatLahir: "Manado",
    tanggalLahir: "2000/11/04",
    jenisKelamin: "Wanita",
    agama: "Katolik",
    wargaNegara: "Indonesia",
    nomorKtp: "7102145104000001",
    masaBerlakuKtp: "SEUMUR HIDUP",
    catatan: "REG FEBRUARI 2022",
  },
  alamat: {
    telepon: "087850391611",
    email: "prilia.vtumober@example.com",
    daruratTelepon: "081341425575",
    daruratEmail: "",
    daruratNama: "Helmi (Mama)",
    tinggalAlamat: "Jln.betesda 5, Ranotana, Ling III",
    tinggalKelurahan: "Ranotana",
    tinggalKecamatan: "Sario",
    tinggalKota: "Menado",
    tinggalKodePos: "95116",
    tinggalProvinsi: "SULAWESI UTARA",
    tinggalTelepon: "085241049268",
    ktpAlamat: "Rumengkor Satu, Jaga III Kec.Tombulu Kab.Minahasa",
    ktpKelurahan: "Rumengkor",
    ktpKecamatan: "Tombulu",
    ktpKota: "Menado",
    ktpKodePos: "95661",
    ktpProvinsi: "SULAWESI UTARA",
    ktpTelepon: "087850391611",
  },
  sipil: {
    keluargaInti: [
      {
        hubungan: "Ayah",
        nama: "Truly Happy Tumober",
        usia: "47",
        pendidikan: "SMA",
        pekerjaan: "Swasta",
        alamat: "Manado",
      },
    ],
    keluargaKandung: [
      {
        hubungan: "Ibu",
        nama: "Emili Rapar",
        usia: "48",
        pendidikan: "SMA",
        pekerjaan: "IRT",
        alamat: "Manado",
      },
    ],
    tempatTinggal: "Rumah Orang Tua",
    tempatTinggalLain: "",
    transportasi: "Kendaraan umum",
    transportasiLain: "",
    sim: [
      { tipe: "A", berlaku: "", daerah: "" },
      { tipe: "A", berlaku: "", daerah: "" },
    ],
  },
  pendidikan: {
    formalTerakhir: {
      jenjang: "TK",
      sekolah: "",
      kota: "* Tidak Diketahui",
      tahunKeluar: "",
      negara: "Indonesia",
      tahunMasuk: "",
      ipk: "",
      lulus: false,
      catatan: "",
    },
    formal: [
      {
        pendidikan: "SMA",
        sekolah: "SMK N 1 MANADO",
        periode: "2015-2018",
        jurusan: "USAHA PERJALANAN WISATA",
        kota: "Menado",
      },
    ],
    nonformal: [],
  },
  keahlian: {
    bahasa: [
      { nama: "Bahasa Indonesia", level: "Native", keterangan: "Bahasa sehari-hari" },
      { nama: "Bahasa Inggris", level: "Intermediate", keterangan: "Komunikasi dasar" },
    ],
    lainnya: [
      { nama: "Microsoft Office", level: "Advanced", keterangan: "Word, Excel, PowerPoint" },
      { nama: "Customer Service", level: "Good", keterangan: "Retail & hospitality" },
    ],
  },
  pekerjaan: {
    pengalaman: [
      {
        perusahaan: "PT INTERFOOD SUKSES JASINDO MANADO",
        periode: "2019-2021",
        alamat: "Jl. Sam Ratulangi No. 458, Manado",
        jabatan: "ADMINISTRATION",
        alasanResign: "MUTASI KE LUAR DAERAH",
      },
    ],
    kondisi: {
      masihAktif: "Ya",
      kerjaShift: "Ya",
      rotasi: "Ya",
      lembur: "Ya",
      kerjaMalam: "Ya",
      ditempatkanDaerah: "Ya",
      dinasDaerah: "Ya",
      gajiSebelumnya: "",
      strukturOrganisasi: "",
      pekerjaanMirip: "",
      pekerjaanMembantu: "",
      tunjangan: "",
      tanggalMulai: "",
      kenalan: "",
      referensi: "",
    },
  },
  aktifitas: {
    organisasi: [
      { organisasi: "OSIS SMK N 1 Manado", jabatan: "Anggota", periode: "2016-2017" },
    ],
    kegemaran: "Membaca, traveling",
    waktuLuang: "Jalan-jalan dan olahraga ringan",
    mediaBaca: "Kompas, Detik",
    berurusanHukum: "Ya",
    detailHukum: "",
  },
  kesehatan: {
    golonganDarah: "A",
    tinggiBadan: "",
    beratBadan: "",
    kacaMata: "Ya",
    ukuranKiri: "",
    ukuranKanan: "",
    sakitKeras: "Ya",
    jenisPenyakit: "",
    lamaPerawatan: "",
    periksaDokter: "Ya",
    alasan: "",
  },
  bank: {
    kodeBank: "BANK INTERNATIOANL INDONESIA",
    noRekening: "",
    pembayaran: "Non Transfer",
    npwp: "",
    tanggalNpwp: "",
    jamsostek: "",
    tanggalJamsostek: "",
    asuransi: "",
    tanggalAsuransi: "",
  },
  documents: {
    ktp: null,
    kartuKeluarga: null,
    npwp: null,
    ijazah: null,
  },
};

export const getEmployeeDummy = (employeeId) => {
  const key = String(employeeId || "").trim();
  if (!key || key === DUMMY_EMPLOYEE_DETAIL.nik || key === String(DUMMY_EMPLOYEE_DETAIL.id)) {
    return DUMMY_EMPLOYEE_DETAIL;
  }
  const photo = DUMMY_EMPLOYEE_PHOTO;
  return {
    ...DUMMY_EMPLOYEE_DETAIL,
    id: key,
    nik: key,
    photo,
    photoUrl: buildImageProfileUrl(photo),
    namaLengkap: `Pegawai Demo ${key}`,
    email: `pegawai.${key}@example.com`,
    jabatan: "SECTION HEAD",
    divisi: "INFORMATION TECH",
    departemen: "STORE",
    pegawaiStatus: "MANAGER ASSISTANT",
    statusLabel: `Status ${key}`,
    identitas: {
      ...DUMMY_EMPLOYEE_DETAIL.identitas,
      nomorInduk: key,
      namaLengkap: `Pegawai Demo ${key}`,
    },
  };
};
