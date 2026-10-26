import React, { useEffect, useState } from "react";
import { Card, CardBody, Row, Col, Badge } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Block, BlockHead, BlockHeadContent, BlockTitle } from "../../../components/Component";
import { useAuth } from "../../../context/AuthContext";
import { accessService } from "../../../services/access.service";
import { extractRows } from "../../../lib/response";
import LoadingState from "../../../components/admin/common/LoadingState";

const ProfilePage = () => {
  const { user } = useAuth();
  const [storeScope, setStoreScope] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.nik) return;
    accessService.getUserStoreScope(user.nik)
      .then((res) => setStoreScope(extractRows(res)))
      .finally(() => setLoading(false));
  }, [user?.nik]);

  return (
    <>
      <Head title="Profile" />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page tag="h3">Profile</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <Block>
          <Row className="g-gs">
            <Col lg="6">
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="title">User Information</h6>
                  <p><strong>NIK:</strong> {user?.nik}</p>
                  <p><strong>Username:</strong> {user?.username}</p>
                  <p><strong>Employee Name:</strong> {user?.employeeName}</p>
                  <p>
                    <strong>Access Level:</strong>{" "}
                    {user?.isSuperAdmin ? <Badge color="primary">Super Admin</Badge> : <Badge color="secondary">User</Badge>}
                  </p>
                </CardBody>
              </Card>
            </Col>
            <Col lg="6">
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="title">Assigned Roles</h6>
                  {(user?.roles || []).map((role, idx) => (
                    <Badge key={idx} color="info" className="me-1 mb-1">
                      {typeof role === "string" ? role : role.role_code || JSON.stringify(role)}
                    </Badge>
                  ))}
                  {!user?.roles?.length && <span className="text-soft">No roles</span>}
                </CardBody>
              </Card>
            </Col>
            <Col lg="12">
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="title">Store Scope</h6>
                  {loading ? <LoadingState message="Loading store scope..." /> : (
                    storeScope.length ? (
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Store ID</th>
                              <th>Store Name</th>
                              <th>Branch ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storeScope.map((row, idx) => (
                              <tr key={idx}>
                                <td>{row.store_id || row.storeId || "-"}</td>
                                <td>{row.store_name || row.storeName || "-"}</td>
                                <td>{row.branch_id || row.branchId || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <span className="text-soft">No store scope data</span>
                    )
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

export default ProfilePage;
