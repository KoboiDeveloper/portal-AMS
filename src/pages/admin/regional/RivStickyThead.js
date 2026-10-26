import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePageSmoothScroll } from "../../../components/PageSmoothScroll";

function headerOffsetPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--ams-header-h").trim();
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 65;
}

/** Prefer tbody leaf cell widths — correct for multi-row / colspan thead. */
function measureColWidths(table, thead) {
  const sample = table.tBodies[0]?.rows[0] || table.tFoot?.rows[0];
  if (sample?.cells?.length && sample.cells.length > 1) {
    return Array.from(sample.cells).map((cell) => Math.round(cell.getBoundingClientRect().width));
  }
  const cols = [];
  Array.from(thead.rows).forEach((row, rowIdx) => {
    let colIdx = 0;
    Array.from(row.cells).forEach((cell) => {
      while (cols[colIdx] != null && rowIdx > 0) colIdx += 1;
      const span = cell.colSpan || 1;
      const w = Math.round(cell.getBoundingClientRect().width);
      if (span === 1) {
        cols[colIdx] = w;
      } else {
        const each = Math.round(w / span);
        for (let s = 0; s < span; s += 1) cols[colIdx + s] = each;
      }
      colIdx += span;
    });
  });
  return cols.filter((w) => w != null);
}

function applyColgroup(tableEl, widths) {
  let colgroup = tableEl.querySelector("colgroup");
  if (!colgroup) {
    colgroup = document.createElement("colgroup");
    tableEl.insertBefore(colgroup, tableEl.firstChild);
  }
  while (colgroup.children.length > widths.length) colgroup.removeChild(colgroup.lastChild);
  widths.forEach((w, i) => {
    let col = colgroup.children[i];
    if (!col) {
      col = document.createElement("col");
      colgroup.appendChild(col);
    }
    col.style.width = `${w}px`;
  });
}

function scrollParentOf(table) {
  let el = table.parentElement;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    const ox = style.overflowX;
    if (ox === "auto" || ox === "scroll" || ox === "overlay") return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Locomotive-safe sticky thead — clones full multi-row thead into a fixed portal.
 * Syncs horizontal scroll when table sits in overflow-x wrap (Tr SO, etc.).
 */
export function RivStickyThead({ tableRef, enabled = true, tableClassName = "riv-table" }) {
  const { native, subscribe } = usePageSmoothScroll();
  const rootRef = useRef(null);
  const tableCloneRef = useRef(null);
  const theadCloneRef = useRef(null);
  const htmlRef = useRef("");
  const visibleRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      const root = rootRef.current;
      if (root) {
        root.style.visibility = "hidden";
        root.style.pointerEvents = "none";
      }
      visibleRef.current = false;
      return undefined;
    }

    const sync = () => {
      const root = rootRef.current;
      const cloneTable = tableCloneRef.current;
      const cloneThead = theadCloneRef.current;
      const table = tableRef.current;
      if (!root || !cloneTable || !cloneThead || !table) return;

      const thead = table.tHead;
      if (!thead) {
        if (visibleRef.current) {
          root.style.visibility = "hidden";
          visibleRef.current = false;
        }
        return;
      }

      const topPad = headerOffsetPx();
      const headRect = thead.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const wrap = scrollParentOf(table);
      const wrapRect = wrap ? wrap.getBoundingClientRect() : tableRect;
      const scrollLeft = wrap ? wrap.scrollLeft : 0;

      const shouldStick =
        headRect.top <= topPad && tableRect.bottom > topPad + Math.max(headRect.height, 24);

      if (!shouldStick) {
        if (visibleRef.current) {
          root.style.visibility = "hidden";
          visibleRef.current = false;
        }
        return;
      }

      const nextHtml = thead.innerHTML;
      if (htmlRef.current !== nextHtml) {
        htmlRef.current = nextHtml;
        cloneThead.innerHTML = nextHtml;
      }

      const widths = measureColWidths(table, thead);
      applyColgroup(cloneTable, widths);
      applyColgroup(table, widths);

      const visibleWidth = Math.round(wrapRect.width);
      const fullWidth = Math.round(tableRect.width);

      root.style.top = `${topPad}px`;
      root.style.left = `${Math.round(wrapRect.left)}px`;
      root.style.width = `${visibleWidth}px`;
      root.style.overflow = "hidden";
      root.style.visibility = "visible";

      cloneTable.style.width = `${fullWidth}px`;
      cloneTable.style.minWidth = `${fullWidth}px`;
      cloneTable.style.transform = scrollLeft ? `translateX(${-Math.round(scrollLeft)}px)` : "";
      cloneTable.style.margin = "0";

      visibleRef.current = true;
    };

    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, { passive: true });

    let unsub = () => {};
    if (!native) unsub = subscribe(sync);

    const table = tableRef.current;
    const wrap = table ? scrollParentOf(table) : null;
    const onWrapScroll = () => sync();
    if (wrap) wrap.addEventListener("scroll", onWrapScroll, { passive: true });

    const ro = table ? new ResizeObserver(sync) : null;
    if (table && ro) ro.observe(table);
    if (wrap && ro) ro.observe(wrap);

    sync();

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
      if (wrap) wrap.removeEventListener("scroll", onWrapScroll);
      unsub();
      ro?.disconnect();
    };
  }, [enabled, native, subscribe, tableRef]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      className="riv-sticky-clone"
      style={{ visibility: "hidden", top: 0, left: 0, width: 0 }}
      aria-hidden="true"
    >
      <table ref={tableCloneRef} className={`${tableClassName} riv-sticky-clone__table`}>
        <thead ref={theadCloneRef} />
      </table>
    </div>,
    document.body
  );
}
