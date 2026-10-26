import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, Form, Col, Row, Spinner } from "reactstrap";
import { Icon, RSelect } from "../../Component";
import ModalActions from "./ModalActions";
import {
  applyFieldMask,
  validateFormFields,
} from "../../../lib/formFieldUtils";
import { hrdLookupOptions } from "../../../services/hrd/hrd.service";
import AppDatePicker from "../../AppDatePicker";
import AppDateRangePicker, { parseAppDate, formatAppDateYmd } from "../../AppDateRangePicker";

const renderFieldInput = (field, value, disabled, onFieldChange, dynamicOptions, formData) => {
  const commonClass = `form-control${disabled ? " bg-lighter" : ""}`;
  const placeholder = field.placeholder || field.label;
  const options = dynamicOptions || field.options || [];

  if (field.type === "daterange") {
    const fromKey = field.fromKey || "from_date";
    const toKey = field.toKey || "to_date";
    return (
      <div className="form-control-wrap">
        <AppDateRangePicker
          startDate={formData?.[fromKey]}
          endDate={formData?.[toKey]}
          placeholder={placeholder || "Select date range"}
          className={`${commonClass} date-picker`}
          disabled={disabled}
          onChange={(fromYmd, toYmd) => {
            onFieldChange({ name: fromKey }, fromYmd || "");
            onFieldChange({ name: toKey }, toYmd || "");
          }}
        />
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className="form-control-wrap">
        <AppDatePicker
          selected={parseAppDate(value)}
          onChange={(d) => onFieldChange(field, formatAppDateYmd(d))}
          dateFormat="dd/MM/yyyy"
          placeholderText={placeholder}
          className={`${commonClass} date-picker`}
          disabled={disabled}
          isClearable={!disabled}
          portalId="hrd-datepicker-portal"
        />
      </div>
    );
  }

  if (field.type === "select") {
    const selected =
      options.find((o) => String(o.value) === String(value ?? "")) || null;
    return (
      <div className="form-control-wrap">
        <RSelect
          inputId={field.name}
          isClearable={!field.required}
          isSearchable
          isDisabled={disabled || field.loading}
          placeholder={field.placeholder || `— ${field.label} —`}
          options={options}
          value={selected}
          onChange={(opt) => onFieldChange(field, opt?.value != null ? String(opt.value) : "")}
        />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="custom-control custom-checkbox">
        <input
          type="checkbox"
          className="custom-control-input"
          id={field.name}
          checked={!!value}
          disabled={disabled}
          onChange={(e) => onFieldChange(field, e.target.checked)}
        />
        <label className="custom-control-label" htmlFor={field.name}>
          {field.checkboxLabel || field.label}
        </label>
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="hrd-radio-group">
        {(field.options || []).map((opt) => (
          <label key={String(opt.value)} className="hrd-radio-item">
            <input
              type="radio"
              name={field.name}
              value={opt.value}
              checked={String(value ?? "") === String(opt.value)}
              disabled={disabled}
              onChange={() => onFieldChange(field, opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "hidden" || field.hidden) {
    return <input type="hidden" id={field.name} value={value ?? ""} readOnly />;
  }

  if (field.type === "label" || field.type === "display") {
    return <div className="hrd-display-value">{value || "—"}</div>;
  }

  if (field.type === "textarea") {
    return (
      <div className="form-control-wrap">
        <textarea
          id={field.name}
          className={`${commonClass} no-resize`}
          rows={field.rows || 3}
          value={value ?? ""}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onFieldChange(field, e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="form-control-wrap">
      <input
        id={field.name}
        type={field.inputType || field.type || "text"}
        className={commonClass}
        value={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onFieldChange(field, e.target.value)}
      />
    </div>
  );
};

const FormModal = ({
  isOpen,
  title,
  subtitle,
  fields,
  formData,
  onChange,
  onSubmit,
  onClose,
  loading,
  submitLabel,
  size = "lg",
}) => {
  const [errors, setErrors] = useState({});
  const [lookupMap, setLookupMap] = useState({});
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const lookupFields = useMemo(
    () => (fields || []).filter((f) => f.lookupKey || f.lookup),
    [fields]
  );

  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      if (!lookupFields.length) return;
      setLookupsLoading(true);
      const next = {};
      await Promise.all(
        lookupFields.map(async (f) => {
          const type = f.lookupKey || f.lookup;
          const parentField = f.lookupParentField;
          const parentId = parentField ? formData?.[parentField] || "" : f.lookupParentId || "";
          // dependent dropdowns wait for parent
          if (parentField && !parentId) {
            next[f.name] = [];
            return;
          }
          next[f.name] = await hrdLookupOptions(type, { parentId });
        })
      );
      if (!cancelled) {
        setLookupMap(next);
        setLookupsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // reload when parent values change for dependent lookups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    lookupFields,
    ...lookupFields
      .filter((f) => f.lookupParentField)
      .map((f) => formData?.[f.lookupParentField]),
  ]);

  const handleFieldChange = (field, rawValue) => {
    const nextValue = field.mask ? applyFieldMask(field.mask, rawValue) : rawValue;
    onChange(field.name, nextValue);
    // clear dependent child when parent changes
    (fields || []).forEach((child) => {
      if (child.lookupParentField === field.name) {
        onChange(child.name, "");
      }
    });
    if (errors[field.name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field.name];
        return next;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateFormFields(fields, formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSubmit();
    }
  };

  /** Collapse from_date+to_date into one range control (marketing.aspx style). */
  const collapseDateRanges = (list) => {
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
    list.forEach((f) => {
      if (used.has(f.name)) return;
      const toKey = pairTo(f.name);
      const toDef =
        toKey && f.type === "date"
          ? list.find((x) => x.name === toKey && x.type === "date")
          : null;
      if (toDef) {
        used.add(f.name);
        used.add(toDef.name);
        out.push({
          name: `__range_${f.name}_${toDef.name}`,
          type: "daterange",
          label: "Date Range",
          fromKey: f.name,
          toKey: toDef.name,
          required: !!(f.required || toDef.required),
          col: f.col || 6,
          section: f.section,
        });
        return;
      }
      used.add(f.name);
      out.push(f);
    });
    return out;
  };

  const sections = useMemo(() => {
    const list = fields || [];
    const hasSection = list.some((f) => f.section);
    if (!hasSection) return [{ title: null, fields: collapseDateRanges(list) }];
    const map = [];
    list.forEach((f) => {
      const title = f.section || "Umum";
      let bucket = map.find((s) => s.title === title);
      if (!bucket) {
        bucket = { title, fields: [] };
        map.push(bucket);
      }
      bucket.fields.push(f);
    });
    return map.map((s) => ({ ...s, fields: collapseDateRanges(s.fields) }));
  }, [fields]);

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      className="modal-dialog-centered admin-form-modal hrd-form-modal"
      size={size}
    >
      <ModalBody className="p-0">
        <div className="hrd-modal-header">
          <div>
            <h5 className="hrd-modal-title">{title}</h5>
            {subtitle ? <p className="hrd-modal-subtitle">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="hrd-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="cross" />
          </button>
        </div>

        <Form className="hrd-modal-body form-validate is-alter" onSubmit={handleSubmit} noValidate>
          {lookupsLoading && (
            <div className="hrd-modal-loading">
              <Spinner size="sm" /> <span>Memuat pilihan dropdown…</span>
            </div>
          )}

          {sections.map((section) => (
            <div key={section.title || "main"} className="hrd-modal-section">
              {section.title ? <div className="hrd-modal-section-title">{section.title}</div> : null}
              <Row className="g-3">
                {section.fields.map((field) => {
                  if (field.type === "hidden" || field.hidden) {
                    return (
                      <React.Fragment key={field.name}>
                        {renderFieldInput(
                          field,
                          formData[field.name],
                          false,
                          handleFieldChange,
                          null,
                          formData
                        )}
                      </React.Fragment>
                    );
                  }
                  const disabled = !!field.disabled;
                  const colSize =
                    field.col ||
                    (field.type === "checkbox" || field.type === "radio"
                      ? 12
                      : field.type === "daterange"
                        ? 6
                        : 6);
                  const dynOpts =
                    field.options && field.options.length
                      ? field.options
                      : lookupMap[field.name];
                  const rangeErr =
                    field.type === "daterange"
                      ? errors[field.fromKey] || errors[field.toKey]
                      : null;
                  const fieldErr = errors[field.name] || rangeErr;

                  return (
                    <Col md={colSize} key={field.name}>
                      <div className={`form-group${fieldErr ? " error" : ""}`}>
                        {field.type !== "checkbox" && (
                          <label className="form-label" htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-danger ms-1">*</span>}
                          </label>
                        )}
                        {renderFieldInput(
                          field,
                          formData[field.name],
                          disabled,
                          handleFieldChange,
                          dynOpts,
                          formData
                        )}
                        {field.help && !fieldErr && (
                          <span className="form-note">{field.help}</span>
                        )}
                        {fieldErr && <span className="invalid">{fieldErr}</span>}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ))}

          <div className="hrd-modal-footer">
            <ModalActions
              submitLabel={submitLabel || "Simpan"}
              loading={loading}
              onCancel={onClose}
            />
          </div>
        </Form>
      </ModalBody>
    </Modal>
  );
};

export default FormModal;
