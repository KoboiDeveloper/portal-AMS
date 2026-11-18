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
const col = (key, label, size = "md", extra = {}) => ({ key, label, size, ...extra });

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

/** Tahun berjalan + 1 tahun ke belakang (generate absen). */
const YEAR_RECENT_OPTS = (() => {
  const y = new Date().getFullYear();
  return [
    { value: String(y), label: String(y) },
    { value: String(y - 1), label: String(y - 1) },
  ];
})();

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
  { value: "WEEKDAY", label: "WEEKDAY" },
  { value: "WEEKEND", label: "WEEKEND" },
  { value: "HOLIDAY", label: "HOLIDAY" },
];

/** ASP Overtime_List.aspx status filter */
const OPT_OT_STATUS = [
  { value: "APPROVED BY MANAGERIAL", label: "APPROVED BY MANAGERIAL" },
  { value: "APPROVED BY HRD", label: "APPROVED BY HRD" },
  { value: "NEW", label: "NEW" },
];

const otMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const otToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
  modalSubtitle = "Lengkapi data pegawai",
  modalVariant = "sc",
  description,
  sectionColumns,
  modalEntityTitle,
  modalSectionTitle,
  statusToggle = false,
  statusTogglePath,
  defaultSort,
  selectable = false,
  bulkApprove = false,
  approvePath = "",
  bulkDelete = false,
  pendingBadge = null,
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
    modalVariant,
    description,
    sectionColumns,
    modalEntityTitle,
    modalSectionTitle,
    statusToggle,
    statusTogglePath,
    defaultSort,
    selectable,
    bulkApprove,
    approvePath,
    bulkDelete,
    pendingBadge,
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
  title: "List absen Store",
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
    f("alamat", "Alamat", "display", { section: "Pegawai", col: 12 }),
    f("no_kontrak", "No. Kontrak", "text", { required: true, section: "Kontrak" }),
    f("tanggal_surat", "Tanggal Surat", "date", { section: "Kontrak" }),
    f("lama_bulan", "Lama (Bulan)", "number", { section: "Kontrak", min: 1, max: 120 }),
    f("terbilang", "Terbilang", "text", { section: "Kontrak", disabled: true }),
    f("tgl_mulai", "Tgl Mulai", "date", { required: true, section: "Kontrak" }),
    f("tanggal_berakhir", "Tanggal Berakhir", "date", { required: true, section: "Kontrak" }),
    f("department", "Department", "select", { lookupKey: "department", section: "Penempatan", col: 12 }),
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
  modalSize: "lg",
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
    f("no_status", "No. Status", "text", { required: true, section: "Dokumentasi", col: 12 }),
    f("tanggal_surat_status", "Tanggal Surat", "date", { section: "Dokumentasi", col: 12 }),
    f("status_sebelum", "Status", "display", { section: "Status terdahulu", col: 12 }),
    f("group_pegawai_sebelum", "Group", "display", { section: "Status terdahulu", col: 12 }),
    f("status_sekarang", "Status", "select", {
      lookupKey: "status_pegawai",
      section: "Status sekarang",
      col: 12,
    }),
    f("group_sekarang", "Group", "select", {
      lookupKey: "group",
      section: "Status sekarang",
      col: 12,
    }),
    f("tanggal_aktif", "Tgl. Efektif", "date", { required: true, section: "Tanggal", col: 12 }),
    f("catatan", "Catatan", "textarea", { section: "Tanggal", col: 12 }),
  ],
});

/** personel_promosi.aspx + lookup_jabatan_emp.aspx */
export const hrdAbsPromosi = cfg({
  title: "Personel Promosi",
  moduleCode: "HRD_ABS_PROMOSI",
  path: "abs/personel-promosi",
  crud: true,
  modalSize: "xl",
  columns: [
    titleColumn("employee_name", "nik", "Pegawai"),
    col("nomor", "Nomor"),
    col("jabatan_sebelum", "Jabatan lama"),
    col("jabatan_sekarang", "Jabatan baru"),
    col("tanggal_efektif", "Tanggal Efektif"),
  ],
  fields: [
    f("nik", "NIK", "text", { required: true, section: "Pegawai" }),
    f("employee_name", "NAMA", "display", { section: "Pegawai" }),
    f("no_promosi", "No. Jabatan", "text", { required: true, section: "Dokumentasi", col: 12 }),
    f("tanggal_surat_promosi", "Tanggal Surat", "date", { section: "Dokumentasi", col: 12 }),
    f("department_sebelum", "Department", "display", { section: "Jabatan sebelumnya", col: 12 }),
    f("pangkat_sebelum", "Pangkat", "display", { section: "Jabatan sebelumnya", col: 12 }),
    f("jabatan_sebelum", "Jabatan", "display", { section: "Jabatan sebelumnya", col: 12 }),
    f("golongan_sebelum", "Golongan", "display", { section: "Jabatan sebelumnya", col: 12 }),
    f("tingkat_sebelum", "Tingkat", "display", { section: "Jabatan sebelumnya", col: 12 }),
    f("department", "Department", "select", { lookupKey: "department", section: "Jabatan sekarang", col: 12 }),
    f("pangkat", "Pangkat", "select", { lookupKey: "pangkat", section: "Jabatan sekarang", col: 12 }),
    f("jabatan", "Jabatan", "select", { lookupKey: "jabatan", section: "Jabatan sekarang", col: 12 }),
    f("golongan", "Golongan", "select", { lookupKey: "golongan", section: "Jabatan sekarang", col: 12 }),
    f("tingkat", "Tingkat", "select", {
      lookupKey: "tingkat",
      lookupParentField: "golongan",
      section: "Jabatan sekarang",
      col: 12,
    }),
    f("tanggal_aktif", "Tgl. Efektif", "date", { required: true, section: "Tanggal", col: 12 }),
    f("percobaan_dari", "Percobaan Dari", "date", { section: "Tanggal", col: 12 }),
    f("percobaan_sampai", "Percobaan Sampai", "date", { section: "Tanggal", col: 12 }),
    f("catatan", "Catatan", "textarea", { section: "Tanggal", col: 12 }),
  ],
});

/** personel_Mutasi.aspx + lookup_Mutasi_emp.aspx */
export const hrdAbsMutasi = cfg({
  title: "Personel Mutasi",
  moduleCode: "HRD_ABS_MUTASI",
  path: "abs/personel-mutasi",
  crud: true,
  modalSize: "xl",
  columns: [
    titleColumn("employee_name", "nik", "Pegawai"),
    col("nomor", "Nomor"),
    col("cabang_sebelum", "Cabang sebelum"),
    col("cabang_sekarang", "Mutasi ke cabang"),
    col("tanggal_efektif", "Efektif"),
  ],
  fields: [
    f("nik", "NIK", "text", { required: true, section: "Pegawai" }),
    f("employee_name", "NAMA", "display", { section: "Pegawai" }),
    f("jabatan", "Jabatan", "display", { section: "Pegawai" }),
    f("no_mutasi", "No. Mutasi", "text", { required: true, section: "Dokumentasi", col: 12 }),
    f("tanggal_mutasi", "Tanggal Mutasi", "date", { section: "Dokumentasi", col: 12 }),
    f("tanggal_aktif", "Tgl. Efektif", "date", { required: true, section: "Dokumentasi", col: 12 }),
    f("cabang_sebelum", "Cabang", "display", { section: "Penempatan sebelumnya", col: 12 }),
    f("kota_sebelum", "Kota", "display", { section: "Penempatan sebelumnya", col: 12 }),
    f("provinsi_sebelum", "Provinsi", "display", { section: "Penempatan sebelumnya", col: 12 }),
    f("brand_sebelum", "Brand", "display", { section: "Penempatan sebelumnya", col: 12 }),
    f("cabang_sekarang", "Cabang", "select", { lookupKey: "cabang", section: "Penempatan sekarang", col: 12 }),
    f("kota_sekarang", "Kota", "display", { section: "Penempatan sekarang", col: 12 }),
    f("provinsi_sekarang", "Provinsi", "display", { section: "Penempatan sekarang", col: 12 }),
    f("brand_sekarang", "Brand", "display", { section: "Penempatan sekarang", col: 12 }),
    f("catatan", "Catatan", "textarea", { section: "Penempatan sekarang", col: 12 }),
  ],
});

/** personel_resign.aspx + Resign_Info.aspx */
export const hrdAbsResign = cfg({
  title: "Pengunduran Diri",
  moduleCode: "HRD_ABS_RESIGN",
  path: "abs/personel-resign",
  crud: true,
  modalSize: "lg",
  columns: [
    titleColumn("employee_name", "nik", "Pegawai"),
    col("department", "Departemen"),
    col("tgl_resign", "Tgl.Resign"),
    col("cabang", "Cabang"),
  ],
  fields: [
    f("id", "ID", "hidden", { section: "Pegawai" }),
    f("nik", "NIK", "text", { required: true, section: "Pegawai" }),
    f("employee_name", "Nama Pegawai", "display", { section: "Pegawai" }),
    f("tipe_resign", "Tipe Resign", "select", {
      lookupKey: "tipe_resign",
      required: true,
      section: "Resign",
      col: 12,
    }),
    f("sk_no", "SK No.", "text", { section: "Resign", col: 12 }),
    f("sk_date", "SK Date", "date", { section: "Resign", col: 12 }),
    f("effective", "Effective Date", "date", { required: true, section: "Resign", col: 12 }),
    f("remark", "Remark", "textarea", { section: "Catatan", col: 12 }),
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
  description: "Pengajuan lembur pegawai (legacy: overtime_list.aspx).",
  modalSize: "lg",
  modalEntityTitle: "Overtime",
  modalSectionTitle: "Overtime",
  modalSubtitle: "Pegawai, jenis, jam, dan subjek kerja",
  sectionColumns: [["Pegawai", "Jadwal"], ["Info"]],
  pageSize: 100,
  selectable: true,
  bulkApprove: true,
  approvePath: "par/overtime/approve",
  bulkDelete: true,
  defaultSort: { key: "tanggal", dir: "desc" },
  pendingBadge: {
    status: "APPROVED BY MANAGERIAL",
    title: "Menunggu approve HRD",
    hint: "Status APPROVED BY MANAGERIAL · klik dept untuk detail",
    groupKey: "department",
    emptyText: "Tidak ada overtime menunggu approve HRD pada rentang tanggal ini.",
  },
  columns: [
    col("tanggal", "TANGGAL"),
    col("day", "DAY", "sm"),
    titleColumn("employee_name", "nik", "NAMA"),
    col("department", "DEPATEMEN"),
    badgeColumn("status", "STATUS"),
  ],
  filterDefs: [
    fd("period", "Periode", "daterange", {
      fromKey: "from_date",
      toKey: "to_date",
      defaultFrom: otMonthStart(),
      defaultTo: otToday(),
    }),
    fd("status", "Status", "select", {
      options: OPT_OT_STATUS,
      defaultValue: "APPROVED BY MANAGERIAL",
    }),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("nik", "NAMA / NIK", "select", {
      required: true,
      section: "Pegawai",
      col: 12,
      lookupKey: "pegawai",
      lookupFill: { nama: "nama", department: "department", jabatan: "jabatan" },
    }),
    f("nama", "NAMA", "display", { section: "Pegawai", col: 12 }),
    f("department", "DEPARTMENT", "display", { section: "Pegawai", col: 12 }),
    f("jabatan", "JABATAN", "display", { section: "Pegawai", col: 12 }),
    f("jenis_lembur", "JENIS LEMBUR", "select", {
      required: true,
      section: "Pegawai",
      col: 12,
      options: OPT_JENIS_LEMBUR,
    }),
    f("tanggal_lembur", "TANGGAL LEMBUR", "date", {
      required: true,
      section: "Jadwal",
      col: 12,
    }),
    f("dari_jam", "DARI JAM", "text", {
      required: true,
      section: "Jadwal",
      col: 6,
      placeholder: "HH:mm:ss",
    }),
    f("sampai_jam", "SAMPAI JAM", "text", {
      required: true,
      section: "Jadwal",
      col: 6,
      placeholder: "HH:mm:ss",
    }),
    f("keterangan", "SUBJEK KERJA", "textarea", {
      required: true,
      section: "Jadwal",
      col: 12,
      maxLength: 300,
    }),
    f("tanggal_pengajuan", "Tgl Pengajuan", "display", { section: "Info", col: 12 }),
    f("tanggal_approve_atasan", "Tgl approve Atasan", "display", {
      section: "Info",
      col: 12,
    }),
    f("tanggal_approve_hrd", "Tgl approve HRD", "display", { section: "Info", col: 12 }),
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

/** Absen_Online/master_holiday.aspx + Holiday_Info.aspx */
const HOLIDAY_YEAR_OPTS = (() => {
  const y = new Date().getFullYear();
  const opts = [];
  for (let i = y + 1; i >= y - 7; i -= 1) {
    opts.push({ value: String(i), label: String(i) });
  }
  return opts;
})();

export const hrdParHoliday = cfg({
  title: "LIST HARI LIBUR NASIONAL",
  moduleCode: "HRD_PAR_HOLIDAY",
  path: "par/holiday",
  crud: true,
  description: "Hari libur nasional (legacy: master_holiday.aspx).",
  modalSize: "md",
  modalEntityTitle: "Hari Libur",
  modalSectionTitle: "Holiday",
  modalSubtitle: "Tanggal, deskripsi, dan potong cuti",
  pageSize: 100,
  columns: [
    col("holiday_date", "TANGGAL"),
    col("hari", "HARI"),
    col("description", "DESCRIPTION", "lg"),
    col("potong_cuti", "POTONG CUTI", "sm"),
  ],
  filterDefs: [
    fd("year", "Tahun", "select", {
      options: HOLIDAY_YEAR_OPTS,
      defaultValue: String(new Date().getFullYear()),
    }),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("holiday_date", "DATE", "date", { required: true, section: "Holiday", col: 12 }),
    f("description", "DESCRIPTION", "textarea", {
      required: true,
      section: "Holiday",
      col: 12,
      maxLength: 200,
    }),
    f("potong_cuti", "POTONG CUTI", "checkbox", {
      section: "Holiday",
      col: 12,
      checkboxLabel: "POTONG CUTI",
    }),
  ],
});

/** Absen_Online/overtime_amount.aspx + overtime_amount_lookup.aspx */
export const hrdParOtAmount = cfg({
  title: "OVERTIME AMOUNT",
  moduleCode: "HRD_PAR_OT_AMOUNT",
  path: "par/overtime-amount",
  crud: true,
  description: "Tarif lembur (legacy: overtime_amount.aspx).",
  modalSize: "lg",
  modalEntityTitle: "Overtime Amount",
  modalSubtitle: "Level, jabatan, konsumsi & insentif",
  sectionColumns: [["Level"], ["Amount"]],
  defaultSort: { key: "level", dir: "asc" },
  columns: [
    col("level", "LEVEL"),
    col("jabatan", "JABATAN"),
    col("konsumsi", "KONSUMSI", "md", {
      sortKey: "konsumsi_amount",
      sortType: "number",
    }),
    col("insentif", "INSENTIF", "md", {
      sortKey: "insentif_amount",
      sortType: "number",
    }),
    col("weekend", "WEEKEND", "md", {
      sortKey: "insentif_weekend_amount",
      sortType: "number",
    }),
    col("tipe_insentif", "TIPE INSENTIF"),
    col("lebih_5_jam", "LEMBUR > 5 JAM"),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("level", "LEVEL", "select", {
      required: true,
      lookupKey: "overtime_level",
      section: "Level",
      col: 12,
    }),
    f("jabatan", "JABATAN", "select", {
      required: true,
      lookupKey: "overtime_jabatan",
      section: "Level",
      col: 12,
      defaultValue: "ALL",
    }),
    f("lebih_5_jam", "LEMBUR LEBIH DARI 5 JAM", "checkbox", {
      section: "Level",
      col: 12,
      checkboxLabel: "LEMBUR LEBIH DARI 5 JAM",
    }),
    f("tipe_insentif", "TIPE INSENTIF", "radio", {
      section: "Level",
      col: 12,
      defaultValue: "TETAP",
      options: [
        { value: "TETAP", label: "TETAP" },
        { value: "PER JAM", label: "PER JAM" },
      ],
    }),
    f("konsumsi_amount", "KONSUMSI AMOUNT", "currency", {
      required: true,
      section: "Amount",
      col: 12,
      format: "currency",
      showPrefix: false,
    }),
    f("insentif_amount", "INSENTIF AMOUNT", "currency", {
      required: true,
      section: "Amount",
      col: 12,
      format: "currency",
      showPrefix: false,
    }),
    f("insentif_weekend_amount", "INSENTIF WEEKEND AMOUNT", "currency", {
      required: true,
      section: "Amount",
      col: 12,
      format: "currency",
      showPrefix: false,
    }),
  ],
});

/** masterpolicylist.aspx + masterpolicy.aspx */
export const hrdParPolicy = cfg({
  title: "Policy List",
  moduleCode: "HRD_PAR_POLICY",
  path: "par/policy",
  crud: true,
  description: "Master policy (legacy: masterpolicylist.aspx / masterpolicy.aspx).",
  modalSize: "xl",
  modalEntityTitle: "Policy",
  modalSubtitle: "Periode, salary, absent, THR & BPJS",
  sectionColumns: [
    ["Branch & Period", "Salary"],
    ["Absent", "THR"],
    ["BPJS"],
  ],
  columns: [
    col("salary_schedule_start", "Salary Schedule Start Date", "lg"),
    col("salary_schedule_end", "Salary Schedule End Date", "lg"),
    col("absent_schedule_start", "Absent Schedule Start Date", "lg"),
    col("absent_schedule_end", "Absent Schedule End Date", "lg"),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("branch", "Branch", "display", {
      section: "Branch & Period",
      col: 12,
      defaultValue: "HEAD OFFICE",
    }),
    f("periode_year", "Period Year", "text", {
      required: true,
      section: "Branch & Period",
      col: 12,
      mask: "year",
      validate: "year",
      maxLength: 4,
      inputMode: "numeric",
      placeholder: "YYYY",
    }),
    f("periode_month", "Period Month", "select", {
      options: MONTH_OPTS,
      section: "Branch & Period",
      col: 12,
    }),
    f("salary_schedule_start", "Salary Schedule Start Date", "date", {
      required: true,
      section: "Salary",
      col: 12,
    }),
    f("salary_schedule_end", "Salary Schedule End Date", "date", {
      required: true,
      section: "Salary",
      col: 12,
    }),
    f("salary_date", "Salary Date", "date", { required: true, section: "Salary", col: 12 }),
    f("last_day_of_month", "Last Day Of The Month", "checkbox", {
      section: "Salary",
      col: 12,
      checkboxLabel: "Last Day Of The Month",
    }),
    f("absent_schedule_start", "Absent Schedule Start Date", "date", {
      required: true,
      section: "Absent",
      col: 12,
    }),
    f("absent_schedule_end", "Absent Schedule End Date", "date", {
      required: true,
      section: "Absent",
      col: 12,
    }),
    f("staff_probation_thr", "Staff Probation THR", "checkbox", {
      section: "THR",
      col: 12,
      checkboxLabel: "Staff Probation THR",
    }),
    f("staff_probation_prorate", "Staff Probation Prorate", "checkbox", {
      section: "THR",
      col: 12,
      checkboxLabel: "Staff Probation Prorate",
    }),
    f("staff_prorate_thr", "Staff Prorate THR", "checkbox", {
      section: "THR",
      col: 12,
      checkboxLabel: "Staff Prorate THR",
    }),
    f("bpjs_kes_employee", "BPJS Kesehatan By Employee (%)", "percent", {
      section: "BPJS",
      col: 6,
      format: "percent",
      validate: "percent",
      min: 0,
      max: 100,
      decimalScale: 2,
    }),
    f("bpjs_kes_company", "BPJS Kesehatan By Company (%)", "percent", {
      section: "BPJS",
      col: 6,
      format: "percent",
      validate: "percent",
      min: 0,
      max: 100,
      decimalScale: 2,
    }),
    f("jht_employee", "JHT By Employee (%)", "percent", {
      section: "BPJS",
      col: 6,
      format: "percent",
      validate: "percent",
      min: 0,
      max: 100,
      decimalScale: 2,
    }),
    f("jht_company", "JHT By Company (%)", "percent", {
      section: "BPJS",
      col: 6,
      format: "percent",
      validate: "percent",
      min: 0,
      max: 100,
      decimalScale: 2,
    }),
    f("bpjs_jkk", "BPJS JKK By Company (%)", "percent", {
      section: "BPJS",
      col: 6,
      format: "percent",
      validate: "percent",
      min: 0,
      max: 100,
      decimalScale: 2,
    }),
    f("bpjs_jkm", "BPJS JKM By Company (%)", "percent", {
      section: "BPJS",
      col: 6,
      format: "percent",
      validate: "percent",
      min: 0,
      max: 100,
      decimalScale: 2,
    }),
    f("bpjs_pensiun_employee", "BPJS Pensiun By Employee (%)", "percent", {
      section: "BPJS",
      col: 6,
      format: "percent",
      validate: "percent",
      min: 0,
      max: 100,
      decimalScale: 2,
    }),
    f("bpjs_pensiun_company", "BPJS Pensiun By Company (%)", "percent", {
      section: "BPJS",
      col: 6,
      format: "percent",
      validate: "percent",
      min: 0,
      max: 100,
      decimalScale: 2,
    }),
    f("threshold_salary_bpjs", "Threshold Salary BPJS", "currency", {
      section: "BPJS",
      col: 6,
      format: "currency",
    }),
    f("threshold_max_salary_bpjs", "Threshold MAX Salary BPJS", "currency", {
      section: "BPJS",
      col: 6,
      format: "currency",
    }),
    f("threshold_salary_jp", "Threshold Salary JP", "currency", {
      section: "BPJS",
      col: 6,
      format: "currency",
    }),
  ],
});

/* ===================== PAR Master HRIS ===================== */
/** M_perusahaan.aspx — single form page */
export const hrdParPerusahaan = cfg({
  title: "Info Perusahaan",
  moduleCode: "HRD_PAR_PERUSAHAAN",
  path: "par/perusahaan",
  crud: true,
  description: "Profil perusahaan (legacy: M_perusahaan.aspx).",
  columns: [titleColumn("nama_perusahaan", "id", "Perusahaan"), col("kota", "Kota"), col("npwp", "NPWP")],
  hideSearch: true,
  fields: [
    f("nama_perusahaan", "Nama Perusahaan", "text", { required: true, section: "Perusahaan", col: 12 }),
    f("alamat_1", "Alamat 1", "text", { section: "Perusahaan", col: 12 }),
    f("alamat_2", "Alamat 2", "text", { section: "Perusahaan", col: 12 }),
    f("alamat_3", "Alamat 3", "text", { section: "Perusahaan", col: 12 }),
    f("kota_id", "Kota", "select", { lookupKey: "kota", section: "Perusahaan" }),
    f("kode_pos", "Kode Pos", "text", { section: "Perusahaan" }),
    f("provinsi_id", "Provinsi", "select", { lookupKey: "provinsi", section: "Perusahaan" }),
    f("negara_id", "Negara", "select", { lookupKey: "negara", section: "Perusahaan" }),
    f("bidang_usaha", "Bidang Usaha", "text", { section: "Perusahaan", col: 12 }),
    f("telepon_kode", "No.TLp Kode", "text", { section: "Kontak" }),
    f("telepon_1", "No.TLp 1", "text", { section: "Kontak" }),
    f("telepon_2", "No.TLp 2", "text", { section: "Kontak" }),
    f("fax_kode", "Fax Kode", "text", { section: "Kontak" }),
    f("fax_nomor", "Fax Nomor", "text", { section: "Kontak" }),
    f("website", "Website", "text", { section: "Kontak", col: 12 }),
    f("email", "Email", "text", { section: "Kontak", col: 12 }),
    f("pimpinan", "Pimpinan Perusahaan", "text", { section: "Kontak", col: 12 }),
    f("npwp", "NPWP", "text", { section: "Kontak" }),
    f("nomor_pkp", "Nomor Pengukuhan Pajak", "text", { section: "Kontak" }),
    f("tanggal_pkp", "Tanggal Pengukuhan Pajak", "date", { section: "Kontak" }),
  ],
});

/** m_cabang.aspx + lookup_cabang_info.aspx */
export const hrdParCabang = cfg({
  title: "List Cabang",
  moduleCode: "HRD_PAR_CABANG",
  path: "par/cabang",
  crud: true,
  description: "Master cabang (legacy: m_cabang.aspx).",
  modalSize: "lg",
  modalEntityTitle: "Cabang",
  modalSubtitle: "Data cabang & kontak",
  /* ASP: dropdown AKTIF → NONAKTIFKAN / sebaliknya */
  statusToggle: true,
  statusTogglePath: "par/cabang/status",
  sectionColumns: [["Cabang"], ["Kontak"]],
  columns: [
    col("brand", "BRAND"),
    titleColumn("nama", "kode", "CABANG"),
    { key: "status", label: "STATUS", type: "status_toggle", size: "mb" },
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("brand", "Brand", "select", { lookupKey: "brand_id", section: "Cabang", col: 12 }),
    f("kode", "Kode", "text", { required: true, section: "Cabang", col: 12 }),
    f("nama", "Nama", "text", { required: true, section: "Cabang", col: 12 }),
    f("alamat", "Alamat", "textarea", { section: "Cabang", col: 12 }),
    f("kota", "Kota", "select", { lookupKey: "kota", section: "Cabang", col: 12 }),
    f("provinsi", "Provinsi", "select", { lookupKey: "provinsi", section: "Cabang", col: 12 }),
    f("negara", "Negara", "select", { lookupKey: "negara", section: "Cabang", col: 12 }),
    f("telepon", "Telepon", "text", { section: "Kontak", col: 12 }),
    f("fax", "Fax", "text", { section: "Kontak", col: 12 }),
    f("pimpinan", "Pimpinan", "text", { section: "Kontak", col: 12 }),
    f("bank", "Bank", "select", { lookupKey: "bank", section: "Kontak", col: 12 }),
    f("nomor_rekening", "No.Rek", "text", { section: "Kontak", col: 12 }),
    f("no_id", "No.ID", "text", { section: "Kontak", col: 12 }),
    f("atas_nama", "Atas Nama", "text", { section: "Kontak", col: 12 }),
  ],
});

/** m_divisi.aspx + lookup_divisi_info.aspx */
export const hrdParDivisi = cfg({
  title: "List Divisi",
  moduleCode: "HRD_PAR_DIVISI",
  path: "par/divisi",
  crud: true,
  description: "Master divisi (legacy: m_divisi.aspx).",
  modalSize: "md",
  modalEntityTitle: "Divisi",
  modalSectionTitle: "Divisi",
  modalSubtitle: "Kode, nama, dan keterangan divisi",
  columns: [col("kode", "Kode Divisi"), titleColumn("nama", "id", "Nama Divisi"), col("keterangan", "Keterangan", "lg")],
  fields: [
    f("id", "ID", "hidden"),
    f("kode", "Kode", "text", { required: true, section: "Divisi", col: 12 }),
    f("nama", "Divisi", "text", { required: true, section: "Divisi", col: 12 }),
    f("keterangan", "Keterangan", "textarea", { section: "Divisi", col: 12 }),
  ],
});

/** m_departemen.aspx + lookup_departemen_info.aspx */
export const hrdParDepartemen = cfg({
  title: "List Departemen",
  moduleCode: "HRD_PAR_DEPARTEMEN",
  path: "par/departemen",
  crud: true,
  description: "Master departemen (legacy: m_departemen.aspx).",
  modalSize: "md",
  modalEntityTitle: "Departemen",
  modalSectionTitle: "Departemen",
  modalSubtitle: "Divisi, kode, dan nama departemen",
  columns: [
    col("kode", "Kode"),
    titleColumn("nama", "id", "Nama"),
    col("keterangan", "Keterangan"),
    col("divisi_nama", "Divisi"),
  ],
  fields: [
    f("id", "ID", "hidden"),
    f("divisi", "Divisi", "select", { lookupKey: "divisi", section: "Departemen", col: 12 }),
    f("kode", "Kode Departemen", "text", { required: true, section: "Departemen", col: 12 }),
    f("nama", "Departemen", "textarea", { required: true, section: "Departemen", col: 12 }),
    f("keterangan", "Keterangan", "textarea", { section: "Departemen", col: 12 }),
  ],
});

/** m_golongan.aspx + lookup_golongan_info.aspx */
export const hrdParGolongan = cfg({
  title: "List Golongan",
  moduleCode: "HRD_PAR_GOLONGAN",
  path: "par/golongan",
  crud: true,
  description: "Master golongan (legacy: m_golongan.aspx).",
  modalSize: "md",
  modalEntityTitle: "Golongan",
  modalSectionTitle: "Golongan",
  modalSubtitle: "Nama dan keterangan golongan",
  columns: [titleColumn("nama", "id", "Golongan"), col("keterangan", "Keterangan", "lg")],
  fields: [
    f("id", "ID", "hidden"),
    f("nama", "Golongan", "text", { required: true, section: "Golongan", col: 12 }),
    f("keterangan", "Keterangan", "textarea", { section: "Golongan", col: 12 }),
  ],
});

/** m_pangkat.aspx + lookup_pangkat_info.aspx */
export const hrdParPangkat = cfg({
  title: "List Pangkat",
  moduleCode: "HRD_PAR_PANGKAT",
  path: "par/pangkat",
  crud: true,
  description: "Master pangkat (legacy: m_pangkat.aspx).",
  modalSize: "md",
  modalEntityTitle: "Pangkat",
  modalSectionTitle: "Pangkat",
  modalSubtitle: "Kode, nama, dan keterangan pangkat",
  columns: [col("kode", "Kode"), titleColumn("nama", "id", "Pangkat"), col("keterangan", "Keterangan")],
  fields: [
    f("id", "ID", "hidden"),
    f("kode", "Kode", "text", { required: true, section: "Pangkat", col: 12 }),
    f("nama", "Pangkat", "text", { required: true, section: "Pangkat", col: 12 }),
    f("keterangan", "Keterangan", "textarea", { section: "Pangkat", col: 12 }),
  ],
});

/** m_jabatan.aspx + lookup_jabatan_info.aspx */
export const hrdParJabatan = cfg({
  title: "List Jabatan",
  moduleCode: "HRD_PAR_JABATAN",
  path: "par/jabatan",
  crud: true,
  description: "Master jabatan (legacy: m_jabatan.aspx).",
  modalSize: "md",
  modalEntityTitle: "Jabatan",
  modalSectionTitle: "Jabatan",
  modalSubtitle: "Kode dan nama jabatan",
  columns: [col("kode", "Kode"), titleColumn("nama", "id", "Jabatan")],
  fields: [
    f("id", "ID", "hidden"),
    f("kode", "Kode", "text", { required: true, section: "Jabatan", col: 12 }),
    f("nama", "Jabatan", "text", { required: true, section: "Jabatan", col: 12 }),
  ],
});

/** sm_dept_list.aspx + sm_dept_info.aspx — detail page HrdSmDeptInfoPage */
export const hrdParSmDept = cfg({
  title: "SM Department List",
  moduleCode: "HRD_PAR_SM_DEPT",
  path: "par/sm-dept",
  crud: true,
  description: "Senior Manager department (legacy: sm_dept_list.aspx).",
  columns: [col("nik", "NIK"), titleColumn("nama", "nik", "NAMA")],
  fields: [
    f("id", "ID", "hidden"),
    f("nik", "NIK", "text", { required: true }),
    f("nama", "NAMA", "display"),
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
  actionLabel: "TARIK ABSEN",
  fields: [
    { name: "month", label: "BULAN", type: "select", options: MONTH_OPTS, required: true },
    { name: "tahun", label: "TAHUN", type: "select", options: YEAR_RECENT_OPTS, required: true },
  ],
};

export const hrdAbsGenerateNasionalProcess = {
  title: "GENERATE ABSEN NASIONAL",
  moduleCode: "HRD_ABS_GENERATE_NASIONAL",
  processPath: "abs/generate-nasional",
  description: "Tarik absen nasional (legacy: Generate_Absen_NASIONAL.aspx).",
  actionLabel: "TARIK ABSEN",
  fields: [
    { name: "id_mesin", label: "LOKASI", type: "select", lookupKey: "id_mesin", required: true },
    { name: "month", label: "BULAN", type: "select", options: MONTH_OPTS, required: true },
    { name: "tahun", label: "TAHUN", type: "select", options: YEAR_RECENT_OPTS, required: true },
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
