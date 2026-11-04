import React from "react";

/**
 * Settlement equation strip A = B − C + D (R05).
 * items: [{ id, label, value, onClick? }] — operators inserted between cards
 */
const ScSettlementStrip = ({ items = [], operators = ["=", "−", "+"] }) => {
  if (!items.length) return null;
  return (
    <div className="sc-settle" role="list">
      {items.map((it, i) => (
        <React.Fragment key={it.id || it.label}>
          {i > 0 ? <span className="sc-settle__op">{operators[i - 1] || "·"}</span> : null}
          <button
            type="button"
            className="sc-settle__card"
            role="listitem"
            onClick={it.onClick}
            disabled={!it.onClick}
          >
            <div className="sc-settle__label">{it.label}</div>
            <div className="sc-settle__value">{it.value}</div>
            {it.hint ? <div className="sc-settle__hint">{it.hint}</div> : null}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ScSettlementStrip;
