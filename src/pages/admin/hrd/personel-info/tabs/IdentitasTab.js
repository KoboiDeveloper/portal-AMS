import React, { useEffect, useState } from "react";
import { Col, Input, Row, Spinner } from "reactstrap";
import { Icon } from "../../../../../components/Component";
import { extractRow, notifyResponse } from "../../../../../lib/response";
import { createHrdService } from "../../../../../services/hrd/hrd.service";
import { ScBtn } from "../../../dgs/sc";
import { DateField, Field, SelectLookup, useLookups } from "../shared";

const service = createHrdService("abs/personel", { crud: true });

const LOOKUP_TYPES = ["agama", "jenis_kelamin", "kota", "negara", "lokasi_absen", "status_aktif"];

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
    <Row className="g-2">
      <Field label="Tanggal aktif" md={4}>
        <DateField value={form.active_date} onChange={(v) => setField("active_date", v)} />
      </Field>
      <Field label="Tanggal resign" md={4}>
        <DateField value={form.resign_date} onChange={() => {}} disabled />
      </Field>
      <Field label="Status aktif" md={4}>
        {select("status_aktif", "status_aktif")}
      </Field>
      <Field label="NIK" md={4}>
        <Input {...text("nik")} disabled={!isNew} />
      </Field>
      <Field label="Lokasi absen" md={8}>
        {select("lokasi_absen_id", "lokasi_absen")}
      </Field>
      <Field label="Nama lengkap" md={12}>
        <Input {...text("employee_name")} />
      </Field>
      <Field label="Nama panggilan" md={4}>
        <Input {...text("nama_panggilan")} />
      </Field>
      <Field label="Jenis kelamin" md={4}>
        {select("jenis_kelamin_id", "jenis_kelamin")}
      </Field>
      <Field label="Agama" md={4}>
        {select("agama_id", "agama")}
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
      <Field label="Rangkuman" md={12}>
        <Input type="textarea" rows={3} {...text("rangkuman")} />
      </Field>
      <Col xs="12">
        <div className="hrd-form-actions">
          <ScBtn disabled={saving} onClick={save}>
            {saving ? <Spinner size="sm" /> : <Icon name="save" />}
            <span>Simpan identitas</span>
          </ScBtn>
        </div>
      </Col>
    </Row>
  );
};

export default IdentitasTab;
