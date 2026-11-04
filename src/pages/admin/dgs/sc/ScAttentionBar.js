import React from "react";

/**
 * Attention metrics strip — angka besar di atas label (R01/R03/R07).
 * items: [{ id, value, label, sub?, tone?, onClick? }]
 */
const ScAttentionBar = ({ items = [], className = "" }) => {
  if (!items.length) return null;
  return (
    <div className={`sc-attn${className ? ` ${className}` : ""}`} role="list">
      {items.map((it) => {
        const Tag = it.onClick ? "button" : "div";
        return (
          <Tag
            key={it.id || it.label}
            type={it.onClick ? "button" : undefined}
            className={`sc-attn__cell${it.tone ? ` is-${it.tone}` : ""}${it.onClick ? " is-click" : ""}`}
            role="listitem"
            onClick={it.onClick}
          >
            <div className="sc-attn__value">{it.value}</div>
            <div className="sc-attn__label">{it.label}</div>
            {it.sub ? <div className="sc-attn__sub">{it.sub}</div> : null}
          </Tag>
        );
      })}
    </div>
  );
};

export default ScAttentionBar;
