import React from "react";
import MarcommListPage from "./MarcommListPage";
import RegMemberListPage from "../regional/RegMemberListPage";
import RegMemberInfoPage from "../regional/RegMemberInfoPage";
import * as C from "./marcommConfigs";

export { default as MarcommDashboardPage } from "./MarcommDashboardPage";
export { default as MarcommExportDataMemberPage } from "./MarcommExportDataMemberPage";
export { default as MarcommMemberAnalyticsPage } from "./MarcommMemberAnalyticsPage";
export { default as MarcommMasterSyaratKetentuanPage } from "./MarcommMasterSyaratKetentuanPage";
export { default as MarcommMissionDetailPage } from "./MarcommMissionDetailPage";
export { default as MarcommGiftDetailPage } from "./MarcommGiftDetailPage";
export { default as MarcommNotificationDetailPage } from "./MarcommNotificationDetailPage";
export { default as MarcommVoucherGeneratedEditorPage } from "./MarcommVoucherGeneratedEditorPage";
export { default as MarcommVoucherReportPage } from "./MarcommVoucherReportPage";
export { default as MarcommGiftReportPage } from "./MarcommGiftReportPage";
export { default as MarcommMasterTierDetailPage } from "./MarcommMasterTierDetailPage";
export { default as MarcommMasterTierPage } from "./MarcommMasterTierPage";

/** Lazy config lookup so HMR always picks latest marcommConfigs exports. */
const wrap = (configKey) => () => <MarcommListPage config={C[configKey]} />;

export const MarcommMemberListPage = () => (
  <RegMemberListPage
    moduleCode="MAR_MBR_LIST"
    memberInfoPath="/admin/marcomm/member/info"
  />
);

export const MarcommMemberInfoPage = () => (
  <RegMemberInfoPage
    moduleCode="MAR_MBR_INFO"
    memberListPath="/admin/marcomm/member/list"
  />
);

export { default as MarcommMemberTransactionPage } from "./MarcommMemberTransactionPage";
export const MarcommMemberPromoPage = wrap("marMemberPromo");
export const MarcommMemberVoucherPage = wrap("marMemberVoucher");
export const MarcommMemberRewardsPage = wrap("marMemberRewards");
export const MarcommMemberMissionPage = wrap("marMemberMission");
export const MarcommMemberNotificationPage = wrap("marMemberNotification");

export const MarcommVoucherGeneratedPage = wrap("marcommVoucherGenerated");

export const MarcommVoucherUsedPage = wrap("marcommVoucherUsed");

export { default as MarcommReportGiftPage } from "./MarcommGiftReportPage";
export const MarcommReportRedemptionPage = wrap("marcommReportRedemption");
export const MarcommReportBirthdayVoucherPage = wrap("marcommReportBirthdayVoucher");

export const MarcommMasterPointRegisterPage = wrap("marMasterPointRegister");
export const MarcommMasterStoreLocationPage = wrap("marMasterStoreLocation");
export const MarcommMasterFaqPage = wrap("marMasterFaq");
export const MarcommMasterVoucherCategoryPage = wrap("marMasterVoucherCategory");
export const MarcommMasterGiftCategoryPage = wrap("marMasterGiftCategory");
export const MarcommMasterFaqCategoryPage = wrap("marMasterFaqCategory");
export const MarcommMasterSpecialHolidayPage = wrap("marMasterSpecialHoliday");