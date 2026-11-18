import React from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Block, BlockHead, BlockHeadContent, BlockTitle, BlockDes } from "../../../components/Component";
import { Card, CardBody } from "reactstrap";
import AccessGuard from "../../../components/admin/AccessGuard";

const MarcommComingSoonPage = ({ moduleCode, title = "Modul Marcomm", description }) => (
  <AccessGuard moduleCode={moduleCode} permission="VIEW">
    <>
      <Head title={title} />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page tag="h3">
              {title}
            </BlockTitle>
            <BlockDes className="text-soft">
              {description || "Halaman ini sedang dalam pengembangan. Modul akan segera tersedia."}
            </BlockDes>
          </BlockHeadContent>
        </BlockHead>
        <Block>
          <Card className="card-bordered">
            <CardBody className="text-soft">Memuat modul…</CardBody>
          </Card>
        </Block>
      </Content>
    </>
  </AccessGuard>
);

export default MarcommComingSoonPage;