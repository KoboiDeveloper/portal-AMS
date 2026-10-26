import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { appPath } from "../../lib/paths";
import LoadingState from "./common/LoadingState";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, bootstrapping } = useAuth();
  const location = useLocation();

  if (loading || bootstrapping) return <LoadingState message="Checking session..." />;
  if (!isAuthenticated) {
    return <Navigate to={appPath("/login")} replace state={{ from: location.pathname }} />;
  }
  return children;
};

export default ProtectedRoute;
