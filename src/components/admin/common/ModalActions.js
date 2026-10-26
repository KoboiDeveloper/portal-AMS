import React from "react";
import { Col } from "reactstrap";
import { Button } from "../../Component";

const ModalActions = ({
  submitLabel = "Save",
  loading = false,
  loadingLabel = "Saving...",
  onCancel,
  submitColor = "primary",
  cancelLabel = "Cancel",
}) => (
  <Col size="12">
    <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
      <li>
        <Button color={submitColor} size="md" type="submit" disabled={loading}>
          {loading ? loadingLabel : submitLabel}
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
          {cancelLabel}
        </Button>
      </li>
    </ul>
  </Col>
);

export default ModalActions;
