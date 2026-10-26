import React from "react";
import { Card, CardBody, Row, Col, Badge } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Block, BlockHead, BlockHeadContent, BlockTitle } from "../../../components/Component";
import { useAuth } from "../../../context/AuthContext";

const DashboardPage = () => {
  const { user, menuRows } = useAuth();

  return (
    <>
      <Head title="Dashboard" />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page tag="h3">Dashboard</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <Block>
          <Row className="g-gs">
            <Col md="6">
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="title">Profile</h6>
                  <p className="mb-1"><strong>NIK:</strong> {user?.nik || "-"}</p>
                  <p className="mb-1"><strong>Username:</strong> {user?.username || "-"}</p>
                  <p className="mb-1"><strong>Name:</strong> {user?.employeeName || "-"}</p>
                  <p className="mb-0">
                    <strong>Role:</strong>{" "}
                    {user?.isSuperAdmin ? <Badge color="primary">Super Admin</Badge> : "Standard User"}
                  </p>
                </CardBody>
              </Card>
            </Col>
            <Col md="6">
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="title">Active Roles</h6>
                  {(user?.roles || []).length ? (
                    user.roles.map((role, idx) => (
                      <Badge key={idx} color="info" className="me-1 mb-1">
                        {typeof role === "string" ? role : role.role_code || role.role_name || JSON.stringify(role)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-soft">No roles assigned</span>
                  )}
                </CardBody>
              </Card>
            </Col>
            <Col md="12">
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="title">Active Menu ({menuRows.length})</h6>
                  {!menuRows.length ? (
                    <span className="text-soft">Menu will appear after login from API user menu.</span>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Module Code</th>
                            <th>Module Name</th>
                            <th>Endpoint</th>
                          </tr>
                        </thead>
                        <tbody>
                          {menuRows.map((row, idx) => (
                            <tr key={idx}>
                              <td>{row.module_code || row.moduleCode || "-"}</td>
                              <td>{row.module_name || row.moduleName || "-"}</td>
                              <td>{row.endpoint_path || row.endpointPath || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Block>
      </Content>
    </>
  );
};

export default DashboardPage;
