import React from "react";

/** Soft notice / announcement banner. tone: info|warn|danger */
const ScNotice = ({ children, tone = "info", onClose }) => (
  <div className={`sc-notice${tone !== "info" ? ` is-${tone}` : ""}`} role="status">
    <div className="sc-notice__body">{children}</div>
    {onClose ? (
      <button type="button" className="sc-notice__close" aria-label="Tutup" onClick={onClose}>
        ×
      </button>
    ) : null}
  </div>
);

export default ScNotice;
