import React, { useEffect, useMemo, useState } from "react";
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

const normalizeCodes = (moduleCode, moduleCodes) => {
  const list = [];
  if (Array.isArray(moduleCodes)) {
    moduleCodes.forEach((c) => {
      if (c && !list.includes(c)) list.push(c);
    });
  }
  if (moduleCode && !list.includes(moduleCode)) list.push(moduleCode);
  return list;
};

const initialAccessState = (codes, permission) => {
  if (!codes.length || isSuperAdmin()) {
    return { loading: false, allowed: true };
  }
  const cached = codes.map((c) => readCache(c, permission));
  if (cached.some((v) => v === true)) return { loading: false, allowed: true };
  if (cached.every((v) => v === false)) return { loading: false, allowed: false };
  return { loading: true, allowed: false };
};

/** `moduleCode` atau `moduleCodes` (OR — cukup salah satu VIEW). */
const AccessGuard = ({ moduleCode, moduleCodes, permission = "VIEW", children }) => {
  const codes = useMemo(() => normalizeCodes(moduleCode, moduleCodes), [moduleCode, moduleCodes]);
  const codesKey = codes.join("|");
  const [state, setState] = useState(() => initialAccessState(codes, permission));

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      if (!codes.length || isSuperAdmin()) {
        if (mounted) setState({ loading: false, allowed: true });
        return;
      }

      const cached = codes.map((c) => readCache(c, permission));
      if (cached.some((v) => v === true)) {
        if (mounted) setState({ loading: false, allowed: true });
        return;
      }
      if (cached.every((v) => v === false)) {
        if (mounted) setState({ loading: false, allowed: false });
        return;
      }

      try {
        const results = await Promise.all(
          codes.map((code) =>
            accessService.check({
              nik: getAuthNik(),
              module_code: code,
              permission_code: permission,
            })
          )
        );
        let allowed = false;
        results.forEach((res, i) => {
          const ok = resolveAllowed(res);
          writeCache(codes[i], permission, ok);
          if (ok) allowed = true;
        });
        if (mounted) setState({ loading: false, allowed });
      } catch {
        if (mounted) setState({ loading: false, allowed: false });
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [codesKey, permission, codes]);

  /* No LoadingState spinner — avoid top-of-page glitch on every menu open */
  if (state.loading) return null;
  if (!state.allowed) return <Navigate to={appPath("/403")} replace />;
  return children;
};

export default AccessGuard;
