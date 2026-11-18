import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Col, Form, Label, Row, Spinner } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import ErrorState from "../../../components/admin/common/ErrorState";
import ProjectListTable from "../../../components/admin/common/ProjectListTable";
import ConfirmDialog from "../../../components/admin/common/ConfirmDialog";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import AppDatePicker from "../../../components/AppDatePicker";
import { parseAppDate, formatAppDateYmd } from "../../../components/AppDateRangePicker";
import { appPath } from "../../../lib/paths";
import { extractRow, extractRows, notifyResponse } from "../../../lib/response";
import {
  marcommLookupOptions,
  marcommVoucherGeneratedService,
} from "../../../services/marcomm/marcomm.service";
import { ScBtn } from "../dgs/sc";
import "../hrd/hrd-personel.css";
import "../dgs/sc/sc-ui.css";

const VTYPE_INFO = {
  pr: "Hanya untuk penggunaan PROMOSI",
  fs: "Hanya untuk penggunaan SEWA / FISIK",
};

const initialCreateForm = {
  qty: "",
  jenis_potongan: "CASH",
  persentase: "0",
  nominal: "",
  nominal_per_voucher: "",
  tipe_penerima: "ALL",
  brand: "",
  store: "",
  from_date: "",
  to_date: "",
  keterangan: "",
  master_code_voucher: "",
  use_master_code: "TIDAK",
  vType: "pr",
};

const pick = (row, ...keys) => {
  for (const key of keys) {
    const v = row?.[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  if (!row) return "";
  for (const key of keys) {
    const found = Object.keys(row).find((k) => k.toLowerCase() === String(key).toLowerCase());
    if (found != null && row[found] !== undefined && row[found] !== null && row[found] !== "") {
      return row[found];
    }
  }
  return "";
};

const fmtNum = (v, digits = 0) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return v == null || v === "" ? "-" : String(v);
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const toYmdMaybe = (v) => {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }
  const parsed = parseAppDate(s);
  return parsed ? formatAppDateYmd(parsed) : "";
};

const normalizeTipe = (raw) => {
  const s = String(raw || "ALL").trim().toUpperCase();
  if (s.startsWith("STORE")) return "STORE";
  if (s.startsWith("BRAND")) return "BRAND";
  if (s === "ALL" || s.startsWith("ALL")) return "ALL";
  return "ALL";
};

const FieldLabel = ({ children }) => <Label className="hrd-form-label text-uppercase">{children}</Label>;

const MarcommVoucherGeneratedEditorPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== "new");
  const vType = (searchParams.get("vType") || "pr").toLowerCase() === "fs" ? "fs" : "pr";

  const perms = useActionPermissions("MAR_VCR_GENERATED");
  const canCreate = perms.CREATE && !perms.loading;

  const [form, setForm] = useState({ ...initialCreateForm, vType });
  const [header, setHeader] = useState(null);
  const [details, setDetails] = useState([]);
  const [detailPage, setDetailPage] = useState(1);
  const [brandOptions, setBrandOptions] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const locked = isEdit;

  const loadLookups = useCallback(async (brandId) => {
    try {
      const brands = await marcommLookupOptions("brand_all");
      setBrandOptions((brands || []).filter((o) => String(o.value).toUpperCase() !== "ALL"));
      if (brandId) {
        const stores = await marcommLookupOptions("store", { parentId: brandId });
        setStoreOptions((stores || []).filter((o) => String(o.value).toUpperCase() !== "ALL"));
      } else {
        setStoreOptions([]);
      }
    } catch {
      setBrandOptions([]);
      setStoreOptions([]);
    }
  }, []);

  const applyHeaderToForm = useCallback((row) => {
    const master = String(pick(row, "MASTER_CODE_VOUCHER", "master_code_voucher") || "").trim();
    const tipe = normalizeTipe(pick(row, "TIPE_VOUCHER", "tipe_voucher", "tipe_penerima"));
    const brand = pick(row, "BRAND", "brand");
    const store = pick(row, "STORE", "store", "store_id");
    setForm({
      qty: String(pick(row, "QTY_VOUCHER", "qty", "QTY") || "").trim(),
      jenis_potongan: "CASH",
      persentase: "0",
      nominal: String(pick(row, "NOMINAL", "nominal") || ""),
      nominal_per_voucher: String(pick(row, "NOMINAL_PERVOUCHER", "nominal_pervoucher", "nominal_per_voucher") || ""),
      tipe_penerima: tipe,
      brand: tipe === "ALL" ? "" : brand,
      store: tipe === "STORE" ? store : "",
      from_date: toYmdMaybe(pick(row, "start_date", "START_DATE", "from_date")),
      to_date: toYmdMaybe(pick(row, "END_DATE", "end_date", "to_date")),
      keterangan: pick(row, "KETERANGAN", "keterangan"),
      master_code_voucher: master,
      use_master_code: master ? "YA" : "TIDAK",
      vType,
    });
  }, [vType]);

  const loadEdit = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    setError("");
    setDetailPage(1);
    try {
      // ASP: get_voucher_header by NO_URUT, then detail by ID_VOUCHER (GUID)
      const headRes = await marcommVoucherGeneratedService.get(id);
      const row = extractRow(headRes) || {};
      if (!pick(row, "NO_URUT", "no_urut", "ID_VOUCHER", "id_voucher")) {
        throw new Error("Header voucher tidak ditemukan");
      }
      setHeader(row);
      applyHeaderToForm(row);

      const brand = pick(row, "BRAND", "brand");
      await loadLookups(brand);

      const idVoucher = pick(row, "ID_VOUCHER", "id_voucher");
      if (!idVoucher) {
        setDetails([]);
        setError("ID voucher kosong — detail tidak bisa dimuat");
        return;
      }
      const detailRes = await marcommVoucherGeneratedService.listDetails(idVoucher);
      setDetails(extractRows(detailRes));
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Gagal memuat voucher");
      setHeader(null);
      setDetails([]);
    } finally {
      setLoading(false);
    }
  }, [applyHeaderToForm, id, isEdit, loadLookups]);

  useEffect(() => {
    if (isEdit) loadEdit();
    else {
      loadLookups();
      setForm((prev) => ({ ...prev, vType }));
      setHeader(null);
      setDetails([]);
    }
  }, [isEdit, loadEdit, loadLookups, vType]);

  const computedTotal = useMemo(() => {
    const qty = Number(String(form.qty || "").replace(/,/g, ""));
    const per = Number(String(form.nominal_per_voucher || "").replace(/,/g, ""));
    if (!Number.isFinite(qty) || !Number.isFinite(per)) return "";
    return String(qty * per);
  }, [form.qty, form.nominal_per_voucher]);

  useEffect(() => {
    if (!isEdit) setForm((prev) => ({ ...prev, nominal: computedTotal }));
  }, [computedTotal, isEdit]);

  const onBrandChange = async (val) => {
    if (locked) return;
    setField("brand", val);
    setField("store", "");
    if (val) {
      const stores = await marcommLookupOptions("store", { parentId: val });
      setStoreOptions((stores || []).filter((o) => String(o.value).toUpperCase() !== "ALL"));
    } else {
      setStoreOptions([]);
    }
  };

  const validateForm = () => {
    const qty = String(form.qty || "").trim();
    const per = String(form.nominal_per_voucher || "").trim();
    if (!qty || !per || !form.from_date || !form.to_date || !form.tipe_penerima) {
      notifyResponse({ responseMessage: "Lengkapi qty, nilai voucher, tanggal, dan penerima." });
      return false;
    }
    if (form.jenis_potongan === "PERSENTASE" && !String(form.persentase || "").trim()) {
      notifyResponse({ responseMessage: "Isi persentase potongan." });
      return false;
    }
    if (form.tipe_penerima === "BRAND" && !form.brand) {
      notifyResponse({ responseMessage: "Pilih brand penerima." });
      return false;
    }
    if (form.tipe_penerima === "STORE" && (!form.brand || !form.store)) {
      notifyResponse({ responseMessage: "Pilih brand dan store penerima." });
      return false;
    }
    if (form.use_master_code === "YA" && !String(form.master_code_voucher || "").trim()) {
      notifyResponse({ responseMessage: "Isi master kode voucher." });
      return false;
    }
    return true;
  };

  const requestGenerate = () => {
    if (!canCreate || !validateForm()) return;
    setConfirmOpen(true);
  };

  const onSave = async () => {
    if (!canCreate) return;
    const qty = String(form.qty || "").trim();
    const per = String(form.nominal_per_voucher || "").trim();
    const nominalTotal =
      form.nominal ||
      String(Number(qty.replace(/,/g, "")) * Number(per.replace(/,/g, "")));

    setSaving(true);
    try {
      const payload = {
        qty,
        jenis_potongan: form.jenis_potongan,
        persentase: form.jenis_potongan === "PERSENTASE" ? form.persentase || "0" : "0",
        nominal: nominalTotal,
        tipe_penerima: form.tipe_penerima,
        brand: form.tipe_penerima === "ALL" ? "" : form.brand,
        store: form.tipe_penerima === "STORE" ? form.store : "",
        from_date: form.from_date,
        to_date: form.to_date,
        keterangan: form.keterangan,
        master_code_voucher: form.use_master_code === "YA" ? form.master_code_voucher : "",
        vType,
      };
      const res = await marcommVoucherGeneratedService.create(payload);
      if (notifyResponse(res, "Voucher berhasil di-generate")) {
        setConfirmOpen(false);
        const created = extractRow(res);
        const newId =
          created?.no_urut ?? created?.NO_URUT ?? created?.id ?? created?.ID;
        if (newId) {
          navigate(appPath(`/admin/marcomm/voucher/generated/${encodeURIComponent(newId)}?vType=${vType}`), {
            replace: true,
          });
        } else {
          navigate(appPath("/admin/marcomm/voucher/generated"));
        }
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const detailColumns = [
    { key: "idx", label: "No", size: "sm", type: "index" },
    {
      key: "no_voucher",
      label: "No Voucher",
      size: "md",
      render: (row) => pick(row, "NO_VOUCHER", "no_voucher") || "-",
    },
    {
      key: "brand",
      label: "Brand",
      size: "sm",
      render: (row) => pick(row, "BRAND", "brand") || "-",
    },
    {
      key: "store_id",
      label: "Store",
      size: "md",
      render: (row) => pick(row, "STORE_ID", "store_id", "STORE", "store") || "-",
    },
    {
      key: "nominal",
      label: "Nilai",
      size: "sm",
      render: (row) => fmtNum(pick(row, "nominal", "NOMINAL"), 2),
    },
    {
      key: "status_penggunaan",
      label: "Status Penggunaan",
      size: "md",
      render: (row) => String(pick(row, "STATUS_PENGGUNAAN", "status_penggunaan") || "-").trim(),
    },
  ];

  const showPercent = form.jenis_potongan === "PERSENTASE";
  const listHref = appPath("/admin/marcomm/voucher/generated");
  const displayTotal = isEdit
    ? fmtNum(form.nominal || pick(header, "NOMINAL", "nominal"), 0)
    : computedTotal
      ? Number(computedTotal).toLocaleString("id-ID")
      : "0";

  const renderForm = () => (
    <Form className="form-validate sc-scope">
      <Row className="g-4">
        <Col lg="6">
          <div className="hrd-modal-section">
            <div className="hrd-modal-section-title">Nilai</div>
            <div className="form-group">
              <FieldLabel>Qty Voucher</FieldLabel>
              <input
                className="form-control"
                value={form.qty}
                disabled={locked}
                onChange={(e) => setField("qty", e.target.value)}
              />
            </div>
            <div className="form-group">
              <FieldLabel>Jenis Potongan</FieldLabel>
              <RSelect
                options={[
                  { value: "CASH", label: "CASH" },
                  { value: "PERSENTASE", label: "PERSENTASE" },
                ]}
                value={{ value: form.jenis_potongan, label: form.jenis_potongan }}
                isDisabled={locked}
                onChange={(opt) => setField("jenis_potongan", opt?.value || "CASH")}
              />
            </div>
            {showPercent && (
              <div className="form-group">
                <FieldLabel>Persentase</FieldLabel>
                <div className="d-flex align-items-center gap-2">
                  <input
                    className="form-control"
                    value={form.persentase}
                    disabled={locked}
                    onChange={(e) => setField("persentase", e.target.value)}
                  />
                  <span className="fw-bold">%</span>
                </div>
              </div>
            )}
            <div className="form-group">
              <FieldLabel>{showPercent ? "Max Nilai Voucher" : "Nilai Voucher"}</FieldLabel>
              <input
                className="form-control text-end"
                value={form.nominal_per_voucher}
                disabled={locked}
                onChange={(e) => setField("nominal_per_voucher", e.target.value)}
              />
            </div>
            <div className="form-group">
              <FieldLabel>Total Nilai Voucher</FieldLabel>
              <input
                className="form-control text-end bg-lighter"
                readOnly
                value={displayTotal}
                style={{ color: "#ff4500", fontWeight: 600 }}
              />
            </div>
          </div>
        </Col>
        <Col lg="6">
          <div className="hrd-modal-section">
            <div className="hrd-modal-section-title">Penerima & Masa Berlaku</div>
            <div className="form-group">
              <FieldLabel>Penerima Voucher</FieldLabel>
              <RSelect
                options={[
                  { value: "ALL", label: "ALL" },
                  { value: "BRAND", label: "BRAND" },
                  { value: "STORE", label: "STORE" },
                ]}
                value={{ value: form.tipe_penerima, label: form.tipe_penerima }}
                isDisabled={locked}
                onChange={(opt) => {
                  const next = opt?.value || "ALL";
                  setForm((prev) => ({
                    ...prev,
                    tipe_penerima: next,
                    brand: next === "ALL" ? "" : prev.brand,
                    store: next === "STORE" ? prev.store : "",
                  }));
                }}
              />
            </div>
            {form.tipe_penerima === "BRAND" && (
              <div className="form-group">
                <FieldLabel>Brand</FieldLabel>
                {locked ? (
                  <input className="form-control" value={form.brand || "-"} readOnly disabled />
                ) : (
                  <RSelect
                    options={brandOptions}
                    value={brandOptions.find((o) => String(o.value) === String(form.brand)) || null}
                    onChange={(opt) => onBrandChange(opt?.value ? String(opt.value) : "")}
                    isClearable
                    isSearchable
                  />
                )}
              </div>
            )}
            {form.tipe_penerima === "STORE" && (
              <>
                <div className="form-group">
                  <FieldLabel>Brand</FieldLabel>
                  {locked ? (
                    <input className="form-control" value={form.brand || "-"} readOnly disabled />
                  ) : (
                    <RSelect
                      options={brandOptions}
                      value={brandOptions.find((o) => String(o.value) === String(form.brand)) || null}
                      onChange={(opt) => onBrandChange(opt?.value ? String(opt.value) : "")}
                      isClearable
                      isSearchable
                    />
                  )}
                </div>
                <div className="form-group">
                  <FieldLabel>Store</FieldLabel>
                  {locked ? (
                    <input className="form-control" value={form.store || "-"} readOnly disabled />
                  ) : (
                    <RSelect
                      options={storeOptions}
                      value={storeOptions.find((o) => String(o.value) === String(form.store)) || null}
                      onChange={(opt) => setField("store", opt?.value ? String(opt.value) : "")}
                      isClearable
                      isSearchable
                    />
                  )}
                </div>
              </>
            )}
            <div className="form-group">
              <FieldLabel>Pakai Master Voucher?</FieldLabel>
              <RSelect
                options={[
                  { value: "TIDAK", label: "TIDAK" },
                  { value: "YA", label: "YA" },
                ]}
                value={{ value: form.use_master_code, label: form.use_master_code }}
                isDisabled={locked}
                onChange={(opt) => setField("use_master_code", opt?.value || "TIDAK")}
              />
            </div>
            {form.use_master_code === "YA" && (
              <div className="form-group">
                <FieldLabel>Master Kode Voucher</FieldLabel>
                <input
                  className="form-control"
                  placeholder="Master Kode Voucher"
                  value={form.master_code_voucher}
                  disabled={locked}
                  onChange={(e) => setField("master_code_voucher", e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <FieldLabel>Keterangan</FieldLabel>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Keterangan Voucher"
                value={form.keterangan}
                disabled={locked}
                onChange={(e) => setField("keterangan", e.target.value)}
              />
            </div>
            <div className="form-group">
              <FieldLabel>Masa Berlaku Voucher</FieldLabel>
              <Row>
                <Col sm="6">
                  <AppDatePicker
                    selected={parseAppDate(form.from_date)}
                    onChange={(d) => setField("from_date", formatAppDateYmd(d))}
                    className="form-control date-picker"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Dari"
                    disabled={locked}
                    isClearable={!locked}
                  />
                </Col>
                <Col sm="6">
                  <AppDatePicker
                    selected={parseAppDate(form.to_date)}
                    onChange={(d) => setField("to_date", formatAppDateYmd(d))}
                    className="form-control date-picker"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Sampai"
                    disabled={locked}
                    isClearable={!locked}
                  />
                </Col>
              </Row>
            </div>
            <input type="hidden" value={vType} readOnly />
          </div>
        </Col>
      </Row>
    </Form>
  );

  return (
    <AccessGuard moduleCode="MAR_VCR_GENERATED" permission="VIEW">
      <>
        <Head title={isEdit ? "Voucher Generated — Detail" : "Generate Voucher"} />
        <Content>
          <div className="hrd-sc sc-scope">
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    Generate Voucher
                  </BlockTitle>
                  <BlockDes className="text-soft">
                    <span className="badge bg-outline-danger me-1">INFO</span>
                    {VTYPE_INFO[vType]} ({vType.toUpperCase()})
                    {isEdit && header ? (
                      <span className="ms-2">
                        · No.Urut {pick(header, "NO_URUT", "no_urut")} · ID{" "}
                        {pick(header, "ID_VOUCHER", "id_voucher")}
                      </span>
                    ) : null}
                  </BlockDes>
                </BlockHeadContent>
                <BlockHeadContent>
                  <div className="d-flex gap-2">
                    <ScBtn variant="soft" onClick={() => navigate(listHref)}>
                      <Icon name="arrow-left" className="me-1" />
                      {isEdit ? "Cancel" : "Batal"}
                    </ScBtn>
                    {!isEdit && (
                      <ScBtn disabled={!canCreate || saving} onClick={requestGenerate}>
                        {saving ? <Spinner size="sm" className="me-1" /> : <Icon name="save" className="me-1" />}
                        Generate
                      </ScBtn>
                    )}
                  </div>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>

            <Block>
              {error && !loading ? (
                <ErrorState message={error} onRetry={loadEdit} />
              ) : loading ? (
                <div className="text-center py-5">
                  <Spinner color="primary" />
                </div>
              ) : (
                <>
                  <div className="hrd-form-modal--sc card card-bordered mb-3">
                    <div className="card-inner">{renderForm()}</div>
                  </div>

                  {isEdit ? (
                    <div className="hrd-form-modal--sc card card-bordered">
                      <div className="card-inner border-bottom py-3">
                        <h6 className="title mb-0">Voucher Detail</h6>
                        <span className="text-soft small">
                          {details.length} kode voucher
                          {pick(header, "ID_VOUCHER", "id_voucher")
                            ? ` · ${pick(header, "ID_VOUCHER", "id_voucher")}`
                            : ""}
                        </span>
                      </div>
                      <div className="card-inner p-0">
                        <ProjectListTable
                          columns={detailColumns}
                          rows={details}
                          idField="no_voucher"
                          rowKey={(row, idx) =>
                            pick(row, "NO_VOUCHER", "no_voucher", "NO_URUT", "no_urut") || idx
                          }
                          currentPage={detailPage}
                          itemPerPage={50}
                          onPageChange={setDetailPage}
                          loading={false}
                          footerSumKeys={["nominal"]}
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </Block>
          </div>
        </Content>

        <ConfirmDialog
          variant="sc"
          isOpen={confirmOpen}
          title="Generate voucher?"
          message={`Generate ${form.qty || "0"} voucher ${vType.toUpperCase()} dengan total nilai ${
            computedTotal ? Number(computedTotal).toLocaleString("id-ID") : "0"
          }?`}
          confirmLabel="Generate"
          loading={saving}
          onCancel={() => (!saving ? setConfirmOpen(false) : null)}
          onConfirm={onSave}
        />
      </>
    </AccessGuard>
  );
};

export default MarcommVoucherGeneratedEditorPage;
