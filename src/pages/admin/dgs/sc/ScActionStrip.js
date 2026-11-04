import React from "react";

const toneClass = (tone) => {
  if (tone === "warn") return " is-warn";
  if (tone === "bad") return " is-bad";
  if (tone === "ok") return " is-ok";
  return "";
};

/**
 * Action Summary Strip — clickable operational counts (Seller Center Beranda pattern).
 * items: [{ id, label, value, cta?, tone?, onClick?, disabled? }]
 */
const ScActionStrip = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <div className="sc-action-strip" role="list">
      {items.map((it) => (
        <button
          key={it.id || it.label}
          type="button"
          className="sc-action-card"
          role="listitem"
          onClick={it.onClick}
          disabled={it.disabled || !it.onClick}
        >
          <span className="sc-action-card__label">{it.label}</span>
          <span className={`sc-action-card__value${toneClass(it.tone)}`}>{it.value}</span>
          {it.cta ? <span className="sc-action-card__cta">{it.cta}</span> : null}
        </button>
      ))}
    </div>
  );
};

export default ScActionStrip;
