import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { appPath } from "../../lib/paths";
import { isStorePortalPath } from "../../lib/storePaths";
import LoadingState from "./common/LoadingState";

/** Blocks STORE_LOGIN users from admin RBAC layout. */
const AdminLayoutGuard = () => {
  const { isStoreUser, homePath, bootstrapping, loading } = useAuth();
  const location = useLocation();

  if (loading || bootstrapping) {
    return <LoadingState message="Loading session..." />;
  }

  if (isStoreUser) {
    const target = isStorePortalPath(homePath) ? homePath : "/store";
    return <Navigate to={appPath(target)} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default AdminLayoutGuard;
