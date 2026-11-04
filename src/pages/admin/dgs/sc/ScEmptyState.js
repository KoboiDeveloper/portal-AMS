import React from "react";
import { Icon } from "../../../../components/Component";

const ScEmptyState = ({ icon = "file-docs", title, hint, action }) => (
  <div className="sc-empty" role="status">
    <div className="sc-empty__icon" aria-hidden>
      <Icon name={icon} />
    </div>
    {title ? <h3 className="sc-empty__title">{title}</h3> : null}
    {hint ? <p className="sc-empty__hint">{hint}</p> : null}
    {action ? <div className="sc-empty__cta">{action}</div> : null}
  </div>
);

export default ScEmptyState;
