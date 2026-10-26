import React, { useState, useEffect } from "react";
import menu from "./MenuData";
import { Link } from "react-router-dom";

const MenuHeader = ({ item }) => {
  return (
    <li className="nk-menu-heading">
      <h6 className="overline-title text-primary">{item}</h6>
    </li>
  );
};

const MenuItem = ({ item, headActive }) => {
  const { subMenu, subPanel, text, link, newTab, badge, header } = item;

  if (header) {
    return <MenuHeader item={header}></MenuHeader>;
  } else
    return (
      <li
        className={`nk-menu-item ${subMenu ? "has-sub" : ""} ${
          process.env.PUBLIC_URL + link === window.location.pathname ? "active current-page" : ""
        } ${headActive ? "active current-page" : ""}`}
      >
        {newTab ? (
          <Link
            className="nk-menu-link"
            target="_blank"
            rel="noopener noreferrer"
            to={`${process.env.PUBLIC_URL + link}`}
          >
            <span className="nk-menu-text">{text}</span>
            {subPanel && <span className="nk-menu-badge">Hot</span>}
          </Link>
        ) : subMenu ? (
          <React.Fragment>
            <a
              href="#toggle"
              className="nk-menu-link nk-menu-toggle"
              onClick={(ev) => {
                ev.preventDefault();
              }}
            >
              <span className="nk-menu-text">{text}</span>
            </a>
            <MenuSub subMenu={subMenu} />
          </React.Fragment>
        ) : (
          <Link className="nk-menu-link" to={process.env.PUBLIC_URL + link}>
            <span className="nk-menu-text">{text}</span>
            {badge && <span className="nk-menu-badge">{badge}</span>}
          </Link>
        )}
      </li>
    );
};

const MenuSub = ({ subMenu }) => {
  return (
    <ul className="nk-menu-sub">
      {subMenu.map((sub, index) => (
        <MenuItem item={sub} key={index} />
      ))}
    </ul>
  );
};

const checkMenuUrl = (data) => {
  for (const node of data.subMenu) {
    if (process.env.PUBLIC_URL + node.link === window.location.pathname) {
      return node;
    } else {
      const newNode = node.subMenu ? checkMenuUrl(node) : undefined;
      if (newNode) return newNode;
    }
  }
};

const findActiveHead = () => {
  let found;
  menu.forEach((item) => {
    let finding = item.subMenu.find((s) => process.env.PUBLIC_URL + s.link === window.location.pathname);
    if (finding) {
      found = item;
    } else {
      item.subMenu.forEach((p) => {
        if (p.subMenu) {
          let finding = checkMenuUrl(p);
          if (finding) {
            found = item;
          }
        }
      });
    }
  });
  return found;
};

const Menu = () => {
  const [head, setHead] = useState("Dashboards");
  let findingActiveHead = findActiveHead();

  useEffect(() => {
    if (findingActiveHead) {
      setHead(findingActiveHead.text);
    }
  }, [window.location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ul className="nk-menu nk-menu-main ui-s2">
      {menu.map((item, index) => {
        if (item.text === head) {
          return <MenuItem key={index} item={item} headActive={true} />;
        } else return <MenuItem key={index} item={item} />;
      })}
    </ul>
  );
};

export default Menu;
