import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../../../components/Component";

const easeInOutQuint = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - (-2 * t + 2) ** 5 / 2;

const softScrollBy = (el, delta, duration = 1100, onDone) => {
  if (!el || !delta) {
    onDone?.();
    return;
  }
  const from = el.scrollLeft;
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  const to = Math.max(0, Math.min(max, from + delta));
  const dist = to - from;
  if (Math.abs(dist) < 1) {
    onDone?.();
    return;
  }
  if (el.__hrdScrollRaf) cancelAnimationFrame(el.__hrdScrollRaf);
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.scrollLeft = from + dist * easeInOutQuint(t);
    if (t < 1) el.__hrdScrollRaf = requestAnimationFrame(tick);
    else {
      el.__hrdScrollRaf = 0;
      onDone?.();
    }
  };
  el.__hrdScrollRaf = requestAnimationFrame(tick);
};

/**
 * Horizontal scroller with soft arrows + hover progress bar (dept strip / detail tabs).
 */
const HrdHScrollRail = ({ children, className = "", ariaLabel, trackClassName = "" }) => {
  const scrollerRef = useRef(null);
  const hintTimerRef = useRef(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [thumb, setThumb] = useState({ left: 0, width: 100 });

  const syncScrollUi = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanLeft(el.scrollLeft > 4);
    setCanRight(max > 4 && el.scrollLeft < max - 4);
    if (el.scrollWidth <= 0) return;
    const widthPct = Math.min(100, Math.max(12, (el.clientWidth / el.scrollWidth) * 100));
    const leftPct = max <= 0 ? 0 : (el.scrollLeft / max) * (100 - widthPct);
    setThumb({ left: leftPct, width: widthPct });
  }, []);

  const revealBar = useCallback((holdMs = 0) => {
    setShowBar(true);
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    if (holdMs > 0) {
      hintTimerRef.current = window.setTimeout(() => setShowBar(false), holdMs);
    }
  }, []);

  const hideBarSoon = useCallback(() => {
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setShowBar(false), 420);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    syncScrollUi();
    const onScroll = () => syncScrollUi();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncScrollUi) : null;
    ro?.observe(el);
    window.addEventListener("resize", syncScrollUi);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      window.removeEventListener("resize", syncScrollUi);
      if (el.__hrdScrollRaf) cancelAnimationFrame(el.__hrdScrollRaf);
      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    };
  }, [syncScrollUi, children]);

  const scrollByDir = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    revealBar(0);
    const step = Math.max(160, Math.round(el.clientWidth * 0.42));
    softScrollBy(el, dir * step, 1100, () => revealBar(900));
  };

  const scrollable = canLeft || canRight;

  return (
    <div
      className={`hrd-dept-rail hrd-hscroll-rail${canLeft ? " has-left" : ""}${
        canRight ? " has-right" : ""
      }${showBar && scrollable ? " is-hint" : ""}${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        className="hrd-dept-rail__arrow is-left"
        aria-label="Geser kiri"
        disabled={!canLeft}
        onClick={() => scrollByDir(-1)}
        onMouseEnter={() => scrollable && revealBar(0)}
        onMouseLeave={hideBarSoon}
        onFocus={() => scrollable && revealBar(0)}
        onBlur={hideBarSoon}
      >
        <Icon name="chevron-left" />
      </button>
      <div
        ref={scrollerRef}
        className={`hrd-dept-strip hrd-hscroll-rail__track${trackClassName ? ` ${trackClassName}` : ""}`}
        aria-label={ariaLabel}
      >
        {children}
      </div>
      <button
        type="button"
        className="hrd-dept-rail__arrow is-right"
        aria-label="Geser kanan"
        disabled={!canRight}
        onClick={() => scrollByDir(1)}
        onMouseEnter={() => scrollable && revealBar(0)}
        onMouseLeave={hideBarSoon}
        onFocus={() => scrollable && revealBar(0)}
        onBlur={hideBarSoon}
      >
        <Icon name="chevron-right" />
      </button>
      <div className="hrd-dept-rail__bar" aria-hidden>
        <span
          className="hrd-dept-rail__thumb"
          style={{ width: `${thumb.width}%`, left: `${thumb.left}%` }}
        />
      </div>
    </div>
  );
};

export default HrdHScrollRail;
