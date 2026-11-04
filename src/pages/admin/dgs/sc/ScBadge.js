import React from "react";

/** Status / label pill. tone: new|info|ok|warn|bad */
const ScBadge = ({ children, tone, className = "" }) => (
  <span className={`sc-badge${tone ? ` is-${tone}` : ""}${className ? ` ${className}` : ""}`}>{children}</span>
);

export default ScBadge;
