import React from "react";
import { Link } from "react-router-dom";
import { appPath } from "../../lib/paths";
import "./OpenPosRail.css";

/** Fixed right-edge rail — quick jump to cashier POS. */
const OpenPosRail = () => (
  <Link
    to={appPath("/store/cashier")}
    className="open-pos-rail"
    aria-label="Open POS"
    title="Open POS"
  >
    <span className="open-pos-rail__glow" aria-hidden />
    <span className="open-pos-rail__label">OPEN POS</span>
  </Link>
);

export default OpenPosRail;
