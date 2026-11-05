import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Col, FormGroup, Input, Label, Row, Spinner, TabContent, TabPane } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { createHrdService, hrdLookupOptions } from "../../../services/hrd/hrd.service";
import { extractRow, notifyResponse } from "../../../lib/response";
import { buildImageProfileUrl } from "../../../lib/imageProfile";
import AppDatePicker from "../../../components/AppDatePicker";
import { parseAppDate, formatAppDateYmd } from "../../../components/AppDateRangePicker";
import {
  ScBadge,
  ScBtn,
  ScNotice,
  ScPageHeader,
  ScStatusTabs,
} from "../dgs/sc";
import HrdHScrollRail from "./HrdHScrollRail";
import "../dgs/dgs.css";
import "./hrd-personel.css";

const resolvePhotoUrl = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const file = value
    .replace(/^~\//, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^\/?ImageProfile\//i, "");
  return buildImageProfileUrl(file);
};

const DateField = ({ value, onChange, disabled }) => (
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

const service = createHrdService("abs/personel", { crud: true });

const TABS = [
  { id: "identitas", label: "Identitas" },
  { id: "alamat", label: "Alamat" },
  { id: "sipil", label: "Sipil" },
  { id: "pendidikan", label: "Pendidikan" },
  { id: "keahlian", label: "Keahlian" },
  { id: "pekerjaan", label: "Pekerjaan" },
  { id: "aktifitas", label: "Aktifitas" },
  { id: "kesehatan", label: "Kesehatan" },
  { id: "kontrak", label: "Kontrak" },
  { id: "status", label: "Status" },
  { id: "jabatan", label: "Jabatan" },
  { id: "penempatan", label: "Penempatan" },
  { id: "bank", label: "Bank" },
  { id: "upload", label: "Upload" },
];

const emptyForm = {
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

const Field = ({ label, children, md = 6 }) => (
  <Col xs="12" md={md}>
    <FormGroup className="mb-3">
      <Label className="hrd-form-label">{label}</Label>
      {children}
    </FormGroup>
  </Col>
);

const SelectLookup = ({ value, onChange, options, disabled }) => (
  <Input type="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
    <option value="">— Pilih —</option>
    {(options || []).map((o) => (
      <option key={String(o.value)} value={o.value}>
        {o.label}
      </option>
    ))}
  </Input>
);

const HrdPersonelInfoPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const vType = searchParams.get("vType") || "HO";

  const [activeTab, setActiveTab] = useState("identitas");
  const [form, setForm] = useState(emptyForm);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [lookups, setLookups] = useState({});
  const [photoBroken, setPhotoBroken] = useState(false);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const photoUrl = resolvePhotoUrl(meta.photo);

  useEffect(() => {
    setPhotoBroken(false);
  }, [photoUrl]);

  const loadLookups = useCallback(async () => {
    const types = ["agama", "jenis_kelamin", "kota", "negara", "lokasi_absen", "status_aktif"];
    const next = {};
    await Promise.all(
      types.map(async (t) => {
        next[t] = await hrdLookupOptions(t);
      })
    );
    setLookups(next);
  }, []);

  const loadData = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await service.get(id);
      const row = extractRow(res) || {};
      setForm({
        ...emptyForm,
        nik: row.nik || "",
        employee_name: row.employee_name || "",
        nama_panggilan: row.nama_panggilan || "",
        tempat_lahir_id: row.tempat_lahir_id != null ? String(row.tempat_lahir_id) : "",
        tanggal_lahir: row.tanggal_lahir || "",
        jenis_kelamin_id: row.jenis_kelamin_id != null ? String(row.jenis_kelamin_id) : "",
        agama_id: row.agama_id != null ? String(row.agama_id) : "",
        warga_negara_id: row.warga_negara_id != null ? String(row.warga_negara_id) : "",
        no_ktp: row.no_ktp || "",
        masa_berlaku_ktp: row.masa_berlaku_ktp || "",
        rangkuman: row.rangkuman || "",
        active_date: row.active_date || "",
        resign_date: row.resign_date || "",
        lokasi_absen_id: row.lokasi_absen_id != null ? String(row.lokasi_absen_id) : "",
        status_aktif: row.status_aktif != null ? String(row.status_aktif) : "0",
      });
      setMeta({
        jabatan: row.jabatan,
        divisi: row.divisi,
        department: row.department,
        status_pegawai: row.status_pegawai,
        branch_name: row.branch_name,
        brand: row.brand,
        updated_by: row.updated_by,
        last_update: row.last_update,
        lokasi_absen: row.lokasi_absen,
        photo: row.photo || row.Photo || row.foto || row.FOTO || "",
      });
    } catch (err) {
      notifyResponse(err);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    loadLookups();
    loadData();
  }, [loadLookups, loadData]);

  const title = useMemo(() => {
    if (isNew) return `Tambah karyawan (${vType})`;
    return form.employee_name || "Employee info";
  }, [isNew, vType, form.employee_name]);

  const saveIdentitas = async () => {
    setSaving(true);
    try {
      const payload = { ...form, v_type: vType };
      let res;
      if (isNew) res = await service.create(payload);
      else res = await service.update(id, payload);
      if (notifyResponse(res, "Identitas tersimpan")) {
        if (isNew) {
          const row = extractRow(res);
          const newId = row?.id || row?.PegawaiIDLng;
          if (newId) navigate(`/admin/hrd/abs/personel/${newId}`, { replace: true });
        } else loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const PlaceholderTab = ({ name, linkTo }) => (
    <p className="hrd-placeholder">
      Tab <strong>{name}</strong> mengikuti modul legacy di dalam employee info.
      {linkTo ? (
        <>
          {" "}
          Data perusahaan-wide juga ada di{" "}
          <Link to={linkTo}>menu terpisah</Link>.
        </>
      ) : (
        " Form detail tab ini menyusul."
      )}
    </p>
  );

  const isActive = form.status_aktif === "0";

  return (
    <AccessGuard moduleCode="HRD_ABS_PERSONEL" permission="VIEW">
      <Head title={title} />
      <Content>
        <PageSmoothScroll revision={`${id || "new"}-${activeTab}-${loading ? 1 : 0}`} className="riv-page-scroll">
          <div className="hrd-sc dgs-dash sc-scope">
            <ScPageHeader
              title={title}
              description={
                isNew
                  ? `Input pegawai baru tipe ${vType}`
                  : [form.nik, meta.jabatan, meta.branch_name].filter(Boolean).join(" · ") ||
                    "Detail identitas & riwayat pegawai"
              }
              actions={
                <div className="d-flex flex-wrap gap-2">
                  <ScBtn variant="ghost" onClick={() => navigate("/admin/hrd/abs/personel")}>
                    <Icon name="arrow-left" /> Kembali
                  </ScBtn>
                  {!isNew ? (
                    <ScBtn variant="soft" disabled={loading} onClick={loadData}>
                      <Icon name="reload" /> Refresh
                    </ScBtn>
                  ) : null}
                </div>
              }
            />

            {isNew ? (
              <ScNotice tone="info">
                Simpan tab Identitas dulu. Tab lain aktif setelah pegawai tersimpan.
              </ScNotice>
            ) : null}

            {loading ? (
              <div className="sc-empty" role="status">
                <Spinner size="sm" />
                <h3 className="sc-empty__title" style={{ marginTop: 12 }}>
                  Memuat data pegawai…
                </h3>
              </div>
            ) : (
              <div
                id="hrd-emp-layout"
                className={`hrd-emp-layout${isNew ? " hrd-emp-layout--new" : ""}`}
              >
                <div className="hrd-emp-main">
                  <div className="sc-panel sc-panel--flush hrd-emp-tabs-panel">
                    <HrdHScrollRail
                      className="hrd-emp-tabs-rail"
                      trackClassName="hrd-emp-tabs-track"
                      ariaLabel="Tab detail pegawai"
                    >
                      <ScStatusTabs
                        value={activeTab}
                        onChange={setActiveTab}
                        items={TABS.map((t) => ({ id: t.id, label: t.label }))}
                      />
                    </HrdHScrollRail>
                  </div>

                  <div className="sc-panel">
                    <div className="hrd-tab-panel">
                      <TabContent activeTab={activeTab}>
                        <TabPane tabId="identitas">
                          <Row className="g-2">
                            <Field label="Tanggal aktif">
                              <DateField
                                value={form.active_date}
                                onChange={(v) => setField("active_date", v)}
                              />
                            </Field>
                            <Field label="Tanggal resign">
                              <DateField value={form.resign_date} onChange={() => {}} disabled />
                            </Field>
                            <Field label="Lokasi absen">
                              <SelectLookup
                                value={form.lokasi_absen_id}
                                onChange={(v) => setField("lokasi_absen_id", v)}
                                options={lookups.lokasi_absen}
                              />
                            </Field>
                            <Field label="Status aktif">
                              <SelectLookup
                                value={form.status_aktif}
                                onChange={(v) => setField("status_aktif", v)}
                                options={lookups.status_aktif}
                              />
                            </Field>
                            <Field label="NIK">
                              <Input
                                value={form.nik}
                                onChange={(e) => setField("nik", e.target.value)}
                                disabled={!isNew}
                              />
                            </Field>
                            <Field label="Agama">
                              <SelectLookup
                                value={form.agama_id}
                                onChange={(v) => setField("agama_id", v)}
                                options={lookups.agama}
                              />
                            </Field>
                            <Field label="Nama lengkap" md={12}>
                              <Input
                                value={form.employee_name}
                                onChange={(e) => setField("employee_name", e.target.value)}
                              />
                            </Field>
                            <Field label="Warga negara">
                              <SelectLookup
                                value={form.warga_negara_id}
                                onChange={(v) => setField("warga_negara_id", v)}
                                options={lookups.negara}
                              />
                            </Field>
                            <Field label="Nama panggilan">
                              <Input
                                value={form.nama_panggilan}
                                onChange={(e) => setField("nama_panggilan", e.target.value)}
                              />
                            </Field>
                            <Field label="No. KTP">
                              <Input
                                value={form.no_ktp}
                                onChange={(e) => setField("no_ktp", e.target.value)}
                              />
                            </Field>
                            <Field label="Tempat lahir">
                              <SelectLookup
                                value={form.tempat_lahir_id}
                                onChange={(v) => setField("tempat_lahir_id", v)}
                                options={lookups.kota}
                              />
                            </Field>
                            <Field label="Masa berlaku KTP">
                              <DateField
                                value={form.masa_berlaku_ktp}
                                onChange={(v) => setField("masa_berlaku_ktp", v)}
                              />
                            </Field>
                            <Field label="Tanggal lahir">
                              <DateField
                                value={form.tanggal_lahir}
                                onChange={(v) => setField("tanggal_lahir", v)}
                              />
                            </Field>
                            <Field label="Jenis kelamin">
                              <SelectLookup
                                value={form.jenis_kelamin_id}
                                onChange={(v) => setField("jenis_kelamin_id", v)}
                                options={lookups.jenis_kelamin}
                              />
                            </Field>
                            <Field label="Rangkuman" md={12}>
                              <Input
                                type="textarea"
                                rows={3}
                                value={form.rangkuman}
                                onChange={(e) => setField("rangkuman", e.target.value)}
                              />
                            </Field>
                            <Col xs="12">
                              <div className="hrd-form-actions">
                                <ScBtn disabled={saving} onClick={saveIdentitas}>
                                  {saving ? <Spinner size="sm" /> : <Icon name="save" />}
                                  <span>Simpan identitas</span>
                                </ScBtn>
                              </div>
                            </Col>
                          </Row>
                        </TabPane>

                        <TabPane tabId="alamat">
                          <PlaceholderTab name="Alamat" />
                        </TabPane>
                        <TabPane tabId="sipil">
                          <PlaceholderTab name="Sipil" />
                        </TabPane>
                        <TabPane tabId="pendidikan">
                          <PlaceholderTab name="Pendidikan" />
                        </TabPane>
                        <TabPane tabId="keahlian">
                          <PlaceholderTab name="Keahlian" />
                        </TabPane>
                        <TabPane tabId="pekerjaan">
                          <PlaceholderTab name="Pekerjaan" />
                        </TabPane>
                        <TabPane tabId="aktifitas">
                          <PlaceholderTab name="Aktifitas" />
                        </TabPane>
                        <TabPane tabId="kesehatan">
                          <PlaceholderTab name="Kesehatan" />
                        </TabPane>
                        <TabPane tabId="kontrak">
                          <PlaceholderTab name="Kontrak" linkTo="/admin/hrd/abs/personel-kontrak" />
                        </TabPane>
                        <TabPane tabId="status">
                          <PlaceholderTab name="Status" linkTo="/admin/hrd/abs/personel-status" />
                        </TabPane>
                        <TabPane tabId="jabatan">
                          <PlaceholderTab
                            name="Jabatan / Promosi"
                            linkTo="/admin/hrd/abs/personel-promosi"
                          />
                        </TabPane>
                        <TabPane tabId="penempatan">
                          <PlaceholderTab
                            name="Penempatan / Mutasi"
                            linkTo="/admin/hrd/abs/personel-mutasi"
                          />
                        </TabPane>
                        <TabPane tabId="bank">
                          <PlaceholderTab name="Bank" />
                        </TabPane>
                        <TabPane tabId="upload">
                          <PlaceholderTab name="Upload Document" />
                        </TabPane>
                      </TabContent>
                    </div>
                  </div>
                </div>

                {!isNew ? (
                  <aside
                    className="hrd-emp-side"
                    data-scroll=""
                    data-scroll-sticky=""
                    data-scroll-target="#hrd-emp-layout"
                    data-scroll-offset="-72,0"
                  >
                    <div className="sc-card hrd-emp-side__card">
                      <h6 className="sc-card__title">Ringkasan</h6>
                      {photoUrl && !photoBroken ? (
                        <div className="hrd-emp-side__photo">
                          <img
                            src={photoUrl}
                            alt=""
                            onError={() => setPhotoBroken(true)}
                          />
                        </div>
                      ) : null}
                      <div className="hrd-emp-side__head">
                        <div className="hrd-emp-side__who">
                          <p className="hrd-emp-side__name">{form.employee_name || "—"}</p>
                          <p className="hrd-emp-side__nik">{form.nik || "—"}</p>
                        </div>
                        <ScBadge tone={isActive ? "ok" : "bad"}>
                          {isActive ? "Aktif" : "Nonaktif"}
                        </ScBadge>
                      </div>
                      <dl className="hrd-emp-side__dl">
                        {[
                          ["Jabatan", meta.jabatan],
                          ["Divisi", meta.divisi || meta.department],
                          ["Status", meta.status_pegawai],
                          ["Cabang", meta.branch_name],
                          ["Brand", meta.brand],
                          ["Lokasi absen", meta.lokasi_absen],
                        ].map(([label, value]) => (
                          <div key={label} className="hrd-emp-side__row">
                            <dt>{label}</dt>
                            <dd>{value || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </aside>
                ) : null}
              </div>
            )}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdPersonelInfoPage;
