import React from "react";
import { Modal, ModalBody, ModalHeader } from "reactstrap";
import { Button, Icon } from "../../../../components/Component";
import { KasPhotoPreview } from "./KasPhoto";

const formatDisplayDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
};

const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("id-ID");
};

const isKasStatusBaru = (status) => {
  const key = String(status || "").trim().toLowerCase();
  if (!key || key.includes("ajukan")) return false;
  return key === "baru" || key.startsWith("baru") || key === "1";
};

const KasDetailModal = ({ open, item, onClose, onEdit, onDelete, deleting }) => {
  if (!item) return null;

  const canDelete = isKasStatusBaru(item.status);

  return (
    <Modal isOpen={open} toggle={onClose} size="lg" className="modal-dialog-centered kas-detail-modal">
      <ModalHeader toggle={onClose}>Detail Kas Kecil</ModalHeader>
      <ModalBody>
        <div className="kas-detail-grid">
          <div className="kas-detail-meta">
            <div className="kas-detail-row">
              <span>ID</span>
              <strong>{item.id ?? "—"}</strong>
            </div>
            <div className="kas-detail-row">
              <span>Store</span>
              <strong>{item.storeId || "—"}</strong>
            </div>
            <div className="kas-detail-row">
              <span>Tanggal</span>
              <strong>{formatDisplayDate(item.date)}</strong>
            </div>
            <div className="kas-detail-row">
              <span>Status</span>
              <strong>
                {(() => {
                  const label = String(item.status || "").trim() || "—";
                  const key = label.toLowerCase();
                  let color = "secondary";
                  if (key.includes("ajukan")) color = "warning";
                  else if (key.includes("baru")) color = "success";
                  return <span className={`tb-status text-${color}`}>{label}</span>;
                })()}
              </strong>
            </div>
            <div className="kas-detail-row">
              <span>Uang Masuk</span>
              <strong className="text-success">Rp {formatMoney(item.amountIn)}</strong>
            </div>
            <div className="kas-detail-row">
              <span>Uang Keluar</span>
              <strong className="text-danger">Rp {formatMoney(item.amountOut)}</strong>
            </div>
            <div className="kas-detail-row kas-detail-row--block">
              <span>Keterangan</span>
              <strong>{item.remarks || "—"}</strong>
            </div>
          </div>

          <div className="kas-detail-photo">
            <div className="kas-detail-photo-label">Foto bukti</div>
            <KasPhotoPreview filename={item.photo} />
          </div>
        </div>

        <div className="kas-detail-actions">
          {canDelete ? (
            <Button color="danger" outline onClick={() => onDelete?.(item)} disabled={deleting}>
              <Icon name="trash" />
              <span>{deleting ? "Menghapus…" : "Hapus"}</span>
            </Button>
          ) : null}
          <Button color="primary" outline onClick={() => onEdit?.(item)}>
            <Icon name="edit" />
            <span>Edit</span>
          </Button>
          <Button color="light" onClick={onClose} disabled={deleting}>
            Tutup
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default KasDetailModal;
