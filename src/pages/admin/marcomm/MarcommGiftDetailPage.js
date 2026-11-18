import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, Label, Spinner } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import ErrorState from "../../../components/admin/common/ErrorState";
import ProjectListTable from "../../../components/admin/common/ProjectListTable";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import { isDropboxStoragePath } from "../../../lib/imageStorage";
import { extractRow, extractRows, isSuccess, notifyResponse } from "../../../lib/response";
import { filesService } from "../../../services/files.service";
import { marcommGiftService } from "../../../services/marcomm/marcomm.service";
import { createdIdFromRes, pick } from "./marcommDetailShared";
import {
  buildGiftVcrPrintHtml,
  openGiftPrintWindow,
  resolveGiftPenerima,
  writeGiftPrintWindow,
} from "./printGiftVcr";
import "../hrd/hrd-personel.css";

const TIPE_PENERIMA = [
  { value: "ALL", label: "ALL" },
  { value: "BRAND", label: "BRAND" },
  { value: "STORE", label: "STORE" },
];

const JENIS_POTONGAN = [
  { value: "CASH", label: "CASH" },
  { value: "PERSENTASE", label: "PERSENTASE" },
];

const BRAND_GIFT = ["AEESHA", "CELCIUS", "FLIES", "IWAN FASHION", "MISSISSIPPI", "QUEENSLAND"].map(
  (name) => ({ value: name, label: name })
);

const GIFT_IMAGE_BASE = "https://web.amscorp.id:3060/imagestorage/gift/";

const moneyId = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return String(value ?? "");
  return n.toLocaleString("id-ID");
};

const dmyToYmd = (value) => {
  const m = String(value || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) {
    const iso = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : "";
  }
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

const giftImageUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isDropboxStoragePath(raw)) return raw.startsWith("/") ? raw : `/${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${GIFT_IMAGE_BASE}${raw.replace(/^~?\/*imagestorage\/gift\//i, "").replace(/^\/+/, "")}`;
};

const giftImageFile = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isDropboxStoragePath(raw)) return raw.startsWith("/") ? raw : `/${raw}`;
  const marker = "/imagestorage/gift/";
  const at = raw.toLowerCase().indexOf(marker);
  if (at >= 0) return decodeURIComponent(raw.slice(at + marker.length).split(/[?#]/)[0]);
  return raw.replace(/^~?\/*imagestorage\/gift\//i, "");
};

const asOptions = (res) =>
  extractRows(res)
    .map((row) => ({
      value: String(row.value ?? row.code ?? row.CODE ?? "").trim(),
      label: String(row.label ?? row.keterangan ?? row.KETERANGAN ?? row.value ?? "").trim(),
    }))
    .filter((o) => o.value);

const emptyGift = () => ({
  qty: "",
  jenis_potongan: "CASH",
  persentase: "0",
  nominal: "",
  nominal_total: "",
  tipe_penerima: "ALL",
  brand: "",
  store: "",
  from_date: "",
  to_date: "",
  kategori_gift: "",
  judul: "",
  keterangan: "",
  image_url: "",
  account_number: "",
  vType: "GIFT",
  id_voucher: "",
});

const detailCols = [
  { key: "no", label: "No", type: "index" },
  { key: "NO_VOUCHER", label: "Code", sortable: true },
  { key: "ID_MEMBER", label: "ID Member", sortable: true },
  { key: "NAMA_MEMBER", label: "Nama", sortable: true },
  {
    key: "nominal",
    label: "Nilai",
    align: "right",
    sortable: true,
    render: (row) => moneyId(pick(row, "nominal", "NOMINAL")),
  },
  {
    key: "STATUS_PENGGUNAAN",
    label: "Status Penggunaan",
    sortable: true,
    render: (row) => {
      const status = String(pick(row, "STATUS_PENGGUNAAN", "status_penggunaan") || "").trim();
      const used = /sudah\s*digunakan/i.test(status);
      return (
        <span
          className={`badge ${used ? "bg-danger" : "bg-success"}`}
          style={{ color: "#fff", fontWeight: 600 }}
        >
          {status || "-"}
        </span>
      );
    },
  },
];

const FieldLabel = ({ children }) => <Label className="hrd-form-label text-uppercase">{children}</Label>;

const MarcommGiftDetailPage = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const isNew = !routeId || routeId === "new";
  const giftId = isNew ? "" : routeId;

  const perms = useActionPermissions("MAR_MBR_REWARDS");
  const canSave = !perms.loading && (isNew ? perms.CREATE : perms.UPDATE);
  const locked = !isNew;

  const [form, setForm] = useState(emptyGift);
  const [details, setDetails] = useState([]);
  const [kaitBrands, setKaitBrands] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [giftCatOptions, setGiftCatOptions] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [memberFileName, setMemberFileName] = useState("");
  const memberFileRef = useRef(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const totalNominal = useMemo(() => {
    if (!isNew && form.nominal_total !== "" && form.nominal_total != null) {
      const headerTotal = Number(String(form.nominal_total).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(headerTotal)) return headerTotal;
    }
    const q = Number(form.qty) || 0;
    const n = Number(form.nominal) || 0;
    return q * n;
  }, [form.nominal, form.nominal_total, form.qty, isNew]);

  const detailTotal = useMemo(
    () =>
      details.reduce((sum, row) => {
        const n = Number(String(pick(row, "nominal", "NOMINAL") ?? "").replace(/[^\d.-]/g, ""));
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [details]
  );

  useEffect(() => {
    let cancelled = false;
    const loadOpts = async () => {
      const [cats, brands] = await Promise.all([
        marcommGiftService.listCategories(),
        marcommGiftService.listBrands(),
      ]);
      if (cancelled) return;
      if (isSuccess(cats)) setGiftCatOptions(asOptions(cats));
      if (isSuccess(brands)) setKaitBrands(asOptions(brands));
    };
    loadOpts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (form.tipe_penerima !== "STORE" || !form.brand) {
      setStoreOptions([]);
      return undefined;
    }
    let cancelled = false;
    marcommGiftService.listStores(form.brand).then((res) => {
      if (!cancelled && isSuccess(res)) setStoreOptions(asOptions(res));
    });
    return () => {
      cancelled = true;
    };
  }, [form.brand, form.tipe_penerima]);

  useEffect(() => {
    let cancelled = false;
    const raw = String(form.image_url || "").trim();
    if (!raw) {
      setPreviewUrl("");
      return undefined;
    }
    if (isDropboxStoragePath(raw)) {
      const path = raw.startsWith("/") ? raw : `/${raw}`;
      filesService.getTemporaryLink(path).then((res) => {
        if (cancelled) return;
        setPreviewUrl(isSuccess(res) ? res?.data?.temporaryLink || "" : "");
      });
      return () => {
        cancelled = true;
      };
    }
    setPreviewUrl(giftImageUrl(raw));
    return undefined;
  }, [form.image_url]);

  const loadGift = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError("");
    try {
      const res = await marcommGiftService.get(giftId);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat gift");
        return;
      }
      const row = extractRow(res) || {};
      const text = (...keys) => String(pick(row, ...keys) ?? "").trim();
      const idVoucher = text("ID_VOUCHER");
      setForm({
        qty: text("QTY_VOUCHER", "qty"),
        jenis_potongan: text("jenis_potongan") || "CASH",
        persentase: text("persentase") || "0",
        nominal: text("NOMINAL_PERVOUCHER"),
        nominal_total: text("NOMINAL", "nominal"),
        tipe_penerima: text("TIPE_VOUCHER", "tipe_penerima") || "ALL",
        brand: text("BRAND", "brand"),
        store: text("STORE", "store"),
        from_date: dmyToYmd(text("start_date", "from_date")),
        to_date: dmyToYmd(text("end_date", "END_DATE", "to_date")),
        kategori_gift: text("kategori", "kategori_gift"),
        judul: text("JUDUL", "judul"),
        keterangan: text("KETERANGAN", "keterangan"),
        image_url: giftImageUrl(text("image_url")),
        account_number: text("NO_JOURNAL", "account_number"),
        vType: "GIFT",
        id_voucher: idVoucher,
      });
      if (idVoucher) {
        const det = await marcommGiftService.listDetails(giftId, idVoucher);
        if (isSuccess(det)) setDetails(extractRows(det));
      }
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat gift");
    } finally {
      setLoading(false);
    }
  }, [giftId, isNew]);

  useEffect(() => {
    loadGift();
  }, [loadGift]);

  const onSave = async () => {
    if (!canSave) return;
    const members = (Array.isArray(memberIds) ? memberIds : [])
      .map((x) => String(x || "").trim())
      .filter(Boolean);
    const payload = {
      ...form,
      image_url: giftImageFile(form.image_url),
      nominal: String(Math.round((Number(form.qty) || 0) * (Number(form.nominal) || 0))),
      brand: form.tipe_penerima === "ALL" ? "" : form.brand,
      store: form.tipe_penerima === "STORE" ? form.store : "",
      ...(isNew && members.length ? { members } : {}),
    };

    setSaving(true);
    try {
      const res = isNew
        ? await marcommGiftService.create(payload)
        : await marcommGiftService.update(giftId, payload);
      if (!notifyResponse(res, isNew ? "Gift dibuat" : "Gift disimpan")) return;
      if (isNew) {
        const newId = createdIdFromRes(res);
        if (newId) navigate(`/admin/marcomm/member/rewards/${encodeURIComponent(newId)}`, { replace: true });
        else navigate("/admin/marcomm/member/rewards");
      } else {
        await loadGift();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const onImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await filesService.upload(file, { module: "gift" });
      const path = res?.data?.path || res?.data?.pathLower;
      if (!isSuccess(res) || !path) {
        notifyResponse(res || { responseMessage: "Upload gagal" });
        return;
      }
      setField("image_url", path);
    } catch (err) {
      notifyResponse(err);
    } finally {
      setUploading(false);
    }
  };

  const onMemberFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const sheet = wb.worksheets[0];
      if (!sheet) {
        notifyResponse({ responseMessage: "Sheet Excel kosong." });
        return;
      }
      let col = 1;
      sheet.getRow(1).eachCell((cell, idx) => {
        const name = String(cell.value || "").toUpperCase();
        if (name.includes("ID_MEMBER") || name === "ID") col = idx;
      });
      const ids = [];
      sheet.eachRow((row, n) => {
        if (n === 1) return;
        const cell = row.getCell(col).value;
        const id = String(cell?.text || cell || "").trim();
        if (id && id.toUpperCase() !== "ID_MEMBER") ids.push(id);
      });
      setMemberIds(ids);
      setMemberFileName(file.name);
      if (!ids.length) {
        notifyResponse({ responseMessage: "Tidak ada ID_MEMBER di file. Pastikan header kolom ID_MEMBER." });
      }
    } catch {
      setMemberIds([]);
      setMemberFileName("");
      notifyResponse({ responseMessage: "File Excel tidak terbaca. Pakai .xlsx/.xls dengan kolom ID_MEMBER." });
    }
  };

  const brandOptions = form.tipe_penerima === "BRAND" ? BRAND_GIFT : kaitBrands;
  const isPersen = form.jenis_potongan === "PERSENTASE";
  const categoryValue =
    giftCatOptions.find((o) => String(o.value) === String(form.kategori_gift)) ||
    giftCatOptions.find((o) => String(o.label).toUpperCase() === String(form.kategori_gift).toUpperCase()) ||
    null;

  const onPrint = () => {
    const w = openGiftPrintWindow();
    if (!w) {
      notifyResponse({ responseMessage: "Popup diblokir. Izinkan popup untuk print." });
      return;
    }
    const storeOpt = storeOptions.find((o) => String(o.value) === String(form.store));
    const penerima = resolveGiftPenerima({
      tipe_penerima: form.tipe_penerima,
      brand: form.brand,
      store: form.store,
      storeLabel: storeOpt?.label || form.store,
    });
    const html = buildGiftVcrPrintHtml(
      {
        nominal: form.nominal,
        qty: form.qty,
        penerima,
        brand: form.brand,
        store: form.store,
        from_date: form.from_date,
        to_date: form.to_date,
        id_voucher: form.id_voucher,
      },
      details
    );
    writeGiftPrintWindow(w, html);
  };

  return (
    <AccessGuard moduleCode="MAR_MBR_REWARDS" permission="VIEW">
      <>
        <Head title={isNew ? "Generate Member Reward" : "Generate Member Reward"} />
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Generate Member Reward
                </BlockTitle>
              </BlockHeadContent>
              <BlockHeadContent>
                <Button
                  color="danger"
                  className="me-2"
                  onClick={() => {
                    if (isNew) navigate("/admin/marcomm/member/rewards");
                    else navigate(-1);
                  }}
                >
                  <Icon name="arrow-left" className="me-1" />
                  {isNew ? "Cancel" : "Back"}
                </Button>
                {!isNew && (
                  <Button color="info" className="me-2" disabled={loading} onClick={onPrint}>
                    <Icon name="printer" className="me-1" />
                    Print
                  </Button>
                )}
                {canSave && (
                  <Button color="primary" disabled={saving || loading} onClick={onSave}>
                    {saving ? <Spinner size="sm" className="me-1" /> : <Icon name="save" className="me-1" />}
                    {isNew ? "Generate" : "Update"}
                  </Button>
                )}
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          {error && !loading ? (
            <ErrorState message={error} onRetry={loadGift} />
          ) : loading ? (
            <Block>
              <div className="text-center py-5">
                <Spinner color="primary" />
              </div>
            </Block>
          ) : (
            <>
              <Block>
                <div className="hrd-form-modal--sc">
                  <div className="row g-3">
                    <div className="col-lg-6">
                      <div className="card card-bordered mb-3">
                        <div className="card-inner">
                          <Form>
                            <div className="row g-3">
                              <div className="col-6">
                                <FieldLabel>Qty Reward</FieldLabel>
                                <Input
                                  type="number"
                                  className="form-control text-end"
                                  value={form.qty}
                                  disabled={!canSave || locked}
                                  onChange={(e) => setField("qty", e.target.value)}
                                />
                              </div>
                              <div className="col-6">
                                <FieldLabel>Jenis Potongan</FieldLabel>
                                <RSelect
                                  options={JENIS_POTONGAN}
                                  value={JENIS_POTONGAN.find((o) => o.value === form.jenis_potongan) || null}
                                  isDisabled={!canSave || locked}
                                  onChange={(opt) => setField("jenis_potongan", opt?.value || "CASH")}
                                />
                              </div>

                              {isPersen && (
                                <div className="col-12">
                                  <FieldLabel>Persentase</FieldLabel>
                                  <div className="d-flex align-items-center gap-2">
                                    <Input
                                      type="number"
                                      className="form-control text-end"
                                      value={form.persentase}
                                      disabled={!canSave || locked}
                                      onChange={(e) => setField("persentase", e.target.value)}
                                    />
                                    <span className="fw-bold">%</span>
                                  </div>
                                </div>
                              )}

                              <div className="col-6">
                                <FieldLabel>{isPersen ? "Max Nilai" : "Nilai"}</FieldLabel>
                                <Input
                                  type="number"
                                  className="form-control text-end"
                                  value={form.nominal}
                                  disabled={!canSave || locked}
                                  onChange={(e) => setField("nominal", e.target.value)}
                                />
                              </div>
                              <div className="col-6">
                                <FieldLabel>Total Nilai</FieldLabel>
                                <Input
                                  value={moneyId(totalNominal)}
                                  disabled
                                  readOnly
                                  className="form-control text-end"
                                  style={{ color: "#ff4500", fontWeight: 600 }}
                                />
                              </div>

                              <div className={form.tipe_penerima === "BRAND" ? "col-6" : "col-12"}>
                                <FieldLabel>Tempat Penukaran</FieldLabel>
                                <RSelect
                                  options={TIPE_PENERIMA}
                                  value={TIPE_PENERIMA.find((o) => o.value === form.tipe_penerima) || null}
                                  isDisabled={!canSave || locked}
                                  onChange={(opt) =>
                                    setForm((p) => ({
                                      ...p,
                                      tipe_penerima: opt?.value || "ALL",
                                      brand: "",
                                      store: "",
                                    }))
                                  }
                                />
                              </div>

                              {form.tipe_penerima === "BRAND" && (
                                <div className="col-6">
                                  <FieldLabel>Brand</FieldLabel>
                                  <RSelect
                                    isClearable={!locked}
                                    options={brandOptions}
                                    value={
                                      brandOptions.find((o) => String(o.value) === String(form.brand)) ||
                                      (form.brand ? { value: form.brand, label: form.brand } : null)
                                    }
                                    isDisabled={!canSave || locked}
                                    onChange={(opt) =>
                                      setForm((p) => ({
                                        ...p,
                                        brand: opt?.value != null ? String(opt.value) : "",
                                        store: "",
                                      }))
                                    }
                                  />
                                </div>
                              )}

                              {form.tipe_penerima === "STORE" && (
                                <>
                                  <div className="col-6">
                                    <FieldLabel>Brand</FieldLabel>
                                    <RSelect
                                      isClearable={!locked}
                                      options={brandOptions}
                                      value={
                                        brandOptions.find((o) => String(o.value) === String(form.brand)) ||
                                        (form.brand ? { value: form.brand, label: form.brand } : null)
                                      }
                                      isDisabled={!canSave || locked}
                                      onChange={(opt) =>
                                        setForm((p) => ({
                                          ...p,
                                          brand: opt?.value != null ? String(opt.value) : "",
                                          store: "",
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="col-6">
                                    <FieldLabel>Store</FieldLabel>
                                    <RSelect
                                      isClearable={!locked}
                                      options={storeOptions}
                                      value={
                                        storeOptions.find((o) => String(o.value) === String(form.store)) ||
                                        (form.store ? { value: form.store, label: form.store } : null)
                                      }
                                      isDisabled={!canSave || locked || !form.brand}
                                      onChange={(opt) => setField("store", opt?.value != null ? String(opt.value) : "")}
                                    />
                                  </div>
                                </>
                              )}

                              <div className="col-12">
                                <FieldLabel>Masa Berlaku</FieldLabel>
                                <AppDateRangePicker
                                  startDate={form.from_date}
                                  endDate={form.to_date}
                                  disabled={!canSave || locked}
                                  className="form-control date-picker"
                                  onChange={(from, to) => setForm((p) => ({ ...p, from_date: from || "", to_date: to || "" }))}
                                />
                              </div>
                            </div>
                          </Form>
                        </div>
                      </div>

                      <div className="card card-bordered">
                        <div className="card-inner">
                          <div className="mb-3">
                            <FieldLabel>Category</FieldLabel>
                            <RSelect
                              isClearable
                              options={giftCatOptions}
                              value={categoryValue}
                              isDisabled={!canSave}
                              onChange={(opt) => setField("kategori_gift", opt?.value != null ? String(opt.value) : "")}
                            />
                          </div>
                          <div className="mb-3">
                            <FieldLabel>Title</FieldLabel>
                            <Input value={form.judul} disabled={!canSave} onChange={(e) => setField("judul", e.target.value)} />
                          </div>
                          <div className="mb-0">
                            <FieldLabel>Keterangan</FieldLabel>
                            <Input
                              type="textarea"
                              rows={6}
                              placeholder="Keterangan Voucher"
                              value={form.keterangan}
                              disabled={!canSave}
                              onChange={(e) => setField("keterangan", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="card card-bordered mb-3">
                        <div className="card-inner p-4">
                          <h6 className="mb-3 text-uppercase">Upload Member</h6>
                          <div className="d-flex align-items-center flex-wrap gap-3 mb-3">
                            <input
                              ref={memberFileRef}
                              type="file"
                              accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                              hidden
                              disabled={!isNew || !canSave}
                              onChange={onMemberFile}
                            />
                            <Button
                              color="primary"
                              disabled={!isNew || !canSave}
                              onClick={() => memberFileRef.current?.click()}
                            >
                              <Icon name="upload" className="me-1" />
                              Choose File
                            </Button>
                            <span className="text-soft">
                              {memberFileName || (!isNew ? "Upload member hanya saat generate" : "No file chosen")}
                            </span>
                          </div>
                          <div className="alert alert-info mb-0 px-3 py-3" role="alert">
                            Pastikan Jumlah ID Member dan Jumlah Qty Reward sama!
                          </div>
                          {isNew && memberIds.length > 0 && (
                            <div className="mt-3 text-soft">
                              {memberIds.length} ID member dari Excel siap digenerate.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="card card-bordered">
                        <div className="card-inner p-4">
                          <h6 className="mb-3 text-uppercase">Upload Image</h6>
                          {canSave && (
                            <div className="mb-3">
                              <Input type="file" accept="image/*" disabled={uploading} onChange={onImage} />
                            </div>
                          )}
                          <div className={`hrd-image-preview${previewUrl ? "" : " hrd-image-preview--empty"}`}>
                            {previewUrl ? (
                              <img src={previewUrl} alt="" style={{ maxHeight: 250, width: "auto", maxWidth: "100%" }} />
                            ) : (
                              "Belum ada gambar"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Block>

              {!isNew && (
                <>
                  <BlockHead size="sm">
                    <BlockTitle tag="h5">Reward Detail</BlockTitle>
                  </BlockHead>
                  <Block>
                    <ProjectListTable
                      columns={detailCols}
                      rows={details}
                      idField="NO_VOUCHER"
                      currentPage={1}
                      itemPerPage={1000}
                      onPageChange={() => {}}
                      loading={false}
                      stickyHeader
                      defaultSort={{ key: "STATUS_PENGGUNAAN", direction: "desc" }}
                      getRowClassName={(row) =>
                        /sudah\s*digunakan/i.test(String(pick(row, "STATUS_PENGGUNAAN", "status_penggunaan") || ""))
                          ? "gift-row-used"
                          : ""
                      }
                    />
                    {details.length > 0 && (
                      <div className="text-end fw-bold mt-2 pe-2">Total: {moneyId(detailTotal)}</div>
                    )}
                  </Block>
                </>
              )}
            </>
          )}
        </Content>
      </>
    </AccessGuard>
  );
};

export default MarcommGiftDetailPage;
