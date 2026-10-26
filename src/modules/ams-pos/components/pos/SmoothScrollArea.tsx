import { useEffect, useRef, useState, type ReactNode } from "react";
import LocomotiveScroll from "locomotive-scroll";

type SmoothScrollAreaProps = {
  children: ReactNode;
  className?: string;
  /** Ganti nilai ini untuk reset posisi ke atas, misal saat kategori berubah */
  revision?: string | number;
};

function safeLocomotiveCall(fn: () => void) {
  try {
    fn();
  } catch {
    // Locomotive v4 bisa error saat DOM/layout berubah drastis (mis. scan produk).
  }
}

function shouldUseNativeScroll() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function SmoothScrollArea({
  children,
  className = "",
  revision,
}: SmoothScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const aliveRef = useRef(false);
  const [isSmooth, setIsSmooth] = useState(false);
  const native = shouldUseNativeScroll();

  useEffect(() => {
    if (native) {
      setIsSmooth(false);
      return;
    }

    const viewport = viewportRef.current;
    const inner = innerRef.current;
    if (!viewport || !inner) return;

    let instance: any;
    try {
      instance = new LocomotiveScroll({
        el: inner,
        smooth: true,
        lerp: 0.09,
        multiplier: 0.9,
        touchMultiplier: 2.5,
        scrollbarContainer: viewport,
        tablet: { smooth: true },
        smartphone: { smooth: true },
      });
    } catch {
      return;
    }

    const engine = instance.scroll;

    engine.setScrollLimit = () => {
      if (!aliveRef.current) return;
      engine.instance.limit.x = 0;
      engine.instance.limit.y = Math.max(0, inner.offsetHeight - viewport.clientHeight);
    };

    window.removeEventListener("keydown", engine.checkKey, false);

    aliveRef.current = true;
    instanceRef.current = instance;
    setIsSmooth(true);
    safeLocomotiveCall(() => instance.update());

    const boot = window.setTimeout(() => {
      if (!aliveRef.current || !instanceRef.current) return;
      safeLocomotiveCall(() => instanceRef.current.update());
    }, 60);

    let frame = 0;
    const scheduleUpdate = () => {
      if (!aliveRef.current || !instanceRef.current) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!aliveRef.current || !instanceRef.current) return;
        safeLocomotiveCall(() => instanceRef.current.update());
      });
    };

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(inner);
    observer.observe(viewport);

    return () => {
      aliveRef.current = false;
      instanceRef.current = null;
      window.clearTimeout(boot);
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      setIsSmooth(false);
      safeLocomotiveCall(() => instance.destroy());
    };
  }, [native]);

  useEffect(() => {
    if (native) {
      viewportRef.current?.scrollTo?.(0, 0);
      return;
    }
    const instance = instanceRef.current;
    if (!instance || !aliveRef.current) return;
    safeLocomotiveCall(() => {
      instance.setScroll(0, 0);
      instance.update();
    });
  }, [revision, native]);

  return (
    <div
      ref={viewportRef}
      className={`pos-smooth${isSmooth ? " is-smooth" : ""}${
        native ? " is-native" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <div ref={innerRef} className="pos-smooth__inner">
        {children}
      </div>
    </div>
  );
}
