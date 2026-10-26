const TOKEN_KEY = "rbac_token";
const USER_KEY = "rbac_user";
const MENU_KEY = "rbac_menu";
const STORE_SCOPE_KEY = "rbac_store_scope";
export const SESSION_CLEARED_EVENT = "rbac-session-cleared";

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clearUser: () => localStorage.removeItem(USER_KEY),

  getMenu: () => {
    try {
      const raw = localStorage.getItem(MENU_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  setMenu: (menu) => localStorage.setItem(MENU_KEY, JSON.stringify(menu)),
  clearMenu: () => localStorage.removeItem(MENU_KEY),

  getStoreScope: () => {
    try {
      const raw = localStorage.getItem(STORE_SCOPE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  setStoreScope: (scope) => localStorage.setItem(STORE_SCOPE_KEY, JSON.stringify(scope)),
  clearStoreScope: () => localStorage.removeItem(STORE_SCOPE_KEY),

  clearAll: () => {
    storage.clearToken();
    storage.clearUser();
    storage.clearMenu();
    storage.clearStoreScope();
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
  },
};
