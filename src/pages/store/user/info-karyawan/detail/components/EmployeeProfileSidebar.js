import React from "react";
import { Badge, Col, Row } from "reactstrap";
import {
  Button,
  Icon,
  OverlineTitle,
  UserAvatar,
} from "../../../../../../components/Component";
import { findUpper } from "../../../../../../utils/Utils";
import { resolveEmployeePhotoUrl } from "../employeeDummy";

const EmployeeProfileSidebar = ({ employee }) => {
  const identitas = employee.identitas || {};
  const photoUrl = resolveEmployeePhotoUrl(employee);
  const email = employee.email || employee.alamat?.email || "-";

  return (
    <>
      <div className="card-inner employee-aside-head">
        <div className="user-card user-card-s2 mt-xxl-0 employee-aside-profile">
          <UserAvatar
            className="employee-aside-avatar xl"
            size="xl"
            theme="primary"
            image={photoUrl}
            imageAlt={employee.namaLengkap}
            text={findUpper(employee.namaLengkap).slice(0, 2)}
          />
          <div className="user-info">
            <Badge tag="div" className="ucap" pill color="outline-light">
              {employee.jabatan || identitas.jabatan || "Employee"}
            </Badge>
            <h5>{employee.namaLengkap}</h5>
            <span className="sub-text">{email}</span>
          </div>
        </div>
      </div>

      <div className="card-inner card-inner-sm">
        <ul className="btn-toolbar justify-center gx-1">
          <li>
            <Button className="btn-trigger btn-icon" disabled title="Call">
              <Icon name="call" />
            </Button>
          </li>
          <li>
            <Button className="btn-trigger btn-icon" disabled title="Email">
              <Icon name="mail" />
            </Button>
          </li>
          <li>
            <Button className="btn-trigger btn-icon" disabled title="Print">
              <Icon name="printer" />
            </Button>
          </li>
          <li>
            <Button className="btn-trigger btn-icon" disabled title="Download">
              <Icon name="download-cloud" />
            </Button>
          </li>
          <li>
            <Button className="btn-trigger btn-icon text-danger" disabled title="Suspend">
              <Icon name="na" />
            </Button>
          </li>
        </ul>
      </div>

      <div className="card-inner employee-aside-role">
        {[
          { icon: "briefcase", label: "Jabatan", value: employee.jabatan },
          { icon: "building", label: "Divisi", value: employee.divisi },
          { icon: "user-check", label: "Pegawai Status", value: employee.pegawaiStatus },
        ].map((item) => (
          <div className="employee-aside-role-row" key={item.label}>
            <span className="sub-text d-inline-flex align-items-center gap-1">
              <Icon name={item.icon} />
              {item.label}
            </span>
            <span className="employee-aside-role-value">{item.value || "-"}</span>
          </div>
        ))}
      </div>

      <div className="card-inner employee-aside-info">
        <OverlineTitle tag="h6" className="mb-3">
          Employee Info
        </OverlineTitle>
        <Row className="employee-aside-info-row g-2 text-center">
          {[
            { icon: "user-alt", label: "NIK", value: employee.nik },
            { icon: "calendar", label: "Aktif", value: identitas.aktifDate },
            { icon: "calendar-check", label: "Resign", value: identitas.resignDate },
          ].map((item) => (
            <Col size="4" key={item.label}>
              <div className="employee-aside-info-cell">
                <span className="sub-text d-inline-flex align-items-center justify-content-center gap-1">
                  <Icon name={item.icon} />
                  {item.label}
                </span>
                <span className="employee-aside-info-value">{item.value || "-"}</span>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      <div className="card-inner">
        <OverlineTitle tag="h6" className="mb-3">
          Tags
        </OverlineTitle>
        <ul className="g-1">
          <li className="btn-group">
            <Button color="light" size="xs" className="btn-dim" disabled>
              {employee.jabatan || "Staff"}
            </Button>
          </li>
          <li className="btn-group">
            <Button color="light" size="xs" className="btn-dim" disabled>
              {employee.divisi || employee.departemen || "STORE"}
            </Button>
          </li>
          <li className="btn-group">
            <Button color="light" size="xs" className="btn-dim" disabled>
              {employee.pegawaiStatus || "-"}
            </Button>
          </li>
        </ul>
      </div>
    </>
  );
};

export default EmployeeProfileSidebar;
