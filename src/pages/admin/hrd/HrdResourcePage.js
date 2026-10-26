import React from "react";
import { Alert } from "reactstrap";
import AdminProjectListPage from "../../../components/admin/AdminProjectListPage";
import Content from "../../../layout/content/Content";
import HrdProcessPage from "./HrdProcessPage";
import HrdSlipGajiPage from "./HrdSlipGajiPage";
import {
  HRD_PAGE_CONFIGS,
  hrdAbsGenerateStoreProcess,
  hrdAbsGenerateNasionalProcess,
  hrdParEomProcess,
  hrdCabMonthlyProcess,
} from "./hrdConfigs";

const PROCESS_BY_KEY = {
  "abs-generate-store": hrdAbsGenerateStoreProcess,
  "abs-generate-nasional": hrdAbsGenerateNasionalProcess,
  "par-eom": hrdParEomProcess,
  "cab-monthly": hrdCabMonthlyProcess,
};

/**
 * @param {{ routeKey: string }} props
 */
const HrdResourcePage = ({ routeKey }) => {
  if (routeKey === "rpt-slip-gaji") return <HrdSlipGajiPage />;

  const processCfg = PROCESS_BY_KEY[routeKey];
  if (processCfg) {
    return (
      <HrdProcessPage
        title={processCfg.title}
        moduleCode={processCfg.moduleCode}
        processPath={processCfg.processPath}
        description={processCfg.description}
        fields={processCfg.fields}
        dualActions={!!processCfg.dualActions}
      />
    );
  }

  const config = HRD_PAGE_CONFIGS[routeKey];
  if (!config) {
    return (
      <Content>
        <Alert color="danger">Konfigurasi HRD tidak ditemukan: {routeKey}</Alert>
      </Content>
    );
  }

  return <AdminProjectListPage config={config} />;
};

export default HrdResourcePage;
