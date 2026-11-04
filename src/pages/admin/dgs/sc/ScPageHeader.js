import React from "react";

/** Page title + description + optional right actions (Seller Center header pattern). */
const ScPageHeader = ({ title, description, children, actions }) => (
  <header className="sc-page-header">
    <div>
      <h1 className="sc-page-header__title">{title}</h1>
      {description ? <p className="sc-page-header__desc">{description}</p> : null}
      {children}
    </div>
    {actions ? <div className="sc-page-header__actions">{actions}</div> : null}
  </header>
);

export default ScPageHeader;
