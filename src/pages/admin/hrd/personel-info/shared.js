import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Col, FormGroup, Input, Label, Row, Spinner } from "reactstrap";
import { Icon } from "../../../../components/Component";
import FormModal from "../../../../components/admin/common/FormModal";
import ConfirmDialog from "../../../../components/admin/common/ConfirmDialog";
import AppDatePicker from "../../../../components/AppDatePicker";
import { parseAppDate, formatAppDateYmd } from "../../../../components/AppDateRangePicker";
import { buildImageProfileUrl } from "../../../../lib/imageProfile";
import { extractRow, extractRows, notifyResponse } from "../../../../lib/response";
import { normalizeFormPayload } from "../../../../lib/formFieldUtils";
import { hrdLookupOptions } from "../../../../services/hrd/hrd.service";
import { useActionPermissions } from "../../../../hooks/useActionPermissions";
import { ScBtn, ScEmptyState, ScError, ScSkeletonBlock } from "../../dgs/sc";

export const PERSONEL_MODULE = "HRD_ABS_PERSONEL";

const NO_LOCK = [];
const LOCK_NIK = ["nik"];

export const YES_NO_OPTIONS = [
  { value: "1", label: "Ya" },
  { value: "0", label: "Tidak" },
];

export const resolvePhotoUrl = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const file = value
    .replace(/^~\//, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^\/?ImageProfile\//i, "");
  return buildImageProfileUrl(file);
};

export const isImageFile = (raw) => /\.(png|jpe?g|gif|webp|bmp)(\?.*)?$/i.test(String(raw || ""));

export const fmtDate = (raw) => {
  const d = parseAppDate(raw);
  if (!d) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

export const lookupLabel = (options, value) => {
  if (value == null || value === "") return "";
  const hit = (options || []).find((o) => String(o.value) === String(value));
  return hit ? hit.label : "";
};

const toFormValue = (value, type) => {
  if (value == null) return "";
  if (type === "yesno") {
    if (value === true) return "1";
    if (value === false) return "0";
  }
  return String(value);
};

const emptyToNull = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === "" ? null : v]));

const emptyFormFor = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.type === "checkbox" ? false : field.defaultValue ?? "";
    return acc;
  }, {});

/** Form field definition: fld(name, label, md, type, extra) — type text|number|date|select|yesno|textarea */
export const fld = (name, label, md = 6, type = "text", extra = {}) => ({
  name,
  label,
  md,
  type,
  ...extra,
});

/** Modal field definition for PersonelSubTable: mf(name, label, col, type, extra) */
export const mf = (name, label, col = 6, type = "text", extra = {}) => ({
  name,
  label,
  col,
  type,
  ...extra,
});

export const useLookups = (types) => {
  const key = [...new Set((types || []).filter(Boolean))].join("|");
  const [lookups, setLookups] = useState({});

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    Promise.all(
      key.split("|").map(async (type) => [type, await hrdLookupOptions(type)])
    ).then((pairs) => {
      if (!cancelled) setLookups(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return lookups;
};

export const Field = ({ label, children, md = 6 }) => (
  <Col
    xs="12"
    md={md}
    className={md <= 3 ? "hrd-field--sm" : md <= 6 ? "hrd-field--md" : "hrd-field--lg"}
  >
    <FormGroup className="mb-3">
      <Label className="hrd-form-label">{label}</Label>
      {children}
    </FormGroup>
  </Col>
);

export const SelectLookup = ({ value, onChange, options, disabled }) => {
  if (Array.isArray(options) && options.length === 0) {
    return (
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Kode / ID"
      />
    );
  }
  return (
    <Input
      type="select"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">— Pilih —</option>
      {(options || []).map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </Input>
  );
};

export const DateField = ({ value, onChange, disabled }) => (
  <AppDatePicker
    selected={parseAppDate(value)}
    onChange={(d) => onChange(formatAppDateYmd(d))}
    dateFormat="dd/MM/yyyy"
    className="form-control date-picker"
    disabled={disabled}
    isClearable={!disabled}
    placeholderText="dd/mm/yyyy"
    portalId="hrd-datepicker-portal"
  />
);

/** field: { name, label, md, type: text|number|date|select|yesno|textarea, lookup, options, rows } */
export const FieldControl = ({ field, value, onChange, lookups, disabled }) => {
  const type = field.type || "text";
  if (type === "date") return <DateField value={value} onChange={onChange} disabled={disabled} />;
  if (type === "yesno" || type === "select") {
    const options = type === "yesno" ? YES_NO_OPTIONS : field.options || lookups?.[field.lookup];
    return <SelectLookup value={value} onChange={onChange} options={options} disabled={disabled} />;
  }
  if (type === "textarea") {
    return (
      <Input
        type="textarea"
        rows={field.rows || 3}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }
  return (
    <Input
      type={type === "number" ? "number" : "text"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
};

export const TabSkeleton = ({ rows = 4 }) => (
  <div className="hrd-tab-skel" aria-busy="true" aria-label="Memuat data">
    <Row className="g-2">
      {Array.from({ length: rows * 3 }).map((_, i) => (
        <Col key={i} xs="12" md="4">
          <ScSkeletonBlock className="hrd-tab-skel__label" />
          <ScSkeletonBlock className="hrd-tab-skel__input" />
        </Col>
      ))}
    </Row>
  </div>
);

export const TableSkeleton = ({ rows = 3 }) => (
  <div className="hrd-tab-skel hrd-tab-skel--table" aria-busy="true" aria-label="Memuat data">
    {Array.from({ length: rows }).map((_, i) => (
      <ScSkeletonBlock key={i} className="hrd-tab-skel__row" />
    ))}
  </div>
);

export const TabEmpty = ({ title, hint, action, icon = "file-docs" }) => (
  <ScEmptyState icon={icon} title={title} hint={hint} action={action} />
);

export const SectionTitle = ({ children, actions }) => (
  <div className="hrd-section-head">
    <h6 className="hrd-section-title">{children}</h6>
    {actions ? <div className="hrd-section-actions">{actions}</div> : null}
  </div>
);

/** Singleton form tab (get/update by pegawai_id) rendered from sections config. */
export const PersonelScForm = ({
  pegawaiId,
  service,
  sections,
  moduleCode = PERSONEL_MODULE,
  savedMessage = "Data tersimpan",
  title,
  onSaved,
}) => {
  const perms = useActionPermissions(moduleCode);
  const canEdit = !perms.loading && perms.UPDATE;
  const fields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const lookups = useLookups(fields.map((f) => f.lookup));
  const [form, setForm] = useState(() => emptyFormFor(fields));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await service.get(pegawaiId);
      const row = extractRow(res) || {};
      const next = emptyFormFor(fields);
      fields.forEach((f) => {
        next[f.name] = toFormValue(row[f.name], f.type);
      });
      setForm(next);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [service, pegawaiId, fields]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await service.update(pegawaiId, emptyToNull(normalizeFormPayload(fields, form)));
      if (notifyResponse(res, savedMessage)) onSaved?.();
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TabSkeleton />;
  if (error) return <ScError message={error} onRetry={load} />;

  return (
    <div className="hrd-sc-form">
      {title ? <SectionTitle>{title}</SectionTitle> : null}
      {sections.map((section) => (
        <div key={section.title || section.fields[0].name} className="hrd-form-section">
          {section.title ? (
            <p className="hrd-form-section__title">{section.title}</p>
          ) : null}
          <Row className="g-2">
            {section.fields.map((f) => (
              <Field key={f.name} label={f.label} md={f.md ?? 6}>
                <FieldControl
                  field={f}
                  value={form[f.name]}
                  onChange={(v) => setForm((prev) => ({ ...prev, [f.name]: v }))}
                  lookups={lookups}
                  disabled={!canEdit || f.disabled}
                />
              </Field>
            ))}
          </Row>
        </div>
      ))}
      {canEdit ? (
        <div className="hrd-form-actions">
          <ScBtn disabled={saving} onClick={save}>
            {saving ? <Spinner size="sm" /> : <Icon name="save" />}
            <span>Simpan</span>
          </ScBtn>
        </div>
      ) : null}
    </div>
  );
};

/** Grid + FormModal sc (list by pegawai_id, create/update/remove). */
export const PersonelSubTable = ({
  title,
  service,
  pegawaiId,
  columns,
  fields,
  moduleCode = PERSONEL_MODULE,
  modalSize = "lg",
  prefill,
  lockFields = NO_LOCK,
  extraPayload,
  emptyHint,
  onRows,
  idField = "id",
}) => {
  const perms = useActionPermissions(moduleCode);
  const canCreate = !perms.loading && perms.CREATE;
  const canEdit = !perms.loading && perms.UPDATE;
  const canDelete = !perms.loading && perms.DELETE;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState({ open: false, mode: "add", row: null });
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, row: null });

  const onRowsRef = useRef(onRows);
  onRowsRef.current = onRows;

  const lookups = useLookups(columns.map((c) => c.lookup));
  const baseForm = useMemo(() => emptyFormFor(fields), [fields]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await service.list({ pegawai_id: pegawaiId });
      const next = extractRows(res);
      setRows(next);
      onRowsRef.current?.(next);
    } catch (err) {
      setError(err?.responseMessage || `Gagal memuat ${title.toLowerCase()}`);
      setRows([]);
      onRowsRef.current?.([]);
    } finally {
      setLoading(false);
    }
  }, [service, pegawaiId, title]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setFormData({ ...baseForm, ...(prefill || {}) });
    setModal({ open: true, mode: "add", row: null });
  };

  const openEdit = (row) => {
    const mapped = { ...baseForm, ...(prefill || {}) };
    fields.forEach((f) => {
      if (row[f.name] != null) mapped[f.name] = toFormValue(row[f.name], f.type);
    });
    setFormData(mapped);
    setModal({ open: true, mode: "edit", row });
  };

  const closeModal = () => setModal({ open: false, mode: "add", row: null });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = emptyToNull({
        ...normalizeFormPayload(fields, formData),
        ...(extraPayload || {}),
        pegawai_id: pegawaiId,
      });
      const res =
        modal.mode === "add"
          ? await service.create(payload)
          : await service.update(modal.row[idField], payload);
      if (notifyResponse(res, modal.mode === "add" ? `${title} ditambahkan` : `${title} diperbarui`)) {
        closeModal();
        load();
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
      const res = await service.remove(confirm.row[idField]);
      if (notifyResponse(res, `${title} dihapus`)) {
        setConfirm({ open: false, row: null });
        load();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const cell = (row, c) => {
    if (c.render) return c.render(row);
    const raw = row[c.key];
    if (c.lookup) {
      const apiLabel = c.labelKey ? row[c.labelKey] : "";
      return apiLabel || lookupLabel(lookups[c.lookup], raw) || (raw != null && raw !== "" ? String(raw) : "—");
    }
    if (c.type === "date") return fmtDate(raw);
    if (c.type === "yesno") return lookupLabel(YES_NO_OPTIONS, toFormValue(raw, "yesno")) || "—";
    return raw == null || raw === "" ? "—" : String(raw);
  };

  const modalFields = useMemo(
    () => fields.map((f) => ({ ...f, disabled: f.disabled || lockFields.includes(f.name) })),
    [fields, lockFields]
  );

  const showActions = canEdit || canDelete;

  return (
    <div className="hrd-sub">
      <SectionTitle
        actions={
          canCreate ? (
            <ScBtn variant="soft" onClick={openAdd}>
              <Icon name="plus" /> Tambah
            </ScBtn>
          ) : null
        }
      >
        {title}
        {!loading && !error ? <em className="hrd-section-count">{rows.length}</em> : null}
      </SectionTitle>

      {loading ? <TableSkeleton /> : null}
      {error ? <ScError message={error} onRetry={load} /> : null}

      {!loading && !error && rows.length === 0 ? (
        <TabEmpty
          title={`Belum ada ${title.toLowerCase()}`}
          hint={emptyHint || "Klik Tambah untuk mengisi data."}
          action={canCreate ? <ScBtn onClick={openAdd}>Tambah</ScBtn> : null}
        />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="dgs-table-wrap hrd-sub__wrap">
          <table className="dgs-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                {showActions ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row[idField] ?? idx}
                  className={canEdit ? "dgs-row-click" : undefined}
                  onClick={() => canEdit && openEdit(row)}
                >
                  {columns.map((c) => (
                    <td key={c.key}>
                      <span className="sc-td-main">{cell(row, c)}</span>
                    </td>
                  ))}
                  {showActions ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="hrd-row-actions">
                        {canEdit ? (
                          <button
                            type="button"
                            className="hrd-icon-btn"
                            title="Ubah"
                            onClick={() => openEdit(row)}
                          >
                            <Icon name="edit" />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="hrd-icon-btn is-danger"
                            title="Hapus"
                            onClick={() => setConfirm({ open: true, row })}
                          >
                            <Icon name="trash" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <FormModal
        isOpen={modal.open}
        variant="sc"
        size={modalSize}
        title={modal.mode === "add" ? `Tambah ${title}` : `Ubah ${title}`}
        subtitle={
          [prefill?.nik, prefill?.employee_name].filter(Boolean).join(" · ") ||
          "Lengkapi data pegawai"
        }
        fields={modalFields}
        formData={formData}
        onChange={(name, value) => setFormData((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSave}
        onClose={closeModal}
        loading={saving}
        submitLabel={modal.mode === "add" ? "Simpan" : "Update"}
      />

      <ConfirmDialog
        isOpen={confirm.open}
        title={`Hapus ${title}`}
        message="Data yang dihapus tidak dapat dikembalikan. Lanjutkan?"
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, row: null })}
        loading={saving}
      />
    </div>
  );
};

export const PersonelSnapshot = ({ title = "Posisi saat ini", items, row }) => (
  <div className="hrd-snapshot">
    <p className="hrd-form-section__title">{title}</p>
    {row ? (
      <dl className="hrd-snapshot__grid">
        {items.map(([label, value, type]) => (
          <div key={label} className="hrd-snapshot__item">
            <dt>{label}</dt>
            <dd>{type === "date" ? fmtDate(value) : value || "—"}</dd>
          </div>
        ))}
      </dl>
    ) : (
      <p className="hrd-snapshot__empty">Belum ada riwayat tercatat.</p>
    )}
  </div>
);

const sortKeyValue = (row, keys) => {
  for (const k of keys) {
    const d = parseAppDate(row?.[k]);
    if (d) return d.getTime();
  }
  return 0;
};

/** Current snapshot (latest row) + history grid with sc modal for add/edit. */
export const PersonelHistoryPanel = ({
  config,
  pegawai,
  columns,
  snapshotItems,
  sortKeys,
  snapshotTitle,
  title,
}) => {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const latest = useMemo(() => {
    if (!rows.length) return null;
    return [...rows].sort(
      (a, b) =>
        sortKeyValue(b, sortKeys) - sortKeyValue(a, sortKeys) ||
        Number(b.id || 0) - Number(a.id || 0)
    )[0];
  }, [rows, sortKeys]);

  const prefill = useMemo(
    () => ({ nik: pegawai.nik || "", employee_name: pegawai.employee_name || "" }),
    [pegawai.nik, pegawai.employee_name]
  );

  const handleRows = useCallback((next) => {
    setRows(next);
    setLoaded(true);
  }, []);

  return (
    <>
      {loaded ? (
        <PersonelSnapshot title={snapshotTitle} items={snapshotItems(latest || {})} row={latest} />
      ) : null}
      <PersonelSubTable
        title={title}
        service={config.service}
        pegawaiId={pegawai.id}
        moduleCode={config.moduleCode}
        columns={columns}
        fields={config.fields}
        modalSize={config.modalSize || "xl"}
        prefill={prefill}
        lockFields={LOCK_NIK}
        onRows={handleRows}
      />
    </>
  );
};
