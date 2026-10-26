import React from "react";
import classNames from "classnames";
import { useLocation, useNavigate } from "react-router-dom";
import Toggle from "../../../layout/header/Toggle";
import Logo from "../../../layout/logo/Logo";
import MobileMenu from "../../../layout/menu/MobileMenu";
import { Dropdown, DropdownToggle, DropdownMenu } from "reactstrap";
import { useAuth } from "../../../context/AuthContext";
import { appPath } from "../../../lib/paths";
import { Icon } from "../../../components/Component";
import { useTheme, useThemeUpdate } from "../../../layout/provider/Theme";
import AdminTopMenu, { toMobileMenuData } from "./AdminTopMenu";
import {
  selectCashierSessionValid,
  useCashierSession,
} from "../../../modules/ams-pos/store/use-cashier-session";
import { CashierLogoutDialog } from "../../../modules/ams-pos/components/pos/CashierLogoutDialog";
import { getDummyShiftSummary } from "../../../modules/ams-pos/lib/cashier-auth-dummy";
import { useStoreScope } from "../../../hooks/useStoreScope";

const isCashierPath = (pathname = "") => {
  const raw = String(pathname || "").split("?")[0].toLowerCase();
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "").toLowerCase();
  let path = base && raw.startsWith(base) ? raw.slice(base.length) : raw;
  path = path.replace(/\/+$/, "") || "/";
  return (
    path === "/store/cashier" ||
    path === "/cashier" ||
    path.endsWith("/store/cashier") ||
    /\/store\/cashier$/i.test(raw) ||
    /\/cashier$/i.test(raw)
  );
};

const initials = (name = "") =>
  String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "CS";

const AdminHeader = () => {
  const { user, navigation, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const themeUpdate = useThemeUpdate();
  const { storeName, storeId } = useStoreScope();
  const [open, setOpen] = React.useState(false);
  const [cashierMenuOpen, setCashierMenuOpen] = React.useState(false);
  const [cashierLogoutOpen, setCashierLogoutOpen] = React.useState(false);
  const mobileMenuData = toMobileMenuData(navigation);

  const cashier = useCashierSession((s) => s.cashier);
  const lastActivityAt = useCashierSession((s) => s.lastActivityAt);
  const signedInAt = useCashierSession((s) => s.signedInAt);
  const shiftSummary = useCashierSession((s) => s.shiftSummary);
  const signOutCashier = useCashierSession((s) => s.signOut);
  const onCashierPage = isCashierPath(location.pathname);
  const showCashierBadge =
    onCashierPage && selectCashierSessionValid({ cashier, lastActivityAt }) && cashier;

  const logoutSummary = (() => {
    const s = shiftSummary;
    const empty =
      !s ||
      ((s.txCount || 0) <= 0 &&
        (s.totalAmount || 0) <= 0 &&
        Object.keys(s.byMethod || {}).length === 0);
    return empty ? getDummyShiftSummary(cashier?.id) : s;
  })();

  const handleLogout = () => {
    logout();
    navigate(appPath("/login"));
  };

  const openCashierLogout = () => {
    setCashierMenuOpen(false);
    setCashierLogoutOpen(true);
  };

  const confirmCashierLogout = () => {
    setCashierLogoutOpen(false);
    signOutCashier();
    navigate(appPath("/store"));
  };

  const headerClass = classNames({
    "nk-header is-regular": true,
    "nk-header-fixed": true,
    "is-light": theme.header === "white",
    [`is-${theme.header}`]: theme.header !== "white" && theme.header !== "light",
    "admin-header": true,
  });

  // Expose header height for page sticky tables (e.g. Total Sales thead)
  React.useEffect(() => {
    const sync = () => {
      const el = document.querySelector(".admin-header.nk-header");
      if (!el) return;
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--ams-header-h", `${h}px`);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return (
    <div className={headerClass}>
      <div className="container-fluid wide-xl">
        <div className="nk-header-wrap">
          <div className="nk-menu-trigger me-sm-2 d-lg-none">
            <Toggle className="nk-nav-toggle nk-quick-nav-icon" icon="menu" click={themeUpdate.sidebarVisibility} />
          </div>
          <div className="nk-header-brand">
            <Logo />
          </div>
          <div
            className={`nk-header-menu ${theme.sidebarMobile ? "mobile-menu" : ""} ${
              theme.sidebarVisibility ? "nk-header-active" : ""
            }`}
          >
            <div className="nk-header-mobile">
              <div className="nk-header-brand">
                <Logo />
              </div>
              <div className="nk-menu-trigger me-n2">
                <Toggle className="nk-nav-toggle nk-quick-nav-icon" icon="arrow-left" click={themeUpdate.sidebarVisibility} />
              </div>
            </div>
            {theme.sidebarMobile ? (
              <MobileMenu data={mobileMenuData} sidebarToggle={themeUpdate.sidebarVisibility} mobileView />
            ) : (
              <AdminTopMenu items={navigation} />
            )}
          </div>
          {theme.sidebarVisibility && <div className="nk-header-overlay" onClick={themeUpdate.sidebarVisibility} />}
          <div className="nk-header-tools">
            <ul className="nk-quick-nav">
              <li className="user-dropdown">
                {showCashierBadge ? (
                  <Dropdown
                    isOpen={cashierMenuOpen}
                    toggle={() => setCashierMenuOpen(!cashierMenuOpen)}
                    className="pos-cashier-dropdown"
                  >
                    {/* Pakai pola user-toggle tema (CSS selalu ada) — hindari crash style btn polos */}
                    <DropdownToggle
                      tag="a"
                      href="#cashier"
                      className="dropdown-toggle"
                      onClick={(e) => e.preventDefault()}
                    >
                      <div className="user-toggle">
                        <div className="user-avatar sm bg-primary">
                          <span>{initials(cashier.name)}</span>
                        </div>
                        <div className="user-info d-none d-md-block">
                          <div className="user-status">CASHIER</div>
                          <div className="user-name dropdown-indicator">
                            {cashier.name} - Shift {cashier.shift}
                          </div>
                        </div>
                      </div>
                    </DropdownToggle>
                    <DropdownMenu end className="dropdown-menu-md pos-cashier-menu">
                      <div className="dropdown-inner">
                        <ul className="link-list">
                          <li>
                            <a
                              href="#logout-cashier"
                              onClick={(e) => {
                                e.preventDefault();
                                openCashierLogout();
                              }}
                            >
                              <Icon name="signout" />
                              <span>Logout Cashier</span>
                            </a>
                          </li>
                        </ul>
                      </div>
                    </DropdownMenu>
                  </Dropdown>
                ) : (
                  <Dropdown isOpen={open} toggle={() => setOpen(!open)}>
                    <DropdownToggle tag="a" className="dropdown-toggle" onClick={(e) => e.preventDefault()}>
                      <div className="user-toggle">
                        <div className="user-avatar sm bg-primary">
                          <span>{(user?.employeeName || user?.username || "U").slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="user-info d-none d-md-block">
                          <div className="user-status">{user?.isSuperAdmin ? "Super Admin" : "User"}</div>
                          <div className="user-name dropdown-indicator">{user?.employeeName || user?.username}</div>
                        </div>
                      </div>
                    </DropdownToggle>
                    <DropdownMenu end className="dropdown-menu-md">
                      <div className="dropdown-inner">
                        <ul className="link-list">
                          <li>
                            <a href="#profile" onClick={(e) => { e.preventDefault(); navigate(appPath("/profile")); setOpen(false); }}>
                              <Icon name="user-alt" /><span>Profile</span>
                            </a>
                          </li>
                          <li>
                            <a href="#logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                              <Icon name="signout" /><span>Logout</span>
                            </a>
                          </li>
                        </ul>
                      </div>
                    </DropdownMenu>
                  </Dropdown>
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {showCashierBadge && cashier ? (
        <CashierLogoutDialog
          open={cashierLogoutOpen}
          cashier={cashier}
          summary={logoutSummary}
          signedInAt={signedInAt}
          intent="logout"
          storeName={storeName || storeId || undefined}
          onCancel={() => setCashierLogoutOpen(false)}
          onConfirm={confirmCashierLogout}
        />
      ) : null}
    </div>
  );
};

export default AdminHeader;
