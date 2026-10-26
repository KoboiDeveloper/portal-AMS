import React, { useEffect, useState } from "react";
import { Modal, ModalBody, Form, Col } from "reactstrap";
import { Icon } from "../../Component";
import ModalActions from "./ModalActions";

const ResetPasswordModal = ({ isOpen, title, employee, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState({
    new_password: "",
    confirm_password: "",
    force_change_password: true,
    reset_reason: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      new_password: "",
      confirm_password: "",
      force_change_password: true,
      reset_reason: "",
    });
    setErrors({});
  }, [isOpen, employee]);

  const validate = () => {
    const next = {};
    if (!form.new_password || form.new_password.length < 8) {
      next.new_password = "Password minimum 8 characters";
    }
    if (form.new_password !== form.confirm_password) {
      next.confirm_password = "Password confirmation does not match";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      new_password: form.new_password,
      force_change_password: form.force_change_password,
      reset_reason: form.reset_reason,
    });
  };

  const employeeLabel = employee?.employee_name || employee?.nik || "-";
  const modalTitle = title || "Change Password";

  return (
    <Modal isOpen={isOpen} toggle={onClose} className="modal-dialog-centered admin-form-modal">
      <ModalBody>
        <a
          href="#close"
          className="close"
          onClick={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          <Icon name="cross-sm" />
        </a>
        <div className="p-2">
          <h5 className="title">{modalTitle}</h5>
          <p className="text-soft mt-2 mb-0">
            Change password for <strong>{employeeLabel}</strong>
            {employee?.nik ? ` (${employee.nik})` : ""}
          </p>
          <div className="mt-4">
            <Form className="row gy-4 form-validate is-alter" onSubmit={handleSubmit} noValidate>
              <Col md="12">
                <div className="form-group">
                  <label className="form-label" htmlFor="new_password">
                    New Password <span className="text-danger">*</span>
                  </label>
                  <div className="form-control-wrap">
                    <input
                      id="new_password"
                      type="password"
                      className={`form-control${errors.new_password ? " error" : ""}`}
                      value={form.new_password}
                      placeholder="Minimum 8 characters"
                      onChange={(e) => setForm((prev) => ({ ...prev, new_password: e.target.value }))}
                    />
                  </div>
                  {errors.new_password && <span className="invalid">{errors.new_password}</span>}
                </div>
              </Col>
              <Col md="12">
                <div className="form-group">
                  <label className="form-label" htmlFor="confirm_password">
                    Confirm Password <span className="text-danger">*</span>
                  </label>
                  <div className="form-control-wrap">
                    <input
                      id="confirm_password"
                      type="password"
                      className={`form-control${errors.confirm_password ? " error" : ""}`}
                      value={form.confirm_password}
                      placeholder="Re-enter new password"
                      onChange={(e) => setForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                    />
                  </div>
                  {errors.confirm_password && <span className="invalid">{errors.confirm_password}</span>}
                </div>
              </Col>
              <Col md="12">
                <div className="custom-control custom-checkbox">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="force_change_password"
                    checked={form.force_change_password}
                    onChange={(e) => setForm((prev) => ({ ...prev, force_change_password: e.target.checked }))}
                  />
                  <label className="custom-control-label" htmlFor="force_change_password">
                    Force Change Password
                  </label>
                </div>
              </Col>
              <Col md="12">
                <div className="form-group">
                  <label className="form-label" htmlFor="reset_reason">Reset Reason</label>
                  <div className="form-control-wrap">
                    <textarea
                      id="reset_reason"
                      className="form-control no-resize"
                      rows={3}
                      value={form.reset_reason}
                      placeholder="Reason for password change"
                      onChange={(e) => setForm((prev) => ({ ...prev, reset_reason: e.target.value }))}
                    />
                  </div>
                </div>
              </Col>
              <ModalActions
                submitLabel={modalTitle}
                loading={loading}
                loadingLabel="Saving..."
                onCancel={onClose}
              />
            </Form>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default ResetPasswordModal;
