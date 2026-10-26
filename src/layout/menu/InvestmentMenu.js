import React, { useState, useEffect } from "react";
import menu from "./MenuData";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Component";

const MenuHeader = ({ item }) => {
  return (
    <li className="nk-menu-heading">
      <h6 className="overline-title text-primary">{item}</h6>
    </li>
  );
};

const MenuItem = ({ item, headActive }) => {
  const { subMenu, text, link, newTab, header, badge } = item;

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
            <span className="nk-menu-text">
              {text} {item.icon && <Icon name={item.icon} />}
            </span>
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

const findActiveHead = (data) => {
  let found;
  data &&
    data.subPanel.forEach((item) => {
      if (process.env.PUBLIC_URL + item.link === window.location.pathname) {
        found = item;
      } else {
        if (item.subMenu) {
          let finding = item.subMenu.find((p) => process.env.PUBLIC_URL + p.link === window.location.pathname);
          if (finding) {
            found = item;
          }
        }
      }
    });
  return found;
};

const InvestmentMenu = () => {
  const [head, setHead] = useState("Dashboards");
  const [data, setData] = useState();

  let findingActiveHead = findActiveHead(data);

  useEffect(() => {
    let investmentItem;
    menu.forEach((item) => {
      investmentItem = item.subMenu.find((el) => el.text === "Investment Panel");
      if (investmentItem) {
        setData(investmentItem);
      }
    });
  }, []);

  useEffect(() => {
    if (findingActiveHead) {
      setHead(findingActiveHead.text);
    }
  }, [window.location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ul className="nk-menu nk-menu-main">
      {data &&
        data.subPanel.map((item, index) => {
          if (item.text === head) {
            return <MenuItem key={index} item={item} headActive={true} />;
          } else return <MenuItem key={index} item={item} />;
        })}
    </ul>
  );
};

export default InvestmentMenu;
