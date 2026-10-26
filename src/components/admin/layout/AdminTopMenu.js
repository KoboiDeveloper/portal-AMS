import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { appPath } from "../../../lib/paths";

const MEGA_SPLIT_AT = 5;

const isPathActive = (pathname, link) => {
  if (!link || link === "#") return false;
  return pathname === appPath(link) || pathname.startsWith(`${appPath(link)}/`);
};

const hasActiveChild = (pathname, item) => {
  if (!item.subMenu) return false;
  return item.subMenu.some(
    (sub) => isPathActive(pathname, sub.link) || hasActiveChild(pathname, sub)
  );
};

/** Split long menus into 2 column chunks when more than MEGA_SPLIT_AT items. */
const splitIntoColumns = (links, maxSingle = MEGA_SPLIT_AT) => {
  if (!links?.length) return [];
  if (links.length <= maxSingle) return [links];
  const mid = Math.ceil(links.length / 2);
  return [links.slice(0, mid), links.slice(mid)];
};

const isStockOpnameGroup = (key, title) => {
  const k = String(key || "").toUpperCase();
  const t = String(title || "").toLowerCase();
  return k === "REG_GRP_SO" || t === "stock opname";
};

/** Left edge of AMS brand + bottom of header (viewport). */
const getMegaPos = () => {
  const header = document.querySelector(".admin-header.nk-header");
  const brand = document.querySelector(".admin-header .nk-header-brand");
  const wrap = document.querySelector(".admin-header .nk-header-wrap");
  const anchor = brand || wrap || header;
  if (!header || !anchor) return { left: 0, top: 64 };
  const hb = header.getBoundingClientRect();
  const ab = anchor.getBoundingClientRect();
  return {
    left: Math.max(0, Math.round(ab.left)),
    top: Math.round(hb.bottom),
  };
};

const LeafList = ({ links, onNavigate }) => {
  const location = useLocation();
  return (
    <ul className="admin-mega-col-list">
      {links.map((leaf) => {
        const active = isPathActive(location.pathname, leaf.link);
        return (
          <li key={leaf.moduleCode || leaf.link || leaf.text} className={active ? "active" : ""}>
            <Link
              className="admin-mega-link"
              to={appPath(leaf.link)}
              onClick={onNavigate}
            >
              {leaf.text}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

/** One mega column. Nested folders stay in the same column. Stock Opname never splits. */
const MegaGroup = ({ groupKey, title, items = [], onNavigate }) => {
  const leaves = items.filter((c) => !c.subMenu?.length);
  const nested = items.filter((c) => c.subMenu?.length);
  const keepSingleCol = isStockOpnameGroup(groupKey, title);

  if (nested.length || keepSingleCol) {
    return (
      <div className="admin-mega-group">
        {title ? <div className="admin-mega-group-title">{title}</div> : null}
        <div className="admin-mega-group-cols">
          <div className="admin-mega-col">
            {leaves.length ? <LeafList links={leaves} onNavigate={onNavigate} /> : null}
            {nested.map((sec) => (
              <div key={sec.moduleCode || sec.text} className="admin-mega-nested">
                <div className="admin-mega-nested-title">{sec.text}</div>
                <LeafList links={sec.subMenu || []} onNavigate={onNavigate} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const chunks = splitIntoColumns(leaves);
  return (
    <div className={`admin-mega-group${chunks.length > 1 ? " is-multi" : ""}`}>
      {title ? <div className="admin-mega-group-title">{title}</div> : null}
      <div className="admin-mega-group-cols">
        {chunks.map((chunk, idx) => (
          <div key={idx} className="admin-mega-col">
            <LeafList links={chunk} onNavigate={onNavigate} />
          </div>
        ))}
      </div>
    </div>
  );
};

/** Portal panel — fixed to pojok kiri (brand), not under the trigger item. */
const MegaMenuPanel = ({ item, open, pos, onEnter, onLeave, onNavigate }) => {
  const folders = (item.subMenu || []).filter((c) => c.subMenu?.length);
  const loneLeaves = (item.subMenu || []).filter((c) => !c.subMenu?.length);

  const groups = folders.map((f) => ({
    key: f.moduleCode || f.text,
    title: f.text,
    items: f.subMenu || [],
  }));

  if (loneLeaves.length) {
    groups.push({
      key: "__lone",
      title: folders.length ? "Lainnya" : "",
      items: loneLeaves,
    });
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="admin-mega-panel is-open"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        display: "block",
        zIndex: 2000,
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="admin-mega-grid">
        {groups.map((g) => (
          <MegaGroup
            key={g.key}
            groupKey={g.key}
            title={g.title}
            items={g.items}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};

const shouldUseMega = (item) => {
  if (item.mega) return true;
  const kids = item.subMenu || [];
  if (kids.some((c) => c.subMenu?.length)) return true;
  if (kids.length > MEGA_SPLIT_AT) return true;
  return false;
};

/** Desktop top menu: hover-only — block click/focus so panels don't stick open. */
const suppressClickOpen = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (typeof e.currentTarget?.blur === "function") e.currentTarget.blur();
};

const MegaTopItem = ({ item, openKey, setOpenKey }) => {
  const location = useLocation();
  const childActive = hasActiveChild(location.pathname, item);
  const key = item.moduleCode || item.text;
  const open = openKey === key;
  const [pos, setPos] = useState({ left: 0, top: 64 });
  const closeTimer = useRef(null);

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openMega = () => {
    clearClose();
    setPos(getMegaPos());
    setOpenKey(key);
  };

  const scheduleClose = () => {
    clearClose();
    closeTimer.current = setTimeout(() => setOpenKey((k) => (k === key ? null : k)), 120);
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    setPos(getMegaPos());
    const onMove = () => setPos(getMegaPos());
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  useEffect(() => () => clearClose(), []);

  return (
    <li
      className={`nk-menu-item has-sub has-mega ${childActive ? "active current-menu" : ""} ${
        open ? "mega-open" : ""
      }`}
      onMouseEnter={openMega}
      onMouseLeave={scheduleClose}
    >
      <a
        href="#toggle"
        className="nk-menu-link nk-menu-toggle"
        onClick={suppressClickOpen}
        onMouseDown={suppressClickOpen}
      >
        <span className="nk-menu-text">{item.text}</span>
      </a>
      <MegaMenuPanel
        item={item}
        open={open}
        pos={pos}
        onEnter={openMega}
        onLeave={scheduleClose}
        onNavigate={() => setOpenKey(null)}
      />
    </li>
  );
};

const TopMenuItem = ({ item, openKey, setOpenKey }) => {
  const location = useLocation();

  if (item.subMenu?.length) {
    const childActive = hasActiveChild(location.pathname, item);

    if (shouldUseMega(item)) {
      return <MegaTopItem item={item} openKey={openKey} setOpenKey={setOpenKey} />;
    }

    return (
      <li className={`nk-menu-item has-sub ${childActive ? "active current-menu" : ""}`}>
        <a
          href="#toggle"
          className="nk-menu-link nk-menu-toggle"
          onClick={suppressClickOpen}
          onMouseDown={suppressClickOpen}
        >
          <span className="nk-menu-text">{item.text}</span>
        </a>
        <ul className="nk-menu-sub">
          {item.subMenu.map((sub) => (
            <TopMenuItem
              key={sub.moduleCode || sub.link || sub.text}
              item={sub}
              openKey={openKey}
              setOpenKey={setOpenKey}
            />
          ))}
        </ul>
      </li>
    );
  }

  const active = isPathActive(location.pathname, item.link);
  return (
    <li className={`nk-menu-item ${active ? "active current-page" : ""}`}>
      <Link className="nk-menu-link" to={appPath(item.link)}>
        <span className="nk-menu-text">{item.text}</span>
      </Link>
    </li>
  );
};

const AdminTopMenu = ({ items = [] }) => {
  const [openKey, setOpenKey] = useState(null);
  const location = useLocation();

  useEffect(() => {
    setOpenKey(null);
  }, [location.pathname]);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") setOpenKey(null);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <ul className="nk-menu nk-menu-main ui-s2">
      {items.map((item) => (
        <TopMenuItem
          key={item.moduleCode || item.link || item.text}
          item={item}
          openKey={openKey}
          setOpenKey={setOpenKey}
        />
      ))}
    </ul>
  );
};

export const toMobileMenuData = (items) =>
  (items || []).map((item) => ({
    text: item.text,
    link: item.link || "#",
    icon: item.icon || "bag",
    badge: item.badge,
    newTab: item.newTab,
    subMenu: item.subMenu?.length ? toMobileMenuData(item.subMenu) : undefined,
  }));

export default AdminTopMenu;
