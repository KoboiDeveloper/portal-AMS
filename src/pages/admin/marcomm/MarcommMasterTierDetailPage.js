import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import { appPath } from "../../../lib/paths";
import MarcommMasterTierDetailPanel from "./MarcommMasterTierDetailPanel";

/** Deep-link fallback — list page opens the same form in a right drawer. */
const MarcommMasterTierDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const perms = useActionPermissions("MAR_MST_TIER");
  const canSave = perms.UPDATE && !perms.loading;
  const [tierName, setTierName] = useState(`Tier ${id}`);

  return (
    <AccessGuard moduleCode="MAR_MST_TIER" permission="VIEW">
      <>
        <Head title={`Tier — ${tierName}`} />
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  {tierName}
                </BlockTitle>
              </BlockHeadContent>
              <BlockHeadContent>
                <Button color="light" onClick={() => navigate(appPath("/admin/marcomm/master/tier"))}>
                  <Icon name="arrow-left" className="me-1" />
                  Kembali
                </Button>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>
          <Block>
            <div className="card card-bordered">
              <div className="card-inner">
                <MarcommMasterTierDetailPanel
                  id={id}
                  canSave={canSave}
                  initialName={tierName}
                  onNameLoaded={setTierName}
                />
              </div>
            </div>
          </Block>
        </Content>
      </>
    </AccessGuard>
  );
};

export default MarcommMasterTierDetailPage;
