import React, { useEffect, useState } from "react";
import { Input, Row, Spinner } from "reactstrap";
import { Icon } from "../../../../../components/Component";
import { extractRow, notifyResponse } from "../../../../../lib/response";
import { createHrdService } from "../../../../../services/hrd/hrd.service";
import { parseAppDate } from "../../../../../components/AppDateRangePicker";
import { ScBtn } from "../../../dgs/sc";
import { DateField, Field, SelectLookup, useLookups } from "../shared";

const service = createHrdService("abs/personel", { crud: true });

const LOOKUP_TYPES = ["agama", "jenis_kelamin", "kota", "negara", "lokasi_absen"];

export const emptyIdentitas = {
  nik: "",
  employee_name: "",
  nama_panggilan: "",
  tempat_lahir_id: "",
  tanggal_lahir: "",
  jenis_kelamin_id: "",
  agama_id: "",
  warga_negara_id: "",
  no_ktp: "",
  masa_berlaku_ktp: "",
  rangkuman: "",
  active_date: "",
  resign_date: "",
  lokasi_absen_id: "",
  status_aktif: "0",
};

const idText = (v) => (v != null ? String(v) : "");

const fmtDisplayDate = (value) => {
  const d = parseAppDate(value);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const identitasFromRow = (row) => ({
  ...emptyIdentitas,
  nik: row.nik || "",
  employee_name: row.employee_name || "",
  nama_panggilan: row.nama_panggilan || "",
  tempat_lahir_id: idText(row.tempat_lahir_id),
  tanggal_lahir: row.tanggal_lahir || "",
  jenis_kelamin_id: idText(row.jenis_kelamin_id),
  agama_id: idText(row.agama_id),
  warga_negara_id: idText(row.warga_negara_id),
  no_ktp: row.no_ktp || "",
  masa_berlaku_ktp: row.masa_berlaku_ktp || "",
  rangkuman: row.rangkuman || "",
  active_date: row.active_date || "",
  resign_date: row.resign_date || "",
  lokasi_absen_id: idText(row.lokasi_absen_id),
  status_aktif: row.status_aktif != null ? String(row.status_aktif) : "0",
});

const IdentitasTab = ({ id, isNew, vType, row, onSaved, onCreated }) => {
  const lookups = useLookups(LOOKUP_TYPES);
  const [form, setForm] = useState(emptyIdentitas);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(row ? identitasFromRow(row) : emptyIdentitas);
  }, [row]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const text = (name) => ({
    value: form[name],
    onChange: (e) => setField(name, e.target.value),
  });
  const select = (name, type) => (
    <SelectLookup
      value={form[name]}
      onChange={(v) => setField(name, v)}
      options={lookups[type]}
    />
  );

  const isActive = String(form.status_aktif) === "0";
  const resignLabel = fmtDisplayDate(form.resign_date);

  const onStatusChange = (e) => {
    setField("status_aktif", e.target.checked ? "0" : "1");
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, v_type: vType };
      const res = isNew ? await service.create(payload) : await service.update(id, payload);
      if (notifyResponse(res, "Identitas tersimpan")) {
        if (isNew) {
          const saved = extractRow(res);
          const newId = saved?.id || saved?.PegawaiIDLng;
          if (newId) onCreated?.(newId);
        } else onSaved?.();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hrd-id">
      <header className="hrd-id__mast">
        <div className="hrd-id__mast-fields">
          <div className="hrd-id__mast-item hrd-id__mast-item--nik">
            <p className="hrd-id__mast-kicker">Nomor induk</p>
            {isNew ? (
              <Input
                className="hrd-id__nik-input"
                value={form.nik}
                onChange={(e) => setField("nik", e.target.value)}
                placeholder="Masukkan NIK"
                autoComplete="off"
              />
            ) : (
              <h2 className="hrd-id__nik">{form.nik || "—"}</h2>
            )}
          </div>

          <div className="hrd-id__mast-item hrd-id__mast-item--aktif">
            <span className="hrd-id__mast-kicker">Tanggal aktif</span>
            <DateField value={form.active_date} onChange={(v) => setField("active_date", v)} />
          </div>

          <div className="hrd-id__mast-item hrd-id__mast-item--lokasi">
            <span className="hrd-id__mast-kicker">Lokasi absen</span>
            {select("lokasi_absen_id", "lokasi_absen")}
          </div>
        </div>

        <div className="hrd-id__status-box">
          <div
            className={`custom-control custom-switch is-right hrd-id__status-switch ${
              isActive ? "is-on" : "is-off"
            }`}
          >
            <input
              type="checkbox"
              className="custom-control-input"
              id="hrd-id-status-switch"
              checked={isActive}
              onChange={onStatusChange}
            />
            <label className="custom-control-label" htmlFor="hrd-id-status-switch">
              {isActive ? "Aktif" : "Nonaktif"}
            </label>
          </div>
          {resignLabel ? (
            <p className="hrd-id__resign-info">
              Resign <strong>{resignLabel}</strong>
            </p>
          ) : null}
        </div>
      </header>

      <hr className="hrd-id__rule" />

      <section className="hrd-id__body" aria-label="Data pribadi">
        <Row className="g-3">
          <Field label="Nama lengkap" md={4}>
            <Input {...text("employee_name")} className="hrd-id__name" />
          </Field>
          <Field label="Nama panggilan" md={4}>
            <Input {...text("nama_panggilan")} />
          </Field>
          <Field label="Agama" md={4}>
            {select("agama_id", "agama")}
          </Field>

          <Field label="Jenis kelamin" md={4}>
            {select("jenis_kelamin_id", "jenis_kelamin")}
          </Field>
          <Field label="Tempat lahir" md={4}>
            {select("tempat_lahir_id", "kota")}
          </Field>
          <Field label="Tanggal lahir" md={4}>
            <DateField value={form.tanggal_lahir} onChange={(v) => setField("tanggal_lahir", v)} />
          </Field>

          <Field label="Warga negara" md={4}>
            {select("warga_negara_id", "negara")}
          </Field>
          <Field label="No. KTP" md={4}>
            <Input {...text("no_ktp")} />
          </Field>
          <Field label="Masa berlaku KTP" md={4}>
            <DateField
              value={form.masa_berlaku_ktp}
              onChange={(v) => setField("masa_berlaku_ktp", v)}
            />
          </Field>

          <Field label="Rangkuman" md={12} className="hrd-id__notes-wrap">
            <Input
              type="textarea"
              rows={9}
              {...text("rangkuman")}
              className="form-control hrd-id__notes"
              style={{ height: 208, minHeight: 208 }}
            />
          </Field>
        </Row>
      </section>

      <div className="hrd-form-actions hrd-id__actions">
        <ScBtn disabled={saving} onClick={save}>
          {saving ? <Spinner size="sm" /> : <Icon name="save" />}
          <span>Simpan identitas</span>
        </ScBtn>
      </div>
    </div>
  );
};

export default IdentitasTab;
