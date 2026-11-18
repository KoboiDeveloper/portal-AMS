import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Offcanvas, OffcanvasBody, OffcanvasHeader } from "reactstrap";
import MarcommListPage from "./MarcommListPage";
import MarcommMasterTierDetailPanel from "./MarcommMasterTierDetailPanel";
import { marMasterTier } from "./marcommConfigs";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import "./marcomm-tier-drawer.css";

const MarcommMasterTierPage = () => {
  const perms = useActionPermissions("MAR_MST_TIER");
  const canSave = perms.UPDATE && !perms.loading;

  const [drawer, setDrawer] = useState({ open: false, id: null, name: "" });

  const openDrawer = useCallback((row) => {
    const id = row?.id ?? row?.ID ?? row?.id_tier_header;
    if (id === undefined || id === null || id === "") return;
    setDrawer({
      open: true,
      id,
      name: row?.tier_name ?? row?.TIER_NAME ?? `Tier ${id}`,
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer((prev) => ({ ...prev, open: false }));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!drawer.open) {
      root.classList.remove("mar-tier-drawer-open");
      return undefined;
    }
    root.classList.add("mar-tier-drawer-open");
    const prevBody = document.body.style.overflow;
    const prevHtml = root.style.overflow;
    document.body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    return () => {
      root.classList.remove("mar-tier-drawer-open");
      document.body.style.overflow = prevBody;
      root.style.overflow = prevHtml;
    };
  }, [drawer.open]);

  const config = useMemo(
    () => ({
      ...marMasterTier,
      getDetailHref: undefined,
      onRowClick: openDrawer,
    }),
    [openDrawer]
  );

  return (
    <>
      <MarcommListPage config={config} />
      <Offcanvas
        isOpen={drawer.open}
        toggle={closeDrawer}
        direction="end"
        backdrop
        scroll={false}
        className="mar-tier-offcanvas"
        style={{ width: "min(560px, 100vw)", height: "100vh" }}
      >
        <OffcanvasHeader toggle={closeDrawer}>
          {drawer.name || "Tier Detail"}
        </OffcanvasHeader>
        <OffcanvasBody className="mar-tier-offcanvas__body">
          {drawer.open && drawer.id !== null && drawer.id !== undefined && drawer.id !== "" ? (
            <MarcommMasterTierDetailPanel
              id={drawer.id}
              canSave={canSave}
              initialName={drawer.name}
              onNameLoaded={(name) =>
                setDrawer((prev) => (prev.open ? { ...prev, name } : prev))
              }
            />
          ) : null}
        </OffcanvasBody>
      </Offcanvas>
    </>
  );
};

export default MarcommMasterTierPage;
