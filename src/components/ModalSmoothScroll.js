import { useEffect, useRef } from "react";

/**
 * Modal body scrollport — native overflow (Locomotive breaks nested modal scroll).
 * Keeps the same API so call sites stay unchanged.
 * @param {{ children: import("react").ReactNode, className?: string, revision?: string|number, active?: boolean }} props
 */
export function ModalSmoothScroll({ children, className = "", revision, active = true }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [active, revision]);

  return (
    <div
      ref={containerRef}
      className={`riv-modal-scroll${className ? ` ${className}` : ""}`}
    >
      <div className="riv-modal-scroll__section">{children}</div>
    </div>
  );
}
