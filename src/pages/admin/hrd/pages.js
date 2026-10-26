import React from "react";
import HrdListPage from "./HrdListPage";
import HrdProcessPage from "./HrdProcessPage";
import HrdSlipGajiPage from "./HrdSlipGajiPage";
import * as C from "./hrdConfigs";

export { default as HrdDashboardPage } from "./HrdDashboardPage";

const wrap = (config) => () => <HrdListPage config={config} />;

const process = (cfg) => () => (
  <HrdProcessPage
    title={cfg.title}
    moduleCode={cfg.moduleCode}
    processPath={cfg.processPath}
    description={cfg.description}
    fields={cfg.fields}
    dualActions={!!cfg.dualActions}
  />
);

export const HrdAbsOnlineAttendancePage = wrap(C.hrdAbsOnlineAttendance);
export const HrdAbsAllAttendancePage = wrap(C.hrdAbsAllAttendance);
export { default as HrdAbsPersonelPage } from "./HrdPersonelListPage";
export { default as HrdPersonelInfoPage } from "./HrdPersonelInfoPage";
export const HrdAbsKontrakPage = wrap(C.hrdAbsKontrak);
export const HrdAbsStatusPage = wrap(C.hrdAbsStatus);
export const HrdAbsPromosiPage = wrap(C.hrdAbsPromosi);
export const HrdAbsMutasiPage = wrap(C.hrdAbsMutasi);
export const HrdAbsResignPage = wrap(C.hrdAbsResign);
export const HrdAbsGenerateStorePage = process(C.hrdAbsGenerateStoreProcess);
export const HrdAbsGenerateNasionalPage = process(C.hrdAbsGenerateNasionalProcess);

export const HrdParAdhocPage = wrap(C.hrdParAdhoc);
export const HrdParDinasPage = wrap(C.hrdParDinas);
export const HrdParIzinPage = wrap(C.hrdParIzin);
export const HrdParCutiPage = wrap(C.hrdParCuti);
export const HrdParSakitPage = wrap(C.hrdParSakit);
export const HrdParOvertimePage = wrap(C.hrdParOvertime);
export const HrdParAlfaPage = wrap(C.hrdParAlfa);
export const HrdParHolidayPage = wrap(C.hrdParHoliday);
export const HrdParOtAmountPage = wrap(C.hrdParOtAmount);
export const HrdParPolicyPage = wrap(C.hrdParPolicy);
export const HrdParPerusahaanPage = wrap(C.hrdParPerusahaan);
export const HrdParCabangPage = wrap(C.hrdParCabang);
export const HrdParDivisiPage = wrap(C.hrdParDivisi);
export const HrdParDepartemenPage = wrap(C.hrdParDepartemen);
export const HrdParGolonganPage = wrap(C.hrdParGolongan);
export const HrdParPangkatPage = wrap(C.hrdParPangkat);
export const HrdParJabatanPage = wrap(C.hrdParJabatan);
export const HrdParSmDeptPage = wrap(C.hrdParSmDept);
export const HrdParEomPage = process(C.hrdParEomProcess);

export const HrdRptAbsenTotalPage = wrap(C.hrdRptAbsenTotal);
export const HrdRptAbsenNasionalPage = wrap(C.hrdRptAbsenNasional);
export const HrdRptAbsenWfhPage = wrap(C.hrdRptAbsenWfh);
export const HrdRptDetailHadirPage = wrap(C.hrdRptDetailHadir);
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
