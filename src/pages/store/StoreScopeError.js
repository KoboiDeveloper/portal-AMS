import React from "react";
import Head from "../../layout/head/Head";
import Content from "../../layout/content/Content";
import { Block, BlockContent, BlockTitle } from "../../components/Component";

const StoreScopeError = ({ message }) => (
  <>
    <Head title="Store Scope Required" />
    <Content>
      <Block className="nk-block-middle wide-md mx-auto text-center">
        <BlockContent>
          <BlockTitle tag="h1" className="display-4">Store Scope</BlockTitle>
          <p className="lead">{message}</p>
        </BlockContent>
      </Block>
    </Content>
  </>
);

export default StoreScopeError;
