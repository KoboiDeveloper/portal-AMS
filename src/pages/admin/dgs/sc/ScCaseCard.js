import React from "react";
import ScBadge from "./ScBadge";

/**
 * Return / case card (Seller Center Pengembalian pattern).
 * props: title, meta, status, statusTone, reason, amount, timeline?, actions?
 */
const ScCaseCard = ({ title, meta, status, statusTone, reason, amount, timeline, actions, onClick }) => {
  const Tag = onClick ? "button" : "article";
  const clickProps = onClick
    ? { type: "button", onClick, className: "sc-case sc-case--click" }
    : { className: "sc-case" };
  return (
    <Tag {...clickProps}>
      <div className="sc-case__top">
        <div className="sc-case__id">{title}</div>
        {status ? <ScBadge tone={statusTone}>{status}</ScBadge> : null}
      </div>
      {meta ? <div className="sc-case__meta">{meta}</div> : null}
      {reason ? <div className="sc-case__reason">{reason}</div> : null}
      <div className="sc-case__foot">
        {amount != null && amount !== "" ? <strong className="sc-case__amt">{amount}</strong> : <span />}
        {actions ? <div className="sc-case__actions">{actions}</div> : null}
      </div>
      {timeline ? <div className="sc-case__timeline">{timeline}</div> : null}
    </Tag>
  );
};

export const ScCaseList = ({ children, empty }) => {
  if (!children || (Array.isArray(children) && children.length === 0)) {
    return empty || null;
  }
  return <div className="sc-case-list">{children}</div>;
};

export const ScViewToggle = ({ value, onChange, options = [] }) => (
  <div className="sc-view-toggle" role="group" aria-label="Tampilan">
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        className={`sc-view-toggle__btn${value === o.id ? " is-active" : ""}`}
        onClick={() => onChange?.(o.id)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export default ScCaseCard;
