import { createContext, useContext, useEffect, useMemo, useRef } from "react";
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

/** @type {React.Context<{ native: boolean, subscribe: (fn: (obj: any) => void) => () => void, update: () => void }>} */
const PageSmoothScrollContext = createContext({
  native: true,
  subscribe: () => () => {},
  update: () => {},
});

export function usePageSmoothScroll() {
  return useContext(PageSmoothScrollContext);
}

/**
 * Page-level Locomotive Scroll (smooth document scroll, not nested panel).
 * Sticky table heads must use a portal clone (CSS sticky breaks under loco transforms).
 * @param {{ children: import("react").ReactNode, className?: string, revision?: string|number }} props
 */
export function PageSmoothScroll({ children, className = "", revision }) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const aliveRef = useRef(false);
  const listenersRef = useRef(new Set());
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

    const onScroll = (obj) => {
      listenersRef.current.forEach((fn) => {
        try {
          fn(obj);
        } catch {
          // ignore listener errors
        }
      });
    };
    safeCall(() => instance.on("scroll", onScroll));

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
    const section = el.querySelector("[data-scroll-section]");
    if (section) observer.observe(section);

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
      return undefined;
    }
    const instance = instanceRef.current;
    if (!instance || !aliveRef.current) return undefined;
    safeCall(() => {
      instance.scrollTo(0, { duration: 0, disableLerp: true });
      instance.update();
    });
    // Tall inventory tables settle late — refresh scroll limit several times.
    const delays = [80, 200, 450, 900, 1600];
    const timers = delays.map((ms) =>
      window.setTimeout(() => {
        if (!aliveRef.current || !instanceRef.current) return;
        safeCall(() => instanceRef.current.update());
      }, ms)
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [revision, native]);

  const api = useMemo(
    () => ({
      native,
      subscribe: (fn) => {
        listenersRef.current.add(fn);
        return () => listenersRef.current.delete(fn);
      },
      update: () => {
        if (!aliveRef.current || !instanceRef.current) return;
        safeCall(() => instanceRef.current.update());
      },
    }),
    [native]
  );

  return (
    <PageSmoothScrollContext.Provider value={api}>
      <div
        ref={containerRef}
        className={`page-smooth-scroll${native ? " is-native" : ""}${className ? ` ${className}` : ""}`}
        data-scroll-container
      >
        <div data-scroll-section className="page-smooth-scroll__section">
          {children}
        </div>
      </div>
    </PageSmoothScrollContext.Provider>
  );
}
