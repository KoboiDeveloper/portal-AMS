import React from "react";
import { createPortal } from "react-dom";
import { PosLayout } from "../../../modules/ams-pos/components/pos/PosLayout";
import "../../../modules/ams-pos/styles/ams-pos.css";

/**
 * Store cashier — portal to body so fixed layout is not clipped by nk-wrap.
 * Class `ams-tw` scopes Tailwind utilities (see tailwind.config.js important).
 */
const StoreCashierPage = () => {
  const content = (
    <div className="ams-pos ams-tw" data-page="store-cashier">
      <div className="ams-pos-shell">
        <PosLayout />
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
};

export default StoreCashierPage;

