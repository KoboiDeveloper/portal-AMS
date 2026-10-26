import React, { useEffect, useMemo, useState } from "react";
import { Badge, Card } from "reactstrap";
import { useNavigate, useParams } from "react-router-dom";
import Head from "../../../../../layout/head/Head";
import Content from "../../../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
  Sidebar,
} from "../../../../../components/Component";
import { appPath } from "../../../../../lib/paths";
import { getEmployeeDummy } from "./employeeDummy";
import { getEmploymentStatusDisplay } from "./employeeStatus";
import EmployeeProfileSidebar from "./components/EmployeeProfileSidebar";
import {
  AktifitasTab,
  AlamatTab,
  BankTab,
  IdentitasTab,
  KeahlianTab,
  KesehatanTab,
  PendidikanTab,
  PekerjaanTab,
  SipilTab,
  UploadDocumentTab,
} from "./tabPanels";

const TABS = [
  { id: "identitas", label: "Identitas", icon: "user-circle", component: IdentitasTab },
  { id: "alamat", label: "Alamat", icon: "map-pin", component: AlamatTab },
  { id: "sipil", label: "Sipil", icon: "users", component: SipilTab },
  { id: "pendidikan", label: "Pendidikan", icon: "book-read", component: PendidikanTab },
  { id: "keahlian", label: "Keahlian", icon: "bulb", component: KeahlianTab },
  { id: "pekerjaan", label: "Pekerjaan", icon: "briefcase", component: PekerjaanTab },
  { id: "aktifitas", label: "Aktifitas", icon: "activity", component: AktifitasTab },
  { id: "kesehatan", label: "Kesehatan", icon: "heart", component: KesehatanTab },
  { id: "bank", label: "Bank", icon: "coins", component: BankTab },
  { id: "upload", label: "Upload Document", icon: "file-text", component: UploadDocumentTab },
];

const EmployeeDetailPage = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("identitas");
  const [sideBar, setSideBar] = useState(false);

  const employee = useMemo(() => getEmployeeDummy(employeeId), [employeeId]);
  const employmentStatus = useMemo(() => getEmploymentStatusDisplay(employee), [employee]);
  const ActivePanel = TABS.find((tab) => tab.id === activeTab)?.component || IdentitasTab;

  useEffect(() => {
    const header = document.getElementsByClassName("nk-header")[0];
    const closeSidebar = () => setSideBar(false);
    header?.addEventListener("click", closeSidebar);
    return () => header?.removeEventListener("click", closeSidebar);
  }, []);

  const toggle = () => setSideBar((prev) => !prev);

  return (
    <>
      <Head title={`Detail Karyawan - ${employee.namaLengkap}`} />
      <Content>
        <BlockHead size="sm" className="employee-detail-header">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Info Karyawan / <strong className="text-primary small">{employee.namaLengkap}</strong>
              </BlockTitle>
              <BlockDes className="text-soft">
                <ul className="list-inline">
                  <li>
                    NIK: <span className="text-base">{employee.nik}</span>
                  </li>
                  <li className="d-inline-flex align-items-center flex-wrap gap-1">
                    Status Pegawai:
                    <Badge
                      tag="span"
                      className="badge-dim badge-dot employee-status-badge"
                      color={employmentStatus.color}
                    >
                      {employmentStatus.label}
                    </Badge>
                  </li>
                </ul>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button
                color="light"
                outline
                className="bg-white d-none d-sm-inline-flex"
                onClick={() => navigate(appPath("/store/user/info-karyawan"))}
              >
                <Icon name="arrow-left" />
                <span>Back</span>
              </Button>
              <Button
                color="light"
                outline
                className="btn-icon bg-white d-inline-flex d-sm-none"
                onClick={() => navigate(appPath("/store/user/info-karyawan"))}
              >
                <Icon name="arrow-left" />
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <Card className="card-bordered">
            <div className="card-aside-wrap" id="employee-detail-block">
              <div className="card-content">
                <ul className="nav nav-tabs nav-tabs-mb-icon nav-tabs-card flex-wrap">
                  {TABS.map((tab) => (
                    <li className="nav-item" key={tab.id}>
                      <a
                        href={`#${tab.id}`}
                        className={`nav-link${activeTab === tab.id ? " active" : ""}`}
                        onClick={(ev) => {
                          ev.preventDefault();
                          setActiveTab(tab.id);
                        }}
                      >
                        <Icon name={tab.icon} />
                        <span>{tab.label}</span>
                      </a>
                    </li>
                  ))}
                  <li className="nav-item nav-item-trigger d-xxl-none">
                    <Button className={`toggle btn-icon btn-trigger ${sideBar ? "active" : ""}`} onClick={toggle}>
                      <Icon name="user-list-fill" />
                    </Button>
                  </li>
                </ul>
                <div className="card-inner">
                  <ActivePanel data={employee} />
                </div>
              </div>

              <Sidebar toggleState={sideBar}>
                <EmployeeProfileSidebar employee={employee} />
              </Sidebar>
              {sideBar ? <div className="toggle-overlay" onClick={toggle} /> : null}
            </div>
          </Card>
        </Block>
      </Content>
    </>
  );
};

export default EmployeeDetailPage;
