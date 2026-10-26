import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { appPath } from "../../lib/paths";
import StoreHome from "../../pages/store/StoreHome";

/** Redirect /store to first menu or store home dashboard. */
const StoreIndex = () => {
  const { homePath } = useAuth();
  if (homePath && homePath !== "/store") {
    return <Navigate to={appPath(homePath)} replace />;
  }
  return <StoreHome />;
};

export default StoreIndex;
