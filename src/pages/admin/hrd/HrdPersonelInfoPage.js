import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Col,
  FormGroup,
  Input,
  Label,
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  TabContent,
  TabPane,
} from "reactstrap";
import classnames from "classnames";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { createHrdService, hrdLookupOptions } from "../../../services/hrd/hrd.service";
import { extractRow, notifyResponse } from "../../../lib/response";
import AppDatePicker from "../../../components/AppDatePicker";
import { parseAppDate, formatAppDateYmd } from "../../../components/AppDateRangePicker";

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
    <FormGroup>
      <Label className="form-label">{label}</Label>
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

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const loadLookups = useCallback(async () => {
    const types = [
      "agama",
      "jenis_kelamin",
      "kota",
      "negara",
      "lokasi_absen",
      "status_aktif",
    ];
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
    if (isNew) return `Tambah Karyawan (${vType})`;
    return form.employee_name || "Employee Info";
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
    <Alert color="light" className="border">
      Tab <strong>{name}</strong> mengikuti modul legacy di dalam employeeinfo.
      {linkTo ? (
        <>
          {" "}
          Data perusahaan-wide juga ada di{" "}
          <Link to={linkTo} className="fw-bold">
            menu terpisah
          </Link>
          .
        </>
      ) : (
        " Form detail tab ini menyusul (field & SP legacy sudah di-map)."
      )}
    </Alert>
  );

  return (
    <AccessGuard moduleCode="HRD_ABS_PERSONEL" permission="VIEW">
      <Head title={title} />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <Button
                  color="light"
                  size="sm"
                  className="mb-2"
                  onClick={() => navigate("/admin/hrd/abs/personel")}
                >
                  <Icon name="arrow-left" />
                  <span>Kembali ke Employee List</span>
                </Button>
                <BlockTitle page tag="h3">
                  {title}
                </BlockTitle>
                <BlockDes className="text-soft">
                  Mirror legacy <code>employeeinfo.aspx</code> — 14 tab.
                </BlockDes>
              </div>
              {!isNew && (
                <div className="hrd-emp-side card card-bordered p-3" style={{ minWidth: 240 }}>
                  <div className="fw-bold">{form.employee_name || "—"}</div>
                  <div className="text-soft small">{form.nik || "—"}</div>
                  <hr className="my-2" />
                  <div className="small">
                    <div>
                      <span className="text-soft">Jabatan:</span> {meta.jabatan || "—"}
                    </div>
                    <div>
                      <span className="text-soft">Divisi:</span> {meta.divisi || "—"}
                    </div>
                    <div>
                      <span className="text-soft">Status:</span> {meta.status_pegawai || "—"}
                    </div>
                    <div>
                      <span className="text-soft">Cabang:</span> {meta.branch_name || "—"}
                    </div>
                    <div>
                      <span className="text-soft">Lokasi Absen:</span> {meta.lokasi_absen || "—"}
                    </div>
                    <div>
                      <span className="text-soft">Aktif:</span>{" "}
                      {form.status_aktif === "0" ? "Aktif" : "Nonaktif"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </BlockHeadContent>
        </BlockHead>

        <Block>
          {loading ? (
            <div className="p-4 text-center text-soft">
              <Spinner size="sm" /> Memuat data pegawai…
            </div>
          ) : (
            <div className="card card-bordered">
              <div className="card-inner">
                <Nav tabs className="nav-tabs-mb-icon nav-tabs-card flex-nowrap overflow-auto">
                  {TABS.map((t) => (
                    <NavItem key={t.id}>
                      <NavLink
                        className={classnames({ active: activeTab === t.id })}
                        href={`#${t.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab(t.id);
                        }}
                      >
                        {t.label}
                      </NavLink>
                    </NavItem>
                  ))}
                </Nav>

                <TabContent activeTab={activeTab} className="mt-3">
                  <TabPane tabId="identitas">
                    <Row className="g-3">
                      <Field label="Tanggal Aktif">
                        <DateField
                          value={form.active_date}
                          onChange={(v) => setField("active_date", v)}
                        />
                      </Field>
                      <Field label="Tanggal Resign">
                        <DateField value={form.resign_date} onChange={() => {}} disabled />
                      </Field>
                      <Field label="Lokasi Absen">
                        <SelectLookup
                          value={form.lokasi_absen_id}
                          onChange={(v) => setField("lokasi_absen_id", v)}
                          options={lookups.lokasi_absen}
                        />
                      </Field>
                      <Field label="Status Aktif">
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
                      <Field label="Nama Lengkap" md={12}>
                        <Input
                          value={form.employee_name}
                          onChange={(e) => setField("employee_name", e.target.value)}
                        />
                      </Field>
                      <Field label="Warga Negara">
                        <SelectLookup
                          value={form.warga_negara_id}
                          onChange={(v) => setField("warga_negara_id", v)}
                          options={lookups.negara}
                        />
                      </Field>
                      <Field label="Nama Panggilan">
                        <Input
                          value={form.nama_panggilan}
                          onChange={(e) => setField("nama_panggilan", e.target.value)}
                        />
                      </Field>
                      <Field label="No. KTP">
                        <Input value={form.no_ktp} onChange={(e) => setField("no_ktp", e.target.value)} />
                      </Field>
                      <Field label="Tempat Lahir">
                        <SelectLookup
                          value={form.tempat_lahir_id}
                          onChange={(v) => setField("tempat_lahir_id", v)}
                          options={lookups.kota}
                        />
                      </Field>
                      <Field label="Masa Berlaku KTP">
                        <DateField
                          value={form.masa_berlaku_ktp}
                          onChange={(v) => setField("masa_berlaku_ktp", v)}
                        />
                      </Field>
                      <Field label="Tanggal Lahir">
                        <DateField
                          value={form.tanggal_lahir}
                          onChange={(v) => setField("tanggal_lahir", v)}
                        />
                      </Field>
                      <Field label="Jenis Kelamin">
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
                        <Button color="primary" disabled={saving} onClick={saveIdentitas}>
                          {saving ? <Spinner size="sm" /> : <Icon name="save" />}
                          <span className="ms-1">Save Identitas</span>
                        </Button>
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
                    <PlaceholderTab name="Jabatan / Promosi" linkTo="/admin/hrd/abs/personel-promosi" />
                  </TabPane>
                  <TabPane tabId="penempatan">
                    <PlaceholderTab name="Penempatan / Mutasi" linkTo="/admin/hrd/abs/personel-mutasi" />
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
          )}
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default HrdPersonelInfoPage;
