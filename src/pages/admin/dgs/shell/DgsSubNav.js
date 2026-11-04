import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { appPath } from "../../../../lib/paths";
import { isSuperAdmin } from "../../../../lib/auth";
import { collectNavModuleCodes, DGS_NAV_GROUPS } from "../sc/dgsModuleMap";
import { DGS_NAV_ICONS, IconQuick } from "./DgsNavIcons";
import useDgsNavAccess from "./useDgsNavAccess";

const pathOf = (route) => appPath(route);

const groupIsActive = (group, pathname) => {
  if (group.route) return pathname === pathOf(group.route) || pathname.startsWith(`${pathOf(group.route)}/`);
  return (group.items || []).some((it) => pathname === pathOf(it.route) || pathname.startsWith(`${pathOf(it.route)}/`));
};

const canView = (allowed, moduleCodes) => {
  if (isSuperAdmin()) return true;
  if (!moduleCodes?.length) return false;
  return moduleCodes.some((c) => allowed.has(String(c).toUpperCase()));
};

/** Secondary left nav — filtered by RBAC VIEW (sama AccessGuard halaman). */
const DgsSubNav = ({ onQuickAccess, onNavigate }) => {
  const { pathname } = useLocation();
  const allCodes = useMemo(() => collectNavModuleCodes(DGS_NAV_GROUPS), []);
  const { loading, allowed } = useDgsNavAccess(allCodes);

  const groups = useMemo(() => {
    const mapped = DGS_NAV_GROUPS.map((g) => {
      if (g.route && !(g.items || []).length) {
        return canView(allowed, g.moduleCodes) ? g : null;
      }
      const items = (g.items || []).filter((it) => canView(allowed, it.moduleCodes));
      if (!items.length) return null;
      return { ...g, items };
    }).filter(Boolean);
    /* Jangan dobel Beranda: full DGS pakai /dashboard; retur pakai /retur-dashboard */
    const hasMainHome = mapped.some((g) => g.id === "home");
    return mapped.filter((g) => !(g.id === "home-retur" && hasMainHome));
  }, [allowed]);

  if (loading) {
    return <nav className="dgs-app-nav" aria-label="Navigasi DigitalSales" aria-busy="true" />;
  }

  const home = groups.find((g) => g.id === "home") || groups.find((g) => g.id === "home-retur");
  const rest = groups.filter((g) => g.id !== "home" && g.id !== "home-retur");

  return (
    <nav className="dgs-app-nav" aria-label="Navigasi DigitalSales">
      {home ? (
        (() => {
          const Icon = DGS_NAV_ICONS[home.icon];
          return (
            <NavLink
              to={pathOf(home.route)}
              className={({ isActive }) => `dgs-subnav__item${isActive ? " is-active" : ""}`}
              onClick={onNavigate}
            >
              {Icon ? <Icon /> : null}
              <span className="dgs-subnav__text">{home.label}</span>
            </NavLink>
          );
        })()
      ) : null}

      <button type="button" className="dgs-subnav__item" onClick={onQuickAccess}>
        <IconQuick />
        <span className="dgs-subnav__text">Akses cepat</span>
      </button>

      {rest.length ? <div className="dgs-subnav__divider" role="separator" /> : null}

      {rest.map((g) => {
        const Icon = DGS_NAV_ICONS[g.icon];
        const open = groupIsActive(g, pathname);
        const items = g.items || [];

        if (g.route && !items.length) {
          return (
            <NavLink
              key={g.id}
              to={pathOf(g.route)}
              className={({ isActive }) => `dgs-subnav__item${isActive ? " is-active" : ""}`}
              onClick={onNavigate}
            >
              {Icon ? <Icon /> : null}
              <span className="dgs-subnav__text">{g.label}</span>
            </NavLink>
          );
        }

        return (
          <div key={g.id} className={`dgs-subnav__block${open ? " is-open" : ""}`}>
            <div
              className={`dgs-subnav__item dgs-subnav__item--parent${open ? " is-open" : ""}`}
              aria-current={open ? "true" : undefined}
            >
              {Icon ? <Icon /> : null}
              <span className="dgs-subnav__text">{g.label}</span>
            </div>
            <div className="dgs-subnav__children">
              {items.map((it) => (
                <NavLink
                  key={it.route}
                  to={pathOf(it.route)}
                  className={({ isActive }) => `dgs-subnav__child${isActive ? " is-active" : ""}`}
                  onClick={onNavigate}
                  title={it.label}
                >
                  {it.label}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
};

export default DgsSubNav;
