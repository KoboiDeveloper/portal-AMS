import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { accessService } from "../../services/access.service";
import { getAuthNik, isSuperAdmin } from "../../lib/auth";
import { isSuccess } from "../../lib/response";
import { appPath } from "../../lib/paths";

/** Session-scoped VIEW/action cache — avoids spinner flash on every navigation */
const accessCache = new Map();

const cacheKey = (moduleCode, permission) =>
  `${getAuthNik() || ""}|${moduleCode}|${permission}`;

const readCache = (moduleCode, permission) => {
  const key = cacheKey(moduleCode, permission);
  if (!accessCache.has(key)) return null;
  return accessCache.get(key);
};

const writeCache = (moduleCode, permission, allowed) => {
  accessCache.set(cacheKey(moduleCode, permission), !!allowed);
};

export const clearAccessCache = () => accessCache.clear();

const resolveAllowed = (res) =>
  isSuccess(res) &&
  (res.allowed === true ||
    res.isAllowed === true ||
    res.data?.allowed === true ||
    res.data?.is_allowed === true);

const initialAccessState = (moduleCode, permission) => {
  if (!moduleCode || isSuperAdmin()) {
    return { loading: false, allowed: true };
  }
  const cached = readCache(moduleCode, permission);
  if (cached !== null) {
    return { loading: false, allowed: cached };
  }
  return { loading: true, allowed: false };
};

const AccessGuard = ({ moduleCode, permission = "VIEW", children }) => {
  const [state, setState] = useState(() => initialAccessState(moduleCode, permission));

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      if (!moduleCode || isSuperAdmin()) {
        if (mounted) setState({ loading: false, allowed: true });
        return;
      }

      const cached = readCache(moduleCode, permission);
      if (cached !== null) {
        if (mounted) setState({ loading: false, allowed: cached });
        return;
      }

      try {
        const res = await accessService.check({
          nik: getAuthNik(),
          module_code: moduleCode,
          permission_code: permission,
        });
        const allowed = resolveAllowed(res);
        writeCache(moduleCode, permission, allowed);
        if (mounted) setState({ loading: false, allowed });
      } catch {
        writeCache(moduleCode, permission, false);
        if (mounted) setState({ loading: false, allowed: false });
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [moduleCode, permission]);

  /* No LoadingState spinner — avoid top-of-page glitch on every menu open */
  if (state.loading) return null;
  if (!state.allowed) return <Navigate to={appPath("/403")} replace />;
  return children;
};

export default AccessGuard;
