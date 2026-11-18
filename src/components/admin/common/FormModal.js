import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, ModalBody, Form, Col, Row, Spinner } from "reactstrap";
import { NumericFormat } from "react-number-format";
import { Icon, RSelect } from "../../Component";
import ModalActions from "./ModalActions";
import {
  applyFieldMask,
  validateFormFields,
} from "../../../lib/formFieldUtils";
import { hrdLookupOptions } from "../../../services/hrd/hrd.service";
import AppDatePicker from "../../AppDatePicker";
import AppDateRangePicker, { parseAppDate, formatAppDateYmd } from "../../AppDateRangePicker";
import { isDropboxStoragePath } from "../../../lib/imageStorage";
import { isSuccess } from "../../../lib/response";
import { filesService } from "../../../services/files.service";

const FieldImagePreview = ({ src }) => {
  const raw = String(src || "").trim();
  const [display, setDisplay] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    if (!raw) {
      setDisplay("");
      setStatus("empty");
      return undefined;
    }
    if (isDropboxStoragePath(raw)) {
      setStatus("loading");
      const path = raw.startsWith("/") ? raw : `/${raw}`;
      filesService
        .getTemporaryLink(path)
        .then((res) => {
          if (cancelled) return;
          const link = res?.data?.temporaryLink;
          if (isSuccess(res) && link) {
            setDisplay(link);
            setStatus("ready");
          } else {
            setDisplay("");
            setStatus("error");
          }
        })
        .catch(() => {
          if (cancelled) return;
          setDisplay("");
          setStatus("error");
        });
      return () => {
        cancelled = true;
      };
    }
    if (/^https?:\/\//i.test(raw)) {
      setDisplay(encodeURI(raw));
      setStatus("ready");
      return undefined;
    }
    setDisplay("");
    setStatus("empty");
    return undefined;
  }, [raw]);

  if (status === "empty" || status === "idle") return null;
  if (status === "loading") {
    return (
      <div className="hrd-image-preview hrd-image-preview--empty">
        <Spinner size="sm" />
      </div>
    );
  }
  if (status === "error" || !display) {
    return <div className="hrd-image-preview hrd-image-preview--empty">Gambar tidak ditemukan</div>;
  }
  return (
    <div className="hrd-image-preview">
      <img src={display} alt="" onError={() => setStatus("error")} />
    </div>
  );
};

const FieldImageUpload = ({ field, disabled, onChange }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      setError("File harus berupa gambar");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await filesService.upload(file, {
        module: field.upload?.module || "promo",
      });
      const path = res?.data?.path || res?.data?.pathLower;
      if (!isSuccess(res) || !path) {
        setError(res?.responseMessage || "Upload gagal");
        return;
      }
      onChange(path);
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Upload gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hrd-image-upload">
      <input
        ref={inputRef}
        type="file"
        accept={field.upload?.accept || "image/*"}
        hidden
        onChange={onPick}
      />
      <button
        type="button"
        className="sc-btn sc-btn--soft"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Spinner size="sm" /> : <Icon name="upload" />}
        <span>{busy ? "Mengunggah…" : "Ganti gambar"}</span>
      </button>
      {error ? <span className="invalid">{error}</span> : null}
    </div>
  );
};

const isCurrencyField = (field) =>
  field?.format === "currency" ||
  field?.mask === "currency" ||
  field?.type === "currency";

const isPercentField = (field) =>
  field?.format === "percent" ||
  field?.mask === "percent" ||
  field?.type === "percent" ||
  field?.validate === "percent";

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
          className="ams-rselect hrd-modal-select"
          classNamePrefix="hrd-ps"
          inputId={field.name}
          isClearable={!field.required}
          isSearchable
          isDisabled={disabled || field.loading}
          placeholder={field.placeholder || `Pilih ${field.label}`}
          options={options}
          value={selected}
          onChange={(opt) => {
            onFieldChange(field, opt?.value != null ? String(opt.value) : "");
            /* optional: map lookup option extras → form fields (e.g. nik → nama/dept) */
            if (field.lookupFill && opt) {
              Object.entries(field.lookupFill).forEach(([formKey, optKey]) => {
                const v = opt[optKey];
                onFieldChange(
                  { name: formKey },
                  v == null || v === "" ? "" : String(v)
                );
              });
            }
          }}
          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
          menuPosition="fixed"
          styles={{
            control: (base) => ({
              ...base,
              minHeight: 36,
              height: 36,
              fontSize: "0.8125rem",
              borderColor: "var(--sc-border, #e3e5e7)",
              borderRadius: 6,
              boxShadow: "none",
            }),
            valueContainer: (base) => ({
              ...base,
              padding: "0 10px",
              height: "100%",
              display: "flex",
              alignItems: "center",
              flexWrap: "nowrap",
            }),
            singleValue: (base) => ({
              ...base,
              position: "static",
              transform: "none",
              margin: 0,
              lineHeight: "20px",
              maxWidth: "100%",
            }),
            placeholder: (base) => ({
              ...base,
              position: "static",
              transform: "none",
              margin: 0,
              lineHeight: "20px",
            }),
            input: (base) => ({ ...base, margin: 0, padding: 0 }),
            // Softnio .form-control-select::after already draws chevron
            indicatorsContainer: () => ({ display: "none" }),
            menuPortal: (base) => ({ ...base, zIndex: 10050 }),
            menu: (base) => ({
              ...base,
              zIndex: 10050,
              fontSize: "0.8125rem",
              width: "max-content",
              minWidth: "100%",
              maxWidth: "min(92vw, 520px)",
            }),
            menuList: (base) => ({
              ...base,
              overflowX: "hidden",
            }),
            option: (base) => ({
              ...base,
              whiteSpace: "normal",
              wordBreak: "break-word",
            }),
          }}
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

  if (field.type === "html_preview") {
    const raw = String(formData?.[field.source || field.name] || "");
    const decoded = (() => {
      if (!raw) return "";
      if (typeof document === "undefined") return raw;
      const ta = document.createElement("textarea");
      ta.innerHTML = raw;
      return ta.value;
    })();
    return (
      <div className="hrd-html-preview">
        {decoded ? (
          <div
            className="hrd-html-preview__frame"
            dangerouslySetInnerHTML={{ __html: decoded }}
          />
        ) : (
          <div className="hrd-html-preview__empty">Preview map akan muncul di sini</div>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="form-control-wrap">
        {field.helpLink?.href ? (
          <div className="hrd-field-helplink">
            <a href={field.helpLink.href} target="_blank" rel="noreferrer">
              {field.helpLink.label || field.helpLink.href}
            </a>
          </div>
        ) : null}
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

  if (isCurrencyField(field)) {
    const showRp =
      field.showPrefix !== false &&
      field.hideCurrencyPrefix !== true &&
      field.prefix !== "";
    return (
      <div
        className={`form-control-wrap hrd-currency-wrap${
          showRp ? "" : " hrd-currency-wrap--no-prefix"
        }`}
      >
        {showRp ? (
          <span className="hrd-currency-prefix" aria-hidden>
            {field.prefix || "Rp"}
          </span>
        ) : null}
        <NumericFormat
          id={field.name}
          className={`${commonClass} hrd-currency-input`}
          value={value ?? ""}
          thousandSeparator="."
          decimalSeparator=","
          decimalScale={field.decimalScale != null ? field.decimalScale : 0}
          allowNegative={false}
          disabled={disabled}
          placeholder={placeholder || "0"}
          onValueChange={(vals) => onFieldChange(field, vals.value)}
        />
      </div>
    );
  }

  if (isPercentField(field)) {
    const maxPct = field.max != null ? Number(field.max) : 100;
    const scale = field.decimalScale != null ? field.decimalScale : 2;
    return (
      <div className="form-control-wrap hrd-percent-wrap">
        <NumericFormat
          id={field.name}
          className={`${commonClass} hrd-percent-input`}
          value={value ?? ""}
          thousandSeparator=""
          decimalSeparator=","
          decimalScale={scale}
          fixedDecimalScale={false}
          allowNegative={false}
          disabled={disabled}
          placeholder={placeholder || "0"}
          isAllowed={(vals) => {
            const n = vals.floatValue;
            if (n == null) return true;
            return n >= 0 && n <= maxPct;
          }}
          onValueChange={(vals) => onFieldChange(field, vals.value)}
        />
        <span className="hrd-percent-suffix" aria-hidden>
          %
        </span>
      </div>
    );
  }

  const inputType = field.inputType || field.type || "text";
  const isNumber = inputType === "number";
  const isYear = field.mask === "year" || field.validate === "year";
  return (
    <div className={`form-control-wrap${isNumber ? " form-control-wrap--number" : ""}`}>
      <input
        id={field.name}
        type={isNumber ? "number" : "text"}
        className={commonClass}
        value={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={field.inputMode || (isYear ? "numeric" : undefined)}
        maxLength={field.maxLength != null ? field.maxLength : isYear ? 4 : undefined}
        pattern={isYear ? "[0-9]{4}" : undefined}
        autoComplete={isYear ? "off" : undefined}
        min={field.min != null ? field.min : undefined}
        max={field.max != null ? field.max : undefined}
        step={field.step != null ? field.step : isNumber ? 1 : undefined}
        onChange={(e) => onFieldChange(field, e.target.value)}
        onKeyDown={
          isYear
            ? (e) => {
                /* izinkan kontrol + digit saja */
                if (
                  e.ctrlKey ||
                  e.metaKey ||
                  e.altKey ||
                  [
                    "Backspace",
                    "Delete",
                    "Tab",
                    "Escape",
                    "Enter",
                    "ArrowLeft",
                    "ArrowRight",
                    "Home",
                    "End",
                  ].includes(e.key)
                ) {
                  return;
                }
                if (!/^\d$/.test(e.key)) e.preventDefault();
              }
            : undefined
        }
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
  /** "sc" = Seller Center shell (personel / kontrak) */
  variant = "default",
  /** e.g. [["Pegawai","Kontrak"],["Penempatan"]] → 2 kolom */
  sectionColumns,
  className = "",
  /** Override HRD lookups (marcomm / regional pages pass their own). */
  lookupOptionsFn,
  /** Optional: rewrite section title from formData (e.g. STORE RC002). */
  resolveSectionTitle,
}) => {
  const isSc = variant === "sc";
  /* SC = shell kontrak HRD: selalu cols2 (flat + aksen), default 1 section jika tak di-set. */
  const effectiveSectionColumns = useMemo(() => {
    if (Array.isArray(sectionColumns) && sectionColumns.length > 0) return sectionColumns;
    if (isSc) return [["Data"]];
    return null;
  }, [sectionColumns, isSc]);
  const hasCols = Array.isArray(effectiveSectionColumns) && effectiveSectionColumns.length > 0;
  const scSingleCol =
    isSc &&
    hasCols &&
    effectiveSectionColumns.length === 1 &&
    (effectiveSectionColumns[0] || []).length <= 1;
  const [errors, setErrors] = useState({});
  const [lookupMap, setLookupMap] = useState({});
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const normalizedFields = useMemo(() => {
    if (!isSc || !hasCols) return fields || [];
    const defaultSection = effectiveSectionColumns[0]?.[0] || "Data";
    return (fields || []).map((field) =>
      field.section ? field : { ...field, section: defaultSection }
    );
  }, [fields, isSc, hasCols, effectiveSectionColumns]);

  const lookupFields = useMemo(
    () => (normalizedFields || []).filter((f) => f.lookupKey || f.lookup),
    [normalizedFields]
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
          const resolveLookup = lookupOptionsFn || hrdLookupOptions;
          let opts = await resolveLookup(type, { parentId });
          /* pastikan value edit ada di options (mis. NIK di luar TOP lookup) */
          const cur = formData?.[f.name];
          if (cur != null && String(cur) !== "") {
            const has = opts.some((o) => String(o.value) === String(cur));
            if (!has) {
              const labelBits = [
                cur,
                formData?.nama || formData?.employee_name || "",
              ].filter(Boolean);
              opts = [
                {
                  value: String(cur),
                  label: labelBits.join(" — "),
                  nama: formData?.nama || formData?.employee_name || "",
                  department: formData?.department || "",
                  jabatan: formData?.jabatan || "",
                },
                ...opts,
              ];
            }
          }
          next[f.name] = opts;
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
    const nextValue =
      isCurrencyField(field) || isPercentField(field)
        ? rawValue
        : field.mask
          ? applyFieldMask(field.mask, rawValue)
          : rawValue;
    onChange(field.name, nextValue);
    // clear dependent child when parent changes
    (normalizedFields || []).forEach((child) => {
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
    const nextErrors = validateFormFields(normalizedFields, formData);
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
          label: f.rangeLabel || f.label || "Date Range",
          fromKey: f.name,
          toKey: toDef.name,
          required: !!(f.required || toDef.required),
          col: f.rangeCol || f.col || 12,
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
    const list = normalizedFields || [];
    /* Collapse from/to pairs for SC + default (ASP Point Register = Masa Berlaku). */
    const shape = (fs) => collapseDateRanges(fs);
    const hasSection = list.some((f) => f.section);
    if (!hasSection) return [{ title: null, fields: shape(list) }];
    const map = [];
    const orphan = [];
    list.forEach((f) => {
      /* field tanpa section (biasanya hidden id) → jangan buat bucket "Umum" */
      if (!f.section) {
        orphan.push(f);
        return;
      }
      let bucket = map.find((s) => s.title === f.section);
      if (!bucket) {
        bucket = { title: f.section, fields: [] };
        map.push(bucket);
      }
      bucket.fields.push(f);
    });
    if (orphan.length) {
      if (map.length) map[0].fields = [...orphan, ...map[0].fields];
      else map.push({ title: null, fields: orphan });
    }
    return map.map((s) => ({ ...s, fields: shape(s.fields) }));
  }, [normalizedFields, isSc]);

  const titledSectionCount = useMemo(
    () =>
      sections.filter((s) =>
        s.title &&
        (s.fields || []).some((f) => f.type !== "hidden" && !f.hidden)
      ).length,
    [sections]
  );

  const renderSection = (section) => {
    const sectionTitle =
      section.title && typeof resolveSectionTitle === "function"
        ? resolveSectionTitle(section.title, formData) || section.title
        : section.title;
    return (
    <div key={section.title || "main"} className="hrd-modal-section">
      {/* cols2/kontrak: selalu tampilkan judul+aksen. Non-cols: hide jika cuma 1 section. */}
      {sectionTitle && (hasCols || titledSectionCount > 1) ? (
        <div className="hrd-modal-section-title">{sectionTitle}</div>
      ) : null}
      <Row className="g-3">
        {section.fields.map((field) => {
          if (typeof field.visible === "function" && !field.visible(formData)) return null;
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
              : field.type === "html_preview"
                ? 12
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
          const hideLabel = field.hideLabel || field.type === "html_preview";

          return (
            <Col md={colSize} key={field.name}>
              <div className={`form-group${fieldErr ? " error" : ""}`}>
                {!hideLabel && field.type !== "checkbox" && (
                  <label
                    className={isSc ? "hrd-form-label" : "form-label"}
                    htmlFor={field.name}
                  >
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
                {field.preview ? <FieldImagePreview src={formData[field.name]} /> : null}
                {field.upload ? (
                  <FieldImageUpload
                    field={field}
                    disabled={disabled}
                    onChange={(path) => handleFieldChange(field, path)}
                  />
                ) : null}
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
    );
  };

  const sectionBlocks = (() => {
    if (!hasCols) return sections.map(renderSection);
    const used = new Set();
    const cols = effectiveSectionColumns.map((titles, idx) => {
      const items = titles
        .map((t) => {
          const sec = sections.find((s) => s.title === t);
          if (sec) used.add(sec.title);
          return sec;
        })
        .filter(Boolean);
      return (
        <div key={`col-${idx}`} className="hrd-modal-col">
          {items.map(renderSection)}
        </div>
      );
    });
    const leftover = sections.filter(
      (s) =>
        !used.has(s.title) &&
        (s.fields || []).some((f) => f.type !== "hidden" && !f.hidden)
    );
    if (leftover.length) {
      cols.push(
        <div key="col-extra" className="hrd-modal-col hrd-modal-col--full">
          {leftover.map(renderSection)}
        </div>
      );
    }
    return <div className="hrd-modal-cols">{cols}</div>;
  })();

  const cls = className || "";
  const wantWide = cls.includes("hrd-form-modal--wide");
  const dialogClass = [
    "modal-dialog-centered",
    "admin-form-modal",
    "hrd-form-modal",
    isSc ? "hrd-form-modal--sc" : "",
    hasCols ? "hrd-form-modal--cols2" : "",
    isSc ? "hrd-kontrak-form-anim" : "",
    scSingleCol && !wantWide && !cls.includes("cols-compact")
      ? "hrd-form-modal--cols-compact"
      : "",
    cls,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      className={dialogClass}
      contentClassName={isSc ? "dgs-modal-content" : undefined}
      size={size}
    >
      <ModalBody className={`p-0${isSc ? " dgs-modal-body" : ""}`}>
        <div className={isSc ? "hrd-modal-head" : "hrd-modal-header"}>
          <div>
            <h5 className={isSc ? "hrd-modal-head__title" : "hrd-modal-title"}>{title}</h5>
            {subtitle ? (
              <p className={isSc ? "hrd-modal-head__sub" : "hrd-modal-subtitle"}>{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className={isSc ? "hrd-modal-head__close" : "hrd-modal-close"}
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="cross" />
          </button>
        </div>

        <Form
          className={`hrd-modal-body form-validate is-alter${isSc ? " sc-scope" : ""}`}
          onSubmit={handleSubmit}
          noValidate
        >
          {lookupsLoading && (
            <div className="hrd-modal-loading">
              <Spinner size="sm" /> <span>Memuat pilihan dropdown…</span>
            </div>
          )}

          {sectionBlocks}

          {isSc ? (
            <div className="dgs-modal-foot hrd-modal-footer hrd-modal-footer--sc">
              <button
                type="button"
                className="sc-btn sc-btn--soft"
                disabled={loading}
                onClick={onClose}
              >
                Batal
              </button>
              <button type="submit" className="sc-btn" disabled={loading}>
                {loading ? <Spinner size="sm" /> : <Icon name="save" />}
                <span>{submitLabel || "Simpan"}</span>
              </button>
            </div>
          ) : (
            <div className="hrd-modal-footer">
              <ModalActions
                submitLabel={submitLabel || "Simpan"}
                loading={loading}
                onCancel={onClose}
              />
            </div>
          )}
        </Form>
      </ModalBody>
    </Modal>
  );
};

export default FormModal;
