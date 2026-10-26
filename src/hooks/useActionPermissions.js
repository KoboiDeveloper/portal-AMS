import { useEffect, useState } from "react";
import { accessService } from "../services/access.service";
import { getAuthNik, isSuperAdmin } from "../lib/auth";
import { isSuccess } from "../lib/response";

export const useActionPermissions = (moduleCode, extraPermissions = []) => {
  const [perms, setPerms] = useState(() => {
    const initial = { CREATE: true, UPDATE: true, DELETE: true, loading: !!moduleCode };
    extraPermissions.forEach((code) => {
      initial[code] = true;
    });
    return initial;
  });

  useEffect(() => {
    if (!moduleCode) {
      const next = { CREATE: true, UPDATE: true, DELETE: true, loading: false };
      extraPermissions.forEach((code) => {
        next[code] = true;
      });
      setPerms(next);
      return;
    }

    if (isSuperAdmin()) {
      const next = { CREATE: true, UPDATE: true, DELETE: true, loading: false };
      extraPermissions.forEach((code) => {
        next[code] = true;
      });
      setPerms(next);
      return;
    }

    let mounted = true;
    const actions = ["CREATE", "UPDATE", "DELETE", ...extraPermissions];

    Promise.all(
      actions.map((permission_code) =>
        accessService
          .check({ nik: getAuthNik(), module_code: moduleCode, permission_code })
          .then((res) => ({
            permission_code,
            allowed:
              isSuccess(res) &&
              (res.allowed === true ||
                res.isAllowed === true ||
                res.data?.allowed === true ||
                res.data?.is_allowed === true),
          }))
          .catch(() => ({ permission_code, allowed: false }))
      )
    ).then((results) => {
      if (!mounted) return;
      const next = { loading: false };
      results.forEach(({ permission_code, allowed }) => {
        next[permission_code] = allowed;
      });
      setPerms(next);
    });

    return () => {
      mounted = false;
    };
  }, [moduleCode, extraPermissions.join(",")]);

  return perms;
};
