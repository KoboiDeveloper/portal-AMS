import React from "react";
import HrdListPage from "./HrdListPage";
import HrdProcessPage from "./HrdProcessPage";
import HrdSlipGajiPage from "./HrdSlipGajiPage";
import HrdMasterListPage from "./HrdMasterListPage";
import * as C from "./hrdConfigs";

export { default as HrdDashboardPage } from "./HrdDashboardPage";

const wrap = (config) => () => <HrdListPage config={config} />;
const master = (config) => () => <HrdMasterListPage config={config} />;

const process = (cfg) => () => (
  <HrdProcessPage
    title={cfg.title}
    moduleCode={cfg.moduleCode}
    processPath={cfg.processPath}
    description={cfg.description}
    fields={cfg.fields}
    dualActions={!!cfg.dualActions}
    actionLabel={cfg.actionLabel}
  />
);

export const HrdAbsOnlineAttendancePage = wrap(C.hrdAbsOnlineAttendance);
export { default as HrdAbsAllAttendancePage } from "./HrdAbsAllAttendancePage";
export { default as HrdAbsPersonelPage } from "./HrdPersonelListPage";
export { default as HrdPersonelInfoPage } from "./HrdPersonelInfoPage";
export { default as HrdAbsKontrakPage } from "./HrdPersonelKontrakPage";
export { default as HrdAbsStatusPage } from "./HrdPersonelStatusPage";
export { default as HrdAbsPromosiPage } from "./HrdPersonelPromosiPage";
export { default as HrdAbsMutasiPage } from "./HrdPersonelMutasiPage";
export { default as HrdAbsResignPage } from "./HrdPersonelResignPage";
export const HrdAbsGenerateStorePage = process(C.hrdAbsGenerateStoreProcess);
export const HrdAbsGenerateNasionalPage = process(C.hrdAbsGenerateNasionalProcess);

export const HrdParAdhocPage = wrap(C.hrdParAdhoc);
export const HrdParDinasPage = wrap(C.hrdParDinas);
export const HrdParIzinPage = wrap(C.hrdParIzin);
export const HrdParCutiPage = wrap(C.hrdParCuti);
export const HrdParSakitPage = wrap(C.hrdParSakit);
export const HrdParOvertimePage = master(C.hrdParOvertime);
export const HrdParAlfaPage = wrap(C.hrdParAlfa);
export const HrdParHolidayPage = master(C.hrdParHoliday);
export const HrdParOtAmountPage = master(C.hrdParOtAmount);
export const HrdParPolicyPage = master(C.hrdParPolicy);
export { default as HrdParPerusahaanPage } from "./HrdPerusahaanPage";
export const HrdParCabangPage = master(C.hrdParCabang);
export const HrdParDivisiPage = master(C.hrdParDivisi);
export const HrdParDepartemenPage = master(C.hrdParDepartemen);
export const HrdParGolonganPage = master(C.hrdParGolongan);
export const HrdParPangkatPage = master(C.hrdParPangkat);
export const HrdParJabatanPage = master(C.hrdParJabatan);
export { default as HrdParSmDeptPage } from "./HrdSmDeptListPage";
export { default as HrdParSmDeptInfoPage } from "./HrdSmDeptInfoPage";
export const HrdParEomPage = process(C.hrdParEomProcess);

export const HrdRptAbsenTotalPage = wrap(C.hrdRptAbsenTotal);
export { default as HrdRptAbsenNasionalPage } from "./HrdRptAbsenNasionalPage";
export const HrdRptAbsenWfhPage = wrap(C.hrdRptAbsenWfh);
export { default as HrdRptDetailHadirPage } from "./HrdRptDetailKehadiranPage";
export const HrdRptExportEmpPage = wrap(C.hrdRptExportEmp);
export const HrdRptCutiPage = wrap(C.hrdRptCuti);
export const HrdRptLemburPage = wrap(C.hrdRptLembur);
export const HrdRptSlipGajiPage = HrdSlipGajiPage;
export const HrdRptKpiPage = wrap(C.hrdRptKpi);

export const HrdCabVariablePage = wrap(C.hrdCabVariable);
export const HrdCabFormulaPage = wrap(C.hrdCabFormula);
export const HrdCabBenefitPage = wrap(C.hrdCabBenefit);
export const HrdCabDeductionPage = wrap(C.hrdCabDeduction);
export const HrdCabSalaryEntryPage = wrap(C.hrdCabSalaryEntry);
export const HrdCabSalaryInquiryPage = wrap(C.hrdCabSalaryInquiry);
export const HrdCabSalaryReportPage = wrap(C.hrdCabSalaryReport);
export const HrdCabThrPage = wrap(C.hrdCabThr);
export const HrdCabPaymentPage = wrap(C.hrdCabPayment);
export const HrdCabMonthlyPage = process(C.hrdCabMonthlyProcess);
