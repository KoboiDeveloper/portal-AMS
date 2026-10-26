import React from "react";
import { Alert } from "reactstrap";

const ErrorState = ({ message = "Something went wrong", onRetry }) => (
  <Alert color="danger" className="alert-icon">
    <span>{message}</span>
    {onRetry && (
      <button type="button" className="btn btn-sm btn-danger ms-3" onClick={onRetry}>
        Retry
      </button>
    )}
  </Alert>
);

export default ErrorState;
