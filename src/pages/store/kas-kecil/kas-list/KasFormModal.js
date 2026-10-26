import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import Dropzone from "react-dropzone";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { toast } from "react-toastify";
import { Input, Modal, ModalBody, ModalFooter, Spinner } from "reactstrap";
import { NumericFormat } from "react-number-format";
import DatePicker from "../../../../components/AppDatePicker";
import CalendarDateInput from "../../../../components/CalendarDateInput";
import { Button, Icon, RSelect } from "../../../../components/Component";
import { getActorId } from "../../../../lib/auth";
import { extractRows, isSuccess } from "../../../../lib/response";
import { isMissingImagePath } from "../../../../lib/imageStorage";
import { storeKasService } from "../../../../services/store-kas.service";
import { resolveKasPhotoUrl } from "./KasPhoto";
import { findCoaOption, rememberKasCoa, resolveCoaCode } from "./coaUtils";

const BRAND_ID = process.env.REACT_APP_BRAND_ID || "CELCIUS";
const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const MAX_AMOUNT_OUT = 200000;

const isApiOk = (res) => {
  const code = String(res?.responseCode ?? "");
  return isSuccess(res) || code === "00" || code === "2000000" || code === "2002500";
};

const parseTxnDate = (value) => {
  if (value instanceof Date && isValid(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return new Date();
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = parseISO(normalized);
  return isValid(parsed) ? parsed : new Date();
};

const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({
    ...base,
    minWidth: "100%",
    width: "max-content",
    maxWidth: "min(92vw, 48rem)",
    borderRadius: 4,
    overflow: "hidden",
    boxShadow: "0 8px 20px rgba(21, 32, 51, 0.1)",
  }),
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderRadius: 4,
    borderColor: state.isFocused ? "#b7c2d0" : "#dbdfea",
    boxShadow: "none",
    "&:hover": { borderColor: "#c5d1e2" },
  }),
  option: (base, state) => ({
    ...base,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: "0.88rem",
    backgroundColor: state.isSelected ? "#eef2f7" : state.isFocused ? "#f7f9fc" : "#fff",
    color: "#152033",
  }),
};

const formatCoaOptionLabel = (option, { context }) => {
  const deskripsi = option?.deskripsi || "";
  const keterangan = option?.keterangan || "";
  const title = deskripsi || keterangan || option?.value || "-";

  if (context === "value") {
    return title;
  }

  return (
    <div className="kas-coa-option">
      <div className="kas-coa-option__deskripsi">{title}</div>
      {keterangan && keterangan !== title ? (
        <div className="kas-coa-option__ket">{keterangan}</div>
      ) : null}
    </div>
  );
};

const Field = ({ label, required, children, className = "" }) => (
  <div className={`kas-field ${className}`.trim()}>
    <div className="kas-field-label">
      <span>
        {label}
        {required ? <em>*</em> : null}
      </span>
    </div>
    {children}
  </div>
);

const KasFormModal = ({ open, onClose, storeId, item = null, onSaved }) => {
  const isEdit = Boolean(item?.id);
  const [txnDate, setTxnDate] = useState(new Date());
  const [remarks, setRemarks] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [coa, setCoa] = useState(null);
  const [coaOptions, setCoaOptions] = useState([]);
  const [coaLoading, setCoaLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [existingPhoto, setExistingPhoto] = useState("");
  const [saving, setSaving] = useState(false);
  const cancelledRef = useRef(false);

  const clearLocalPreview = useCallback(() => {
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
  }, []);

  const hydrateForm = useCallback(
    async (source) => {
      clearLocalPreview();
      setPhotoFile(null);

      if (!source) {
        setTxnDate(new Date());
        setRemarks("");
        setAmountOut("");
        setCoa(null);
        setExistingPhoto("");
        return;
      }

      setTxnDate(parseTxnDate(source.date));
      setRemarks(String(source.remarks || "").trim() === "-" ? "" : String(source.remarks || ""));
      setAmountOut(source.amountOut ? String(Math.round(Number(source.amountOut) || 0)) : "");
      setExistingPhoto(String(source.photo || "").trim());
      setCoa(null); // tunggu master COA agar langsung tampil deskripsi, bukan kode

      if (source.photo && !isMissingImagePath(source.photo)) {
        const url = await resolveKasPhotoUrl(source.photo);
        if (!cancelledRef.current) setPhotoPreview(url || "");
      }
    },
    [clearLocalPreview]
  );

  useEffect(() => {
    if (!open) return undefined;

    cancelledRef.current = false;
    let cancelled = false;
    const editItem = isEdit ? item : null;

    const pickCoa = (options) => {
      if (!editItem) {
        setCoa(null);
        return;
      }
      const coaCode = resolveCoaCode(editItem);
      if (!coaCode) {
        setCoa(null);
        return;
      }
      const matched = findCoaOption(options, coaCode);
      // hanya set jika ketemu di master — hindari flash kode COA di control
      setCoa(matched || null);
    };

    (async () => {
      setCoaLoading(true);
      setCoa(null);
      await hydrateForm(editItem);
      if (cancelled || cancelledRef.current) return;

      try {
        const res = await storeKasService.masterCoa();
        if (cancelled || cancelledRef.current) return;
        if (!isApiOk(res)) throw res;
        const rows = extractRows(res);
        const options = rows
          .map((row) => {
            const code = String(row?.code ?? row?.CODE ?? "").trim();
            const deskripsi = String(row?.deskripsi ?? row?.DESKRIPSI ?? "").trim();
            const keterangan = String(row?.keterangan ?? row?.KETERANGAN ?? "").trim();
            const label = [deskripsi, keterangan].filter(Boolean).join(" ") || code;
            return { value: code, label, deskripsi, keterangan };
          })
          .filter((opt) => opt.value);
        setCoaOptions(options);
        pickCoa(options);
      } catch (err) {
        if (!cancelled && !cancelledRef.current) {
          setCoaOptions([]);
          setCoa(null);
          toast.error(err?.responseMessage || "Gagal memuat kategori COA");
        }
      } finally {
        if (!cancelled && !cancelledRef.current) setCoaLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
    };
  }, [open, isEdit, item, hydrateForm]);

  useEffect(
    () => () => {
      if (photoPreview && photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview]
  );

  const onDropPhoto = useCallback((accepted) => {
    const file = accepted?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const clearPhoto = () => {
    setPhotoFile(null);
    setExistingPhoto("");
    clearLocalPreview();
  };

  const amountValue = useMemo(() => {
    const raw = String(amountOut ?? "").replace(/\./g, "").replace(/,/g, ".");
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }, [amountOut]);

  const hasPhoto = Boolean(photoFile) || Boolean(existingPhoto && !isMissingImagePath(existingPhoto));

  const handleSubmit = async () => {
    if (!storeId) {
      toast.error("Store belum dipilih");
      return;
    }
    if (!(txnDate instanceof Date) || !isValid(txnDate)) {
      toast.error("Tanggal wajib diisi");
      return;
    }
    if (!coa?.value) {
      toast.error("Kategori COA wajib dipilih");
      return;
    }
    if (!(amountValue > 0)) {
      toast.error("Uang keluar harus lebih dari 0");
      return;
    }
    if (amountValue > MAX_AMOUNT_OUT) {
      toast.error("Uang keluar maksimal Rp 200.000");
      return;
    }
    if (!String(remarks).trim()) {
      toast.error("Keterangan wajib diisi");
      return;
    }
    if (!hasPhoto) {
      toast.error("Foto bukti wajib diupload");
      return;
    }

    const dateStr = format(txnDate, "yyyy-MM-dd");
    const datetimeStr = `${dateStr} 00:00:00`;
    const nowStr = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    const actor = getActorId();
    const formData = new FormData();
    formData.append("store_id", storeId);
    formData.append("date", datetimeStr);
    formData.append("remarks", String(remarks).trim());
    formData.append("amount_out", String(amountValue));
    formData.append("coa", coa.value);

    if (photoFile) {
      formData.append("photo", photoFile);
    } else if (existingPhoto) {
      formData.append("photo", existingPhoto);
    }

    setSaving(true);
    try {
      let res;
      if (isEdit) {
        formData.append("id", String(item.id));
        formData.append("mod_by", actor);
        formData.append("mod_date", nowStr);
        res = await storeKasService.update(formData);
      } else {
        formData.append("brand_id", BRAND_ID);
        formData.append("datetime", datetimeStr);
        formData.append("cre_by", actor);
        formData.append("cre_date", nowStr);
        res = await storeKasService.create(formData);
      }

      if (!isApiOk(res)) {
        toast.error(res?.responseMessage || (isEdit ? "Gagal mengubah kas" : "Gagal menyimpan kas"));
        return;
      }
      const savedId = res?.data?.id ?? item?.id;
      const savedCoa = res?.data?.coa ?? coa.value;
      rememberKasCoa(savedId, savedCoa);
      toast.success(res?.responseMessage || (isEdit ? "Data kas berhasil diubah" : "Data kas berhasil disimpan"));
      onSaved?.(res);
      onClose?.();
    } catch (err) {
      toast.error(err?.responseMessage || err?.message || (isEdit ? "Gagal mengubah kas" : "Gagal menyimpan kas"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      toggle={onClose}
      size="lg"
      className="modal-dialog-centered kas-form-modal"
      contentClassName="kas-form-content"
    >
      <div className="kas-form-hero">
        <div className="kas-form-hero-copy">
          <h4>{isEdit ? "Edit Kas Kecil" : "Tambah Kas Kecil"}</h4>
        </div>
        <button type="button" className="kas-form-close" onClick={onClose} aria-label="Tutup">
          <Icon name="cross" />
        </button>
      </div>

      <ModalBody className="kas-form-body">
        <div className="kas-form-stack">
          <Field label="Kategori" required>
            <RSelect
              options={coaOptions}
              value={coa ? findCoaOption(coaOptions, coa.value) || coa : null}
              onChange={setCoa}
              isLoading={coaLoading}
              placeholder={coaLoading ? "Memuat kategori…" : "Pilih kategori"}
              isClearable
              getOptionValue={(opt) => String(opt?.value ?? "")}
              formatOptionLabel={formatCoaOptionLabel}
              filterOption={(option, input) => {
                const q = String(input || "").trim().toLowerCase();
                if (!q) return true;
                const hay = [
                  option?.data?.value,
                  option?.data?.deskripsi,
                  option?.data?.keterangan,
                  option?.label,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();
                return hay.includes(q);
              }}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              menuPosition="fixed"
              styles={selectStyles}
            />
          </Field>

          <div className="kas-form-row">
            <Field label="Tanggal" required>
              <DatePicker
                selected={txnDate}
                onChange={setTxnDate}
                dateFormat="dd MMM yyyy"
                portalId="sales-datepicker-portal"
                popperProps={{ strategy: "fixed" }}
                customInput={<CalendarDateInput className="form-control date-picker kas-form-control" />}
              />
            </Field>

            <Field label="Uang Keluar" required>
              <div className="kas-amount-wrap">
                <span className="kas-amount-prefix">Rp</span>
                <NumericFormat
                  className="form-control kas-form-control kas-amount-input"
                  value={amountOut}
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={0}
                  allowNegative={false}
                  isAllowed={(values) => {
                    const num = values.floatValue;
                    return num === undefined || num <= MAX_AMOUNT_OUT;
                  }}
                  placeholder="0"
                  onValueChange={(values) => setAmountOut(values.value)}
                />
              </div>
            </Field>
          </div>

          <Field label="Keterangan" required>
            <Input
              type="textarea"
              rows={3}
              className="kas-form-control"
              value={remarks}
              maxLength={400}
              placeholder="Keterangan"
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Field>

          <Field label="Foto bukti" required>
            {photoPreview ? (
              <div className="kas-form-photo-row">
                <Zoom zoomMargin={40}>
                  <img src={photoPreview} alt="Preview bukti" className="kas-form-photo-thumb" title="Klik untuk preview" />
                </Zoom>
                <div className="kas-form-photo-meta">
                  <strong>{photoFile?.name || "Foto terpilih"}</strong>
                  <span>Siap diupload</span>
                </div>
                <div className="kas-form-photo-actions">
                  <Dropzone accept={ACCEPT} multiple={false} onDrop={onDropPhoto} disabled={saving}>
                    {({ getRootProps, getInputProps }) => (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-light"
                        {...getRootProps()}
                        disabled={saving}
                        title="Ganti foto"
                      >
                        <input {...getInputProps()} />
                        <Icon name="swap" />
                        <span>Ganti</span>
                      </button>
                    )}
                  </Dropzone>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={clearPhoto}
                    disabled={saving}
                    title="Hapus foto"
                  >
                    <Icon name="trash" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ) : (
              <Dropzone accept={ACCEPT} multiple={false} onDrop={onDropPhoto} disabled={saving}>
                {({ getRootProps, getInputProps, isDragActive }) => (
                  <div
                    {...getRootProps()}
                    className={`kas-form-dropzone${isDragActive ? " is-active" : ""}`}
                  >
                    <input {...getInputProps()} />
                    <Icon name="img" />
                    <span>Klik atau drop foto di sini</span>
                  </div>
                )}
              </Dropzone>
            )}
          </Field>
        </div>
      </ModalBody>

      <ModalFooter className="kas-form-footer">
        <Button color="light" onClick={onClose} disabled={saving}>
          Batal
        </Button>
        <Button color="primary" className="kas-form-submit" onClick={handleSubmit} disabled={saving || !storeId}>
          {saving ? <Spinner size="sm" /> : <Icon name={isEdit ? "edit" : "plus"} />}
          <span>{isEdit ? "Simpan Perubahan" : "Simpan Kas"}</span>
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default KasFormModal;
