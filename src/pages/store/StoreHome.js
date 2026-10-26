import React from "react";
import Head from "../../layout/head/Head";
import Content from "../../layout/content/Content";
import { Block, BlockHead, BlockHeadContent, BlockTitle, BlockDes } from "../../components/Component";
import { Card, CardBody, Row, Col } from "reactstrap";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { appPath } from "../../lib/paths";

const StoreHome = () => {
  const { activeStore, navigation, user } = useAuth();

  return (
    <>
      <Head title="Store Home" />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page tag="h3">Store Portal</BlockTitle>
            <BlockDes className="text-soft">
              Welcome, {user?.employeeName || user?.username}
            </BlockDes>
          </BlockHeadContent>
        </BlockHead>
        <Block>
          <Row className="g-gs">
            <Col md="6">
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="title">Active Store</h6>
                  <p className="mb-1"><strong>Store ID:</strong> {activeStore?.store_id || "-"}</p>
                  <p className="mb-0"><strong>Store Name:</strong> {activeStore?.store_name || "-"}</p>
                </CardBody>
              </Card>
            </Col>
            <Col md="6">
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="title">Quick Menu</h6>
                  {!navigation.length ? (
                    <span className="text-soft">No store menu assigned.</span>
                  ) : (
                    navigation.map((item) =>
                      item.link ? (
                        <div key={item.link}>
                          <Link to={appPath(item.link)}>{item.text}</Link>
                        </div>
                      ) : (
                        item.subMenu?.map((sub) => (
                          <div key={sub.link}>
                            <Link to={appPath(sub.link)}>{sub.text}</Link>
                          </div>
                        ))
                      )
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

export default StoreHome;
