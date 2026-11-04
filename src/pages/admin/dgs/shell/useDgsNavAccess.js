import { useEffect, useMemo, useState } from "react";
import { accessService } from "../../../../services/access.service";
import { getAuthNik, isSuperAdmin } from "../../../../lib/auth";
import { isSuccess } from "../../../../lib/response";

/** Session cache — cleared on logout via clearDgsNavAccessCache */
const cache = new Map();
const keyOf = (code) => `${getAuthNik() || ""}|${code}|VIEW`;

export const clearDgsNavAccessCache = () => cache.clear();

const resolveAllowed = (res) =>
  isSuccess(res) &&
  (res.allowed === true ||
    res.isAllowed === true ||
    res.data?.allowed === true ||
    res.data?.is_allowed === true);

/**
 * Cek VIEW access untuk daftar module_code (OR per item).
 * return: { loading, allowed: Set<string> } — Set berisi code yang boleh.
 */
export const useDgsNavAccess = (moduleCodes = []) => {
  const codes = useMemo(
    () => [...new Set(moduleCodes.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean))],
    [moduleCodes.join("|")]
  );
  const [state, setState] = useState(() => ({
    loading: !isSuperAdmin() && codes.length > 0,
    allowed: new Set(isSuperAdmin() ? codes : []),
  }));

  useEffect(() => {
    let mounted = true;

    if (!codes.length || isSuperAdmin()) {
      setState({ loading: false, allowed: new Set(codes) });
      return undefined;
    }

    const run = async () => {
      const nextAllowed = new Set();
      const needFetch = [];

      codes.forEach((code) => {
        const k = keyOf(code);
        if (cache.has(k)) {
          if (cache.get(k)) nextAllowed.add(code);
        } else {
          needFetch.push(code);
        }
      });

      if (!needFetch.length) {
        if (mounted) setState({ loading: false, allowed: nextAllowed });
        return;
      }

      const settled = await Promise.allSettled(
        needFetch.map((code) =>
          accessService.check({
            nik: getAuthNik(),
            module_code: code,
            permission_code: "VIEW",
          })
        )
      );

      settled.forEach((result, i) => {
        const code = needFetch[i];
        let ok = false;
        if (result.status === "fulfilled") {
          ok = resolveAllowed(result.value);
        } else {
          const body = result.reason?.response?.data || result.reason?.data;
          ok = body ? resolveAllowed(body) : false;
        }
        cache.set(keyOf(code), ok);
        if (ok) nextAllowed.add(code);
      });

      if (mounted) setState({ loading: false, allowed: nextAllowed });
    };

    setState((s) => ({ ...s, loading: true }));
    run();
    return () => {
      mounted = false;
    };
  }, [codes.join("|")]);

  return { loading: state.loading, allowed: state.allowed };
};

export default useDgsNavAccess;
