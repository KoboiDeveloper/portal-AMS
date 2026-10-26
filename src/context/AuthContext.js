import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authService } from "../services/auth.service";
import { accessService } from "../services/access.service";
import { storage, SESSION_CLEARED_EVENT } from "../lib/storage";
import { extractRows, isSuccess } from "../lib/response";
import { buildAdminNavigation, buildStoreNavigation } from "../lib/menu";
import { getDefaultHomePath, pickActiveStore, isStoreLoginUser } from "../lib/userSession";
import { clearAccessCache } from "../components/admin/AccessGuard";

const AuthContext = createContext(null);

const readStoredUser = () => storage.getUser();
const hasValidSession = () => !!(storage.getToken() && readStoredUser()?.nik);

export const AuthProvider = ({ children }) => {
  const bootstrappedRef = useRef(null);
  const menuBootstrapAttemptRef = useRef(null);
  const [user, setUser] = useState(() => readStoredUser());
  const [menuRows, setMenuRows] = useState(() => storage.getMenu());
  const [storeScope, setStoreScope] = useState(() => storage.getStoreScope());
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  const purgeSession = useCallback(() => {
    bootstrappedRef.current = null;
    menuBootstrapAttemptRef.current = null;
    clearAccessCache();
    authService.logout();
    setUser(null);
    setMenuRows([]);
    setStoreScope([]);
    setBootstrapping(false);
    setLoading(false);
  }, []);

  const isStoreUser = useMemo(() => isStoreLoginUser(user), [user]);
  const activeStore = useMemo(
    () => pickActiveStore(storeScope, user?.storeId),
    [storeScope, user?.storeId]
  );
  const activeStoreId = activeStore?.store_id || null;

  const loadMenu = useCallback(async (nik) => {
    if (!nik) return [];
    try {
      const res = await accessService.getUserMenu(nik);
      if (!isSuccess(res)) {
        console.warn("[Auth] menu API failed:", res?.responseMessage || res?.responseCode);
        return [];
      }
      const rows = extractRows(res);
      storage.setMenu(rows);
      setMenuRows(rows);
      return rows;
    } catch (err) {
      console.warn("[Auth] menu API error:", err?.responseMessage || err?.message || err);
      return [];
    }
  }, []);

  const loadStoreScope = useCallback(async (nik) => {
    if (!nik) return [];
    try {
      const res = await accessService.getUserStoreScope(nik);
      const rows = extractRows(res);
      storage.setStoreScope(rows);
      setStoreScope(rows);
      return rows;
    } catch {
      storage.setStoreScope([]);
      setStoreScope([]);
      return [];
    }
  }, []);

  const bootstrapSession = useCallback(
    async (nextUser) => {
      if (!nextUser?.nik) return [];
      if (!storage.getToken()) return [];
      setBootstrapping(true);
      try {
        const rows = await loadMenu(nextUser.nik);
        if (!storage.getToken()) return rows;
        if (isStoreLoginUser(nextUser)) {
          await loadStoreScope(nextUser.nik);
        } else {
          storage.setStoreScope([]);
          setStoreScope([]);
        }
        return rows;
      } finally {
        setBootstrapping(false);
      }
    },
    [loadMenu, loadStoreScope]
  );

  const login = useCallback(
    async (username, password) => {
      setLoading(true);
      try {
        purgeSession();
        const res = await authService.login(username, password);
        const nextUser = storage.getUser();
        if (!nextUser?.nik || !storage.getToken()) {
          throw {
            responseMessage: "Login response incomplete (missing token or user profile).",
          };
        }
        setUser(nextUser);
        const rows = await bootstrapSession(nextUser);
        if (!storage.getToken()) {
          throw {
            responseMessage: "Session expired while loading menu. Please try again.",
          };
        }
        if (!rows.length) {
          console.warn("[Auth] menu empty after login for", nextUser.nik);
        }
        bootstrappedRef.current = rows.length
          ? `${nextUser.nik}:${storage.getToken() || ""}`
          : null;
        const nav = isStoreLoginUser(nextUser)
          ? buildStoreNavigation(rows)
          : buildAdminNavigation(rows);
        const resolvedHome = getDefaultHomePath(nextUser, nav);
        return { res, homePath: resolvedHome };
      } finally {
        setLoading(false);
      }
    },
    [bootstrapSession, purgeSession]
  );

  const logout = useCallback(() => {
    purgeSession();
  }, [purgeSession]);

  useEffect(() => {
    const token = storage.getToken();
    const storedUser = readStoredUser();
    if (!token && storedUser) {
      purgeSession();
      return;
    }
    if (token && !storedUser?.nik) {
      purgeSession();
    }
  }, [purgeSession]);

  useEffect(() => {
    const onSessionCleared = () => {
      setUser(null);
      setMenuRows([]);
      setStoreScope([]);
      setBootstrapping(false);
      setLoading(false);
    };
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
  }, []);

  useEffect(() => {
    if (!hasValidSession() || !user?.nik) {
      bootstrappedRef.current = null;
      menuBootstrapAttemptRef.current = null;
      return;
    }

    const sessionKey = `${user.nik}:${storage.getToken() || ""}`;
    if (menuRows.length > 0) {
      bootstrappedRef.current = sessionKey;
      return;
    }

    if (bootstrapping || loading) return;
    if (menuBootstrapAttemptRef.current === sessionKey) return;

    menuBootstrapAttemptRef.current = sessionKey;
    bootstrapSession(user).then((rows) => {
      if (rows.length) {
        bootstrappedRef.current = sessionKey;
      }
    });
  }, [user?.nik, menuRows.length, bootstrapSession, user, bootstrapping, loading]);

  const adminNavigation = useMemo(
    () => buildAdminNavigation(menuRows),
    [menuRows]
  );

  const storeNavigation = useMemo(
    () => buildStoreNavigation(menuRows),
    [menuRows]
  );

  const navigation = useMemo(
    () => (isStoreUser ? storeNavigation : adminNavigation),
    [isStoreUser, storeNavigation, adminNavigation]
  );

  const homePath = useMemo(
    () => getDefaultHomePath(user, navigation),
    [user, navigation]
  );

  const isAuthenticated = hasValidSession() && !!user?.nik;

  const value = useMemo(
    () => ({
      user,
      menuRows,
      storeScope,
      activeStore,
      activeStoreId,
      isStoreUser,
      adminNavigation,
      storeNavigation,
      navigation,
      homePath,
      loading,
      bootstrapping,
      isAuthenticated,
      login,
      logout,
      purgeSession,
      loadMenu,
      loadStoreScope,
      refreshMenu: () => loadMenu(user?.nik),
      refreshStoreScope: () => loadStoreScope(user?.nik),
    }),
    [
      user,
      menuRows,
      storeScope,
      activeStore,
      activeStoreId,
      isStoreUser,
      adminNavigation,
      storeNavigation,
      navigation,
      homePath,
      loading,
      bootstrapping,
      isAuthenticated,
      login,
      logout,
      purgeSession,
      loadMenu,
      loadStoreScope,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
