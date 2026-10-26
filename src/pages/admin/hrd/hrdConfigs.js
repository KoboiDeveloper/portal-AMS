import { createHrdService } from "../../../services/hrd/hrd.service";

/* ========== helpers ========== */
const titleColumn = (titleKey, subtitleKey, label = "Name") => ({
  key: titleKey,
  label,
  type: "title",
  titleKey,
  subtitleKey,
});
const badgeColumn = (key, label, size = "mb") => ({ key, label, size, type: "badge" });
const col = (key, label, size = "md") => ({ key, label, size });

const f = (name, label, type = "text", extra = {}) => ({ name, label, type, ...extra });
const fd = (name, label, type = "text", extra = {}) => ({ name, label, type, ...extra });

const MONTH_OPTS = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const OPT_ACTIVE = [
  { value: "", label: "ALL" },
  { value: "1", label: "ACTIVE" },
  { value: "0", label: "NON ACTIVE" },
];
const OPT_STATUS_APPROVE = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];
const OPT_STATUS_SIMPLE = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];
const OPT_PAJAK = [
  { value: "", label: "All" },
  { value: "1", label: "Pajak" },
  { value: "0", label: "Non Pajak" },
];
const OPT_SEMUA_WAKTU = [
  { value: "", label: "Tidak" },
  { value: "1", label: "Semua Waktu" },
];
const OPT_KATEGORI_IZIN = [
  { value: "", label: "All" },
  { value: "DATANG_TERLAMBAT", label: "Datang Terlambat" },
  { value: "PULANG_CEPAT", label: "Pulang Cepat" },
  { value: "KELUAR_KANTOR", label: "Keluar Kantor" },
  { value: "LAINNYA", label: "Lainnya" },
];
const OPT_JENIS_CUTI = [
  { value: "", label: "-- Pilih --" },
  { value: "TAHUNAN", label: "Cuti Tahunan" },
  { value: "KHUSUS", label: "Cuti Khusus" },
];
const OPT_JENIS_LEMBUR = [
  { value: "", label: "-- Pilih --" },
  { value: "WD", label: "Weekday" },
  { value: "WK", label: "Weekend" },
  { value: "HD", label: "Holiday" },
];

const emptyForm = (fields) =>
  fields.reduce((acc, field) => {
    if (field.type === "checkbox") acc[field.name] = false;
    else if (field.type === "hidden") acc[field.name] = "";
    else acc[field.name] = field.defaultValue ?? "";
    return acc;
  }, {});

const cfg = ({
  title,
  moduleCode,
  path,
  crud = false,
  columns,
  fields = [],
  filterDefs = [],
  hideSearch = false,
  hideStatusFilter = true,
  pageSize = 15,
  addButtonLabel,
  modalSize = "lg",
  modalSubtitle,
}) => {
  const initialForm = emptyForm(fields);
  return {
    title,
    moduleCode,
    service: createHrdService(path, { crud }),
    idField: "id",
    pageSize,
    hideSearch,
    hideStatusFilter,
    filterDefs,
    extraListParams: filterDefs.map((x) => x.name),
    readOnly: !crud,
    projectListColumns: columns,
    fields,
    initialForm,
    addButtonLabel,
    modalSize,
    modalSubtitle,
  };
};

/* ========== shared column sets ========== */
const personelListCols = [
  col("brand", "BRAND"),
  col("branch_name", "CABANG", "lg"),
  titleColumn("employee_name", "nik", "PEGAWAI"),
  col("pangkat", "PANGKAT"),
  col("job_title", "JABATAN"),
  col("status", "STATUS", "sm"),
];

/* ===================== ABS ===================== */
/** GH_absen_List.aspx — Brand, Store, From, To */
export const hrdAbsOnlineAttendance = cfg({
  title: "LIST ABSEN ONLINE",
  moduleCode: "HRD_ABS_ONLINE_LIST",
  path: "abs/online-attendance",
  columns: [col("store", "STORE"), col("tanggal", "TANGGAL ABSENSI", "lg")],
  hideSearch: true,
  filterDefs: [
    fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
    fd("id_store", "Store", "select", { lookupKey: "store", lookupParentField: "id_brand" }),
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
  ],
});

/** Rpt_Attendance.aspx — Keywords, Brand, Store, From, To */
export const hrdAbsAllAttendance = cfg({
  title: "ALL ATTENDANCE",
  moduleCode: "HRD_ABS_ALL_ATTENDANCE",
  path: "abs/all-attendance",
  columns: [
    col("store", "STORE"),
    titleColumn("employee_name", "nik", "EMPLOYEE"),
    col("tanggal", "DATE"),
    col("jam_masuk", "TIME IN", "sm"),
    col("jam_keluar", "TIME OUT", "sm"),
  ],
  filterDefs: [
    fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
    fd("id_store", "Store", "select", { lookupKey: "store", lookupParentField: "id_brand" }),
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
  ],
});

/** personel_list.aspx — DDLTIPESEARCH, ddlStatus, txtSearch; entry employeeinfo (CRUD stub fields minimal for list edit) */
export const hrdAbsPersonel = cfg({
  title: "Personel Info",
  moduleCode: "HRD_ABS_PERSONEL",
  path: "abs/personel",
  crud: true,
  columns: personelListCols,
  hideStatusFilter: false,
  filterDefs: [
    fd("tipe", "Tipe Search", "select", {
      options: [
        { value: "BRAND", label: "BRAND" },
        { value: "CABANG", label: "CABANG" },
        { value: "NOMOR_INDUK", label: "NOMOR INDUK" },
        { value: "PEGAWAI", label: "PEGAWAI" },
        { value: "PANGKAT", label: "PANGKAT" },
        { value: "JABATAN", label: "JABATAN" },
        { value: "DEPARTEMEN", label: "DEPARTEMEN" },
      ],
    }),
    fd("status", "Status", "select", { options: OPT_ACTIVE }),
  ],
  fields: [
    f("nik", "NIK", "text", { disabledOnEdit: true, required: true }),
    f("employee_name", "Nama", "text", { required: true }),
    f("brand", "Brand", "select", { lookupKey: "brand" }),
    f("branch_name", "Cabang", "select", { lookupKey: "cabang" }),
    f("pangkat", "Pangkat", "select", { lookupKey: "pangkat" }),
    f("job_title", "Jabatan", "select", { lookupKey: "jabatan" }),
    f("department", "Departemen", "select", { lookupKey: "department" }),
    f("status", "Status", "select", { options: OPT_ACTIVE }),
    f("is_active", "Active", "checkbox"),
  ],
});

/** personel_kontrak.aspx + lookup_kontrak_emp.aspx */
export const hrdAbsKontrak = cfg({
  title: "Personel Kontrak",
  moduleCode: "HRD_ABS_KONTRAK",
  path: "abs/personel-kontrak",
  crud: true,
  modalSize: "xl",
  columns: [
    titleColumn("employee_name", "nik", "Pegawai"),
    col("no_kontrak", "Nomor"),
    col("tgl_mulai", "Mulai"),
    col("tanggal_berakhir", "Selesai"),
  ],
  fields: [
    f("nik", "NIK", "text", { required: true, section: "Pegawai" }),
    f("employee_name", "NAMA", "display", { section: "Pegawai" }),
    f("alamat", "Alamat", "display", { section: "Pegawai" }),
    f("no_kontrak", "No. Kontrak", "text", { required: true, section: "Kontrak" }),
    f("tanggal_surat", "Tanggal Surat", "date", { section: "Kontrak" }),
    f("tanggal_berakhir_sebelumnya", "Tgl Berakhir Kontrak Sebelumnya", "date", { section: "Kontrak" }),
    f("lama_bulan", "Lama (Bulan)", "text", { section: "Kontrak" }),
    f("terbilang", "Terbilang", "text", { section: "Kontrak" }),
    f("tgl_mulai", "Tgl Mulai", "date", { required: true, section: "Kontrak" }),
    f("tanggal_berakhir", "Tanggal Berakhir", "date", { required: true, section: "Kontrak" }),
    f("department", "Department", "select", { lookupKey: "department", section: "Penempatan" }),
    f("unit", "Unit", "select", {
      lookupKey: "unit",
      lookupParentField: "department",
      section: "Penempatan",
    }),
    f("pangkat", "Pangkat", "select", { lookupKey: "pangkat", section: "Penempatan" }),
    f("jabatan", "Jabatan", "select", { lookupKey: "jabatan", section: "Penempatan" }),
    f("golongan", "Golongan", "select", { lookupKey: "golongan", section: "Penempatan" }),
    f("tingkat", "Tingkat", "select", {
      lookupKey: "tingkat",
      lookupParentField: "golongan",
      section: "Penempatan",
    }),
    f("penempatan", "Penempatan", "select", { lookupKey: "penempatan", section: "Penempatan" }),
    f("ump", "UMP", "number", { section: "Penempatan" }),
  ],
});

/** personel_status.aspx + lookup_status_emp.aspx */
export const hrdAbsStatus = cfg({
  title: "Personel Status",
  moduleCode: "HRD_ABS_STATUS",
  path: "abs/personel-status",
  crud: true,
  columns: [
    titleColumn("employee_name", "nik", "Pegawai"),
    col("nomor", "Nomor"),
    col("status_lama", "Status lama"),
    col("status_baru", "Status Baru"),
    col("tanggal_efektif", "Tanggal Efektif"),
  ],
  fields: [
    f("nik", "NIK", "text", { required: true, section: "Pegawai" }),
    f("employee_name", "NAMA", "display", { section: "Pegawai" }),
    f("no_status", "No. Status", "text", { required: true, section: "Status" }),
    f("tanggal_surat_status", "Tanggal Surat Status", "date", { section: "Status" }),
    f("status_sebelum", "Status Sebelum", "display", { section: "Status" }),
    f("group_pegawai_sebelum", "Group Pegawai Sebelum", "display", { section: "Status" }),
    f("status_sekarang", "Status Sekarang", "select", {
      lookupKey: "status_pegawai",
      section: "Status",
    }),
    f("group_sekarang", "Group Sekarang", "select", { lookupKey: "group", section: "Status" }),
    f("tanggal_aktif", "Tanggal Aktif", "date", { required: true, section: "Status" }),
    f("catatan", "Catatan", "textarea", { section: "Status", col: 12 }),
  ],
});

/** personel_promosi.aspx + lookup_jabatan_emp.aspx */
export const hrdAbsPromosi = cfg({
  title: "Personel Promosi",
  moduleCode: "HRD_ABS_PROMOSI",
  path: "abs/personel-promosi",
  crud: true,
  columns: [
    titleColumn("employee_name", "nik", "Pegawai"),
    col("nomor", "Nomor"),
    col("jabatan_sebelum", "Status lama"),
    col("jabatan_sekarang", "Status Baru"),
    col("tanggal_efektif", "Tanggal Efektif"),
  ],
  fields: [
    f("nik", "NIK", "text", { required: true }),
    f("employee_name", "NAMA", "display"),
    f("no_promosi", "No. Promosi", "text", { required: true }),
    f("tanggal_surat_promosi", "Tanggal Surat Promosi", "date"),
    f("department_sebelum", "Department Sebelum", "display"),
    f("pangkat_sebelum", "Pangkat Sebelum", "display"),
    f("jabatan_sebelum", "Jabatan Sebelum", "display"),
    f("golongan_sebelum", "Golongan Sebelum", "display"),
    f("tingkat_sebelum", "Tingkat Sebelum", "display"),
    f("department", "Department", "select", { lookupKey: "department" }),
    f("unit", "Unit", "select", { lookupKey: "unit", lookupParentField: "department" }),
    f("pangkat", "Pangkat", "select", { lookupKey: "pangkat" }),
    f("jabatan", "Jabatan", "select", { lookupKey: "jabatan" }),
    f("golongan", "Golongan", "select", { lookupKey: "golongan" }),
    f("tingkat", "Tingkat", "select", { lookupKey: "tingkat", lookupParentField: "golongan" }),
    f("tanggal_aktif", "Tanggal Aktif", "date", { required: true }),
    f("catatan", "Catatan", "textarea"),
    f("percobaan_dari", "Percobaan Dari", "date"),
    f("percobaan_sampai", "Percobaan Sampai", "date"),
  ],
});

/** personel_Mutasi.aspx + lookup_Mutasi_emp.aspx */
export const hrdAbsMutasi = cfg({
  title: "Personel Mutasi",
  moduleCode: "HRD_ABS_MUTASI",
  path: "abs/personel-mutasi",
  crud: true,
  columns: [
    titleColumn("employee_name", "nik", "Pegawai"),
    col("nomor", "Nomor"),
    col("cabang_sebelum", "Cabang sebelum"),
    col("cabang_sekarang", "Mutasi ke cabang"),
    col("tanggal_efektif", "Efektif"),
  ],
  fields: [
    f("nik", "NIK", "text", { required: true }),
    f("employee_name", "NAMA", "display"),
    f("jabatan", "Jabatan", "display"),
    f("status_sipil", "Status Sipil", "display"),
    f("no_mutasi", "No. Mutasi", "text", { required: true }),
    f("tanggal_mutasi", "Tanggal Mutasi", "date"),
    f("tanggal_aktif", "Tanggal Aktif", "date", { required: true }),
    f("cabang_sebelum", "Cabang Sebelum", "display"),
    f("kota_sebelum", "Kota Sebelum", "display"),
    f("provinsi_sebelum", "Provinsi Sebelum", "display"),
    f("brand_sebelum", "Brand Sebelum", "display"),
    f("cabang_sekarang", "Cabang", "select", { lookupKey: "cabang" }),
    f("kota_sekarang", "Kota Sekarang", "select", { lookupKey: "kota" }),
    f("provinsi_sekarang", "Provinsi Sekarang", "select", { lookupKey: "provinsi" }),
    f("brand_sekarang", "Brand Sekarang", "select", { lookupKey: "brand" }),
    f("catatan", "Catatan", "textarea"),
  ],
});

/** personel_resign.aspx + Resign_Info.aspx */
export const hrdAbsResign = cfg({
  title: "Pengunduran Diri",
  moduleCode: "HRD_ABS_RESIGN",
  path: "abs/personel-resign",
  crud: true,
  columns: [
    titleColumn("employee_name", "nik", "Pegawai"),
    col("department", "Departemen"),
    col("tgl_resign", "Tgl.Resign"),
    col("cabang", "Cabang"),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("nik", "NIK", "text", { required: true }),
    f("employee_name", "Nama Pegawai", "display"),
    f("tipe_resign", "Tipe Resign", "select", {
      lookupKey: "tipe_resign",
      required: true,
    }),
    f("sk_no", "SK No."),
    f("effective", "Effective", "date", { required: true }),
    f("remark", "Remark", "textarea"),
  ],
});

/* ===================== PAR System Param ===================== */
/** Adhoc.aspx + Lookup_Adhoc_info.aspx */
export const hrdParAdhoc = cfg({
  title: "SPECIAL ACTIVITY",
  moduleCode: "HRD_PAR_ADHOC",
  path: "par/adhoc",
  crud: true,
  columns: [
    col("tanggal", "TANGGAL"),
    col("kategori", "KATEGORI"),
    col("keterangan", "KETERANGAN", "lg"),
    badgeColumn("status", "STATUS"),
  ],
  filterDefs: [
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
    fd("status", "Status", "select", { options: OPT_STATUS_SIMPLE }),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("date", "TANGGAL AKTIFITAS", "date", { required: true }),
    f("keterangan", "KETERANGAN", "textarea", { required: true }),
    f("department", "DEPARTMENT", "select", { lookupKey: "department" }),
    f("kategori", "KATEGORI"),
    f("jam", "Jam", "time"),
    f("jenis", "JENIS", "radio", {
      options: [
        { value: "IN", label: "IN" },
        { value: "OUT", label: "OUT" },
      ],
    }),
  ],
});

/** Dinas.aspx + Dinas_info.aspx */
export const hrdParDinas = cfg({
  title: "DINAS LIST",
  moduleCode: "HRD_PAR_DINAS",
  path: "par/dinas",
  crud: true,
  columns: [
    col("tanggal", "TANGGAL"),
    col("keterangan", "KETERANGAN", "lg"),
    badgeColumn("status", "STATUS"),
  ],
  filterDefs: [
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
    fd("status", "Status", "select", { options: OPT_STATUS_SIMPLE }),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("from_date", "FROM DATE", "date", { required: true }),
    f("time_from", "FROM TIME", "time", { required: true }),
    f("to_date", "TO DATE", "date", { required: true }),
    f("time_to", "TO TIME", "time", { required: true }),
    f("keterangan", "JOB DESCRIPTION", "textarea", { required: true }),
  ],
});

/** Izin_list.aspx + Lookup_Izin_info.aspx */
export const hrdParIzin = cfg({
  title: "List Izin Pegawai",
  moduleCode: "HRD_PAR_IZIN",
  path: "par/izin",
  crud: true,
  columns: [
    col("tanggal", "TANGGAL"),
    titleColumn("employee_name", "nik", "NAMA"),
    col("department", "DEPARTEMEN"),
    badgeColumn("status", "STATUS"),
  ],
  filterDefs: [
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
    fd("kategori", "Kategori Izin", "select", { options: OPT_KATEGORI_IZIN }),
    fd("status", "Status", "select", { options: OPT_STATUS_APPROVE }),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("nik", "NIK", "text", { required: true }),
    f("nama", "NAMA", "display"),
    f("department", "DEPARTMENT", "display"),
    f("jabatan", "JABATAN", "display"),
    f("kategori", "KATEGORI", "select", { options: OPT_KATEGORI_IZIN }),
    f("from_date", "DATE", "date"),
    f("to_date", "TO DATE", "date"),
    f("dari_jam", "DARI JAM", "time"),
    f("sampai_jam", "SAMPAI JAM", "time"),
    f("keterangan", "KETERANGAN", "textarea", { required: true }),
  ],
});

/** Cuti_List.aspx + Lookup_Cuti_info.aspx */
export const hrdParCuti = cfg({
  title: "LIST CUTI PEGAWAI",
  moduleCode: "HRD_PAR_CUTI",
  path: "par/cuti",
  crud: true,
  columns: [
    titleColumn("employee_name", "nik", "NAMA"),
    col("department", "DEPATEMEN"),
    col("tanggal", "TANGGAL"),
    badgeColumn("status", "STATUS"),
  ],
  filterDefs: [
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
    fd("kategori", "Kategori Cuti", "select", { options: OPT_JENIS_CUTI }),
    fd("status", "Status", "select", { options: OPT_STATUS_APPROVE }),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("nik", "NIK", "text", { required: true }),
    f("nama", "NAMA", "display"),
    f("department", "DEPARTMENT", "display"),
    f("jabatan", "JABATAN", "display"),
    f("tanggal_pengajuan", "TANGGAL PENGAJUAN", "date"),
    f("jenis_cuti", "JENIS CUTI", "select", { options: OPT_JENIS_CUTI }),
    f("cuti_khusus", "CUTI KHUSUS"),
    f("from_date", "DARI TGL", "date"),
    f("to_date", "SAMPAI TGL", "date"),
    f("keterangan", "KETERANGAN", "textarea", { required: true }),
  ],
});

/** sakit_list.aspx + Lookup_Izin_sakit_info.aspx */
export const hrdParSakit = cfg({
  title: "List Izin Sakit Pegawai",
  moduleCode: "HRD_PAR_SAKIT",
  path: "par/sakit",
  crud: true,
  columns: [
    col("tanggal", "TANGGAL"),
    titleColumn("employee_name", "nik", "NAMA"),
    col("department", "DEPARTEMEN"),
  ],
  filterDefs: [fd("from_date", "From", "date"), fd("to_date", "To", "date")],
  fields: [
    f("id", "ID", "hidden"),
    f("nik", "NIK", "text", { required: true }),
    f("nama", "NAMA", "display"),
    f("department", "DEPARTMENT", "display"),
    f("jabatan", "JABATAN", "display"),
    f("from_date", "FROM DATE", "date"),
    f("to_date", "TO DATE", "date"),
    f("keterangan", "KETERANGAN", "textarea", { required: true }),
  ],
});

/** Overtime_List.aspx + Lookup_overtime_info.aspx */
export const hrdParOvertime = cfg({
  title: "LIST OVERTIME PEGAWAI",
  moduleCode: "HRD_PAR_OVERTIME",
  path: "par/overtime",
  crud: true,
  columns: [
    col("tanggal", "TANGGAL"),
    col("day", "DAY", "sm"),
    titleColumn("employee_name", "nik", "NAMA"),
    col("department", "DEPATEMEN"),
    badgeColumn("status", "STATUS"),
  ],
  filterDefs: [
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
    fd("status", "Status", "select", { options: OPT_STATUS_APPROVE }),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("nik", "NIK", "text", { required: true }),
    f("nama", "NAMA", "display"),
    f("department", "DEPARTMENT", "display"),
    f("jabatan", "JABATAN", "display"),
    f("jenis_lembur", "JENIS LEMBUR", "select", { options: OPT_JENIS_LEMBUR }),
    f("diluar_kantor", "Diluar kantor ?", "checkbox"),
    f("tanggal_lembur", "TANGGAL LEMBUR", "date"),
    f("dari_jam", "DARI JAM", "time"),
    f("sampai_jam", "SAMPAI JAM", "time"),
    f("keterangan", "SUBJEK KERJA", "textarea", { required: true }),
  ],
});

/** alfa_list.aspx — no create form */
export const hrdParAlfa = cfg({
  title: "ALFA LIST",
  moduleCode: "HRD_PAR_ALFA",
  path: "par/alfa",
  columns: [
    col("tanggal", "TANGGAL"),
    titleColumn("employee_name", "nik", "NAMA"),
    col("department", "DEPARTMENT"),
    badgeColumn("status", "STATUS"),
  ],
  filterDefs: [
    fd("dept", "Department", "select", { lookupKey: "department" }),
    fd("month", "BULAN", "select", { options: MONTH_OPTS }),
    fd("tahun", "TAHUN"),
  ],
});

/** master_holiday.aspx + Holiday_Info.aspx */
export const hrdParHoliday = cfg({
  title: "LIST HARI LIBUR NASIONAL",
  moduleCode: "HRD_PAR_HOLIDAY",
  path: "par/holiday",
  crud: true,
  columns: [
    col("holiday_date", "TANGGAL"),
    col("hari", "HARI"),
    col("description", "DESCRIPTION", "lg"),
    col("potong_cuti", "POTONG CUTI", "sm"),
  ],
  filterDefs: [fd("year", "Tahun")],
  fields: [
    f("holiday_date", "DATE", "date", { required: true }),
    f("description", "DESCRIPTION", "textarea", { required: true }),
    f("potong_cuti", "POTONG CUTI", "checkbox"),
  ],
});

/** overtime_amount.aspx + overtime_amount_lookup.aspx */
export const hrdParOtAmount = cfg({
  title: "OVERTIME AMOUNT",
  moduleCode: "HRD_PAR_OT_AMOUNT",
  path: "par/overtime-amount",
  crud: true,
  columns: [
    col("level", "LEVEL"),
    col("jabatan", "JABATAN"),
    col("konsumsi", "KONSUMSI"),
    col("insentif", "INSENTIF"),
    col("weekend", "WEEKEND"),
    col("tipe_insentif", "TIPE INSENTIF"),
    col("lebih_5_jam", "LEMBUR > 5 JAM"),
  ],
  fields: [
    f("level", "LEVEL", "select", { lookupKey: "level" }),
    f("jabatan", "JABATAN", "select", { lookupKey: "jabatan" }),
    f("lebih_5_jam", "LEMBUR LEBIH DARI 5 JAM", "checkbox"),
    f("tipe_insentif", "TIPE INSENTIF", "radio", {
      options: [
        { value: "FIXED", label: "FIXED" },
        { value: "PERJAM", label: "PER JAM" },
      ],
    }),
    f("konsumsi_amount", "KONSUMSI AMOUNT", "number", { required: true }),
    f("insentif_amount", "INSENTIF AMOUNT", "number", { required: true }),
    f("insentif_weekend", "INSENTIF WEEKEND AMOUNT", "number"),
    f("insentif_perjam", "INSENTIF PER JAM", "number"),
  ],
});

/** masterpolicy.aspx */
export const hrdParPolicy = cfg({
  title: "Policy List",
  moduleCode: "HRD_PAR_POLICY",
  path: "par/policy",
  crud: true,
  columns: [
    col("salary_start", "Salary Schedule Start Date", "lg"),
    col("salary_end", "Salary Schedule End Date", "lg"),
    col("absent_start", "Absent Schedule Start Date", "lg"),
    col("absent_end", "Absent Schedule End Date", "lg"),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("branch", "Branch", "display"),
    f("periode_year", "Period Year *", "text", { required: true }),
    f("periode_month", "Period Month", "select", { options: MONTH_OPTS }),
    f("formula_overtime", "Formula Overtime *", "text", { required: true }),
    f("formula_thr", "Formula THR *", "text", { required: true }),
    f("salary_schedule_start", "Salary Schedule Start Date *", "date", { required: true }),
    f("salary_schedule_end", "Salary Schedule End Date *", "date", { required: true }),
    f("salary_date", "Salary Date *", "date", { required: true }),
    f("last_day_of_month", "Last Day Of The Month", "checkbox"),
    f("absent_schedule_start", "Absent Schedule Start Date *", "date", { required: true }),
    f("absent_schedule_end", "Absent Schedule End Date *", "date", { required: true }),
    f("staff_probation_thr", "Staff Probation THR", "checkbox"),
    f("staff_probation_prorate", "Staff Probation Prorate", "checkbox"),
    f("staff_prorate_thr", "Staff Prorate THR", "checkbox"),
    f("bpjs_kes_employee", "BPJS Kesehatan By Employee (%)", "number"),
    f("bpjs_kes_company", "BPJS Kesehatan By Company (%)", "number"),
    f("jht_employee", "JHT By Employee (%)", "number"),
    f("jht_company", "JHT By Company (%)", "number"),
    f("bpjs_jkk", "BPJS JKK By Company (%)", "number"),
    f("bpjs_jkm", "BPJS JKM By Company (%)", "number"),
    f("bpjs_pensiun_employee", "BPJS Pensiun By Employee (%)", "number"),
    f("bpjs_pensiun_company", "BPJS Pensiun By Company (%)", "number"),
    f("threshold_salary_bpjs", "Threshold Salary BPJS", "number"),
    f("threshold_max_salary_bpjs", "Threshold MAX Salary BPJS", "number"),
    f("threshold_salary_jp", "Threshold Salary JP", "number"),
  ],
});

/* ===================== PAR Master HRIS ===================== */
/** M_perusahaan.aspx — single form page */
export const hrdParPerusahaan = cfg({
  title: "Info Perusahaan",
  moduleCode: "HRD_PAR_PERUSAHAAN",
  path: "par/perusahaan",
  crud: true,
  columns: [titleColumn("nama_perusahaan", "id", "Perusahaan"), col("kota", "Kota"), col("npwp", "NPWP")],
  hideSearch: true,
  fields: [
    f("nama_perusahaan", "Nama Perusahaan :", "text", { required: true, col: 12 }),
    f("alamat_1", "Alamat 1"),
    f("alamat_2", "Alamat 2"),
    f("alamat_3", "Alamat 3"),
    f("kota_id", "Kota", "select", { lookupKey: "kota" }),
    f("kode_pos", "Kode Pos"),
    f("provinsi_id", "Provinsi", "select", { lookupKey: "provinsi" }),
    f("negara_id", "Negara :", "select", { lookupKey: "negara" }),
    f("bidang_usaha", "Bidang Usaha"),
    f("telepon_kode", "No.TLp Kode"),
    f("telepon_1", "No.TLp 1"),
    f("telepon_2", "No.TLp 2"),
    f("fax_kode", "Fax Kode"),
    f("fax_nomor", "Fax Nomor"),
    f("website", "Website"),
    f("email", "Email"),
    f("pimpinan", "Pimpinan Perusahaan"),
    f("npwp", "NPWP"),
    f("nomor_pkp", "Nomor Pengukuhan Pajak"),
    f("tanggal_pkp", "Tanggal Pengukuhan Pajak", "date"),
  ],
});

/** m_cabang.aspx + lookup_cabang_info.aspx */
export const hrdParCabang = cfg({
  title: "List Cabang",
  moduleCode: "HRD_PAR_CABANG",
  path: "par/cabang",
  crud: true,
  columns: [col("brand", "BRAND"), titleColumn("nama", "kode", "CABANG"), badgeColumn("status", "STATUS")],
  fields: [
    f("id", "ID", "hidden"),
    f("brand", "Brand", "select", { lookupKey: "brand" }),
    f("kode", "Kode", "text", { required: true }),
    f("nama", "Nama", "text", { required: true }),
    f("alamat", "Alamat", "textarea"),
    f("kota", "Kota", "select", { lookupKey: "kota" }),
    f("provinsi", "Provinsi", "select", { lookupKey: "provinsi" }),
    f("negara", "Negara", "select", { lookupKey: "negara" }),
    f("telepon", "Telepon"),
    f("fax", "Fax"),
    f("pimpinan", "Pimpinan"),
    f("bank", "Bank"),
    f("nomor_rekening", "No.Rek"),
    f("no_id", "No.ID"),
    f("atas_nama", "Atas Nama"),
  ],
});

/** m_divisi.aspx + lookup_divisi_info.aspx */
export const hrdParDivisi = cfg({
  title: "List Divisi",
  moduleCode: "HRD_PAR_DIVISI",
  path: "par/divisi",
  crud: true,
  columns: [col("kode", "Kode Divisi"), titleColumn("nama", "id", "Nama Divisi"), col("keterangan", "Keterangan", "lg")],
  fields: [
    f("id", "ID", "hidden"),
    f("kode", "Kode", "text", { required: true }),
    f("nama", "Divisi", "text", { required: true }),
    f("keterangan", "Keterangan", "textarea"),
  ],
});

/** m_departemen.aspx + lookup_departemen_info.aspx */
export const hrdParDepartemen = cfg({
  title: "List Departemen",
  moduleCode: "HRD_PAR_DEPARTEMEN",
  path: "par/departemen",
  crud: true,
  columns: [
    col("kode", "Kode"),
    titleColumn("nama", "id", "Nama"),
    col("keterangan", "Keterangan"),
    col("divisi", "Divisi"),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("divisi", "Divisi", "select", { lookupKey: "divisi" }),
    f("kode", "Kode Departemen", "text", { required: true }),
    f("nama", "Departemen", "textarea", { required: true }),
    f("keterangan", "keterangan", "textarea"),
  ],
});

/** m_golongan.aspx + lookup_golongan_info.aspx */
export const hrdParGolongan = cfg({
  title: "List Golongan",
  moduleCode: "HRD_PAR_GOLONGAN",
  path: "par/golongan",
  crud: true,
  columns: [titleColumn("nama", "id", "Golongan"), col("keterangan", "Keterangan", "lg")],
  fields: [
    f("id", "ID", "hidden"),
    f("nama", "Golongan", "text", { required: true }),
    f("keterangan", "Keterangan", "textarea"),
  ],
});

/** m_pangkat.aspx + lookup_pangkat_info.aspx */
export const hrdParPangkat = cfg({
  title: "List Pangkat",
  moduleCode: "HRD_PAR_PANGKAT",
  path: "par/pangkat",
  crud: true,
  columns: [col("kode", "Kode"), titleColumn("nama", "id", "Pangkat"), col("keterangan", "Keterangan")],
  fields: [
    f("id", "ID", "hidden"),
    f("kode", "Kode", "text", { required: true }),
    f("nama", "Pangkat", "text", { required: true }),
    f("keterangan", "Keterangan", "textarea"),
  ],
});

/** m_jabatan.aspx + lookup_jabatan_info.aspx */
export const hrdParJabatan = cfg({
  title: "List Jabatan",
  moduleCode: "HRD_PAR_JABATAN",
  path: "par/jabatan",
  crud: true,
  columns: [col("kode", "Kode"), titleColumn("nama", "id", "Jabatan")],
  fields: [
    f("id", "ID", "hidden"),
    f("kode", "Kode", "text", { required: true }),
    f("nama", "Jabatan", "text", { required: true }),
  ],
});

/** sm_dept_list.aspx + sm_dept_info.aspx */
export const hrdParSmDept = cfg({
  title: "SENIOR MANAGER DEPARTMENT LIST",
  moduleCode: "HRD_PAR_SM_DEPT",
  path: "par/sm-dept",
  crud: true,
  columns: [titleColumn("nama", "nik", "NAMA")],
  fields: [
    f("id", "ID", "hidden"),
    f("nik", "NIK", "text", { required: true }),
    f("nama", "NAMA", "display"),
    f("jabatan", "JABATAN", "display"),
    f("department", "DEPARTMENT", "select", { lookupKey: "department" }),
  ],
});

/* ===================== RPT ===================== */
/** AbsenReportTotal.aspx */
export const hrdRptAbsenTotal = cfg({
  title: "Absen Report Store",
  moduleCode: "HRD_RPT_ABSEN_TOTAL",
  path: "rpt/absen-total",
  hideSearch: true,
  columns: [
    col("nick", "NICK"),
    titleColumn("employee_name", "nik", "NAMA"),
    col("jabatan", "JABATAN"),
    col("total_masuk", "TOTAL MASUK", "sm"),
  ],
  filterDefs: [
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
    fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
    fd("group", "Group Pegawai", "select", { lookupKey: "group" }),
    fd("is_pajak", "Pajak/Non Pajak", "select", { options: OPT_PAJAK }),
  ],
});

/** AbsenReportNasionalATotal.aspx */
export const hrdRptAbsenNasional = cfg({
  title: "Absen Nasional Report",
  moduleCode: "HRD_RPT_ABSEN_NASIONAL",
  path: "rpt/absen-nasional",
  hideSearch: true,
  columns: [
    titleColumn("employee_name", "nik", "NAMA"),
    col("jabatan", "JABATAN"),
    col("kehadiran_reguler", "KEHADIRAN REGULER"),
    col("izin", "IZIN", "sm"),
    col("sakit", "SAKIT", "sm"),
    col("cuti", "CUTI", "sm"),
    col("alfa", "ALFA", "sm"),
  ],
  filterDefs: [
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
    fd("cabang", "Cabang", "select", { lookupKey: "cabang" }),
    fd("group", "Group Pegawai", "select", { lookupKey: "group" }),
    fd("dept", "Department", "select", { lookupKey: "department" }),
  ],
});

/** AbsenRptDistance.aspx */
export const hrdRptAbsenWfh = cfg({
  title: "WFH LOCATIONS",
  moduleCode: "HRD_RPT_ABSEN_WFH",
  path: "rpt/absen-wfh",
  hideSearch: true,
  columns: [
    titleColumn("employee_name", "nik", "Employee"),
    col("jabatan", "Jabatan"),
    col("checktime", "Check Time"),
    col("geolocation", "Geolocation", "lg"),
    col("distance_m", "Distance (m)", "sm"),
  ],
  filterDefs: [
    fd("from_date", "From", "date"),
    fd("cabang", "Cabang", "select", { lookupKey: "cabang" }),
    fd("dept", "Department", "select", { lookupKey: "department" }),
  ],
});

/** AbsenDk.aspx */
export const hrdRptDetailHadir = cfg({
  title: "Detail Kehadiran Rangkuman Pegawai",
  moduleCode: "HRD_RPT_DETAIL_HADIR",
  path: "rpt/detail-kehadiran",
  hideSearch: true,
  columns: [
    titleColumn("employee_name", "nik", "NAMA"),
    col("jabatan", "JABATAN"),
    col("total", "TOTAL", "sm"),
  ],
  filterDefs: [
    fd("from_date", "From", "date"),
    fd("to_date", "To", "date"),
    fd("id_brand", "Brand", "select", { lookupKey: "brand" }),
    fd("group", "Group Pegawai", "select", { lookupKey: "group" }),
  ],
});

/** ExportEmployee.aspx */
export const hrdRptExportEmp = cfg({
  title: "Export Data Karyawan",
  moduleCode: "HRD_RPT_EXPORT_EMP",
  path: "rpt/export-employee",
  hideSearch: true,
  columns: personelListCols,
  filterDefs: [
    fd("from_date", "Tanggal Aktif From", "date"),
    fd("to_date", "Tanggal Aktif To", "date"),
    fd("semua_waktu", "Semua Waktu", "select", { options: OPT_SEMUA_WAKTU }),
    fd("cabang", "Cabang", "select", { lookupKey: "cabang" }),
    fd("status", "Status Aktif", "select", { options: OPT_ACTIVE }),
    fd("month", "Bulan Kehadiran", "select", { options: MONTH_OPTS }),
  ],
});

/** rpt_cuti.aspx */
export const hrdRptCuti = cfg({
  title: "INFO SISA CUTI PEGAWAI",
  moduleCode: "HRD_RPT_CUTI",
  path: "rpt/cuti",
  hideSearch: true,
  columns: [
    titleColumn("employee_name", "nik", "NAMA"),
    col("semester_1", "SEMESTER 1", "sm"),
    col("semester_2", "SEMESTER 2", "sm"),
    col("sisa_cuti", "SISA", "sm"),
  ],
  filterDefs: [
    fd("cabang", "Cabang", "select", { lookupKey: "cabang" }),
    fd("group", "Group Pegawai", "select", { lookupKey: "group" }),
    fd("dept", "Department", "select", { lookupKey: "department" }),
    fd("tahun", "Tahun"),
  ],
});

/** rpt_lembur.aspx */
export const hrdRptLembur = cfg({
  title: "OVERTIME PAYABLE AMOUNT",
  moduleCode: "HRD_RPT_LEMBUR",
  path: "rpt/lembur",
  hideSearch: true,
  columns: [
    titleColumn("employee_name", "nik", "NAMA"),
    col("department", "Department"),
    col("amount", "Amount"),
  ],
  filterDefs: [
    fd("cabang", "Cabang", "select", { lookupKey: "cabang" }),
    fd("dept", "Department", "select", { lookupKey: "department" }),
    fd("month", "Bulan", "select", { options: MONTH_OPTS }),
  ],
});

/** KPI.aspx */
export const hrdRptKpi = cfg({
  title: "KEY INDICATOR PERFORMANCE",
  moduleCode: "HRD_RPT_KPI",
  path: "rpt/kpi",
  hideSearch: true,
  columns: [titleColumn("employee_name", "nik", "Nama"), col("jabatan", "Jabatan"), col("score", "Score", "sm")],
  filterDefs: [
    fd("cabang", "Cabang", "select", { lookupKey: "cabang" }),
    fd("dept", "Department", "select", { lookupKey: "department" }),
    fd("tahun", "Tahun"),
  ],
});

/* ===================== CAB ===================== */
/** masterpayrollvariable.aspx */
export const hrdCabVariable = cfg({
  title: "Payroll Variable List",
  moduleCode: "HRD_CAB_VARIABLE",
  path: "cab/variable",
  crud: true,
  columns: [
    col("code", "Code"),
    titleColumn("name", "id", "Name"),
    col("standard_ufn", "Standard UFN Name", "lg"),
    col("ovr", "OVR", "sm"),
    col("overwrite_ufn", "Overwrite UFN Name", "lg"),
  ],
  fields: [
    f("code", "Code", "text", { required: true, disabledOnEdit: true }),
    f("name", "Name", "text", { required: true }),
    f("standard_ufn", "Standard UFN Name", "text", { required: true }),
    f("is_ovr", "OVR", "checkbox"),
    f("overwrite_ufn", "Overwrite UFN Name"),
    f("remark", "Remark", "textarea"),
  ],
});

/** masterpayrollformula.aspx */
export const hrdCabFormula = cfg({
  title: "Payroll Formula List",
  moduleCode: "HRD_CAB_FORMULA",
  path: "cab/formula",
  crud: true,
  columns: [
    col("code", "Code"),
    titleColumn("name", "id", "Name"),
    col("standard_formula", "Standard Formula", "lg"),
    col("ovr", "OVR", "sm"),
    col("type", "Type", "sm"),
  ],
  fields: [
    f("code", "Code", "text", { required: true, disabledOnEdit: true }),
    f("name", "Name", "text", { required: true }),
    f("standard_formula", "Standard Formula", "textarea", { required: true }),
    f("is_ovr", "OVR", "checkbox"),
    f("overwrite_formula", "Overwrite Formula", "textarea"),
    f("formula_type", "Formula Type"),
    f("order_no", "Order No", "number"),
    f("tax_calculated", "Tax Calculated", "checkbox"),
    f("show_in_salary_slip", "Show In Salary Slip?", "checkbox"),
  ],
});

/** mastertransactionbenefit.aspx */
export const hrdCabBenefit = cfg({
  title: "Transaction Benefit List",
  moduleCode: "HRD_CAB_BENEFIT",
  path: "cab/benefit",
  crud: true,
  columns: [
    col("code", "Code"),
    titleColumn("name", "id", "Standard"),
    col("account", "Account"),
    col("description", "Description", "lg"),
    col("jamsostek", "Jamsostek Calculated", "sm"),
  ],
  fields: [
    f("code", "Code", "text", { required: true, disabledOnEdit: true }),
    f("standard", "Standard", "text", { required: true }),
    f("account", "Account"),
    f("description", "Description", "textarea"),
    f("tax_calculated", "Tax Calculated", "checkbox"),
    f("jamsostek_calculated", "Jamsostek Calculated", "checkbox"),
    f("show_flag", "Show Flag", "checkbox"),
    f("amount_flag", "Amount Flag", "checkbox"),
    f("occurance_flag", "Occurance Flag", "checkbox"),
    f("join_flag", "Join Flag", "checkbox"),
    f("terminate_flag", "Terminate Flag", "checkbox"),
    f("manual_flag", "Manual Flag", "checkbox"),
  ],
});

/** mastertransactiondeduction.aspx */
export const hrdCabDeduction = cfg({
  title: "Transaction Deduction List",
  moduleCode: "HRD_CAB_DEDUCTION",
  path: "cab/deduction",
  crud: true,
  columns: [
    col("code", "Code"),
    titleColumn("name", "id", "Standard"),
    col("account", "Account"),
    col("description", "Description", "lg"),
    col("jamsostek", "Jamsostek Calculated", "sm"),
  ],
  fields: [
    f("code", "Code", "text", { required: true, disabledOnEdit: true }),
    f("standard", "Standard", "text", { required: true }),
    f("account", "Account"),
    f("description", "Description", "textarea"),
    f("tax_calculated", "Tax Calculated", "checkbox"),
    f("jamsostek_calculated", "Jamsostek Calculated", "checkbox"),
    f("manual_flag", "Manual Flag", "checkbox"),
  ],
});

/** payrollsalaryandbenefitentrylist.aspx — search only; select opens entry */
export const hrdCabSalaryEntry = cfg({
  title: "Payroll Salary and Benefit Entry List",
  moduleCode: "HRD_CAB_SALARY_ENTRY",
  path: "cab/salary-entry",
  columns: [
    col("brand", "BRAND"),
    col("cabang", "CABANG"),
    titleColumn("employee_name", "nik", "PEGAWAI"),
    col("department", "DEPARTEMEN"),
    col("jabatan", "JABATAN"),
    badgeColumn("status", "STATUS"),
  ],
});

/** employeesalaryentrylist.aspx */
export const hrdCabSalaryInquiry = cfg({
  title: "Payroll Inquery List",
  moduleCode: "HRD_CAB_SALARY_INQUIRY",
  path: "cab/salary-inquiry",
  columns: [
    col("brand", "BRAND"),
    col("cabang", "CABANG"),
    titleColumn("employee_name", "nik", "PEGAWAI"),
    col("department", "DEPARTEMEN"),
    col("jabatan", "JABATAN"),
    badgeColumn("status", "STATUS"),
  ],
});

/** SalaryReport.aspx */
export const hrdCabSalaryReport = cfg({
  title: "Payroll Transaction Report",
  moduleCode: "HRD_CAB_SALARY_REPORT",
  path: "cab/salary-report",
  hideSearch: true,
  columns: [
    titleColumn("employee_name", "nik", "PEGAWAI"),
    col("period", "Period"),
    col("amount", "Amount"),
  ],
  filterDefs: [
    fd("tipe", "Tipe"),
    fd("year", "Year"),
    fd("month", "Month", "select", { options: MONTH_OPTS }),
  ],
});

/** ThrReport.aspx */
export const hrdCabThr = cfg({
  title: "THR Transaction Report",
  moduleCode: "HRD_CAB_THR",
  path: "cab/thr",
  hideSearch: true,
  columns: [titleColumn("employee_name", "nik", "PEGAWAI"), col("amount", "THR")],
  filterDefs: [fd("tipe", "Tipe"), fd("from_date", "Tanggal", "date")],
});

/** paymentrequestlist.aspx + paymentrequest.aspx */
export const hrdCabPayment = cfg({
  title: "Payment Request List",
  moduleCode: "HRD_CAB_PAYMENT",
  path: "cab/payment-request",
  crud: true,
  columns: [
    col("requestor_date", "Requestor Date"),
    col("year", "Year", "sm"),
    col("month", "Month", "sm"),
    badgeColumn("status", "Status"),
  ],
  filterDefs: [fd("status", "Status", "select", { options: OPT_STATUS_APPROVE })],
  fields: [
    f("period_year", "Period Year", "text", { required: true }),
    f("period_month", "Period Month", "select", { options: MONTH_OPTS, required: true }),
    f("status", "Status", "select", { options: OPT_STATUS_APPROVE }),
    f("voucher_no", "Voucher No."),
    f("paid_date", "Paid Date", "date"),
  ],
});

/* ========== process / slip configs (used by pages.js) ========== */
export const hrdAbsGenerateStoreProcess = {
  title: "GENERATE ABSEN STORE",
  moduleCode: "HRD_ABS_GENERATE_STORE",
  processPath: "abs/generate-store",
  description: "Tarik absen store (legacy: Generate_Absen.aspx).",
  fields: [
    { name: "month", label: "BULAN", type: "select", options: MONTH_OPTS, required: true },
    { name: "tahun", label: "TAHUN", type: "text", required: true },
  ],
};

export const hrdAbsGenerateNasionalProcess = {
  title: "GENERATE ABSEN NASIONAL",
  moduleCode: "HRD_ABS_GENERATE_NASIONAL",
  processPath: "abs/generate-nasional",
  description: "Tarik absen nasional (legacy: Generate_Absen_NASIONAL.aspx).",
  fields: [
    { name: "id_mesin", label: "Mesin", type: "text", required: true },
    { name: "month", label: "BULAN", type: "select", options: MONTH_OPTS, required: true },
    { name: "tahun", label: "TAHUN", type: "text", required: true },
  ],
};

export const hrdParEomProcess = {
  title: "EOM Manual",
  moduleCode: "HRD_PAR_EOM",
  processPath: "par/eom",
  description: "End of month (legacy: eommanual.aspx — btnProcess only).",
  fields: [],
};

export const hrdCabMonthlyProcess = {
  title: "Monthly Payroll Transaction",
  moduleCode: "HRD_CAB_MONTHLY",
  processPath: "cab/monthly-process",
  description: "Generate payroll / prorate (legacy: monthlyprocess.aspx).",
  fields: [
    { name: "year", label: "Year", type: "text", required: true },
    { name: "month", label: "Month", type: "select", options: MONTH_OPTS, required: true },
    { name: "year_prorate", label: "Year (Prorate)", type: "text" },
    { name: "month_prorate", label: "Month (Prorate)", type: "select", options: MONTH_OPTS },
  ],
  dualActions: true,
};

export const hrdRptSlipGajiConfig = {
  title: "Slip Gaji",
  moduleCode: "HRD_RPT_SLIP_GAJI",
  fields: [
    { name: "emp_code", label: "Employee", type: "text", required: true },
    { name: "year", label: "Year", type: "text", required: true },
    { name: "month", label: "Month", type: "select", options: MONTH_OPTS, required: true },
  ],
};

/** optional routeKey map for HrdResourcePage */
export const HRD_PAGE_CONFIGS = {
  "abs-online-attendance": hrdAbsOnlineAttendance,
  "abs-all-attendance": hrdAbsAllAttendance,
  "abs-personel": hrdAbsPersonel,
  "abs-kontrak": hrdAbsKontrak,
  "abs-status": hrdAbsStatus,
  "abs-promosi": hrdAbsPromosi,
  "abs-mutasi": hrdAbsMutasi,
  "abs-resign": hrdAbsResign,
  "par-adhoc": hrdParAdhoc,
  "par-dinas": hrdParDinas,
  "par-izin": hrdParIzin,
  "par-cuti": hrdParCuti,
  "par-sakit": hrdParSakit,
  "par-overtime": hrdParOvertime,
  "par-alfa": hrdParAlfa,
  "par-holiday": hrdParHoliday,
  "par-ot-amount": hrdParOtAmount,
  "par-policy": hrdParPolicy,
  "par-perusahaan": hrdParPerusahaan,
  "par-cabang": hrdParCabang,
  "par-divisi": hrdParDivisi,
  "par-departemen": hrdParDepartemen,
  "par-golongan": hrdParGolongan,
  "par-pangkat": hrdParPangkat,
  "par-jabatan": hrdParJabatan,
  "par-sm-dept": hrdParSmDept,
  "rpt-absen-total": hrdRptAbsenTotal,
  "rpt-absen-nasional": hrdRptAbsenNasional,
  "rpt-absen-wfh": hrdRptAbsenWfh,
  "rpt-detail-hadir": hrdRptDetailHadir,
  "rpt-export-emp": hrdRptExportEmp,
  "rpt-cuti": hrdRptCuti,
  "rpt-lembur": hrdRptLembur,
  "rpt-kpi": hrdRptKpi,
  "cab-variable": hrdCabVariable,
  "cab-formula": hrdCabFormula,
  "cab-benefit": hrdCabBenefit,
  "cab-deduction": hrdCabDeduction,
  "cab-salary-entry": hrdCabSalaryEntry,
  "cab-salary-inquiry": hrdCabSalaryInquiry,
  "cab-salary-report": hrdCabSalaryReport,
  "cab-thr": hrdCabThr,
  "cab-payment": hrdCabPayment,
};
