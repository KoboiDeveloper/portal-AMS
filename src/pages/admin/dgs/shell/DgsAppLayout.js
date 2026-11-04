import React, { useState } from "react";
import { Icon } from "../../../../components/Component";
import DgsSubNav from "./DgsSubNav";
import { ScBtn } from "../sc";
import ScQuickAccessModal from "../sc/ScQuickAccessModal";
import "../dgs.css";

/**
 * Layout DigitalSales di bawah AdminHeader (top bar tidak diubah).
 * Sidebar di kiri viewport — di luar container Content.
 * Footer Softnio tidak dipakai di /dgs (hindari flash di atas saat AccessGuard loading).
 */
const DgsAppLayout = ({ children }) => {
  const [navOpen, setNavOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <div className="sc-root dgs-app-layout dgs-dash">
      <aside className={`dgs-app-layout__sidebar${navOpen ? " is-open" : ""}`} aria-label="Menu DigitalSales">
        <DgsSubNav
          onQuickAccess={() => {
            setQuickOpen(true);
            setNavOpen(false);
          }}
          onNavigate={() => setNavOpen(false)}
        />
      </aside>
      <div className="dgs-app-layout__main">
        <div className="dgs-app-layout__mobile-bar">
          <ScBtn variant="soft" onClick={() => setNavOpen((v) => !v)}>
            <Icon name="menu" /> Menu DigitalSales
          </ScBtn>
        </div>
        {children}
      </div>
      {navOpen ? (
        <button
          type="button"
          className="dgs-app-layout__backdrop"
          aria-label="Tutup menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <ScQuickAccessModal isOpen={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
};

export default DgsAppLayout;
