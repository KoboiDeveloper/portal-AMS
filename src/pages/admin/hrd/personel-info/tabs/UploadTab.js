import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../../../../../components/Component";
import FormModal from "../../../../../components/admin/common/FormModal";
import { extractRow, notifyResponse } from "../../../../../lib/response";
import { hrdPersonelInfoService } from "../../../../../services/hrd/hrd.service";
import { useActionPermissions } from "../../../../../hooks/useActionPermissions";
import { ScBtn, ScError } from "../../../dgs/sc";
import {
  PERSONEL_MODULE,
  SectionTitle,
  TabSkeleton,
  isImageFile,
  mf,
  resolvePhotoUrl,
} from "../shared";

const service = hrdPersonelInfoService.upload;

const DOCS = [
  { key: "ktp", label: "KTP" },
  { key: "npwp", label: "NPWP" },
  { key: "kk", label: "Kartu keluarga" },
  { key: "ijazah", label: "Ijazah" },
];

const MODAL_FIELDS = [
  mf("photo", "Foto pegawai (nama file / URL)", 12),
  ...DOCS.map((d) => mf(d.key, `${d.label} (nama file / URL)`, 6)),
];

const emptyDocs = { photo: "", ktp: "", npwp: "", kk: "", ijazah: "" };

const DocPreview = ({ label, value }) => {
  const url = resolvePhotoUrl(value);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [url]);

  return (
    <div className="hrd-doc">
      <div className="hrd-doc__preview">
        {url && isImageFile(value) && !broken ? (
          <img src={url} alt={label} onError={() => setBroken(true)} />
        ) : url ? (
          <a href={url} target="_blank" rel="noreferrer" className="hrd-doc__file">
            <Icon name="file-docs" />
            <span>Buka berkas</span>
          </a>
        ) : (
          <span className="hrd-doc__none">Belum ada berkas</span>
        )}
      </div>
      <p className="hrd-doc__label">{label}</p>
      {value ? <p className="hrd-doc__name">{String(value)}</p> : null}
    </div>
  );
};

const UploadTab = ({ pegawai, photo, onPhotoChanged }) => {
  const perms = useActionPermissions(PERSONEL_MODULE);
  const canEdit = !perms.loading && perms.UPDATE;
  const [docs, setDocs] = useState(emptyDocs);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyDocs);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await service.get(pegawai.id);
      const row = extractRow(res) || {};
      setDocs({
        photo: row.photo || photo || "",
        ktp: row.ktp || "",
        npwp: row.npwp || "",
        kk: row.kk || "",
        ijazah: row.ijazah || "",
      });
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat dokumen");
    } finally {
      setLoading(false);
    }
  }, [pegawai.id, photo]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = () => {
    setFormData({ ...docs });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await service.update(pegawai.id, formData);
      if (notifyResponse(res, "Dokumen tersimpan")) {
        setModalOpen(false);
        load();
        onPhotoChanged?.();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TabSkeleton rows={2} />;
  if (error) return <ScError message={error} onRetry={load} />;

  return (
    <div className="hrd-sub">
      <SectionTitle
        actions={
          canEdit ? (
            <ScBtn variant="soft" onClick={openModal}>
              <Icon name="edit" /> Ubah dokumen & foto
            </ScBtn>
          ) : null
        }
      >
        Upload document
      </SectionTitle>
      <div className="hrd-doc-grid">
        <DocPreview label="Foto pegawai" value={docs.photo} />
        {DOCS.map((d) => (
          <DocPreview key={d.key} label={d.label} value={docs[d.key]} />
        ))}
      </div>

      <FormModal
        isOpen={modalOpen}
        variant="sc"
        size="lg"
        title="Ubah dokumen & foto"
        subtitle={[pegawai.nik, pegawai.employee_name].filter(Boolean).join(" · ")}
        fields={MODAL_FIELDS}
        formData={formData}
        onChange={(name, value) => setFormData((prev) => ({ ...prev, [name]: value }))}
        onSubmit={save}
        onClose={() => setModalOpen(false)}
        loading={saving}
        submitLabel="Simpan"
      />
    </div>
  );
};

export default UploadTab;
