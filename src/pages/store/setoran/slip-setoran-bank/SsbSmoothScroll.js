import { useEffect, useRef } from "react";
import LocomotiveScroll from "locomotive-scroll";
import "locomotive-scroll/dist/locomotive-scroll.css";

function safeCall(fn) {
  try {
    fn();
  } catch {
    // ignore locomotive layout race
  }
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Page-level Locomotive Scroll (smooth document scroll, not nested panel).
 * @param {{ children: import("react").ReactNode, className?: string, revision?: string|number }} props
 */
export function SsbSmoothScroll({ children, className = "", revision }) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const aliveRef = useRef(false);
  const native = prefersReducedMotion();

  useEffect(() => {
    if (native) return undefined;

    const el = containerRef.current;
    if (!el) return undefined;

    let instance;
    try {
      instance = new LocomotiveScroll({
        el,
        smooth: true,
        lerp: 0.08,
        multiplier: 0.95,
        class: "is-inview",
        smartphone: {
          smooth: true,
          breakpoint: 767,
        },
        tablet: {
          smooth: true,
          breakpoint: 1024,
        },
      });
    } catch {
      return undefined;
    }

    aliveRef.current = true;
    instanceRef.current = instance;
    safeCall(() => instance.update());

    const boot = window.setTimeout(() => {
      if (!aliveRef.current || !instanceRef.current) return;
      safeCall(() => instanceRef.current.update());
    }, 80);

    let frame = 0;
    const scheduleUpdate = () => {
      if (!aliveRef.current || !instanceRef.current) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!aliveRef.current || !instanceRef.current) return;
        safeCall(() => instanceRef.current.update());
      });
    };

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(el);

    return () => {
      aliveRef.current = false;
      instanceRef.current = null;
      window.clearTimeout(boot);
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      safeCall(() => instance.destroy());
      document.documentElement.classList.remove("has-scroll-smooth", "has-scroll-dragging");
      document.body.classList.remove("has-scroll-smooth", "has-scroll-dragging");
    };
  }, [native]);

  useEffect(() => {
    if (native) {
      window.scrollTo?.(0, 0);
      return;
    }
    const instance = instanceRef.current;
    if (!instance || !aliveRef.current) return;
    safeCall(() => {
      instance.scrollTo(0, { duration: 0, disableLerp: true });
      instance.update();
    });
  }, [revision, native]);

  return (
    <div
      ref={containerRef}
      className={`ssb-page-scroll${native ? " is-native" : ""}${className ? ` ${className}` : ""}`}
      data-scroll-container
    >
      <div data-scroll-section>{children}</div>
    </div>
  );
}
