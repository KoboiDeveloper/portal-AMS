import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Footer from "../../../layout/footer/Footer";
import AppRoot from "../../../layout/global/AppRoot";
import AppWrap from "../../../layout/global/AppWrap";
import AdminHeader from "../../admin/layout/AdminHeader";
import OpenPosRail from "../OpenPosRail";
import "../../../modules/ams-pos/styles/ams-pos.css";

const isCashierPath = (pathname = "") => {
  const raw = String(pathname || "").split("?")[0].toLowerCase();
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "").toLowerCase();
  let path = base && raw.startsWith(base) ? raw.slice(base.length) : raw;
  path = path.replace(/\/+$/, "") || "/";
  // Electron / homepage kadang sisakan path penuh
  return (
    path === "/store/cashier" ||
    path === "/cashier" ||
    path.endsWith("/store/cashier") ||
    /\/store\/cashier$/i.test(raw) ||
    /\/cashier$/i.test(raw)
  );
};

const StoreShell = ({ title }) => {
  const location = useLocation();
  const isCashier = isCashierPath(location.pathname);

  useEffect(() => {
    const header = document.querySelector(".nk-header");
    const offset = header ? Math.ceil(header.getBoundingClientRect().height) : 65;
    document.documentElement.style.setProperty("--ams-header-offset", `${offset}px`);

    document.body.classList.toggle("ams-cashier-open", isCashier);
    document.documentElement.classList.toggle("ams-cashier-open", isCashier);
    return () => {
      document.body.classList.remove("ams-cashier-open");
      document.documentElement.classList.remove("ams-cashier-open");
      document.documentElement.style.removeProperty("--ams-header-offset");
    };
  }, [isCashier, location.pathname]);

  // Set class segera di render-path agar chip kasir tidak "crash style" 1 frame
  if (typeof document !== "undefined") {
    document.body.classList.toggle("ams-cashier-open", isCashier);
    document.documentElement.classList.toggle("ams-cashier-open", isCashier);
  }

  return (
    <>
      <Head title={title || (isCashier ? "Kasir" : "Store Portal")} />
      <AppRoot>
        <AppWrap className={isCashier ? "nk-wrap-cashier" : undefined}>
          <AdminHeader />
          <Outlet />
          {!isCashier && <Footer />}
          {!isCashier && <OpenPosRail />}
        </AppWrap>
      </AppRoot>
    </>
  );
};

export default StoreShell;
