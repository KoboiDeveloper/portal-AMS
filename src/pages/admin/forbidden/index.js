import React from "react";
import { Link } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Block, BlockContent, BlockTitle } from "../../../components/Component";
import { appPath } from "../../../lib/paths";
import { useAuth } from "../../../context/AuthContext";

const ForbiddenPage = ({ message }) => {
  const { isStoreUser, homePath } = useAuth();
  const backPath = isStoreUser ? homePath || "/store" : "/admin/dashboard";

  return (
    <>
      <Head title="403 Forbidden" />
      <Content>
        <Block className="nk-block-middle wide-md mx-auto text-center">
          <BlockContent>
            <BlockTitle tag="h1" className="display-4">403</BlockTitle>
            <p className="lead">{message || "You do not have permission to access this page."}</p>
            <Link to={appPath(backPath)} className="btn btn-primary">Go Back</Link>
          </BlockContent>
        </Block>
      </Content>
    </>
  );
};

export default ForbiddenPage;
