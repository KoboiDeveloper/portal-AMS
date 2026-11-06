import React from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";

/** Placeholder dashboard — analisa payment content follows later. */
const RegTaxiPaymentDashPage = () => (
  <AccessGuard moduleCode="TAXI_PAYMENT_DASH">
    <Head title="Analisa Payment" />
    <Content>
      <BlockHead size="sm">
        <BlockHeadContent>
          <BlockTitle page tag="h3">
            Analisa Payment
          </BlockTitle>
          <BlockDes className="text-soft">Dashboard analisa payment</BlockDes>
        </BlockHeadContent>
      </BlockHead>
      <Block>
        <div className="card card-bordered">
          <div className="card-inner">
            <p className="text-soft mb-0">Konten menyusul. Pakai menu AR Detail / DCR / Sales Detail / Last Stock sementara.</p>
          </div>
        </div>
      </Block>
    </Content>
  </AccessGuard>
);

export default RegTaxiPaymentDashPage;
