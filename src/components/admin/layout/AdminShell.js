import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Footer from "../../../layout/footer/Footer";
import AppRoot from "../../../layout/global/AppRoot";
import AppWrap from "../../../layout/global/AppWrap";
import AdminHeader from "./AdminHeader";
import DgsAppLayout from "../../../pages/admin/dgs/shell/DgsAppLayout";

const isDgsPath = (pathname = "") => {
  const raw = String(pathname || "").split("?")[0].toLowerCase();
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "").toLowerCase();
  let path = base && raw.startsWith(base) ? raw.slice(base.length) : raw;
  path = path.replace(/\/+$/, "") || "/";
  return path === "/dgs" || path.startsWith("/dgs/");
};

const AdminShell = ({ title }) => {
  const { pathname } = useLocation();
  const dgs = isDgsPath(pathname);

  return (
    <>
      <Head title={title || "Admin Portal"} />
      <AppRoot>
        <AppWrap className={dgs ? "nk-wrap--dgs" : undefined}>
          <AdminHeader />
          {dgs ? (
            <DgsAppLayout>
              <Outlet />
            </DgsAppLayout>
          ) : (
            <>
              <Outlet />
              <Footer />
            </>
          )}
        </AppWrap>
      </AppRoot>
    </>
  );
};

export default AdminShell;
