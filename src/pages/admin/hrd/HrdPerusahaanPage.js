import React, { useCallback, useEffect, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon, RSelect } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { extractRow, extractRows, notifyResponse } from "../../../lib/response";
import { normalizeFormPayload } from "../../../lib/formFieldUtils";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import { hrdLookupOptions } from "../../../services/hrd/hrd.service";
import { ScBtn, ScError, ScPageHeader, ScSkeletonBlock } from "../dgs/sc";
import { hrdParPerusahaan } from "./hrdConfigs";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";
import "./hrd-kontrak.css";

const config = hrdParPerusahaan;
const service = config.service;

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
    height: "100%",
    display: "flex",
    alignItems: "center",
  }),
  singleValue: (base) => ({ ...base, position: "static", transform: "none", margin: 0 }),
  placeholder: (base) => ({ ...base, position: "static", transform: "none", margin: 0 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: () => ({ display: "none" }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: "0.8125rem" }),
};

const HrdPerusahaanPage = () => {
  const perms = useActionPermissions(config.moduleCode);
  const [form, setForm] = useState(config.initialForm || {});
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lookups, setLookups] = useState({ kota: [], provinsi: [], negara: [] });

  const canUpdate = !perms.loading && perms.UPDATE;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [kota, provinsi, negara, listRes] = await Promise.all([
        hrdLookupOptions("kota"),
        hrdLookupOptions("provinsi"),
        hrdLookupOptions("negara"),
        service.list({}),
      ]);
      setLookups({ kota, provinsi, negara });
      const rows = extractRows(listRes);
      let row = rows[0];
      if (row?.id) {
        try {
          const det = extractRow(await service.get(row.id));
          if (det) row = { ...row, ...det };
        } catch {
          /* list row enough */
        }
      }
      if (!row) {
        setError("Data perusahaan tidak ditemukan");
        setForm(config.initialForm || {});
      } else {
        setId(String(row.id || ""));
        const next = { ...(config.initialForm || {}) };
        (config.fields || []).forEach((f) => {
          next[f.name] = row[f.name] != null ? String(row[f.name]) : next[f.name] || "";
        });
        setForm(next);
      }
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Gagal memuat perusahaan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const onSave = async (e) => {
    e.preventDefault();
    if (!canUpdate) return;
    setSaving(true);
    try {
      const payload = normalizeFormPayload(config.fields || [], form);
      const res = id
        ? await service.update(id, payload)
        : await service.create(payload);
      if (notifyResponse(res, "Perusahaan diperbarui")) {
        load();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    if (field.type === "select") {
      const opts = lookups[field.lookupKey] || [];
      const val = opts.find((o) => String(o.value) === String(form[field.name] || "")) || null;
      return (
        <RSelect
          className="ams-rselect hrd-process-select"
          classNamePrefix="hrd-ps"
          styles={selectStyles}
          options={opts}
          value={val}
          placeholder={`Pilih ${field.label.replace(/\s*:?\s*$/, "")}`}
          onChange={(opt) => setField(field.name, opt?.value != null ? String(opt.value) : "")}
        />
      );
    }
    if (field.type === "textarea") {
      return (
        <textarea
          className="form-control"
          rows={3}
          value={form[field.name] || ""}
          onChange={(e) => setField(field.name, e.target.value)}
        />
      );
    }
    return (
      <input
        className="form-control"
        type={field.type === "date" ? "date" : "text"}
        value={form[field.name] || ""}
        onChange={(e) => setField(field.name, e.target.value)}
      />
    );
  };

  const left = (config.fields || []).filter((f) => (f.section || "Perusahaan") === "Perusahaan");
  const right = (config.fields || []).filter((f) => f.section === "Kontak");

  return (
    <AccessGuard moduleCode={config.moduleCode} permission="VIEW">
      <Head title={config.title} />
      <Content>
        <PageSmoothScroll revision={loading ? 0 : 1} className="riv-page-scroll">
          <div className="hrd-sc hrd-kontrak dgs-dash sc-scope">
            <ScPageHeader
              title="Info Perusahaan"
              description="Profil perusahaan (legacy: M_perusahaan.aspx)."
              actions={
                <div className="hrd-toolbar-actions">
                  <ScBtn variant="soft" disabled={loading} onClick={load}>
                    <Icon name="reload" /> Refresh
                  </ScBtn>
                  {canUpdate ? (
                    <ScBtn disabled={loading || saving} onClick={onSave}>
                      <Icon name="save" /> {saving ? "Menyimpan…" : "Update"}
                    </ScBtn>
                  ) : null}
                </div>
              }
            />

            {error ? <ScError message={error} onRetry={load} /> : null}

            {loading ? (
              <div className="sc-panel" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ScSkeletonBlock key={i} style={{ height: 36, margin: "8px 12px" }} />
                ))}
              </div>
            ) : (
              <form className="sc-panel hrd-master-form" onSubmit={onSave}>
                <div className="hrd-master-form__grid">
                  <div className="hrd-master-form__col">
                    <h3 className="hrd-master-form__sec">Perusahaan</h3>
                    {left.map((field) => (
                      <div className="hrd-master-form__row" key={field.name}>
                        <label>{field.label}</label>
                        <div>{renderField(field)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="hrd-master-form__col">
                    <h3 className="hrd-master-form__sec">Kontak & Pajak</h3>
                    {right.map((field) => (
                      <div className="hrd-master-form__row" key={field.name}>
                        <label>{field.label}</label>
                        <div>{renderField(field)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            )}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdPerusahaanPage;
