import React from "react";
import { Icon } from "./Component";

/**
 * Shared empty state for Sales pages (same look as Daily Collection Report).
 * Keep visible while loading — only swap out when data is ready.
 */
export function SalesEmptyState({
  title = "Belum ada data",
  description = (
    <>
      Pilih tanggal, lalu klik <strong>Load</strong> untuk menampilkan laporan.
    </>
  ),
  icon = "file-docs",
  className = "",
}) {
  return (
    <div className={`sales-empty${className ? ` ${className}` : ""}`}>
      <div className="sales-empty-visual" aria-hidden="true">
        <div className="sales-empty-ring sales-empty-ring--outer" />
        <div className="sales-empty-ring sales-empty-ring--inner" />
        <div className="sales-empty-icon">
          <Icon name={icon} />
        </div>
      </div>
      <h5>{title}</h5>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
