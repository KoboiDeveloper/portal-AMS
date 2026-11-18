import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import FormModal from "../../../components/admin/common/FormModal";
import ConfirmDialog from "../../../components/admin/common/ConfirmDialog";
import ErrorState from "../../../components/admin/common/ErrorState";
import ProjectListTable from "../../../components/admin/common/ProjectListTable";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import { isDropboxStoragePath } from "../../../lib/imageStorage";
import { extractRow, extractRows, isSuccess, notifyResponse } from "../../../lib/response";
import { exportStyledXlsx } from "../../../lib/exportStyledXlsx";
import { filesService } from "../../../services/files.service";
import { marcommMissionService } from "../../../services/marcomm/marcomm.service";
import { createdIdFromRes, pick } from "./marcommDetailShared";
import "../hrd/hrd-personel.css";
import "../dgs/dgs.css";

const MISSION_CATEGORIES = [
  { value: "1", label: "Mission by total amount" },
  { value: "2", label: "Mission by total transaksi" },
  { value: "3", label: "Mission Survey" },
];

const MISSION_BRANDS = ["CELCIUS", "CELCIUS WOMAN", "MISSISSIPPI", "QUEENSLAND"].map((value) => ({
  value,
  label: value,
}));

const MISSION_IMAGE_BASE = "https://web.amscorp.id:3060/imagestorage/mission/";

const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

const moneyId = (value) => {
  const raw = digitsOnly(value);
  if (!raw) return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("id-ID");
};

const dmyToYmd = (value) => {
  const raw = String(value || "").trim();
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return "";
};

const missionImageUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isDropboxStoragePath(raw)) return raw.startsWith("/") ? raw : `/${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${MISSION_IMAGE_BASE}${raw.replace(/^~?\/*imagestorage\/mission\//i, "").replace(/^\/+/, "")}`;
};

const missionImageFile = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isDropboxStoragePath(raw)) return raw.startsWith("/") ? raw : `/${raw}`;
  const marker = "/imagestorage/mission/";
  const at = raw.toLowerCase().indexOf(marker);
  if (at >= 0) return decodeURIComponent(raw.slice(at + marker.length).split(/[?#]/)[0]);
  return raw.replace(/^~?\/*imagestorage\/mission\//i, "");
};

const emptyHeader = (category = "") => ({
  title: "",
  description: "",
  category_id: category,
  brand: "",
  from_date: "",
  to_date: "",
  maxvalue: "",
  survey_link: "",
  image_url: "",
});

const milestoneFormEmpty = () => ({
  description: "",
  targetvalue: "",
  rewardcategory: "",
  rewardtext: "",
  maxclaim: "",
  rewardamount: "0",
});

const REWARD_CATEGORIES = [
  { value: "Voucher", label: "Voucher" },
  { value: "Barang", label: "Barang" },
];

const MILESTONE_FIELDS = [
  { name: "description", label: "Deskripsi", type: "text", required: true, section: "Milestone" },
  { name: "targetvalue", label: "Target", type: "number", required: true, section: "Milestone" },
  {
    name: "rewardcategory",
    label: "Kategori Reward",
    type: "select",
    options: REWARD_CATEGORIES,
    section: "Milestone",
  },
  { name: "rewardtext", label: "Reward", type: "text", section: "Milestone" },
  { name: "maxclaim", label: "Max Claim", type: "number", section: "Milestone" },
  {
    name: "rewardamount",
    label: "Nilai",
    type: "currency",
    hideCurrencyPrefix: true,
    section: "Milestone",
  },
];

const milestoneCols = [
  { key: "no", label: "No", type: "index" },
  { key: "Description", label: "Deskripsi" },
  {
    key: "target_value",
    label: "Target",
    align: "right",
    render: (row) => pick(row, "target_value_desc", "target_value", "targetvalue") || "-",
  },
  { key: "RewardCategory", label: "Kategori" },
  { key: "Reward", label: "Reward" },
];

const memberCols = [
  { key: "no", label: "No", type: "index" },
  { key: "id_member", label: "ID Member" },
  { key: "Nama", label: "Nama" },
  { key: "Email", label: "Email" },
  { key: "tgl_member", label: "Tgl Member" },
  { key: "Current_value", label: "Current Value" },
  { key: "milestones_completed", label: "Milestone" },
  { key: "milestone_sudah_claim", label: "Claim" },
];

const MEMBER_EXPORT_COLS = [
  { key: "id_member", label: "ID MEMBER" },
  { key: "Nama", label: "NAMA" },
  { key: "Email", label: "EMAIL" },
  { key: "tgl_member", label: "TGL.MEMBER" },
  { key: "Current_value", label: "CURRENT VALUE" },
  { key: "milestones_completed", label: "MILESTONE" },
  { key: "milestone_sudah_claim", label: "CLAIM" },
];

const FieldLabel = ({ children }) => <Label className="hrd-form-label text-uppercase">{children}</Label>;

const MarcommMissionDetailPage = () => {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !routeId || routeId === "new";
  const missionId = isNew ? "" : routeId;

  const perms = useActionPermissions("MAR_MBR_MISSION");
  const canSave = !perms.loading && (isNew ? perms.CREATE : perms.UPDATE);

  const presetCategory = searchParams.get("category") || "";
  const [header, setHeader] = useState(() => ({
    ...emptyHeader(presetCategory),
    brand: presetCategory ? "CELCIUS" : "",
  }));
  const [milestones, setMilestones] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberKw, setMemberKw] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const MEMBER_PAGE_SIZE = 50;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const [msModal, setMsModal] = useState({ open: false, mode: "add", row: null });
  const [msForm, setMsForm] = useState(milestoneFormEmpty());
  const [msSaving, setMsSaving] = useState(false);
  const [msConfirm, setMsConfirm] = useState({ open: false, row: null });
  const [participantsToolbarInView, setParticipantsToolbarInView] = useState(true);
  const participantsToolbarRef = useRef(null);

  const categoryVal = String(header.category_id || "");
  const isSurvey = categoryVal === "3";

  useEffect(() => {
    if (isNew && !["1", "2", "3"].includes(presetCategory)) {
      navigate("/admin/marcomm/member/mission", { replace: true });
    }
  }, [isNew, presetCategory, navigate]);

  useEffect(() => {
    const el = participantsToolbarRef.current;
    if (!el || isNew || typeof IntersectionObserver === "undefined") return undefined;
    const headerH = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--ams-header-h")
    );
    const top = Number.isFinite(headerH) ? headerH : 65;
    const io = new IntersectionObserver(
      ([entry]) => setParticipantsToolbarInView(Boolean(entry?.isIntersecting)),
      { root: null, threshold: 0, rootMargin: `-${top}px 0px 0px 0px` }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isNew, loading]);

  const loadMilestones = useCallback(async (mid) => {
    if (!mid) return;
    const res = await marcommMissionService.listMilestones(mid);
    if (isSuccess(res)) setMilestones(extractRows(res));
  }, []);

  const loadMembers = useCallback(async (mid, keywords) => {
    if (!mid) return;
    const res = await marcommMissionService.listMembers(mid, keywords ? { keywords } : {});
    if (isSuccess(res)) {
      setMembers(extractRows(res));
      setMemberPage(1);
    }
  }, []);

  const loadHeader = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError("");
    try {
      const res = await marcommMissionService.get(missionId);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat mission");
        return;
      }
      const row = extractRow(res) || {};
      setHeader({
        title: pick(row, "title", "judul", "JUDUL"),
        description: pick(row, "description", "deskripsi", "DEKSRIPSI"),
        category_id: String(pick(row, "category_id", "kategori") || ""),
        brand: pick(row, "brand", "BRAND"),
        from_date: dmyToYmd(pick(row, "from_date")),
        to_date: dmyToYmd(pick(row, "to_date", "to_DATE")),
        maxvalue: digitsOnly(pick(row, "maxvalue", "maxValue")),
        survey_link: pick(row, "survey_link"),
        image_url: missionImageUrl(pick(row, "image_url")),
      });
      await Promise.all([loadMilestones(missionId), loadMembers(missionId, "")]);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat mission");
    } finally {
      setLoading(false);
    }
  }, [isNew, missionId, loadMilestones, loadMembers]);

  useEffect(() => {
    loadHeader();
  }, [loadHeader]);

  useEffect(() => {
    let cancelled = false;
    const raw = String(header.image_url || "").trim();
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
    setPreviewUrl(missionImageUrl(raw));
    return undefined;
  }, [header.image_url]);

  const onSaveHeader = async () => {
    if (!canSave) return;
    const payload = {
      ...header,
      category_id: Number(header.category_id) || 0,
      maxvalue: Number(digitsOnly(header.maxvalue)) || 0,
      image_url: missionImageFile(header.image_url),
    };
    setSaving(true);
    try {
      let res;
      if (isNew) {
        res = await marcommMissionService.create(payload);
      } else {
        res = await marcommMissionService.update(missionId, payload);
      }
      if (!notifyResponse(res, isNew ? "Mission dibuat" : "Mission disimpan")) return;
      if (isNew) {
        const newId = createdIdFromRes(res);
        if (newId) navigate(`/admin/marcomm/member/mission/${encodeURIComponent(newId)}`, { replace: true });
        else navigate("/admin/marcomm/member/mission");
      } else {
        await loadHeader();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const onImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await filesService.upload(file, { module: "mission" });
      const path = res?.data?.path || res?.data?.pathLower;
      if (!isSuccess(res) || !path) {
        notifyResponse(res || { responseMessage: "Upload gagal" });
        return;
      }
      setHeader((p) => ({ ...p, image_url: path.startsWith("/") ? path : `/${path}` }));
    } catch (err) {
      notifyResponse(err);
    } finally {
      setUploading(false);
    }
  };

  const openMsAdd = () => {
    setMsForm(milestoneFormEmpty());
    setMsModal({ open: true, mode: "add", row: null });
  };

  const openMsEdit = (row) => {
    setMsForm({
      description: pick(row, "description", "Description"),
      targetvalue: pick(row, "targetvalue", "target_value"),
      rewardcategory: pick(row, "rewardcategory", "RewardCategory"),
      rewardtext: pick(row, "rewardtext", "Reward"),
      maxclaim: pick(row, "maxclaim"),
      rewardamount: digitsOnly(pick(row, "rewardamount", "RewardAmount")) || "0",
    });
    setMsModal({ open: true, mode: "edit", row });
  };

  const saveMilestone = async () => {
    if (!missionId) return;
    const payload = {
      ...msForm,
      rewardamount:
        msForm.rewardcategory === "Barang" ? "0" : digitsOnly(msForm.rewardamount) || "0",
      targetvalue: digitsOnly(msForm.targetvalue) || "0",
      maxclaim: digitsOnly(msForm.maxclaim) || "0",
    };
    setMsSaving(true);
    try {
      let res;
      if (msModal.mode === "add") {
        res = await marcommMissionService.createMilestone(missionId, payload);
      } else {
        const mid = pick(msModal.row, "MilestoneID", "id_milestone", "milestoneid", "id");
        res = await marcommMissionService.updateMilestone(missionId, mid, payload);
      }
      if (notifyResponse(res, msModal.mode === "add" ? "Milestone ditambah" : "Milestone disimpan")) {
        setMsModal({ open: false, mode: "add", row: null });
        await loadMilestones(missionId);
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setMsSaving(false);
    }
  };

  const deleteMilestone = async () => {
    if (!msConfirm.row || !missionId) return;
    setMsSaving(true);
    try {
      const mid = pick(msConfirm.row, "MilestoneID", "id_milestone", "milestoneid", "id");
      const res = await marcommMissionService.deleteMilestone(missionId, mid);
      if (notifyResponse(res, "Milestone dihapus")) {
        setMsConfirm({ open: false, row: null });
        await loadMilestones(missionId);
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setMsSaving(false);
    }
  };

  const msRowKey = useCallback(
    (row, idx) => pick(row, "MilestoneID", "id_milestone", "milestoneid", "id") || idx,
    []
  );

  const milestoneFields = useMemo(
    () =>
      MILESTONE_FIELDS.map((field) =>
        field.name === "rewardamount" && msForm.rewardcategory === "Barang"
          ? { ...field, disabled: true }
          : field
      ),
    [msForm.rewardcategory]
  );

  const brandOptions = useMemo(() => {
    const brand = String(header.brand || "");
    if (brand && !MISSION_BRANDS.some((o) => o.value === brand)) {
      return [{ value: brand, label: brand }, ...MISSION_BRANDS];
    }
    return MISSION_BRANDS;
  }, [header.brand]);

  const brandSelect = useMemo(
    () => brandOptions.find((o) => String(o.value) === String(header.brand)) || null,
    [brandOptions, header.brand]
  );

  const catSelect = useMemo(
    () => MISSION_CATEGORIES.find((o) => String(o.value) === categoryVal) || null,
    [categoryVal]
  );

  const exportMembers = async (kind) => {
    if (!missionId) return;
    try {
      const res =
        kind === "barang"
          ? await marcommMissionService.listMemberBarang(missionId, memberKw ? { keywords: memberKw } : {})
          : await marcommMissionService.listMembers(missionId, memberKw ? { keywords: memberKw } : {});
      if (!isSuccess(res)) {
        notifyResponse(res);
        return;
      }
      const rows = extractRows(res);
      await exportStyledXlsx({
        fileName: kind === "barang" ? "member_mission_claim_barang.xlsx" : "member_mission.xlsx",
        sheetName: "member",
        columns: MEMBER_EXPORT_COLS,
        rows,
      });
    } catch (err) {
      notifyResponse(err);
    }
  };

  return (
    <AccessGuard moduleCode="MAR_MBR_MISSION" permission="VIEW">
      <>
        <Head title={isNew ? "Mission Baru" : "Detail Mission"} />
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  {isNew ? "Mission Baru" : "Detail Mission"}
                </BlockTitle>
              </BlockHeadContent>
              <BlockHeadContent>
                <Button
                  color="light"
                  className="me-2"
                  onClick={() => {
                    if (isNew) navigate("/admin/marcomm/member/mission");
                    else navigate(-1);
                  }}
                >
                  <Icon name="arrow-left" className="me-1" />
                  Kembali
                </Button>
                {canSave && (
                  <Button color="primary" disabled={saving || loading} onClick={onSaveHeader}>
                    {saving ? <Spinner size="sm" className="me-1" /> : <Icon name="save" className="me-1" />}
                    Simpan
                  </Button>
                )}
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          {error && !loading ? (
            <ErrorState message={error} onRetry={loadHeader} />
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
                  <div className="row g-3 align-items-stretch">
                    <div className="col-lg-6">
                      <div className="card card-bordered h-100">
                        <div className="card-inner">
                          <Form>
                            <div className="mb-3">
                              <FieldLabel>Judul</FieldLabel>
                              <Input
                                value={header.title}
                                disabled={!canSave}
                                onChange={(e) => setHeader((p) => ({ ...p, title: e.target.value }))}
                              />
                            </div>
                            <div className="mb-3">
                              <FieldLabel>Deskripsi</FieldLabel>
                              <Input
                                type="textarea"
                                rows={4}
                                value={header.description}
                                disabled={!canSave}
                                onChange={(e) => setHeader((p) => ({ ...p, description: e.target.value }))}
                              />
                            </div>
                            <div className="mb-3">
                              <FieldLabel>Kategori</FieldLabel>
                              <RSelect
                                options={MISSION_CATEGORIES}
                                value={catSelect}
                                isDisabled={!canSave || isNew}
                                onChange={(opt) =>
                                  setHeader((p) => ({
                                    ...p,
                                    category_id: opt?.value != null ? String(opt.value) : "",
                                  }))
                                }
                              />
                            </div>
                            <div className="row g-3 gy-4">
                              <div className="col-md-6">
                                <FieldLabel>Max Value</FieldLabel>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  className="form-control text-end"
                                  value={moneyId(header.maxvalue)}
                                  disabled={!canSave}
                                  onChange={(e) =>
                                    setHeader((p) => ({ ...p, maxvalue: digitsOnly(e.target.value) }))
                                  }
                                />
                              </div>
                              <div className="col-md-6">
                                <FieldLabel>Brand</FieldLabel>
                                <RSelect
                                  options={brandOptions}
                                  value={brandSelect}
                                  isClearable
                                  isDisabled={!canSave}
                                  onChange={(opt) =>
                                    setHeader((p) => ({
                                      ...p,
                                      brand: opt?.value != null ? String(opt.value) : "",
                                    }))
                                  }
                                />
                              </div>
                              <div className="col-12">
                                <FieldLabel>Masa Berlaku</FieldLabel>
                                <AppDateRangePicker
                                  startDate={header.from_date}
                                  endDate={header.to_date}
                                  disabled={!canSave}
                                  className="form-control date-picker"
                                  onChange={(from, to) =>
                                    setHeader((p) => ({ ...p, from_date: from || "", to_date: to || "" }))
                                  }
                                />
                              </div>
                              {isSurvey && (
                                <div className="col-12">
                                  <FieldLabel>Survey Link</FieldLabel>
                                  <Input
                                    value={header.survey_link}
                                    disabled={!canSave}
                                    onChange={(e) => setHeader((p) => ({ ...p, survey_link: e.target.value }))}
                                  />
                                </div>
                              )}
                            </div>
                          </Form>
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="card card-bordered h-100">
                        <div className="card-inner p-4">
                          <h6 className="mb-3 text-uppercase">Upload Image</h6>
                          {canSave && (
                            <div className="mb-3">
                              <Input type="file" accept="image/*" disabled={uploading} onChange={onImage} />
                              {uploading ? <div className="small text-soft mt-2">Mengunggah ke Dropbox…</div> : null}
                            </div>
                          )}
                          <div className={`hrd-image-preview${previewUrl ? "" : " hrd-image-preview--empty"}`}>
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt=""
                                style={{ maxHeight: 280, width: "auto", maxWidth: "100%" }}
                              />
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

              <BlockHead size="sm" className="mt-4">
                <BlockBetween>
                  <BlockHeadContent>
                    <BlockTitle tag="h5">Milestone</BlockTitle>
                  </BlockHeadContent>
                  <BlockHeadContent>
                    {!isNew && perms.UPDATE && (
                      <Button size="sm" color="primary" onClick={openMsAdd}>
                        <Icon name="plus" />
                        <span>Tambah Milestone</span>
                      </Button>
                    )}
                  </BlockHeadContent>
                </BlockBetween>
              </BlockHead>
              <Block>
                {isNew ? (
                  <div className="card card-bordered">
                    <div className="card-inner">
                      <div className="text-soft small">Simpan mission dulu untuk menambah milestone.</div>
                    </div>
                  </div>
                ) : (
                  <ProjectListTable
                    columns={milestoneCols}
                    rows={milestones}
                    idField="MilestoneID"
                    rowKey={msRowKey}
                    canEdit={perms.UPDATE}
                    canDelete={perms.DELETE}
                    onEdit={openMsEdit}
                    onDelete={(row) => setMsConfirm({ open: true, row })}
                    currentPage={1}
                    itemPerPage={1000}
                    onPageChange={() => {}}
                    loading={false}
                  />
                )}
              </Block>

              {!isNew && (
                <div
                  className={`marcomm-mission-participants${
                    participantsToolbarInView ? " is-toolbar-visible" : ""
                  }`}
                >
                  <BlockHead size="sm" className="mt-4">
                    <BlockBetween className="g-3">
                      <BlockHeadContent>
                        <BlockTitle tag="h5">Participants</BlockTitle>
                      </BlockHeadContent>
                      <BlockHeadContent>
                        <div
                          ref={participantsToolbarRef}
                          className="d-flex gap-2 align-items-center flex-wrap marcomm-mission-participants-toolbar"
                        >
                          <Input
                            bsSize="sm"
                            placeholder="Keywords"
                            value={memberKw}
                            onChange={(e) => setMemberKw(e.target.value)}
                            className="w-200px"
                          />
                          <Button size="sm" color="light" onClick={() => loadMembers(missionId, memberKw)}>
                            <Icon name="search" />
                          </Button>
                          <Button size="sm" color="light" onClick={() => exportMembers("transaksi")}>
                            <Icon name="download" />
                            <span>Export Transaksi</span>
                          </Button>
                          <Button size="sm" color="light" onClick={() => exportMembers("barang")}>
                            <Icon name="download" />
                            <span>Milestone Barang</span>
                          </Button>
                        </div>
                      </BlockHeadContent>
                    </BlockBetween>
                  </BlockHead>
                  <Block>
                    <ProjectListTable
                      columns={memberCols}
                      rows={members}
                      idField="id_member"
                      currentPage={memberPage}
                      itemPerPage={MEMBER_PAGE_SIZE}
                      onPageChange={setMemberPage}
                      loading={false}
                      stickyHeader
                    />
                  </Block>
                </div>
              )}
            </>
          )}

          <FormModal
            isOpen={msModal.open}
            variant="sc"
            size="md"
            className="hrd-kontrak-form-anim hrd-form-modal--cols-compact hrd-form-modal--fit"
            sectionColumns={[["Milestone"]]}
            title={msModal.mode === "add" ? "Tambah Milestone" : "Ubah Milestone"}
            subtitle={msModal.mode === "add" ? "Lengkapi data milestone" : "Perbarui data milestone"}
            fields={milestoneFields}
            formData={msForm}
            onChange={(name, value) =>
              setMsForm((p) => {
                const next = { ...p, [name]: value };
                if (name === "rewardcategory" && value === "Barang") next.rewardamount = "0";
                return next;
              })
            }
            onSubmit={saveMilestone}
            onClose={() => setMsModal({ open: false, mode: "add", row: null })}
            loading={msSaving}
          />

          <ConfirmDialog
            isOpen={msConfirm.open}
            variant="sc"
            title="Hapus Milestone"
            message="Hapus milestone ini?"
            confirmLabel="Hapus"
            onConfirm={deleteMilestone}
            onCancel={() => setMsConfirm({ open: false, row: null })}
            loading={msSaving}
          />
        </Content>
      </>
    </AccessGuard>
  );
};

export default MarcommMissionDetailPage;
