import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO, isValid, eachDayOfInterval, startOfDay, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Dropzone from "react-dropzone";
import { Controlled as ControlledZoom } from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { toast } from "react-toastify";
import { Alert, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Spinner } from "reactstrap";
import { Button, Icon } from "../../../../components/Component";
import { getActorId } from "../../../../lib/auth";
import { isSuccess } from "../../../../lib/response";
import { buildImageStorageUrl, isDropboxStoragePath, isMissingImagePath } from "../../../../lib/imageStorage";
import { filesService } from "../../../../services/files.service";
import { storeSlipSetoranBankService } from "../../../../services/store-slip-setoran-bank.service";

const ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

const SLIP_SLOTS = [
  { key: "image_1", rowKey: "image1", label: "Mandiri (Slip)", group: "slip" },
  { key: "image_2", rowKey: "image2", label: "BNI (Slip)", group: "slip" },
  { key: "image_3", rowKey: "image3", label: "Direct Selling", group: "slip" },
  { key: "image_4", rowKey: "image4", label: "Mandiri (Settlement)", group: "settlement" },
  { key: "image_5", rowKey: "image5", label: "BNI (Settlement)", group: "settlement" },
  { key: "image_6", rowKey: "image6", label: "BCA (Settlement)", group: "settlement" },
];

const isApiOk = (res) => {
  const code = String(res?.responseCode ?? "");
  return isSuccess(res) || code === "00" || code === "2000000";
};

const emptyFiles = () => ({
  image_1: null,
  image_2: null,
  image_3: null,
  image_4: null,
  image_5: null,
  image_6: null,
});

const emptyPaths = () => ({
  image_1: "",
  image_2: "",
  image_3: "",
  image_4: "",
  image_5: "",
  image_6: "",
});

const toDateKey = (value) => {
  if (!value) return "";
  if (value instanceof Date && isValid(value)) return format(value, "yyyy-MM-dd");
  const raw = String(value).trim();
  if (!raw) return "";
  const first = raw.split(",")[0].trim();
  const parsed = parseISO(first.length <= 10 ? first : first.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  return first.slice(0, 10);
};

const parseMaybeDate = (value) => {
  const key = toDateKey(value);
  if (!key) return null;
  const parsed = parseISO(key);
  return isValid(parsed) ? startOfDay(parsed) : null;
};

const resolvePreviewUrl = async (filename) => {
  const value = String(filename ?? "").trim();
  if (!value || isMissingImagePath(value)) return "";

  // Path baru (Dropbox) → temporary link; path lama → base URL imagestorage
  if (isDropboxStoragePath(value)) {
    try {
      const path = value.startsWith("/") ? value : `/${value}`;
      const res = await filesService.getTemporaryLink(path);
      if ((isSuccess(res) || String(res?.responseCode) === "00") && res?.data?.temporaryLink) {
        return res.data.temporaryLink;
      }
    } catch {
      /* fall through — jangan pakai imagestorage untuk path dropbox */
    }
    return "";
  }

  return buildImageStorageUrl(value);
};

/**
 * Tanggal kosong = sehari setelah batch terakhir s/d hari ini.
 * Contoh: max detail 15, hari ini 18 → opsi 16, 17, 18.
 */
const buildEmptyBatchOptions = (occupiedKeys) => {
  const today = startOfDay(new Date());
  const occupiedDates = [...occupiedKeys]
    .map((key) => parseMaybeDate(key))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  const lastFilled = occupiedDates.length ? occupiedDates[occupiedDates.length - 1] : null;
  const earliest = lastFilled ? addDays(lastFilled, 1) : today;

  if (earliest > today) {
    return { options: [], lastFilled, earliest: null, latest: today };
  }

  const days = eachDayOfInterval({ start: earliest, end: today });
  const options = days.filter((day) => !occupiedKeys.has(format(day, "yyyy-MM-dd")));
  return { options, lastFilled, earliest, latest: today };
};

const formatBatchPretty = (value, withWeekday = false) => {
  const parsed = value instanceof Date && isValid(value) ? value : parseMaybeDate(value);
  if (!parsed) return "—";
  if (withWeekday) return format(parsed, "EEEE, dd MMM yyyy", { locale: localeId });
  return format(parsed, "dd MMM yyyy", { locale: localeId });
};

const formatBatchParts = (value) => {
  const parsed = value instanceof Date && isValid(value) ? value : parseMaybeDate(value);
  if (!parsed) return { weekday: "—", iso: "—", pretty: "—" };
  return {
    weekday: format(parsed, "EEEE", { locale: localeId }),
    iso: format(parsed, "yyyy-MM-dd"),
    pretty: format(parsed, "dd MMM yyyy", { locale: localeId }),
  };
};

const SlotDrop = ({
  label,
  file,
  preview,
  onPick,
  onClear,
  disabled,
  allowClear = true,
  emptyLabel = "Pilih / drop file",
}) => {
  const [broken, setBroken] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  useEffect(() => {
    setBroken(false);
    setIsZoomed(false);
  }, [preview, file]);

  const showPreview = Boolean(preview) && !broken;
  const hasMedia = Boolean(file || showPreview);

  return (
    <div className={`ssb-upload-slot${hasMedia ? " has-file" : ""}`}>
      <div className="ssb-upload-slot-label">{label}</div>
      <div className="ssb-upload-frame">
        <Dropzone
          onDrop={(accepted) => {
            if (accepted?.[0]) onPick(accepted[0]);
          }}
          accept={ACCEPT}
          maxFiles={1}
          multiple={false}
          disabled={disabled}
          noClick={hasMedia}
        >
          {({ getRootProps, getInputProps, isDragActive, open }) => (
            <div
              {...getRootProps()}
              className={`ssb-upload-drop${isDragActive ? " is-active" : ""}${disabled ? " is-disabled" : ""}${hasMedia ? " has-preview" : ""}`}
            >
              <input {...getInputProps()} />
              {showPreview ? (
                <ControlledZoom
                  isZoomed={isZoomed}
                  onZoomChange={setIsZoomed}
                  zoomMargin={40}
                  classDialog="ssb-zoom-dialog"
                >
                  <img
                    src={preview}
                    alt={label}
                    className="ssb-upload-preview"
                    onError={() => setBroken(true)}
                  />
                </ControlledZoom>
              ) : file ? (
                <div className="ssb-upload-pdf">
                  <Icon name="file-pdf" />
                  <span>{file.name}</span>
                </div>
              ) : (
                <div className="ssb-upload-empty">
                  <Icon name="upload-cloud" />
                  <span>{emptyLabel}</span>
                </div>
              )}
              {hasMedia && !disabled ? (
                <div className="ssb-upload-actions">
                  {showPreview ? (
                    <button
                      type="button"
                      className="ssb-upload-action"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsZoomed(true);
                      }}
                    >
                      <Icon name="eye" />
                      <span>Lihat</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ssb-upload-action"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      open();
                    }}
                  >
                    <Icon name="img" />
                    <span>Ganti</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </Dropzone>
        {allowClear && hasMedia && !disabled ? (
          <button
            type="button"
            className="ssb-upload-clear"
            title="Hapus"
            aria-label="Hapus file"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }}
          >
            <Icon name="cross" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

/**
 * mode: "add" | "edit"
 * item: existing row (edit)
 * occupiedBatchKeys: Set/array of yyyy-MM-dd that already have batch
 * periodFrom / periodTo: Date from page filter
 */
const SlipSetoranUploadModal = ({
  open,
  onClose,
  onSuccess,
  mode = "add",
  item = null,
  storeId = "",
  occupiedBatchKeys = [],
  periodFrom = null,
  periodTo = null,
}) => {
  const [files, setFiles] = useState(emptyFiles);
  const [existingPaths, setExistingPaths] = useState(emptyPaths);
  const [originalPaths, setOriginalPaths] = useState(emptyPaths);
  const [clearedKeys, setClearedKeys] = useState(() => new Set());
  const [previews, setPreviews] = useState({});
  const [nilaiMandiri, setNilaiMandiri] = useState("");
  const [nilaiBni, setNilaiBni] = useState("");
  const [nilaiDirect, setNilaiDirect] = useState("");
  const [batchDate, setBatchDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const previewUrlsRef = useRef([]);
  const initTokenRef = useRef(0);

  const occupiedSet = useMemo(() => {
    const set = new Set();
    (occupiedBatchKeys || []).forEach((key) => {
      const normalized = toDateKey(key);
      if (normalized) set.add(normalized);
    });
    return set;
  }, [occupiedBatchKeys]);

  const emptyBatch = useMemo(() => buildEmptyBatchOptions(occupiedSet), [occupiedSet]);

  const batchKey = toDateKey(batchDate) || "—";
  const isEditMode = mode === "edit";
  const editId = item?.id != null && /^\d+$/.test(String(item.id)) ? String(item.id) : "";
  const canUpdate = isEditMode && Boolean(editId);
  const optionIndex = useMemo(() => {
    if (!batchDate || !emptyBatch.options.length) return -1;
    const key = toDateKey(batchDate);
    return emptyBatch.options.findIndex((day) => format(day, "yyyy-MM-dd") === key);
  }, [batchDate, emptyBatch.options]);

  const canGoOlder = !isEditMode && optionIndex > 0;
  const canGoNewer = !isEditMode && optionIndex >= 0 && optionIndex < emptyBatch.options.length - 1;
  const noEmptySlot = !isEditMode && emptyBatch.options.length === 0;

  const conflictKey =
    batchKey !== "—" &&
    occupiedSet.has(batchKey) &&
    (!isEditMode || toDateKey(item?.tglBatch) !== batchKey);

  const readOnly = (Boolean(conflictKey) && !isEditMode) || noEmptySlot;
  const formDisabled = submitting || readOnly;

  const shiftBatchDate = (delta) => {
    if (isEditMode || submitting || noEmptySlot) return;
    const nextIndex = optionIndex + delta;
    if (nextIndex < 0 || nextIndex >= emptyBatch.options.length) return;
    setBatchDate(emptyBatch.options[nextIndex]);
  };

  const revokePreviews = useCallback(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
  }, []);

  const resetLocal = useCallback(() => {
    revokePreviews();
    setFiles(emptyFiles());
    setExistingPaths(emptyPaths());
    setOriginalPaths(emptyPaths());
    setClearedKeys(new Set());
    setPreviews({});
    setNilaiMandiri("");
    setNilaiBni("");
    setNilaiDirect("");
    setBatchDate(null);
    setSubmitting(false);
    setLoadingPreviews(false);
  }, [revokePreviews]);

  useEffect(() => {
    if (!open) {
      resetLocal();
      return undefined;
    }

    const token = ++initTokenRef.current;
    let cancelled = false;

    const bootstrap = async () => {
      if (isEditMode && item) {
        setNilaiMandiri(item.nilaiMandiri ? String(item.nilaiMandiri) : "");
        setNilaiBni(item.nilaiBni ? String(item.nilaiBni) : "");
        setNilaiDirect(item.nilaiDirectSelling ? String(item.nilaiDirectSelling) : "");
        setBatchDate(parseMaybeDate(item.tglBatch) || parseMaybeDate(periodFrom) || startOfDay(new Date()));

        const rawPaths = emptyPaths();
        const paths = emptyPaths();
        SLIP_SLOTS.forEach((slot) => {
          const raw = String(item[slot.rowKey] ?? "").trim();
          rawPaths[slot.key] = raw;
          // no_image / kosong → anggap belum ada foto (tampil seperti add)
          paths[slot.key] = isMissingImagePath(raw) ? "" : raw;
        });
        setExistingPaths(paths);
        setOriginalPaths({ ...rawPaths });
        setClearedKeys(new Set());
        setFiles(emptyFiles());
        setLoadingPreviews(true);

        const nextPreviews = {};
        await Promise.all(
          SLIP_SLOTS.map(async (slot) => {
            const path = paths[slot.key];
            if (!path) return;
            try {
              const url = await resolvePreviewUrl(path);
              if (url) nextPreviews[slot.key] = url;
            } catch {
              /* ignore preview errors */
            }
          })
        );

        if (!cancelled && initTokenRef.current === token) {
          setPreviews(nextPreviews);
          setLoadingPreviews(false);
        }
        return;
      }

      const options = buildEmptyBatchOptions(occupiedSet).options;
      const autoDate = options.length ? options[options.length - 1] : startOfDay(new Date());
      setBatchDate(autoDate);
      setNilaiMandiri("");
      setNilaiBni("");
      setNilaiDirect("");
      setExistingPaths(emptyPaths());
      setOriginalPaths(emptyPaths());
      setClearedKeys(new Set());
      setFiles(emptyFiles());
      setPreviews({});
      setLoadingPreviews(false);
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [open, isEditMode, item, periodFrom, periodTo, occupiedSet, resetLocal]);

  useEffect(() => () => revokePreviews(), [revokePreviews]);

  const setSlotFile = (key, file) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    if (file) {
      // File baru menggantikan path lama di field itu
      setExistingPaths((prev) => ({ ...prev, [key]: "" }));
      setClearedKeys((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    setPreviews((prev) => {
      const next = { ...prev };
      if (prev[key] && prev[key].startsWith("blob:")) {
        URL.revokeObjectURL(prev[key]);
        previewUrlsRef.current = previewUrlsRef.current.filter((u) => u !== prev[key]);
      }
      if (file?.type?.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        previewUrlsRef.current.push(url);
        next[key] = url;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const clearSlot = (key) => {
    // Seperti add: X mengosongkan slot. Path asli tetap di originalPaths untuk hapus Dropbox.
    setFiles((prev) => ({ ...prev, [key]: null }));
    setExistingPaths((prev) => ({ ...prev, [key]: "" }));
    if (isEditMode) {
      setClearedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    }
    setPreviews((prev) => {
      const next = { ...prev };
      if (prev[key] && prev[key].startsWith("blob:")) {
        URL.revokeObjectURL(prev[key]);
        previewUrlsRef.current = previewUrlsRef.current.filter((u) => u !== prev[key]);
      }
      delete next[key];
      return next;
    });
  };

  const visibleSlots = useMemo(() => SLIP_SLOTS, []);

  const handleSubmit = async () => {
    if (readOnly) {
      toast.info("Batch telah terisi. Tidak bisa menambah data baru untuk tanggal ini.");
      return;
    }
    if (isEditMode && !canUpdate) {
      toast.error("ID data tidak valid, tidak bisa update");
      return;
    }
    if (!isEditMode && (!batchKey || batchKey === "—")) {
      toast.error("Tanggal batch wajib diisi");
      return;
    }
    if (!isEditMode && conflictKey) {
      toast.error("Batch tanggal ini sudah terisi");
      return;
    }

    const hasFile = SLIP_SLOTS.some((slot) => {
      if (clearedKeys.has(slot.key)) return false;
      if (files[slot.key]) return true;
      if (existingPaths[slot.key] && !isMissingImagePath(existingPaths[slot.key])) return true;
      if (isEditMode && originalPaths[slot.key] && !isMissingImagePath(originalPaths[slot.key])) return true;
      return false;
    });
    if (!hasFile) {
      toast.error("Minimal satu gambar wajib diisi");
      return;
    }

    const resolvedStoreId = String(storeId || item?.store || "")
      .split("-")[0]
      .trim();
    if (!resolvedStoreId) {
      toast.error("Store belum dipilih");
      return;
    }

    const formData = new FormData();
    // Edit tanpa ubah gambar: kirim ulang path asli agar SP tidak men-null-kan field
    SLIP_SLOTS.forEach((slot) => {
      if (files[slot.key]) {
        formData.append(slot.key, files[slot.key]);
      } else if (clearedKeys.has(slot.key)) {
        formData.append(slot.key, "no_image");
      } else if (existingPaths[slot.key] && !isMissingImagePath(existingPaths[slot.key])) {
        formData.append(slot.key, existingPaths[slot.key]);
      } else if (isEditMode && originalPaths[slot.key]) {
        // termasuk no_image agar SP tidak mengosongkan field
        formData.append(slot.key, originalPaths[slot.key]);
      }
    });
    formData.append("nilai_mandiri", nilaiMandiri || "0");
    formData.append("nilai_bni", nilaiBni || "0");
    formData.append("nilai_directselling", nilaiDirect || "0");
    formData.append("store_id", resolvedStoreId);

    const actor = getActorId();
    if (canUpdate) {
      formData.append("id", editId);
      formData.append("mod_by", actor);
      // Path lama → API hapus dari Dropbox jika diganti/dihapus
      SLIP_SLOTS.forEach((slot) => {
        const prev = String(originalPaths[slot.key] ?? "").trim();
        if (prev && !isMissingImagePath(prev) && isDropboxStoragePath(prev)) {
          formData.append(`prev_${slot.key}`, prev);
        }
      });
    } else {
      formData.append("tgl_batch", batchKey);
      formData.append("cre_date", batchKey);
      formData.append("cre_by", actor);
    }

    setSubmitting(true);
    try {
      const res = canUpdate
        ? await storeSlipSetoranBankService.update(formData)
        : await storeSlipSetoranBankService.create(formData);
      if (!isApiOk(res)) {
        toast.error(res?.responseMessage || (canUpdate ? "Gagal mengubah DCR" : "Gagal menyimpan DCR"));
        return;
      }
      toast.success(res?.responseMessage || (canUpdate ? "Data DCR berhasil diubah" : "Data DCR berhasil disimpan"));
      onSuccess?.(res);
      onClose?.();
    } catch (err) {
      toast.error(err?.responseMessage || err?.message || (canUpdate ? "Gagal mengubah DCR" : "Gagal menyimpan DCR"));
    } finally {
      setSubmitting(false);
    }
  };

  const batchParts = formatBatchParts(batchDate);
  const slipSlots = visibleSlots.filter((s) => s.group === "slip");
  const settlementSlots = visibleSlots.filter((s) => s.group === "settlement");

  return (
    <>
    <Modal isOpen={open} toggle={onClose} size="lg" className="ssb-upload-modal" centered>
      <ModalHeader toggle={onClose}>{isEditMode ? "Edit Slip Setoran Bank" : "Upload Slip Setoran Bank"}</ModalHeader>
      <ModalBody>
        <div className={`ssb-batch-picker${readOnly ? " is-blocked" : ""}${isEditMode ? " is-edit" : ""}`}>
          <div className="ssb-batch-line-label">Tanggal batch</div>

          {isEditMode ? (
            <div className="ssb-batch-shell is-static">
              <div className="ssb-batch-core">
                <span className="ssb-batch-weekday">{batchParts.weekday}</span>
                <strong className="ssb-batch-iso">{batchParts.iso}</strong>
                <span className="ssb-batch-sub">{batchParts.pretty}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="ssb-batch-shell">
                <button
                  type="button"
                  className="ssb-batch-nav"
                  aria-label="Tanggal lebih lama"
                  title="Mundur"
                  disabled={!canGoOlder || submitting}
                  onClick={() => shiftBatchDate(-1)}
                >
                  <Icon name="arrow-left" />
                </button>

                <div className="ssb-batch-core">
                  {noEmptySlot ? (
                    <>
                      <span className="ssb-batch-weekday is-muted">Tidak tersedia</span>
                      <strong className="ssb-batch-iso">—</strong>
                      <span className="ssb-batch-sub">Tidak ada tanggal kosong</span>
                    </>
                  ) : (
                    <>
                      <span className="ssb-batch-weekday">{batchParts.weekday}</span>
                      <strong className="ssb-batch-iso">{batchParts.iso}</strong>
                      <span className="ssb-batch-sub">{batchParts.pretty}</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className="ssb-batch-nav"
                  aria-label="Tanggal lebih baru"
                  title="Maju"
                  disabled={!canGoNewer || submitting}
                  onClick={() => shiftBatchDate(1)}
                >
                  <Icon name="arrow-right" />
                </button>
              </div>

              <div className="ssb-batch-picker-meta">
                {emptyBatch.options.length > 1 ? (
                  <div className="ssb-batch-dots" aria-hidden="true">
                    {emptyBatch.options.map((day, idx) => (
                      <button
                        key={format(day, "yyyy-MM-dd")}
                        type="button"
                        className={`ssb-batch-dot${idx === optionIndex ? " is-active" : ""}`}
                        onClick={() => setBatchDate(day)}
                        disabled={submitting}
                        title={format(day, "yyyy-MM-dd")}
                      />
                    ))}
                  </div>
                ) : null}
                <span className="ssb-batch-line-hint">
                  <Icon name="info" />
                  <span>
                    {noEmptySlot
                      ? "Semua tanggal sudah terisi sampai hari ini"
                      : emptyBatch.lastFilled
                        ? `Bisa mundur sampai ${formatBatchPretty(emptyBatch.earliest)} · setelah batch ${formatBatchPretty(emptyBatch.lastFilled)}`
                        : "Otomatis ke tanggal kosong terbaru"}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>

        {readOnly ? (
          <Alert color="warning" className="ssb-upload-blocked">
            {noEmptySlot ? (
              <>
                <strong>Tidak ada tanggal kosong.</strong> Batch terakhir sampai hari ini sudah terisi.
              </>
            ) : (
              <>
                <strong>Batch telah terisi.</strong> Tanggal {batchKey} sudah punya data DCR. Tidak bisa menambah
                lagi — buka kartu batch yang ada untuk melihat detail.
              </>
            )}
          </Alert>
        ) : null}

        {isEditMode && !canUpdate ? (
          <Alert color="danger" className="ssb-upload-blocked">
            ID data tidak ditemukan dari API, perubahan tidak bisa disimpan.
          </Alert>
        ) : null}

        {conflictKey && isEditMode ? (
          <Alert color="danger" className="ssb-upload-blocked">
            Tanggal batch {batchKey} sudah dipakai data lain.
          </Alert>
        ) : null}

        <div className="ssb-upload-amounts">
          <FormGroup>
            <Label>Nilai Mandiri</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={nilaiMandiri}
              onChange={(e) => setNilaiMandiri(e.target.value.replace(/[^\d]/g, ""))}
              disabled={formDisabled}
            />
          </FormGroup>
          <FormGroup>
            <Label>Nilai BNI</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={nilaiBni}
              onChange={(e) => setNilaiBni(e.target.value.replace(/[^\d]/g, ""))}
              disabled={formDisabled}
            />
          </FormGroup>
          <FormGroup>
            <Label>Nilai Direct Selling</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={nilaiDirect}
              onChange={(e) => setNilaiDirect(e.target.value.replace(/[^\d]/g, ""))}
              disabled={formDisabled}
            />
          </FormGroup>
        </div>

        {loadingPreviews ? (
          <div className="ssb-upload-loading">
            <Spinner size="sm" /> <span>Memuat preview…</span>
          </div>
        ) : null}

        {slipSlots.length ? (
          <>
            <div className="ssb-upload-section-title">Slip Setoran</div>
            <div className="ssb-upload-grid">
              {slipSlots.map((slot) => (
                  <SlotDrop
                    key={slot.key}
                    label={slot.label}
                    file={files[slot.key]}
                    preview={previews[slot.key]}
                    onPick={(f) => setSlotFile(slot.key, f)}
                    onClear={() => clearSlot(slot.key)}
                    disabled={formDisabled}
                    allowClear={Boolean(files[slot.key] || previews[slot.key])}
                    emptyLabel="Pilih / drop file"
                  />
                ))}
            </div>
          </>
        ) : null}

        {settlementSlots.length ? (
          <>
            <div className={`ssb-upload-section-title${slipSlots.length ? " mt-3" : ""}`}>Settlement</div>
            <div className="ssb-upload-grid">
              {settlementSlots.map((slot) => (
                  <SlotDrop
                    key={slot.key}
                    label={slot.label}
                    file={files[slot.key]}
                    preview={previews[slot.key]}
                    onPick={(f) => setSlotFile(slot.key, f)}
                    onClear={() => clearSlot(slot.key)}
                    disabled={formDisabled}
                    allowClear={Boolean(files[slot.key] || previews[slot.key])}
                    emptyLabel="Pilih / drop file"
                  />
                ))}
            </div>
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button color="light" outline onClick={onClose} disabled={submitting}>
          {readOnly ? "Tutup" : "Batal"}
        </Button>
        {!readOnly ? (
          <Button
            color="primary"
            onClick={handleSubmit}
            disabled={submitting || Boolean(conflictKey) || (isEditMode && !canUpdate)}
          >
            {submitting ? <Spinner size="sm" /> : <Icon name={canUpdate ? "save" : "upload"} />}
            <span>
              {submitting ? "Menyimpan…" : canUpdate ? "Simpan Perubahan" : "Simpan & Upload"}
            </span>
          </Button>
        ) : null}
      </ModalFooter>
    </Modal>
    </>
  );
};

export default SlipSetoranUploadModal;
