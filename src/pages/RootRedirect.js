import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { appPath } from "../lib/paths";

const RootRedirect = () => {
  const { isAuthenticated, homePath, bootstrapping } = useAuth();

  if (bootstrapping) return null;
  if (!isAuthenticated) {
    return <Navigate to={appPath("/login")} replace />;
  }
  return <Navigate to={appPath(homePath || "/login")} replace />;
};

export default RootRedirect;
