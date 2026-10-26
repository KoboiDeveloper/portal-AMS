import { branchService } from "../../../services/branch.service";
import { storeService } from "../../../services/store.service";
import { employeeService } from "../../../services/employee.service";
import { roleService } from "../../../services/role.service";
import { moduleService } from "../../../services/module.service";
import { permissionService } from "../../../services/permission.service";
import { userRoleService } from "../../../services/user-role.service";
import { rolePermissionService } from "../../../services/role-permission.service";
import { areaStoreService } from "../../../services/area-store.service";
import { accessService } from "../../../services/access.service";
import { getAuthNik } from "../../../lib/auth";
import { extractRows } from "../../../lib/response";

const titleColumn = (titleKey, subtitleKey, label = "Name") => ({
  key: titleKey,
  label,
  type: "title",
  titleKey,
  subtitleKey,
});

const badgeColumn = (key, label, size = "mb") => ({
  key,
  label,
  size,
  type: "badge",
});

export const branchConfig = {
  title: "Branch / SBU",
  moduleCode: "MASTER_BRANCH",
  service: branchService,
  idField: "branch_id",
  pageSize: 10,
  projectListColumns: [
    titleColumn("branch_name", "branch_id", "Branch / SBU"),
    { key: "branch_type", label: "Type", size: "lg" },
    { key: "parent_branch_id", label: "Parent", size: "md" },
    badgeColumn("is_active", "Status"),
  ],
  fields: [
    { name: "branch_id", label: "Branch ID", disabledOnEdit: true },
    { name: "branch_name", label: "Branch Name" },
    { name: "branch_type", label: "Branch Type" },
    { name: "parent_branch_id", label: "Parent Branch ID" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ],
  initialForm: { branch_id: "", branch_name: "", branch_type: "RETAIL", parent_branch_id: "", is_active: true },
};

export const storeConfig = {
  title: "Store",
  moduleCode: "MASTER_STORE",
  service: storeService,
  idField: "store_id",
  extraListParams: ["branch_id"],
  pageSize: 10,
  projectListColumns: [
    titleColumn("store_name", "store_id", "Store Name"),
    { key: "branch_id", label: "Branch", size: "lg" },
    { key: "store_city", label: "City", size: "lg" },
    { key: "store_province", label: "Province", size: "md" },
    { key: "store_island", label: "Island", size: "md" },
    badgeColumn("is_active", "Status"),
  ],
  fields: [
    { name: "store_id", label: "Store ID", disabledOnEdit: true },
    { name: "store_name", label: "Store Name" },
    { name: "branch_id", label: "Branch ID" },
    { name: "store_city", label: "City" },
    { name: "store_province", label: "Province" },
    { name: "store_island", label: "Island" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ],
  initialForm: {
    store_id: "",
    store_name: "",
    branch_id: "",
    store_city: "",
    store_province: "",
    store_island: "",
    is_active: true,
  },
};

export const employeeConfig = {
  title: "Employee",
  moduleCode: "MASTER_EMPLOYEE",
  extraPermissions: ["RESET_PASSWORD"],
  resetPassword: {
    label: "Change Password",
    modalTitle: "Change Password",
    permission: "RESET_PASSWORD",
    successMessage: "Password changed successfully",
  },
  service: employeeService,
  idField: "nik",
  extraListParams: ["employee_type", "branch_id", "store_id"],
  pageSize: 10,
  projectListColumns: [
    titleColumn("employee_name", "nik", "Employee"),
    { key: "employee_type", label: "Type", size: "md" },
    { key: "branch_id", label: "Branch", size: "lg" },
    { key: "store_id", label: "Store", size: "lg" },
    { key: "job_title", label: "Job Title", size: "md" },
    { key: "email", label: "Email", size: "lg" },
    badgeColumn("is_active", "Status"),
  ],
  fields: [
    {
      name: "nik",
      label: "NIK",
      col: 6,
      mask: "code",
      required: true,
      placeholder: "ST001",
      disabledOnEdit: true,
      help: "Alphanumeric employee ID",
    },
    {
      name: "employee_name",
      label: "Employee Name",
      col: 6,
      mask: "name",
      required: true,
      placeholder: "Full name",
    },
    {
      name: "employee_type",
      label: "Employee Type",
      type: "select",
      col: 6,
      required: true,
      options: [
        { value: "STORE", label: "STORE" },
        { value: "BRANCH", label: "BRANCH" },
        { value: "HQ", label: "HQ" },
      ],
    },
    {
      name: "branch_id",
      label: "Branch ID",
      col: 6,
      mask: "code",
      placeholder: "BR001",
    },
    {
      name: "store_id",
      label: "Store ID",
      col: 6,
      mask: "code",
      placeholder: "STR001",
    },
    {
      name: "job_title",
      label: "Job Title",
      col: 6,
      placeholder: "Job title",
    },
    {
      name: "email",
      label: "Email",
      col: 6,
      inputType: "email",
      validate: "email",
      placeholder: "user@company.com",
    },
    {
      name: "phone",
      label: "Phone / WhatsApp",
      col: 6,
      mask: "phone",
      validate: "phone",
      placeholder: "0812-3456-7890",
      help: "Format: 08xx-xxxx-xxxx",
    },
    {
      name: "is_active",
      label: "Active",
      type: "checkbox",
      col: 12,
      checkboxLabel: "Employee is active",
    },
  ],
  initialForm: {
    nik: "",
    employee_name: "",
    employee_type: "STORE",
    branch_id: "",
    store_id: "",
    job_title: "",
    email: "",
    phone: "",
    is_active: true,
  },
};

export const roleConfig = {
  title: "Role",
  moduleCode: "SEC_ROLE",
  service: roleService,
  idField: "role_code",
  pageSize: 10,
  projectListColumns: [
    titleColumn("role_name", "role_code", "Role"),
    { key: "scope_level", label: "Scope", size: "md" },
    { key: "description", label: "Description", size: "xxl" },
    badgeColumn("is_system", "System", "md"),
    badgeColumn("is_active", "Status"),
  ],
  fields: [
    { name: "role_code", label: "Role Code", disabledOnEdit: true },
    { name: "role_name", label: "Role Name" },
    {
      name: "scope_level",
      label: "Scope Level",
      type: "select",
      options: [
        { value: "GLOBAL", label: "GLOBAL" },
        { value: "BRANCH", label: "BRANCH" },
        { value: "STORE", label: "STORE" },
      ],
    },
    { name: "description", label: "Description", type: "textarea" },
    { name: "is_system", label: "System Role", type: "checkbox" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ],
  initialForm: {
    role_code: "",
    role_name: "",
    scope_level: "BRANCH",
    description: "",
    is_system: false,
    is_active: true,
  },
};

export const moduleConfig = {
  title: "Module",
  moduleCode: "SEC_MODULE",
  description:
    "Susunan menu mengikuti Parent Module Code + Sort No. Endpoint kosong/# = folder/mega column (bukan halaman).",
  service: moduleService,
  idField: "module_code",
  pageSize: 10,
  projectListColumns: [
    titleColumn("module_name", "module_code", "Module"),
    { key: "parent_module_code", label: "Parent", size: "md" },
    { key: "endpoint_path", label: "Endpoint", size: "xxl" },
    { key: "sort_no", label: "Sort", size: "sm" },
    badgeColumn("is_active", "Status"),
  ],
  fields: [
    { name: "module_code", label: "Module Code", disabledOnEdit: true },
    { name: "module_name", label: "Module Name", help: "Tampil sebagai label menu / judul kolom mega menu." },
    {
      name: "parent_module_code",
      label: "Parent Module Code",
      help: "Kosong = top menu. Isi kode folder (mis. HRD, HRD_GRP_PAYROLL) untuk mengelompokkan di bawah parent.",
    },
    {
      name: "endpoint_path",
      label: "Endpoint Path",
      help: "Path halaman React, atau kosong/# untuk folder/mega column (bukan link).",
      placeholder: "/admin/... atau #",
    },
    {
      name: "sort_no",
      label: "Sort No",
      type: "number",
      help: "Urutan dalam parent yang sama (kolom mega / item).",
    },
    { name: "is_active", label: "Active", type: "checkbox" },
  ],
  initialForm: {
    module_code: "",
    module_name: "",
    parent_module_code: "",
    endpoint_path: "",
    sort_no: 0,
    is_active: true,
  },
};

export const permissionConfig = {
  title: "Permission",
  moduleCode: "SEC_PERMISSION",
  service: permissionService,
  idField: "permission_code",
  pageSize: 10,
  projectListColumns: [
    titleColumn("permission_name", "permission_code", "Permission"),
    badgeColumn("is_active", "Status"),
  ],
  fields: [
    { name: "permission_code", label: "Permission Code", disabledOnEdit: true },
    { name: "permission_name", label: "Permission Name" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ],
  initialForm: { permission_code: "", permission_name: "", is_active: true },
};

export const userRoleConfig = {
  title: "User Role",
  moduleCode: "SEC_USER_ROLE",
  service: userRoleService,
  idField: "user_role_id",
  extraListParams: ["nik", "role_code", "is_effective"],
  pageSize: 10,
  projectListColumns: [
    titleColumn("nik", "user_role_id", "User Role"),
    { key: "role_code", label: "Role", size: "lg" },
    { key: "branch_id", label: "Branch", size: "md" },
    { key: "store_id", label: "Store", size: "md" },
    { key: "start_date", label: "Start", size: "md" },
    { key: "end_date", label: "End", size: "md" },
    badgeColumn("is_active", "Status"),
  ],
  fields: [
    { name: "nik", label: "NIK" },
    { name: "role_code", label: "Role Code" },
    { name: "branch_id", label: "Branch ID" },
    { name: "store_id", label: "Store ID" },
    { name: "start_date", label: "Start Date", type: "date" },
    { name: "end_date", label: "End Date", type: "date" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ],
  initialForm: {
    nik: "",
    role_code: "",
    branch_id: "",
    store_id: "",
    start_date: "",
    end_date: "",
    is_active: true,
  },
};

export const rolePermissionConfig = {
  title: "Role Permission",
  moduleCode: "SEC_ROLE",
  service: rolePermissionService,
  idField: "role_code",
  disableUpdate: true,
  addButtonLabel: "Save Mapping",
  addSuccessMessage: "Role permission saved",
  extraListParams: ["role_code", "module_code"],
  pageSize: 10,
  rowKey: (row, idx) => `${row.role_code}-${row.module_code}-${row.permission_code}-${idx}`,
  getDeleteMessage: (row) =>
    `Remove mapping ${row.role_code} / ${row.module_code} / ${row.permission_code}?`,
  onCreate: (payload) => rolePermissionService.save(payload),
  onDelete: (row) =>
    rolePermissionService.remove({
      role_code: row.role_code,
      module_code: row.module_code,
      permission_code: row.permission_code,
    }),
  projectListColumns: [
    titleColumn("role_code", "module_code", "Role / Module"),
    { key: "permission_code", label: "Permission", size: "lg" },
    badgeColumn("is_active", "Status"),
  ],
  fields: [
    { name: "role_code", label: "Role Code" },
    { name: "module_code", label: "Module Code" },
    { name: "permission_code", label: "Permission Code" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ],
  initialForm: {
    role_code: "",
    module_code: "",
    permission_code: "",
    is_active: true,
  },
};

export const areaStoreConfig = {
  title: "Area Store",
  moduleCode: "SEC_AREA_STORE",
  service: areaStoreService,
  idField: "store_id",
  disableUpdate: true,
  extraListParams: ["area_manager_nik", "store_id"],
  pageSize: 10,
  rowKey: (row, idx) => `${row.area_manager_nik}-${row.store_id}-${idx}`,
  getDeleteMessage: (row) =>
    `Remove mapping ${row.area_manager_nik} → ${row.store_id}?`,
  onDelete: (row) =>
    areaStoreService.remove({
      area_manager_nik: row.area_manager_nik,
      store_id: row.store_id,
    }),
  projectListColumns: [
    titleColumn("area_manager_nik", "store_id", "Area Manager / Store"),
    badgeColumn("is_active", "Status"),
  ],
  fields: [
    { name: "area_manager_nik", label: "Area Manager NIK" },
    { name: "store_id", label: "Store ID" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ],
  initialForm: { area_manager_nik: "", store_id: "", is_active: true },
};

export const effectiveAccessConfig = {
  title: "Effective Access",
  readOnly: true,
  hideSearch: true,
  hideStatusFilter: true,
  loadOnMount: false,
  extraListParams: ["nik", "role_code", "module_code"],
  initialExtraFilters: { nik: getAuthNik() },
  pageSize: 10,
  customLoad: async (params) => {
    const res = await accessService.getEffectiveAccess(params);
    return extractRows(res);
  },
  projectListColumns: [
    { key: "nik", label: "NIK", size: "md" },
    { key: "role_code", label: "Role", size: "lg" },
    { key: "module_code", label: "Module", size: "lg" },
    { key: "permission_code", label: "Permission", size: "md" },
  ],
};

export const userMenuPreviewConfig = {
  title: "User Menu Preview",
  readOnly: true,
  hideSearch: true,
  hideStatusFilter: true,
  loadOnMount: false,
  extraListParams: ["nik"],
  initialExtraFilters: { nik: getAuthNik() },
  pageSize: 10,
  customLoad: async (params) => {
    if (!params.nik) return [];
    const res = await accessService.getUserMenu(params.nik);
    return extractRows(res);
  },
  projectListColumns: [
    titleColumn("module_name", "module_code", "Module"),
    { key: "endpoint_path", label: "Endpoint", size: "xxl" },
    { key: "sort_no", label: "Sort", size: "sm" },
  ],
};

export const storeScopePreviewConfig = {
  title: "Store Scope Preview",
  readOnly: true,
  hideSearch: true,
  hideStatusFilter: true,
  loadOnMount: false,
  extraListParams: ["nik"],
  initialExtraFilters: { nik: getAuthNik() },
  pageSize: 10,
  customLoad: async (params) => {
    if (!params.nik) return [];
    const res = await accessService.getUserStoreScope(params.nik);
    return extractRows(res);
  },
  projectListColumns: [
    titleColumn("store_name", "store_id", "Store"),
    { key: "branch_id", label: "Branch", size: "lg" },
  ],
};
