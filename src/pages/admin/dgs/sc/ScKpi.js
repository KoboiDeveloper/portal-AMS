import React from "react";

const toneClass = (tone) => {
  if (tone === "warn") return " is-warn";
  if (tone === "bad") return " is-bad";
  if (tone === "ok") return " is-ok";
  if (tone === "info") return " is-info";
  return "";
};

/** KPI metric card. Pass `onClick` to make it an action card. */
const ScKpi = ({ title, value, sub, hint, tone, onClick, disabled }) => {
  const cls = `sc-kpi${toneClass(tone)}`;
  if (typeof onClick === "function") {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled}>
        <div className="sc-kpi__label">{title}</div>
        <div className="sc-kpi__value">{value}</div>
        {sub ? <div className="sc-kpi__sub">{sub}</div> : null}
        {hint ? <div className="sc-kpi__hint">{hint}</div> : null}
      </button>
    );
  }
  return (
    <div className={cls}>
      <div className="sc-kpi__label">{title}</div>
      <div className="sc-kpi__value">{value}</div>
      {sub ? <div className="sc-kpi__sub">{sub}</div> : null}
    </div>
  );
};

export const ScKpiStrip = ({ children }) => <div className="sc-kpi-strip">{children}</div>;

export default ScKpi;
