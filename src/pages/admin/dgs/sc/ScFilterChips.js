import React from "react";

/**
 * Toolbar filter row ala R01/R08.
 * left: chips/filters; right: sort/export actions
 */
const ScFilterChips = ({ children, actions, className = "" }) => (
  <div className={`sc-filterbar${className ? ` ${className}` : ""}`}>
    <div className="sc-filterbar__left">{children}</div>
    {actions ? <div className="sc-filterbar__right">{actions}</div> : null}
  </div>
);

export const ScChip = ({ children, active, onClick, as: Tag = "button", ...rest }) => (
  <Tag
    type={Tag === "button" ? "button" : undefined}
    className={`sc-chip${active ? " is-active" : ""}`}
    onClick={onClick}
    {...rest}
  >
    {children}
  </Tag>
);

export default ScFilterChips;
