import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appPath } from "../../lib/paths";
import Head from "../../layout/head/Head";
import Content from "../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  BlockDes,
  Icon,
  Button,
  RSelect,
} from "../../components/Component";
import {
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
  DropdownItem,
  Input,
} from "reactstrap";
import ProjectListTable from "./common/ProjectListTable";
import FormModal from "./common/FormModal";
import ConfirmDialog from "./common/ConfirmDialog";
import ResetPasswordModal from "./common/ResetPasswordModal";
import ErrorState from "./common/ErrorState";
import AccessGuard from "./AccessGuard";
import { extractRow, extractRows, isSuccess, notifyResponse } from "../../lib/response";
import { toast } from "react-toastify";
import { normalizeFormPayload, applyFieldMask } from "../../lib/formFieldUtils";
import { useActionPermissions } from "../../hooks/useActionPermissions";
import { hrdLookupOptions } from "../../services/hrd/hrd.service";
import { exportStyledXlsx } from "../../lib/exportStyledXlsx";
import AppDatePicker from "../AppDatePicker";
import AppDateRangePicker, { parseAppDate } from "../AppDateRangePicker";

/** Same box size as date range / search (CSS also enforces 220×32) */
const filterSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 32,
    height: 32,
    fontSize: "0.8125rem",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 6px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 4px" }),
  menu: (base) => ({
    ...base,
    zIndex: 30,
    fontSize: "0.8125rem",
    width: "max-content",
    minWidth: "100%",
    maxWidth: "none",
    overflowX: "hidden",
  }),
  menuList: (base) => ({
    ...base,
    overflowX: "hidden",
  }),
  option: (base) => ({
    ...base,
    fontSize: "0.8125rem",
    padding: "6px 12px",
    whiteSpace: "nowrap",
    overflow: "visible",
    textOverflow: "clip",
  }),
  singleValue: (base) => ({
    ...base,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  }),
};

const listStateStorageKey = (config) =>
  `admin.listState.${config?.moduleCode || config?.path || config?.title || "page"}`;

const readListState = (config) => {
  if (config?.persistListState === false) return null;
  try {
    const raw = sessionStorage.getItem(listStateStorageKey(config));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeListState = (config, payload) => {
  if (config?.persistListState === false) return;
  try {
    sessionStorage.setItem(listStateStorageKey(config), JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
};

const AdminProjectListPage = ({ config }) => {
  const navigate = useNavigate();
  const resolveLookupOptions = config.lookupOptionsFn || hrdLookupOptions;
  const savedListState = useMemo(() => readListState(config), [config]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sm, setSm] = useState(false);
  const [search, setSearch] = useState(() => savedListState?.search ?? "");
  const [isActive, setIsActive] = useState(() => savedListState?.isActive ?? "");
  const [statusPick, setStatusPick] = useState(
    () => savedListState?.statusPick ?? (config.statusDefault || "")
  );
  const statusOptions = Array.isArray(config.statusOptions) ? config.statusOptions : null;
  const [extraFilters, setExtraFilters] = useState(
    () => savedListState?.extraFilters ?? (config.initialExtraFilters || {})
  );
  const [filterOptions, setFilterOptions] = useState({});
  const [modal, setModal] = useState({ open: false, mode: "add" });
  const [formData, setFormData] = useState(config.initialForm || {});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, row: null });
  const [resetModal, setResetModal] = useState({ open: false, row: null });
  const [currentPage, setCurrentPage] = useState(() => savedListState?.currentPage || 1);
  const [itemPerPage] = useState(config.pageSize || 10);
  const [exporting, setExporting] = useState(false);
  const extraPermissions = config.extraPermissions || [];
  const hasAddMenu = Array.isArray(config.addMenu) && config.addMenu.length > 0;
  const navCreate = Boolean(config.addPath || hasAddMenu);
  const perms = useActionPermissions(
    config.readOnly && !navCreate ? null : config.moduleCode,
    extraPermissions
  );

  const resolveDetailHref = useCallback(
    (row) => {
      if (typeof config.getDetailHref === "function") return config.getDetailHref(row);
      if (typeof config.detailPath === "function") return config.detailPath(row);
      if (config.detailPath && row) {
        const id = row[config.idField] ?? row.id ?? row.ID;
        return config.detailPath.replace(":id", encodeURIComponent(String(id ?? "")));
      }
      return null;
    },
    [config]
  );

  const goDetail = useCallback(
    (row) => {
      if (typeof config.onRowClick === "function") {
        config.onRowClick(row);
        return;
      }
      const href = resolveDetailHref(row);
      if (href) navigate(href);
    },
    [config, navigate, resolveDetailHref]
  );

  const filterDefs = useMemo(() => {
    if (Array.isArray(config.filterDefs) && config.filterDefs.length) return config.filterDefs;
    return (config.extraListParams || []).map((key) => ({
      name: key,
      label: key.replace(/_/g, " "),
      type: "text",
    }));
  }, [config.filterDefs, config.extraListParams]);

  /** Collapse from_date+to_date into one daterange control (marketing.aspx style). */
  const displayFilters = useMemo(() => {
    const out = [];
    const used = new Set();
    const pairTo = (fromName) => {
      if (fromName === "from_date") return "to_date";
      if (fromName === "date_from") return "date_to";
      if (fromName === "from") return "to";
      if (fromName === "tgl_mulai") return "tanggal_berakhir";
      if (fromName.endsWith("_dari")) return fromName.replace(/_dari$/, "_sampai");
      if (fromName.endsWith("_start")) return fromName.replace(/_start$/, "_end");
      return null;
    };
    filterDefs.forEach((f, idx) => {
      if (used.has(f.name)) return;
      if (f.type === "daterange") {
        used.add(f.name);
        out.push({
          kind: "daterange",
          key: f.name,
          label: f.label || "Date Range",
          fromKey: f.fromKey || "from_date",
          toKey: f.toKey || "to_date",
        });
        return;
      }
      const toKey = pairTo(f.name);
      const toDef = toKey ? filterDefs.find((x) => x.name === toKey) : null;
      const nextIsTo =
        !toDef &&
        f.type === "date" &&
        filterDefs[idx + 1]?.type === "date" &&
        /^(to_date|date_to|to)$/i.test(filterDefs[idx + 1]?.name || "");
      if ((f.type === "date" || !f.type) && toDef) {
        used.add(f.name);
        used.add(toDef.name);
        out.push({
          kind: "daterange",
          key: `${f.name}__${toDef.name}`,
          label: f.label || toDef?.label || "Date Range",
          fromKey: f.name,
          toKey: toDef.name,
        });
        return;
      }
      if (nextIsTo) {
        const toF = filterDefs[idx + 1];
        used.add(f.name);
        used.add(toF.name);
        out.push({
          kind: "daterange",
          key: `${f.name}__${toF.name}`,
          label: f.label || toF?.label || "Date Range",
          fromKey: f.name,
          toKey: toF.name,
        });
        return;
      }
      if (f.type === "date") {
        used.add(f.name);
        out.push({ kind: "date", ...f });
        return;
      }
      used.add(f.name);
      out.push({ kind: "default", ...f });
    });
    return out;
  }, [filterDefs]);

  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      const next = {};
      await Promise.all(
        filterDefs.map(async (f) => {
          const type = f.lookupKey || f.lookup;
          if (!type) return;
          const parentField = f.lookupParentField;
          const parentId = parentField ? extraFilters[parentField] || "" : "";
          if (parentField && !parentId) {
            next[f.name] = [];
            return;
          }
          if (Array.isArray(f.options) && f.options.length) {
            next[f.name] = f.options;
            return;
          }
          next[f.name] = await resolveLookupOptions(type, { parentId });
        })
      );
      if (!cancelled) setFilterOptions((prev) => ({ ...prev, ...next }));
    };
    loadFilters();
    return () => {
      cancelled = true;
    };
  }, [
    filterDefs,
    resolveLookupOptions,
    ...filterDefs.filter((f) => f.lookupParentField).map((f) => extraFilters[f.lookupParentField]),
  ]);

  const listParams = useMemo(() => {
    const params = {};
    if (!config.hideSearch && search) params.search = search;
    if (!config.hideStatusFilter && isActive !== "") params.is_active = isActive;
    filterDefs.forEach((f) => {
      const val = extraFilters[f.name];
      if (val === undefined || val === null || val === "") return;
      // Legacy REGIONAL dropdowns use "ALL" / "0" as no-filter sentinels
      if (val === "ALL" || val === "all" || (f.type === "select" && val === "0")) return;
      params[f.name] = val;
    });
    return params;
  }, [search, isActive, extraFilters, filterDefs, config.hideSearch, config.hideStatusFilter]);

  const requiredFilterNames = useMemo(
    () => (Array.isArray(config.requireFilters) ? config.requireFilters : []),
    [config.requireFilters]
  );

  const filtersReady = useMemo(() => {
    if (!requiredFilterNames.length) return true;
    return requiredFilterNames.every((name) => {
      const val = extraFilters[name];
      if (val === undefined || val === null || val === "") return false;
      if (val === "ALL" || val === "all" || val === "0") return false;
      return true;
    });
  }, [requiredFilterNames, extraFilters]);

  const loadData = useCallback(async () => {
    if (requiredFilterNames.length && !filtersReady) {
      setRows([]);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let data = [];
      if (config.customLoad) {
        data = await config.customLoad(listParams);
      } else {
        const res = await config.service.list(listParams);
        data = extractRows(res);
      }
      setRows(data);
      setCurrentPage(1);
      writeListState(config, {
        search,
        isActive,
        statusPick,
        extraFilters,
        currentPage: 1,
        queried: true,
      });
    } catch (err) {
      setError(err?.responseMessage || "Failed to load data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    config,
    listParams,
    requiredFilterNames,
    filtersReady,
    search,
    isActive,
    statusPick,
    extraFilters,
  ]);

  /* Keep filter UI in sync while user edits (before/without reload). */
  useEffect(() => {
    writeListState(config, {
      search,
      isActive,
      statusPick,
      extraFilters,
      currentPage,
      queried: Boolean(savedListState?.queried || rows.length),
    });
  }, [config, search, isActive, statusPick, extraFilters, currentPage, rows.length, savedListState?.queried]);

  /* Lists with required filters wait for Cari. autoLoad fetches once on open (mpromo.aspx). */
  useEffect(() => {
    if (requiredFilterNames.length && !filtersReady) {
      setRows([]);
      setLoading(false);
      setError("");
    }
  }, [requiredFilterNames.length, filtersReady]);

  useEffect(() => {
    const shouldLoad =
      config.autoLoad || (savedListState?.queried && (!requiredFilterNames.length || filtersReady));
    if (!shouldLoad) return undefined;
    if (requiredFilterNames.length && !filtersReady) return undefined;
    loadData();
    return undefined;
    // Initial / restored load only. Later Cari / search uses the current loadData.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.autoLoad]);

  const openAdd = () => {
    if (config.addPath) {
      navigate(config.addPath);
      return;
    }
    setFormData({ ...(config.initialForm || {}) });
    setModal({ open: true, mode: "add" });
  };

  const openEdit = async (row) => {
    let source = row;
    if (config.loadDetailOnEdit && config.service?.get) {
      const pickId = (obj, name) => {
        if (!obj || name == null) return undefined;
        if (obj[name] !== undefined && obj[name] !== null && obj[name] !== "") return obj[name];
        const found = Object.keys(obj).find((k) => k.toLowerCase() === String(name).toLowerCase());
        return found != null ? obj[found] : undefined;
      };
      const id =
        pickId(row, config.idField) ??
        pickId(row, "id") ??
        pickId(row, "store") ??
        row?.ID;
      if (id !== undefined && id !== null && id !== "") {
        try {
          const res = await config.service.get(id);
          if (isSuccess(res)) source = extractRow(res) || row;
        } catch {
          source = row;
        }
      }
    }
    const sourceRow = typeof config.mapRowToForm === "function" ? config.mapRowToForm(source) : source;
    const pickFieldValue = (obj, name) => {
      if (!obj || name == null) return undefined;
      if (obj[name] !== undefined && obj[name] !== null && obj[name] !== "") return obj[name];
      const found = Object.keys(obj).find((k) => k.toLowerCase() === String(name).toLowerCase());
      return found != null ? obj[found] : undefined;
    };
    const mapped = { ...(config.initialForm || {}) };
    (config.fields || []).forEach((field) => {
      let value =
        pickFieldValue(sourceRow, field.name) ??
        pickFieldValue(source, field.name) ??
        pickFieldValue(row, field.name) ??
        mapped[field.name];
      if (field.mask && value != null && value !== "") {
        value = applyFieldMask(field.mask, value);
      }
      mapped[field.name] = value ?? "";
    });
    setFormData(mapped);
    setModal({ open: true, mode: "edit", row });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = normalizeFormPayload(config.fields || [], formData);
      if (payload.sort_no !== undefined && payload.sort_no !== "") {
        payload.sort_no = Number(payload.sort_no);
      }
      if (payload.end_date === "") payload.end_date = null;
      if (payload.store_id === "") payload.store_id = null;
      if (payload.parent_branch_id === "") payload.parent_branch_id = null;
      if (payload.parent_module_code === "") payload.parent_module_code = null;
      const body =
        typeof config.mapFormToPayload === "function" ? config.mapFormToPayload(payload) : payload;

      let res;
      if (modal.mode === "add") {
        res = config.onCreate
          ? await config.onCreate(body)
          : await config.service.create(body);
      } else {
        const pickId = (obj, name) => {
          if (!obj || name == null) return undefined;
          if (obj[name] !== undefined && obj[name] !== null && obj[name] !== "") return obj[name];
          const found = Object.keys(obj).find((k) => k.toLowerCase() === String(name).toLowerCase());
          return found != null ? obj[found] : undefined;
        };
        const editId =
          pickId(formData, config.idField) ||
          pickId(modal.row, config.idField) ||
          pickId(modal.row, "id");
        res = config.onUpdate
          ? await config.onUpdate(editId, body)
          : await config.service.update(editId, body);
      }

      const successMsg =
        modal.mode === "add"
          ? config.addSuccessMessage || "Created successfully"
          : "Updated successfully";

      if (notifyResponse(res, successMsg)) {
        /* Jangan reset mode di sini — biar judul tidak glitch Ubah→Tambah saat animasi close. */
        setModal((prev) => ({ ...prev, open: false }));
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm.row) return;
    setSaving(true);
    try {
      const pickId = (obj, name) => {
        if (!obj || name == null) return undefined;
        if (obj[name] !== undefined && obj[name] !== null && obj[name] !== "") return obj[name];
        const found = Object.keys(obj).find((k) => k.toLowerCase() === String(name).toLowerCase());
        return found != null ? obj[found] : undefined;
      };
      const deleteId = pickId(confirm.row, config.idField) || pickId(confirm.row, "id");
      const res = config.onDelete
        ? await config.onDelete(confirm.row)
        : await config.service.remove(deleteId);

      if (notifyResponse(res, config.deleteSuccessMessage || "Deleted successfully")) {
        setConfirm({ open: false, row: null });
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const promoStatusOf = (row) => {
    const status = String(row?.STATUS || row?.status || "").trim().toUpperCase();
    if (status) return status;
    const on = row?.is_active === true || row?.is_active === 1 || row?.is_active === "1";
    return on ? "AKTIF" : "NONAKTIF";
  };
  const visibleRows = useMemo(() => {
    if (!statusOptions || !statusPick) return rows;
    const want = String(statusPick).toUpperCase();
    return rows.filter((row) => promoStatusOf(row) === want);
  }, [rows, statusPick, statusOptions]);
  const statusLabel = statusOptions
    ? statusOptions.find((opt) => opt.value === statusPick)?.label || "Semua Status"
    : isActive === ""
      ? "All Status"
      : isActive === "true"
        ? "Active"
        : "Inactive";
  const canCreate =
    !perms.loading &&
    perms.CREATE &&
    !config.disableCreate &&
    (!config.readOnly || navCreate);
  const canOpenDetail = Boolean(
    config.onRowClick || config.getDetailHref || config.detailPath
  );
  const canEdit = !config.readOnly && !config.disableUpdate && !perms.loading && perms.UPDATE;
  const canDelete =
    !config.readOnly && !config.disableDelete && !perms.loading && perms.DELETE;
  const resetPermission = config.resetPassword?.permission || "RESET_PASSWORD";
  const canChangePassword =
    !!config.resetPassword && !config.readOnly && !perms.loading && perms[resetPermission];

  const statusToggle = config.statusToggle && config.service?.updateStatus;

  const handleStatusToggle = async (row) => {
    const id = row?.[config.idField];
    const ngapain =
      row?.confirm_status ??
      row?.CONFIRM_STATUS ??
      row?.status_action ??
      row?.STATUS_ACTION;
    if (!id || !ngapain) {
      notifyResponse({ responseMessage: "Status action tidak tersedia untuk baris ini" });
      return;
    }
    setSaving(true);
    try {
      const res = await config.service.updateStatus(id, ngapain);
      if (notifyResponse(res, "Status diperbarui")) loadData();
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const extraActions = [
    ...(canChangePassword
      ? [
          {
            key: "changePassword",
            label: config.resetPassword?.label || "Change Password",
            icon: "lock-alt",
            onClick: (row) => setResetModal({ open: true, row }),
          },
        ]
      : []),
    ...(statusToggle && canEdit
      ? [
          {
            key: "toggleStatus",
            label: (row) =>
              row?.CONFIRM_STATUS ||
              row?.confirm_status ||
              config.statusToggleLabel ||
              "Status",
            icon: "repeat",
            onClick: handleStatusToggle,
          },
        ]
      : []),
  ];

  const handleChangePassword = async (payload) => {
    if (!resetModal.row) return;
    setSaving(true);
    try {
      const nikField = config.resetPassword?.nikField || config.idField;
      const nik = resetModal.row[nikField];
      const submit = config.resetPassword?.onSubmit || config.service?.resetPassword;
      if (!submit) throw { responseMessage: "Reset password handler not configured" };

      const res = await submit(nik, payload);
      if (notifyResponse(res, config.resetPassword?.successMessage || "Password changed successfully")) {
        setResetModal({ open: false, row: null });
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  /* SC tanpa sectionColumns → shell flat kontrak HRD (cols-compact + 1 section). */
  const scModal = (config.modalVariant || "default") === "sc";
  const scSectionTitle = config.modalSectionTitle || "Data";
  const scSectionColumns =
    config.sectionColumns || (scModal ? [[scSectionTitle]] : undefined);
  const scModalClassName = [
    scModal ? "hrd-kontrak-form-anim" : "",
    scModal && !config.sectionColumns ? "hrd-form-modal--cols-compact" : "",
    config.modalClassName || "",
  ]
    .filter(Boolean)
    .join(" ");

  const modalFields = (config.fields || []).map((field) => {
    const next = {
      ...field,
      disabled: !!(field.disabledOnEdit && modal.mode === "edit"),
    };
    if (scModal && !config.sectionColumns && !field.section) {
      next.section = scSectionTitle;
    }
    return next;
  });

  const deleteMessage =
    confirm.row && config.getDeleteMessage
      ? config.getDeleteMessage(confirm.row)
      : `Delete ${confirm.row?.[config.idField]}?`;

  /** Prefer toolbar filters; if too many (or config.filtersBelow), render below title. */
  const putFiltersBelow =
    config.filtersBelow === true ||
    (config.filtersBelow !== false && displayFilters.length > 5);

  const renderFilterItems = () =>
    displayFilters.map((f) => {
      if (f.kind === "daterange") {
        return (
          <li key={f.key} className="hrd-filter-daterange">
            <div className="form-control-wrap">
              <div className="form-icon form-icon-left">
                <Icon name="calendar" />
              </div>
              <AppDateRangePicker
                startDate={extraFilters[f.fromKey]}
                endDate={extraFilters[f.toKey]}
                placeholder={f.label || "Date Range"}
                className="form-control form-control-sm date-picker ps-4"
                onChange={(fromYmd, toYmd) =>
                  setExtraFilters((prev) => ({
                    ...prev,
                    [f.fromKey]: fromYmd || "",
                    [f.toKey]: toYmd || "",
                  }))
                }
              />
            </div>
          </li>
        );
      }
      if (f.kind === "date") {
        return (
          <li key={f.name} className="hrd-filter-date">
            <div className="form-control-wrap">
              <div className="form-icon form-icon-left">
                <Icon name="calendar" />
              </div>
              <AppDatePicker
                selected={parseAppDate(extraFilters[f.name])}
                onChange={(d) =>
                  setExtraFilters((prev) => ({
                    ...prev,
                    [f.name]: d
                      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
                          d.getDate()
                        ).padStart(2, "0")}`
                      : "",
                  }))
                }
                dateFormat="dd/MM/yyyy"
                placeholderText={f.label}
                className="form-control form-control-sm date-picker ps-4"
                isClearable
              />
            </div>
          </li>
        );
      }
      const opts = (f.options && f.options.length ? f.options : null) || filterOptions[f.name] || [];
      const isSelect = f.type === "select" || !!f.lookupKey || !!f.lookup;
      const selectValue = extraFilters[f.name] || "";
      const selectOpt = opts.find((o) => String(o.value) === String(selectValue)) || null;
      return (
        <li key={f.name} className={isSelect ? "hrd-filter-select" : undefined}>
          {isSelect ? (
            <RSelect
              className="hrd-filter-rselect"
              styles={filterSelectStyles}
              isClearable
              isSearchable
              placeholder={f.label}
              options={opts}
              value={selectOpt}
              onChange={(opt) => {
                const val = opt?.value != null ? String(opt.value) : "";
                setExtraFilters((prev) => {
                  const next = { ...prev, [f.name]: val };
                  filterDefs.forEach((child) => {
                    if (child.lookupParentField === f.name) next[child.name] = "";
                  });
                  return next;
                });
              }}
            />
          ) : f.type === "checkbox_bool" ? (
            <label className="d-flex align-items-center gap-1 mb-0 small text-soft">
              <Input
                type="checkbox"
                checked={!!extraFilters[f.name]}
                onChange={(e) =>
                  setExtraFilters((prev) => ({
                    ...prev,
                    [f.name]: e.target.checked ? "1" : "",
                  }))
                }
              />
              {f.label}
            </label>
          ) : (
            <Input
              type={f.type === "month" ? "month" : f.type || "text"}
              bsSize="sm"
              className="w-150px"
              placeholder={f.label}
              title={f.label}
              value={extraFilters[f.name] || ""}
              onChange={(e) =>
                setExtraFilters((prev) => ({ ...prev, [f.name]: e.target.value }))
              }
            />
          )}
        </li>
      );
    });

  const loadDisabled =
    loading || (requiredFilterNames.length > 0 && !filtersReady);

  const renderLoadButton = () => (
    <li>
      {config.refreshIcon ? (
        <button
          type="button"
          className="btn btn-icon btn-trigger admin-filter-premium-btn"
          onClick={loadData}
          disabled={loadDisabled}
          title={loadDisabled && !loading ? "Pilih filter dulu" : "Load"}
          aria-label="Load"
        >
          <Icon
            pack={config.refreshIcon.pack || "premium"}
            name={config.refreshIcon.name}
            size={config.refreshIcon.size || 32}
          />
        </button>
      ) : (
        <Button
          color="light"
          size="sm"
          className="btn-icon"
          onClick={loadData}
          disabled={loadDisabled}
          title={loadDisabled && !loading ? "Pilih filter dulu" : "Load"}
        >
          <Icon name="reload" />
        </Button>
      )}
    </li>
  );

  const exportCfg = config.exportExcel || null;

  const pickExportCell = (row, key) => {
    if (!row || key == null) return "";
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
    const found = Object.keys(row).find((k) => k.toLowerCase() === String(key).toLowerCase());
    return found != null ? row[found] ?? "" : "";
  };

  const buildExportColumns = (sampleRow) => {
    if (Array.isArray(exportCfg?.columns) && exportCfg.columns.length) return exportCfg.columns;
    const cols = Array.isArray(config.projectListColumns) ? config.projectListColumns : config.columns || [];
    const out = [];
    cols.forEach((c) => {
      if (!c) return;
      if (c.type === "title") {
        if (c.subtitleKey) out.push({ key: c.subtitleKey, label: "Id Member", width: 16 });
        if (c.titleKey || c.key) out.push({ key: c.titleKey || c.key, label: c.label || "Nama", width: 24 });
        return;
      }
      if (c.key) out.push({ key: c.key, label: c.label || c.key, width: 16, align: c.align });
    });
    if (out.length) return out;
    if (sampleRow) {
      return Object.keys(sampleRow).map((key) => ({ key, label: key, width: 16 }));
    }
    return [];
  };

  const handleExportExcel = useCallback(async () => {
    if (!exportCfg) return;
    if (requiredFilterNames.length && !filtersReady) {
      notifyResponse({ responseMessage: "Pilih filter dulu sebelum export" });
      return;
    }
    setExporting(true);
    try {
      let data = rows;
      // ASP re-runs SP with current filters — fetch fresh so export matches filter bar
      if (config.customLoad) {
        data = await config.customLoad(listParams);
      } else if (config.service?.list) {
        const res = await config.service.list(listParams);
        if (res?.responseCode != null && !isSuccess(res)) {
          notifyResponse(res);
          return;
        }
        data = extractRows(res);
      }
      const list = Array.isArray(data) ? data : [];
      if (!list.length) {
        toast.error("Tidak ada data untuk di-export");
        return;
      }
      const columns = buildExportColumns(list[0]);
      if (!columns.length) {
        toast.error("Kolom export tidak dikonfigurasi");
        return;
      }
      const fileName =
        typeof exportCfg.fileName === "function"
          ? exportCfg.fileName(listParams, extraFilters)
          : exportCfg.fileName || "export.xlsx";
      const ok = await exportStyledXlsx({
        fileName,
        sheetName: exportCfg.sheetName || "Member",
        columns,
        rows: list.map((row) => {
          const mapped = {};
          columns.forEach((col) => {
            mapped[col.key] = pickExportCell(row, col.key);
          });
          return mapped;
        }),
      });
      if (ok) toast.success(`File ${fileName} terunduh`);
    } catch (err) {
      toast.error(err?.responseMessage || err?.message || "Gagal export");
    } finally {
      setExporting(false);
    }
  }, [
    exportCfg,
    requiredFilterNames.length,
    filtersReady,
    rows,
    config,
    listParams,
    extraFilters,
  ]);

  const renderExportButton = () => {
    if (!exportCfg) return null;
    const disabled = exporting || loading || (requiredFilterNames.length > 0 && !filtersReady);
    return (
      <li>
        <Button
          color="success"
          size="sm"
          className="btn-icon"
          onClick={handleExportExcel}
          disabled={disabled}
          title={disabled && !exporting && !loading ? "Pilih filter dulu" : "Export Excel"}
          aria-label="Export Excel"
        >
          <Icon name={exporting ? "loader" : "download"} />
        </Button>
      </li>
    );
  };

  const content = (
    <>
      <Head title={config.title} />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">{config.title}</BlockTitle>
              <BlockDes className="text-soft">
                {requiredFilterNames.length && !filtersReady
                  ? config.description ||
                    `Isi filter lengkap lalu klik Cari untuk memuat data`
                  : !visibleRows.length
                    ? config.description || `Isi filter lalu klik Cari untuk memuat data`
                    : `You have total ${visibleRows.length} ${config.title.toLowerCase()}`}
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                  onClick={() => setSm(!sm)}
                >
                  <Icon name="menu-alt-r" />
                </Button>
                <div className="toggle-expand-content">
                  <ul className="nk-block-tools g-3 align-items-center">
                    {!config.hideSearch && (
                      <li>
                        <div className="form-control-wrap w-200px">
                          <div className="form-icon form-icon-left">
                            <Icon name="search" />
                          </div>
                          <Input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder={config.searchPlaceholder || "Keywords"}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                      </li>
                    )}
                    {!putFiltersBelow && renderFilterItems()}
                    {statusOptions ? (
                      <li>
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="dropdown-toggle btn btn-white btn-dim btn-outline-light">
                            <Icon name="filter-alt" className="d-none d-sm-inline" />
                            <span>{statusLabel}</span>
                            <Icon name="chevron-right" className="dd-indc" />
                          </DropdownToggle>
                          <DropdownMenu end>
                            <ul className="link-list-opt no-bdr">
                              {statusOptions.map((opt) => (
                                <li key={opt.value || "all"}>
                                  <DropdownItem
                                    tag="a"
                                    href={`#status-${opt.value || "all"}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setStatusPick(opt.value);
                                      setCurrentPage(1);
                                    }}
                                  >
                                    <span>{opt.label}</span>
                                  </DropdownItem>
                                </li>
                              ))}
                            </ul>
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </li>
                    ) : !config.hideStatusFilter && (
                      <li>
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="dropdown-toggle btn btn-white btn-dim btn-outline-light">
                            <Icon name="filter-alt" className="d-none d-sm-inline" />
                            <span>{statusLabel}</span>
                            <Icon name="chevron-right" className="dd-indc" />
                          </DropdownToggle>
                          <DropdownMenu end>
                            <ul className="link-list-opt no-bdr">
                              <li>
                                <DropdownItem tag="a" href="#all" onClick={(e) => { e.preventDefault(); setIsActive(""); }}>
                                  <span>All Status</span>
                                </DropdownItem>
                              </li>
                              <li>
                                <DropdownItem tag="a" href="#active" onClick={(e) => { e.preventDefault(); setIsActive("true"); }}>
                                  <span>Active</span>
                                </DropdownItem>
                              </li>
                              <li>
                                <DropdownItem tag="a" href="#inactive" onClick={(e) => { e.preventDefault(); setIsActive("false"); }}>
                                  <span>Inactive</span>
                                </DropdownItem>
                              </li>
                            </ul>
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </li>
                    )}
                    {!putFiltersBelow && renderLoadButton()}
                    {!putFiltersBelow && renderExportButton()}
                    {canCreate && hasAddMenu ? (
                      <li className="nk-block-tools-opt">
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="dropdown-toggle btn btn-primary">
                            <Icon name="plus" />
                            <span>{config.addButtonLabel || "Tambah"}</span>
                            <Icon name="chevron-down" className="dd-indc" />
                          </DropdownToggle>
                          <DropdownMenu end>
                            <ul className="link-list-opt no-bdr">
                              {config.addMenu.map((item) => (
                                <li key={item.key || item.label}>
                                  <DropdownItem
                                    tag="a"
                                    href="#add"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (item.onClick) item.onClick();
                                      else if (item.to) navigate(appPath(item.to));
                                    }}
                                  >
                                    <span>{item.label}</span>
                                  </DropdownItem>
                                </li>
                              ))}
                            </ul>
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </li>
                    ) : (
                      canCreate && (
                        <li className="nk-block-tools-opt">
                          <Button color="primary" onClick={openAdd}>
                            <Icon name="plus" />
                            <span>{config.addButtonLabel || `Add ${config.title}`}</span>
                          </Button>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {putFiltersBelow && (
          <Block className="mb-2">
            <ul className="nk-block-tools g-3 align-items-center flex-wrap">
              {renderFilterItems()}
              {renderLoadButton()}
              {renderExportButton()}
            </ul>
          </Block>
        )}

        {typeof config.renderAboveList === "function" ? (
          <Block className="mb-3">{config.renderAboveList({ perms, loadData })}</Block>
        ) : config.renderAboveList ? (
          <Block className="mb-3">{config.renderAboveList}</Block>
        ) : null}

        <Block>
          {error && !loading ? (
            <ErrorState message={error} onRetry={loadData} />
          ) : (
            <ProjectListTable
              columns={config.projectListColumns || config.columns || []}
              rows={visibleRows}
              idField={config.idField}
              rowKey={config.rowKey || ((row, idx) => row[config.idField] || idx)}
              onEdit={openEdit}
              editLabel={config.editLabel || "Edit"}
              onDelete={(row) => setConfirm({ open: true, row })}
              canEdit={canEdit}
              canDelete={canDelete}
              extraActions={extraActions}
              onRowClick={canOpenDetail ? goDetail : undefined}
              currentPage={currentPage}
              itemPerPage={itemPerPage}
              onPageChange={setCurrentPage}
              defaultSort={config.defaultSort || null}
              stickyHeader={Boolean(config.stickyHeader)}
              stickyMaxHeight={config.stickyMaxHeight || null}
              loading={loading}
              footerSumKeys={config.footerSumKeys || []}
            />
          )}
        </Block>

        {!config.readOnly && (
          <>
            <FormModal
              isOpen={modal.open}
              variant={config.modalVariant || "default"}
              size={config.modalSize || "lg"}
              lookupOptionsFn={resolveLookupOptions}
              sectionColumns={scSectionColumns}
              className={scModalClassName}
              resolveSectionTitle={config.resolveSectionTitle}
              title={
                modal.mode === "add"
                  ? config.modalAddTitle ||
                    (config.addButtonLabel ? config.addButtonLabel : `Tambah ${config.title}`)
                  : config.modalEditTitle || `Ubah ${config.title}`
              }
              subtitle={config.modalSubtitle || `Lengkapi data ${config.title}`}
              fields={modalFields}
              formData={formData}
              onChange={(name, value) => setFormData((prev) => ({ ...prev, [name]: value }))}
              onSubmit={handleSave}
              onClose={() => setModal((prev) => ({ ...prev, open: false }))}
              loading={saving}
              submitLabel={
                modal.mode === "add"
                  ? config.modalSubmitLabel || "Simpan"
                  : config.modalUpdateLabel || "Update"
              }
            />

            <ConfirmDialog
              isOpen={confirm.open}
              variant={config.modalVariant || "default"}
              title={config.modalVariant === "sc" ? `Hapus ${config.title}` : `Delete ${config.title}`}
              message={deleteMessage}
              confirmLabel={config.modalVariant === "sc" ? "Hapus" : "Delete"}
              onConfirm={handleDelete}
              onCancel={() => setConfirm({ open: false, row: null })}
              loading={saving}
            />

            {config.resetPassword && (
              <ResetPasswordModal
                isOpen={resetModal.open}
                title={config.resetPassword.modalTitle || config.resetPassword.label || "Change Password"}
                employee={resetModal.row}
                onClose={() => setResetModal({ open: false, row: null })}
                onSubmit={handleChangePassword}
                loading={saving}
              />
            )}
          </>
        )}
      </Content>
    </>
  );

  if (!config.moduleCode) return content;

  return (
    <AccessGuard moduleCode={config.moduleCode} permission="VIEW">
      {content}
    </AccessGuard>
  );
};

export default AdminProjectListPage;
