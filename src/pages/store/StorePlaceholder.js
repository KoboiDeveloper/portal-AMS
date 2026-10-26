import React from "react";
import Head from "../../layout/head/Head";
import Content from "../../layout/content/Content";
import { Block, BlockHead, BlockHeadContent, BlockTitle, BlockDes } from "../../components/Component";
import { Card, CardBody } from "reactstrap";
import { Link } from "react-router-dom";
import { appPath } from "../../lib/paths";

const StorePlaceholder = () => (
  <>
    <Head title="Store Module" />
    <Content>
      <BlockHead size="sm">
        <BlockHeadContent>
          <BlockTitle page tag="h3">Module Coming Soon</BlockTitle>
          <BlockDes className="text-soft">
            Halaman store ini belum tersedia di portal. Hubungi administrator jika perlu akses segera.
          </BlockDes>
        </BlockHeadContent>
      </BlockHead>
      <Block>
        <Card className="card-bordered">
          <CardBody>
            <Link to={appPath("/store")} className="btn btn-primary">
              Kembali ke Store Home
            </Link>
          </CardBody>
        </Card>
      </Block>
    </Content>
  </>
);

export default StorePlaceholder;
