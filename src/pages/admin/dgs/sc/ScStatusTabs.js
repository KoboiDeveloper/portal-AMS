import React from "react";

/**
 * Underline status tabs (Seller Center Pesanan pattern).
 * items: [{ id, label, count? }]
 */
const ScStatusTabs = ({ items = [], value, onChange, className = "" }) => (
  <div className={`sc-tabs${className ? ` ${className}` : ""}`} role="tablist">
    {items.map((it) => {
      const active = String(it.id) === String(value);
      return (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={active}
          className={`sc-tab${active ? " is-active" : ""}`}
          onClick={() => onChange?.(it.id)}
        >
          <span>{it.label}</span>
          {it.count != null && it.count !== "" ? <em className="sc-tab__count">{it.count}</em> : null}
        </button>
      );
    })}
  </div>
);

export default ScStatusTabs;
