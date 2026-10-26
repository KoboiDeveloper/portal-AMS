import React from "react";
import { Outlet } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Footer from "../../../layout/footer/Footer";
import AppRoot from "../../../layout/global/AppRoot";
import AppWrap from "../../../layout/global/AppWrap";
import AdminHeader from "./AdminHeader";

const AdminShell = ({ title }) => (
  <>
    <Head title={title || "Admin Portal"} />
    <AppRoot>
      <AppWrap>
        <AdminHeader />
        <Outlet />
        <Footer />
      </AppWrap>
    </AppRoot>
  </>
);

export default AdminShell;
