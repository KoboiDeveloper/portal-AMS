import React from "react";
import { Spinner } from "reactstrap";

const LoadingState = ({ message = "Loading..." }) => (
  <div className="text-center py-5">
    <Spinner color="primary" />
    <p className="mt-3 text-soft">{message}</p>
  </div>
);

export default LoadingState;
