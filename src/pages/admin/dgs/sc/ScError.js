import React from "react";
import ScBtn from "./ScBtn";

const ScError = ({ message, onRetry }) => {
  if (!message) return null;
  return (
    <div className="sc-error" role="alert">
      <div>{message}</div>
      {onRetry ? (
        <div className="sc-error__actions">
          <ScBtn variant="ghost" onClick={onRetry}>
            Coba lagi
          </ScBtn>
        </div>
      ) : null}
    </div>
  );
};

export default ScError;
