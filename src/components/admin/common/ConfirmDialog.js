import React from "react";
import { Modal, ModalBody, Col } from "reactstrap";
import { Icon, Button } from "../../Component";

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, loading, confirmLabel = "Delete" }) => (
  <Modal isOpen={isOpen} toggle={onCancel} className="modal-dialog-centered admin-form-modal">
    <ModalBody>
      <a
        href="#close"
        className="close"
        onClick={(e) => {
          e.preventDefault();
          onCancel();
        }}
      >
        <Icon name="cross-sm" />
      </a>
      <div className="p-2">
        <h5 className="title">{title || "Confirm"}</h5>
        <div className="mt-3">
          <p className="text-soft mb-0">{message || "Are you sure?"}</p>
        </div>
        <Col size="12" className="mt-4 px-0">
          <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
            <li>
              <Button color="danger" size="md" onClick={onConfirm} disabled={loading}>
                {loading ? "Processing..." : confirmLabel}
              </Button>
            </li>
            <li>
              <Button
                type="button"
                className="link link-light"
                color="link"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </li>
          </ul>
        </Col>
      </div>
    </ModalBody>
  </Modal>
);

export default ConfirmDialog;
