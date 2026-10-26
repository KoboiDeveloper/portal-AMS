import React from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Block, BlockHead, BlockHeadContent, BlockTitle, BlockDes } from "../../../components/Component";
import { Card, CardBody } from "reactstrap";
import { Link } from "react-router-dom";
import { appPath } from "../../../lib/paths";

const AdminPlaceholder = ({ title = "Admin Module", description }) => (
  <>
    <Head title={title} />
    <Content>
      <BlockHead size="sm">
        <BlockHeadContent>
          <BlockTitle page tag="h3">{title}</BlockTitle>
          <BlockDes className="text-soft">
            {description || "Halaman admin ini belum tersedia. Hubungi administrator jika perlu akses segera."}
          </BlockDes>
        </BlockHeadContent>
      </BlockHead>
      <Block>
        <Card className="card-bordered">
          <CardBody>
            <Link to={appPath("/admin/dashboard")} className="btn btn-primary">
              Kembali ke Dashboard
            </Link>
          </CardBody>
        </Card>
      </Block>
    </Content>
  </>
);

export default AdminPlaceholder;
