import React, { useEffect } from "react";
import Icon from "../../components/icon/Icon";
import classNames from "classnames";
import { NavLink, Link } from "react-router-dom";
import { appPath } from "../../lib/paths";

const ICON_FILL_MAP = {
  bag: "bag-fill",
  home: "home-fill",
  users: "users-fill",
  shield: "shield-fill",
  wallet: "wallet-fill",
  building: "building-fill",
  box: "package",
  "file-docs": "file-docs",
};

const resolveMenuIcon = (icon, filled = false) => {
  const value = String(icon || "").trim() || "bag";
  if (!filled) return value;
  if (value.endsWith("-fill")) return value;
  return ICON_FILL_MAP[value] || `${value}-fill`;
};

const MenuItem = ({ icon, link, text, sub, newTab, sidebarToggle, mobileView, badge }) => {
  let currentUrl;

  if (window.location.pathname !== undefined) {
    currentUrl = window.location.pathname;
  } else {
    currentUrl = null;
  }

  const resolvedLink = link && link !== "#" ? appPath(link) : "#";
  const isCurrent = currentUrl === resolvedLink && !sub;
  const menuIcon = resolveMenuIcon(icon, isCurrent);

  const toggleActionSidebar = (e) => {
    if (!sub && !newTab && mobileView) {
      sidebarToggle(e);
    }
  };

  const menuHeight = (el) => {
    var totalHeight = [];
    for (var i = 0; i < el.length; i++) {
      var margin =
        parseInt(window.getComputedStyle(el[i]).marginTop.slice(0, -2)) +
        parseInt(window.getComputedStyle(el[i]).marginBottom.slice(0, -2));
      var padding =
        parseInt(window.getComputedStyle(el[i]).paddingTop.slice(0, -2)) +
        parseInt(window.getComputedStyle(el[i]).paddingBottom.slice(0, -2));
      var height = el[i].clientHeight + margin + padding;
      totalHeight.push(height);
    }
    totalHeight = totalHeight.reduce((sum, value) => (sum += value));
    return totalHeight;
  };

  const makeParentActive = (el, childHeight) => {
    let element = el.parentElement.parentElement.parentElement;
    let wrap = el.parentElement.parentElement;
    if (element.classList[0] === "nk-menu-item") {
      element.classList.add("active");
      const subMenuHeight = menuHeight(el.parentNode.children);
      wrap.style.height = subMenuHeight + childHeight - 50 + "px";
      makeParentActive(element);
    }
  };

  useEffect(() => {
    var element = document.getElementsByClassName("nk-menu-item active current-page");
    var arrayElement = [...element];

    arrayElement.forEach((dom) => {
      if (dom.parentElement.parentElement.parentElement.classList[0] === "nk-menu-item") {
        dom.parentElement.parentElement.parentElement.classList.add("active");
        const subMenuHeight = menuHeight(dom.parentNode.children);
        dom.parentElement.parentElement.style.height = subMenuHeight + "px";
        makeParentActive(dom.parentElement.parentElement.parentElement, subMenuHeight);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const menuToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    var self = e.target.closest(".nk-menu-toggle");
    if (!self) return;
    var parent = self.parentElement;
    var subMenu = self.nextSibling;
    if (!subMenu) return;
    var subMenuItem = subMenu.childNodes;
    var parentSiblings = parent.parentElement.childNodes;
    var parentMenu = parent.closest(".nk-menu-wrap");
    var subMenuHeight = menuHeight(subMenuItem);
    const getParents = (el, parentSelector) => {
      parentSelector = document.querySelector(".nk-menu");
      if (parentSelector === undefined) {
        parentSelector = document;
      }
      var parents = [];
      var p = el.parentNode;
      while (p !== parentSelector) {
        var o = p;
        parents.push(o);
        p = o.parentNode;
      }
      parents.push(parentSelector);
      return parents;
    };
    var parentMenus = getParents(self);
    if (!parent.classList.contains("active")) {
      for (var j = 0; j < parentSiblings.length; j++) {
        parentSiblings[j].classList.remove("active");
        if (typeof parentSiblings[j].childNodes[1] !== "undefined") {
          parentSiblings[j].childNodes[1].style.height = 0;
        }
      }
      if (parentMenu !== null) {
        if (!parentMenu.classList.contains("sub-opened")) {
          parentMenu.classList.add("sub-opened");

          for (var l = 0; l < parentMenus.length; l++) {
            if (typeof parentMenus !== "undefined") {
              if (parentMenus[l].classList.contains("nk-menu-wrap")) {
                parentMenus[l].style.height = subMenuHeight + parentMenus[l].clientHeight + "px";
              }
            }
          }
        }
      }
      parent.classList.add("active");
      subMenu.style.height = subMenuHeight + "px";
    } else {
      parent.classList.remove("active");
      if (parentMenu !== null) {
        parentMenu.classList.remove("sub-opened");
        for (var k = 0; k < parentMenus.length; k++) {
          if (typeof parentMenus !== "undefined") {
            if (parentMenus[k].classList.contains("nk-menu-wrap")) {
              parentMenus[k].style.height = parentMenus[k].clientHeight - subMenuHeight + "px";
            }
          }
        }
      }
      subMenu.style.height = 0;
    }
  };

  const menuItemClass = classNames({
    "nk-menu-item": true,
    "has-sub": sub,
    "active current-page": isCurrent,
  });

  const renderIcon = () => (
    <span className={`nk-menu-icon${isCurrent ? " is-fill" : ""}`}>
      <Icon name={menuIcon} />
    </span>
  );

  return (
    <li className={menuItemClass} onClick={(e) => toggleActionSidebar(e)}>
      {newTab ? (
        <Link to={resolvedLink} target="_blank" rel="noopener noreferrer" className="nk-menu-link">
          {renderIcon()}
          <span className="nk-menu-text">{text}</span>
        </Link>
      ) : sub ? (
        <a href="#toggle" className="nk-menu-link nk-menu-toggle" onClick={menuToggle}>
          {renderIcon()}
          <span className="nk-menu-text">{text}</span>
          {badge && <span className="nk-menu-badge">{badge}</span>}
        </a>
      ) : (
        <NavLink
          to={resolvedLink}
          className={({ isActive }) => classNames("nk-menu-link", { active: isActive })}
        >
          {renderIcon()}
          <span className="nk-menu-text">{text}</span>
          {badge && <span className="nk-menu-badge">{badge}</span>}
        </NavLink>
      )}
      {sub ? (
        <div className="nk-menu-wrap">
          <MenuSub sub={sub} sidebarToggle={sidebarToggle} mobileView={mobileView} />
        </div>
      ) : null}
    </li>
  );
};

const MenuSub = ({ sub, sidebarToggle, mobileView, ...props }) => {
  return (
    <ul className="nk-menu-sub" style={props.style}>
      {sub.map((item, i) => (
        <MenuItem
          key={item.link || item.text || i}
          link={item.link}
          icon={item.icon}
          text={item.text}
          sub={item.subMenu}
          badge={item.badge}
          newTab={item.newTab}
          sidebarToggle={sidebarToggle}
          mobileView={mobileView}
        />
      ))}
    </ul>
  );
};

const MobileMenu = ({ data, sidebarToggle, mobileView }) => {
  return (
    <ul className="nk-menu nk-menu-main ui-s2">
      {(data || []).map((item, i) => (
        <MenuItem
          key={item.text || item.link || i}
          link={item.link}
          icon={item.icon}
          text={item.text}
          sub={item.subMenu}
          badge={item.badge}
          sidebarToggle={sidebarToggle}
          mobileView={mobileView}
        />
      ))}
    </ul>
  );
};

export default MobileMenu;
