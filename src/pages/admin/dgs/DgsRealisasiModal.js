import React, { useEffect, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { toast } from "react-toastify";
import { Icon } from "../../../components/Component";
import { postDgsArRealisasiSave } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { errMsg, todayYmd } from "./dgsUtils";
import "./dgs.css";

/** Simpan Realisasi (tgl pelunasan) untuk satu invoice AR. */
const DgsRealisasiModal = ({ isOpen, invoice, marketplace, onClose, onSaved }) => {
  const [tgl, setTgl] = useState(todayYmd());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTgl(todayYmd());
      setError("");
    }
  }, [isOpen, invoice]);

  const save = async () => {
    if (!tgl) {
      setError("Tanggal pelunasan wajib diisi");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await postDgsArRealisasiSave({ invoice, tgl_realisasi: tgl });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal menyimpan realisasi");
        return;
      }
      toast.success(`Realisasi ${invoice} tersimpan`);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(errMsg(e, "Gagal menyimpan realisasi"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      className="modal-dialog-centered rsd-detail-modal"
      size="sm"
      contentClassName="dgs-modal-content"
    >
      <div className="rsd-detail-hero">
        <div>
          <h5 className="rsd-detail-title">Realisasi AR</h5>
          <p className="rsd-detail-sub">
            {invoice}
            {marketplace ? ` · ${marketplace}` : ""}
          </p>
        </div>
        <button type="button" className="btn btn-icon btn-trigger" onClick={onClose} aria-label="Tutup">
          <Icon name="cross" />
        </button>
      </div>
      <ModalBody className="rsd-detail-body dgs-modal-body">
        {error ? <div className="reg-ar-err">{error}</div> : null}
        <div className="dgs-field">
          <label>Tanggal Pelunasan</label>
          <input type="date" className="form-control" value={tgl} onChange={(e) => setTgl(e.target.value)} />
        </div>
      </ModalBody>
      <div className="dgs-modal-foot">
        <span className="dgs-spacer" />
        <button type="button" className="dgs-btn dgs-btn--ghost" onClick={onClose}>
          Batal
        </button>
        <button type="button" className="dgs-btn" disabled={busy} onClick={save}>
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </Modal>
  );
};

export default DgsRealisasiModal;
