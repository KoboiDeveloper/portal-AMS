import React, { useEffect, useMemo, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon, RSelect } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { hrdLookupOptions, hrdProcess } from "../../../services/hrd/hrd.service";
import { notifyResponse, isSuccess } from "../../../lib/response";
import { toast } from "react-toastify";
import { ScBtn, ScError, ScNotice, ScPageHeader } from "../dgs/sc";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";

const defaultFields = [
  { name: "period", label: "Period (YYYY-MM)", type: "text", required: true },
  { name: "store_id", label: "Store ID (opsional)", type: "text" },
];

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 36,
    height: 36,
    fontSize: "0.8125rem",
    borderColor: "var(--sc-border, #e3e5e7)",
    borderRadius: 6,
    background: "#fff",
    boxShadow: "none",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 10px",
    margin: 0,
    height: "100%",
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
  }),
  singleValue: (base) => ({
    ...base,
    position: "static",
    transform: "none",
    maxWidth: "100%",
    margin: 0,
    lineHeight: "20px",
  }),
  placeholder: (base) => ({
    ...base,
    position: "static",
    transform: "none",
    margin: 0,
    lineHeight: "20px",
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  // Softnio .form-control-select::after already draws the chevron — hide RS indicators.
  indicatorsContainer: () => ({ display: "none" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: () => ({ display: "none" }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: "0.8125rem" }),
};

const currentYear = () => String(new Date().getFullYear());
const currentMonth = () => String(new Date().getMonth() + 1);

const HrdProcessPage = ({
  title,
  moduleCode,
  processPath,
  description,
  fields,
  dualActions = false,
  actionLabel,
}) => {
  const formFields = useMemo(() => (Array.isArray(fields) ? fields : defaultFields), [fields]);
  const [form, setForm] = useState(() =>
    formFields.reduce((acc, f) => {
      if (f.name === "tahun" || f.name === "year") acc[f.name] = currentYear();
      else if (f.name === "month") acc[f.name] = currentMonth();
      else acc[f.name] = f.defaultValue != null ? String(f.defaultValue) : "";
      return acc;
    }, {})
  );
  const [lookupMap, setLookupMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const keys = [...new Set(formFields.map((f) => f.lookupKey).filter(Boolean))];
    if (!keys.length) return undefined;
    (async () => {
      const next = {};
      await Promise.all(
        keys.map(async (key) => {
          next[key] = await hrdLookupOptions(key);
        })
      );
      if (!cancelled) setLookupMap(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [formFields]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const run = async (extra = {}) => {
    for (const f of formFields) {
      if (f.required && !String(form[f.name] ?? "").trim()) {
        setError(`${f.label || f.name} wajib diisi`);
        return;
      }
    }
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const payload = { ...form, ...extra };
      const res = await hrdProcess(processPath, payload);
      notifyResponse(res);
      if (isSuccess(res)) {
        const ok = res?.responseMessage || "SUKSES";
        toast.success(ok);
        setMessage(ok);
      } else {
        setError(res?.responseMessage || "Process failed");
      }
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Process failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await run(dualActions ? { mode: "payroll" } : {});
  };

  const primaryLabel =
    actionLabel ||
    (formFields.length === 0 ? "Process" : "TARIK ABSEN");

  const fieldOptions = (field) => {
    if (Array.isArray(field.options) && field.options.length) {
      return field.options.map((o) => ({ value: String(o.value), label: o.label }));
    }
    if (field.lookupKey && Array.isArray(lookupMap[field.lookupKey])) {
      return lookupMap[field.lookupKey];
    }
    return [];
  };

  const renderField = (field) => {
    if (field.type === "select") {
      const opts = fieldOptions(field);
      const val = opts.find((o) => o.value === String(form[field.name] || "")) || null;
      return (
        <RSelect
          className="ams-rselect hrd-process-select"
          classNamePrefix="hrd-ps"
          styles={selectStyles}
          options={opts}
          value={val}
          placeholder={`Pilih ${field.label}`}
          isClearable={false}
          onChange={(opt) => setField(field.name, opt?.value != null ? String(opt.value) : "")}
        />
      );
    }
    return (
      <input
        id={field.name}
        className="form-control"
        type={field.type || "text"}
        value={form[field.name] || ""}
        onChange={(e) => setField(field.name, e.target.value)}
        placeholder={field.label}
        required={!!field.required}
      />
    );
  };

  return (
    <AccessGuard moduleCode={moduleCode} permission="VIEW">
      <Head title={title} />
      <Content>
        <PageSmoothScroll revision={processPath} className="riv-page-scroll">
          <div className="hrd-sc hrd-process dgs-dash sc-scope">
            <ScPageHeader title={title} description={description || "Jalankan proses HRD."} />

            <form className="dgs-filters hrd-process__filters" onSubmit={onSubmit}>
              {formFields.map((field) => (
                <div
                  className="reg-ar-f-item"
                  key={field.name}
                  style={{ minWidth: field.lookupKey || field.type === "select" ? 200 : 120 }}
                >
                  <label htmlFor={field.name}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>
                  {renderField(field)}
                </div>
              ))}

              {dualActions ? (
                <div className="hrd-toolbar-actions">
                  <ScBtn
                    type="button"
                    disabled={loading}
                    onClick={() => run({ mode: "payroll" })}
                  >
                    <Icon name="play" /> Generate Payroll
                  </ScBtn>
                  <ScBtn
                    type="button"
                    variant="soft"
                    disabled={loading}
                    onClick={() => run({ mode: "prorate" })}
                  >
                    <Icon name="play" /> Generate Payroll Prorate
                  </ScBtn>
                </div>
              ) : (
                <ScBtn type="submit" disabled={loading}>
                  <Icon name={loading ? "loader" : "download"} />
                  {loading ? "Loading..." : primaryLabel}
                </ScBtn>
              )}
            </form>

            {error ? <ScError message={error} onRetry={() => run()} /> : null}
            {message && !error ? <ScNotice>{message}</ScNotice> : null}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdProcessPage;
