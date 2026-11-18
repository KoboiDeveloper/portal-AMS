import React, { useEffect } from "react";

/**
 * Inline pager matching gift_rpt.aspx / voucher_rpt.aspx
 * (First · Previous · page nums · Next · Last · "Page x of y").
 * Not fixed/portaled — stays in document flow under the list.
 */
const MarcommReportPager = ({ page, totalPages, totalLabel, onPage }) => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  if (totalPages <= 1) return null;

  // ASP HandlePaging: ~10 page buttons around current
  let firstIndex = page - 5;
  let lastIndex = page > 5 ? page + 5 : 10;
  if (lastIndex > totalPages) {
    lastIndex = totalPages;
    firstIndex = lastIndex - 10;
  }
  if (firstIndex < 1) firstIndex = 1;
  const pages = [];
  for (let n = firstIndex; n <= lastIndex; n += 1) pages.push(n);

  return (
    <div className="mvr-pager">
      <div className="mvr-pager__pages">
        <button type="button" className="mvr-pager__nav" disabled={page <= 1} onClick={() => onPage(1)}>
          First
        </button>
        <button
          type="button"
          className="mvr-pager__nav"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          Previous
        </button>
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            className={n === page ? "is-active" : ""}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className="mvr-pager__nav"
          disabled={page >= totalPages}
          onClick={() => onPage(Math.min(totalPages, page + 1))}
        >
          Next
        </button>
        <button
          type="button"
          className="mvr-pager__nav"
          disabled={page >= totalPages}
          onClick={() => onPage(totalPages)}
        >
          Last
        </button>
      </div>
      <div className="mvr-pager__meta text-soft small">
        Page {page} of {totalPages}
        {totalLabel ? ` · ${totalLabel}` : ""}
      </div>
    </div>
  );
};

export default MarcommReportPager;
