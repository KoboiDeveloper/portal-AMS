import React from "react";

export const ScSkeletonBlock = ({ className = "", style }) => (
  <div className={`sc-skeleton ${className}`.trim()} style={style} aria-hidden />
);

/** Loading placeholders for dashboard KPI + chart grid */
const ScDashboardSkeleton = () => (
  <div aria-busy="true" aria-label="Memuat">
    <div className="sc-kpi-strip">
      {Array.from({ length: 8 }).map((_, i) => (
        <ScSkeletonBlock key={i} className="sc-skeleton-kpi" />
      ))}
    </div>
    <div className="sc-grid-2">
      <ScSkeletonBlock className="sc-skeleton-card" />
      <ScSkeletonBlock className="sc-skeleton-card" />
    </div>
  </div>
);

export default ScDashboardSkeleton;
