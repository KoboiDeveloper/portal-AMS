import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { appPath } from "../../lib/paths";
import { isPathAllowedByMenu } from "../../lib/userSession";
import { isStorePortalPath } from "../../lib/storePaths";
import LoadingState from "../admin/common/LoadingState";
import StoreScopeError from "../../pages/store/StoreScopeError";

/** Store layout — only for STORE_LOGIN users with API-driven menu. */
const StoreLayoutGuard = () => {
  const { isStoreUser, homePath, bootstrapping, loading, navigation, activeStoreId } = useAuth();
  const location = useLocation();

  if (loading || bootstrapping) {
    return <LoadingState message="Loading store session..." />;
  }

  if (!isStoreUser) {
    return <Navigate to={appPath("/dashboard")} replace state={{ from: location.pathname }} />;
  }

  if (!activeStoreId) {
    return (
      <StoreScopeError message="No store scope assigned to this account. Contact administrator." />
    );
  }

  const normalizedPath = location.pathname.replace(process.env.PUBLIC_URL || "", "") || "/";
  const isHome =
    normalizedPath === homePath ||
    normalizedPath === "/store" ||
    normalizedPath.startsWith("/store/");
  if (
    !isHome &&
    navigation.length &&
    !isPathAllowedByMenu(location.pathname, navigation) &&
    !isStorePortalPath(normalizedPath)
  ) {
    return <Navigate to={appPath("/403")} replace />;
  }

  return <Outlet />;
};

export default StoreLayoutGuard;
