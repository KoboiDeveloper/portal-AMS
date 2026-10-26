import React from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader, Spinner } from "reactstrap";
import { Button } from "../../../../components/Component";

const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("id-ID");
};

/**
 * Confirm dialog generik untuk aksi kas (hapus / ajukan).
 * props.variant: "danger" | "primary"
 */
const KasConfirmDialog = ({
  open,
  item,
  loading,
  title,
  confirmLabel,
  loadingLabel,
  variant = "primary",
  message,
  onCancel,
  onConfirm,
}) => {
  if (!item) return null;

  return (
    <Modal
      isOpen={open}
      toggle={loading ? undefined : onCancel}
      centered
      className="kas-confirm-modal"
    >
      <ModalHeader toggle={loading ? undefined : onCancel}>{title}</ModalHeader>
      <ModalBody>
        {message ? (
          message
        ) : (
          <>
            <p className="mb-2">
              Transaksi <strong>#{item.id}</strong>
              {item.amountOut ? (
                <>
                  {" "}
                  sebesar <strong>Rp {formatMoney(item.amountOut)}</strong>
                </>
              ) : null}
              ?
            </p>
            <p className="text-soft mb-0">Tindakan ini tidak dapat dibatalkan.</p>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button color={variant} onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner size="sm" /> : null}
          <span>{loading ? loadingLabel || "Memproses…" : confirmLabel}</span>
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default KasConfirmDialog;
