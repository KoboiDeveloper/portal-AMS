import React from "react";

const ScCard = ({ title, hint, children, flush, className = "", as: Tag = "div", ...rest }) => (
  <Tag className={`sc-card${flush ? " sc-card--flush" : ""}${className ? ` ${className}` : ""}`} {...rest}>
    {title ? (
      <h6 className="sc-card__title">
        {title}
        {hint ? <small>{hint}</small> : null}
      </h6>
    ) : null}
    {children}
  </Tag>
);

export default ScCard;
