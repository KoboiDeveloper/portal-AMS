import React from "react";

const ScBtn = ({ children, variant = "primary", className = "", type = "button", ...rest }) => {
  const v =
    variant === "ghost" ? " sc-btn--ghost" : variant === "soft" ? " sc-btn--soft" : "";
  return (
    <button type={type} className={`sc-btn${v}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </button>
  );
};

export default ScBtn;
