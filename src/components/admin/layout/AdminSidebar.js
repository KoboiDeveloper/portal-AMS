import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SimpleBar from "simplebar-react";
import Logo from "../../../layout/logo/Logo";
import { useAuth } from "../../../context/AuthContext";
import { appPath } from "../../../lib/paths";
import { Icon } from "../../../components/Component";

const isPathActive = (pathname, link) => link && pathname === appPath(link);

const hasActiveChild = (pathname, item) =>
  item.subMenu?.some((sub) => isPathActive(pathname, sub.link) || hasActiveChild(pathname, sub));

const SidebarItem = ({ item, openKeys, toggleOpen }) => {
  const location = useLocation();

  if (item.subMenu) {
    const isOpen = openKeys.includes(item.text);
    const childActive = hasActiveChild(location.pathname, item);

    return (
      <li className={`nk-menu-item has-sub ${isOpen || childActive ? "active" : ""}`}>
        <a
          href="#menu"
          className="nk-menu-link nk-menu-toggle"
          onClick={(e) => {
            e.preventDefault();
            toggleOpen(item.text);
          }}
        >
          {item.icon && (
            <span className="nk-menu-icon">
              <Icon name={item.icon} />
            </span>
          )}
          <span className="nk-menu-text">{item.text}</span>
        </a>
        <ul className="nk-menu-sub">
          {item.subMenu.map((sub) => (
            <SidebarItem key={sub.link || sub.text} item={sub} openKeys={openKeys} toggleOpen={toggleOpen} />
          ))}
        </ul>
      </li>
    );
  }

  const isActive = isPathActive(location.pathname, item.link);
  return (
    <li className={`nk-menu-item ${isActive ? "active current-page" : ""}`}>
      <Link className="nk-menu-link" to={appPath(item.link)}>
        <span className="nk-menu-text">{item.text}</span>
      </Link>
    </li>
  );
};

const AdminSidebar = () => {
  const { navigation, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState([]);

  const defaultOpenKeys = useMemo(
    () =>
      navigation
        .filter((item) => item.subMenu && hasActiveChild(location.pathname, item))
        .map((item) => item.text),
    [navigation, location.pathname]
  );

  useEffect(() => {
    if (defaultOpenKeys.length) {
      setOpenKeys((prev) => Array.from(new Set([...prev, ...defaultOpenKeys])));
    }
  }, [defaultOpenKeys]);

  const toggleOpen = (key) => {
    setOpenKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleLogout = () => {
    logout();
    navigate(appPath("/login"));
  };

  return (
    <div className="nk-sidebar nk-sidebar-fixed is-light" data-content="sidebarMenu">
      <div className="nk-sidebar-element nk-sidebar-head">
        <div className="nk-sidebar-brand">
          <Logo />
        </div>
      </div>
      <div className="nk-sidebar-element">
        <div className="nk-sidebar-content">
          <SimpleBar className="nk-sidebar-menu">
            <ul className="nk-menu">
              {navigation.map((item) => (
                <SidebarItem key={item.text} item={item} openKeys={openKeys} toggleOpen={toggleOpen} />
              ))}
              <li className="nk-menu-item">
                <a
                  href="#logout"
                  className="nk-menu-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
                >
                  <span className="nk-menu-icon">
                    <Icon name="signout" />
                  </span>
                  <span className="nk-menu-text">Logout</span>
                </a>
              </li>
            </ul>
          </SimpleBar>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
