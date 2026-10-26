import React, { useLayoutEffect } from "react";
import { Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { ProductContextProvider } from "../pages/pre-built/products/ProductContext";
import { UserContextProvider } from "../pages/pre-built/user-manage/UserContext";

import Sales from "../pages/Sales";
import Crypto from "../pages/Crypto";
import Analytics from "../pages/Analytics";
import Invest from "../pages/Invest";
import RootRedirect from "../pages/RootRedirect";

import Overview from "../pages/panel/invest/Overview";
import Plan from "../pages/panel/invest/Plan";
import Investment from "../pages/panel/invest/Investment";
import InvestmentProcess from "../pages/panel/invest/pages/InvesmentProcess";
import InvestmentDetails from "../pages/panel/invest/pages/InvestmentDetails";
import Welcome from "../pages/panel/invest/pages/Welcome";
import KycApplications from "../pages/panel/invest/pages/KycApplications";
import KycForms from "../pages/panel/invest/pages/KycForms";
import ProfileLayout from "../pages/panel/invest/ProfileLayout";
import Profile from "../pages/panel/invest/Profile";
import ProfileSetting from "../pages/panel/invest/ProfileSetting";
import ProfileNotify from "../pages/panel/invest/ProfileNotify";
import ProfileConnected from "../pages/panel/invest/ProfileConnected";
import ProfileActivity from "../pages/panel/invest/ProfileActivity";

import Component from "../pages/components/Index";
import Accordian from "../pages/components/Accordions";
import Alerts from "../pages/components/Alerts";
import Avatar from "../pages/components/Avatar";
import Badges from "../pages/components/Badges";
import Breadcrumbs from "../pages/components/Breadcrumbs";
import ButtonGroup from "../pages/components/ButtonGroup";
import Buttons from "../pages/components/Buttons";
import Cards from "../pages/components/Cards";
import Carousel from "../pages/components/Carousel";
import Dropdowns from "../pages/components/Dropdowns";
import FormElements from "../pages/components/forms/FormElements";
import FormLayouts from "../pages/components/forms/FormLayouts";
import FormValidation from "../pages/components/forms/FormValidation";
import Modals from "../pages/components/Modals";
import Pagination from "../pages/components/Pagination";
import Popovers from "../pages/components/Popovers";
import Progress from "../pages/components/Progress";
import Spinner from "../pages/components/Spinner";
import Tabs from "../pages/components/Tabs";
import Toast from "../pages/components/Toast";
import Tooltips from "../pages/components/Tooltips";
import Typography from "../pages/components/Typography";
import UtilBorder from "../pages/components/UtilBorder";
import UtilColors from "../pages/components/UtilColors";
import UtilDisplay from "../pages/components/UtilDisplay";
import UtilEmbeded from "../pages/components/UtilEmbeded";
import UtilFlex from "../pages/components/UtilFlex";
import UtilOthers from "../pages/components/UtilOthers";
import UtilSizing from "../pages/components/UtilSizing";
import UtilSpacing from "../pages/components/UtilSpacing";
import UtilText from "../pages/components/UtilText";

import Blank from "../pages/others/Blank";
import Faq from "../pages/others/Faq";
import Regularv1 from "../pages/others/Regular-1";
import Regularv2 from "../pages/others/Regular-2";
import Terms from "../pages/others/Terms";
import BasicTable from "../pages/components/table/BasicTable";
import SpecialTablePage from "../pages/components/table/SpecialTable";
import DataTablePage from "../pages/components/table/DataTable";
import ChartPage from "../pages/components/charts/Charts";
import KnobPreview from "../pages/components/charts/KnobPreview";
import EmailTemplate from "../pages/components/email-template/Email";
import NioIconPage from "../pages/components/crafted-icons/NioIcon";
import SVGIconPage from "../pages/components/crafted-icons/SvgIcons";

import ProjectCardPage from "../pages/pre-built/projects/ProjectCard";
import ProjectListPage from "../pages/pre-built/projects/ProjectList";
import UserListRegular from "../pages/pre-built/user-manage/UserListRegular";
import UserContactCard from "../pages/pre-built/user-manage/UserContactCard";
import UserDetails from "../pages/pre-built/user-manage/UserDetailsRegular";
import UserListCompact from "../pages/pre-built/user-manage/UserListCompact";
import UserProfileRegular from "../pages/pre-built/user-manage/UserProfileRegular";
import UserProfileSetting from "../pages/pre-built/user-manage/UserProfileSetting";
import UserProfileNotification from "../pages/pre-built/user-manage/UserProfileNotification";
import UserProfileActivity from "../pages/pre-built/user-manage/UserProfileActivity";
import KycListRegular from "../pages/pre-built/kyc-list-regular/KycListRegular";
import KycDetailsRegular from "../pages/pre-built/kyc-list-regular/kycDetailsRegular";
import TransListBasic from "../pages/pre-built/trans-list/TransListBasic";
import TransListCrypto from "../pages/pre-built/trans-list/TransListCrypto";
import ProductCard from "../pages/pre-built/products/ProductCard";
import ProductList from "../pages/pre-built/products/ProductList";
import ProductDetails from "../pages/pre-built/products/ProductDetails";
import InvoiceList from "../pages/pre-built/invoice/InvoiceList";
import InvoiceDetails from "../pages/pre-built/invoice/InvoiceDetails";
import InvoicePrint from "../pages/pre-built/invoice/InvoicePrint";
import PricingTable from "../pages/pre-built/pricing-table/PricingTable";
import GalleryPreview from "../pages/pre-built/gallery/GalleryCardPreview";

import AppMessages from "../pages/app/messages/Messages";
import Chat from "../pages/app/chat/ChatContainer";
import Calender from "../pages/app/calender/Calender";
import Kanban from "../pages/app/kanban/Kanban";
import Inbox from "../pages/app/inbox/Inbox";
import DateTimePicker from "../pages/components/forms/DateTimePicker";
import AdvancedControls from "../pages/components/forms/AdvancedControls";
import CheckboxRadio from "../pages/components/forms/CheckboxRadio";
import InputGroup from "../pages/components/forms/InputGroup";
import FormUpload from "../pages/components/forms/FormUpload";
import NumberSpinner from "../pages/components/forms/NumberSpinner";
import NouiSlider from "../pages/components/forms/nouislider";
import WizardForm from "../pages/components/forms/WizardForm";
import QuillPreview from "../pages/components/forms/rich-editor/QuillPreview";
import TinymcePreview from "../pages/components/forms/rich-editor/TinymcePreview";

import FileManager from "../pages/app/file-manager/FileManager";
import FileManagerFiles from "../pages/app/file-manager/FileManagerFiles";
import FileManagerShared from "../pages/app/file-manager/FileManagerShared";
import FileManagerStarred from "../pages/app/file-manager/FileManagerStarred";
import FileManagerRecovery from "../pages/app/file-manager/FileManagerRecovery";
import FileManagerSettings from "../pages/app/file-manager/FileManagerSettings";
import CardWidgets from "../pages/components/widgets/CardWidgets";
import ChartWidgets from "../pages/components/widgets/ChartWidgets";
import RatingWidgets from "../pages/components/widgets/RatingWidgets";
import SlickPage from "../pages/components/misc/Slick";
import JsTreePreview from "../pages/components/misc/JsTree";
import ReactToastify from "../pages/components/misc/ReactToastify";
import SweetAlertPage from "../pages/components/misc/SweetAlert";
import BeautifulDnd from "../pages/components/misc/BeautifulDnd";
import DualListPage from "../pages/components/misc/DualListbox";
import GoogleMapPage from "../pages/components/misc/GoogleMap";

import Error404Classic from "../pages/error/404-classic";
import Error404Modern from "../pages/error/404-modern";
import Error504Modern from "../pages/error/504-modern";
import Error504Classic from "../pages/error/504-classic";

import Login from "../pages/auth/Login";
import RbacLogin from "../pages/auth/RbacLogin";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import Success from "../pages/auth/Success";

import Layout from "../layout/Index";
import LayoutNoSidebar from "../layout/Index-nosidebar";
import AdminShell from "../components/admin/layout/AdminShell";
import AdminLayoutGuard from "../components/admin/AdminLayoutGuard";
import StoreShell from "../components/store/layout/StoreShell";
import StoreLayoutGuard from "../components/store/StoreLayoutGuard";
import ProtectedRoute from "../components/admin/ProtectedRoute";
import StoreDashboard from "../pages/store/StoreDashboard";
import StorePlaceholder from "../pages/store/StorePlaceholder";
import StoreCashierPage from "../pages/store/cashier";
import InfoKaryawan from "../pages/store/user/info-karyawan";
import EmployeeDetailPage from "../pages/store/user/info-karyawan/detail";
import AdminDashboardPage from "../pages/admin/dashboard";
import AdminProfilePage from "../pages/admin/profile";
import ForbiddenPage from "../pages/admin/forbidden";
import BranchesPage from "../pages/admin/master/branches";
import StoresPage from "../pages/admin/master/stores";
import EmployeesPage from "../pages/admin/master/employees";
import RolesPage from "../pages/admin/security/roles";
import ModulesPage from "../pages/admin/security/modules";
import PermissionsPage from "../pages/admin/security/permissions";
import RolePermissionsPage from "../pages/admin/security/role-permissions";
import UserRolesPage from "../pages/admin/security/user-roles";
import AreaStoresPage from "../pages/admin/security/area-stores";
import AccessCheckPage from "../pages/admin/access/access-check";
import EffectiveAccessPage from "../pages/admin/access/effective-access";
import UserMenuPreviewPage from "../pages/admin/access/user-menu-preview";
import StoreScopePreviewPage from "../pages/admin/access/store-scope-preview";
import AuditLogPage from "../pages/admin/system/audit-log";
import PasswordResetLogPage from "../pages/admin/system/password-reset-log";
import Dcr from "../pages/store-sales/dailyCollectionReport";
import DailySalesSummary from "../pages/store-sales/dailySalesSummary";
import SalesDetail from "../pages/store-sales/salesDetail";
import AsbcNilai from "../pages/store-sales/asbcNilai";
import SalesBatch from "../pages/store-sales/batch";
import SalesByManPower from "../pages/store-sales/salesByManPower";
import BestSeller from "../pages/store-sales/bestSeller";
import Promosi from "../pages/store-sales/promosi";
import Refund from "../pages/store-sales/salesRefund";
import SlipSetoranBankPage from "../pages/store/setoran/slip-setoran-bank";
import KasListPage from "../pages/store/kas-kecil/kas-list";
import {
  HrdDashboardPage,
  HrdAbsOnlineAttendancePage,
  HrdAbsAllAttendancePage,
  HrdAbsPersonelPage,
  HrdPersonelInfoPage,
  HrdAbsKontrakPage,
  HrdAbsStatusPage,
  HrdAbsPromosiPage,
  HrdAbsMutasiPage,
  HrdAbsResignPage,
  HrdAbsGenerateStorePage,
  HrdAbsGenerateNasionalPage,
  HrdParAdhocPage,
  HrdParDinasPage,
  HrdParIzinPage,
  HrdParCutiPage,
  HrdParSakitPage,
  HrdParOvertimePage,
  HrdParAlfaPage,
  HrdParHolidayPage,
  HrdParOtAmountPage,
  HrdParPolicyPage,
  HrdParPerusahaanPage,
  HrdParCabangPage,
  HrdParDivisiPage,
  HrdParDepartemenPage,
  HrdParGolonganPage,
  HrdParPangkatPage,
  HrdParJabatanPage,
  HrdParSmDeptPage,
  HrdParEomPage,
  HrdRptAbsenTotalPage,
  HrdRptAbsenNasionalPage,
  HrdRptAbsenWfhPage,
  HrdRptDetailHadirPage,
  HrdRptExportEmpPage,
  HrdRptCutiPage,
  HrdRptLemburPage,
  HrdRptSlipGajiPage,
  HrdRptKpiPage,
  HrdCabVariablePage,
  HrdCabFormulaPage,
  HrdCabBenefitPage,
  HrdCabDeductionPage,
  HrdCabSalaryEntryPage,
  HrdCabSalaryInquiryPage,
  HrdCabSalaryReportPage,
  HrdCabThrPage,
  HrdCabPaymentPage,
  HrdCabMonthlyPage,
} from "../pages/admin/hrd/pages";
import {
  RegDashboardPage,
  RegMobileTotSalesPage,
  RegAbsenListPage,
  RegPluScanPage,
  RegSlipDcrPage,
  RegMpArListPage,
  RegMpArRealisasiPage,
  RegMpReturPage,
  RegRptSalesArticlePage,
  RegRptSalesIslandPage,
  RegRptGrossMarginPage,
  RegRptDailySalesPage,
  RegRptDcrPage,
  RegRptSalesDetailPage,
  RegRptPaymentPage,
  RegRptArDetailPage,
  RegRptPromosiPage,
  RegRptAsbcQtyPage,
  RegRptKoleksiPage,
  RegRptSalesManpowerPage,
  RegRptTrStInPage,
  RegRptOutstandingPage,
  RegRptTrStOutPage,
  RegRptStListPage,
  RegRptLbppBrandPage,
  RegRptLastStockPage,
  RegRptLastStockAllPage,
  RegRptDailyStockPage,
  RegRptCekMutasiPage,
  RegRptMutasiHarianPage,
  RegRptCekQty0Page,
  RegRptTrSoPage,
  RegRptSoDiffPage,
  RegRptSoAdjPage,
  RegRptTrSoPartialPage,
  RegRptSoDiffPartialPage,
  RegRptSoAdjPartialPage,
  RegRptVoucherFisikPage,
  RegRptVoucherImlekPage,
  RegRptWoro1Page,
  RegRptWoro2Page,
  RegRptOmniRtPage,
  RegRptOmniVarianPage,
  RegRptOmniOrderPage,
  RegRptMemberPage,
  RegRptMemberInfoPage,
  RegScanSelisihPage,
  RegToolsAdjSoPage,
  RegToolsGhPage,
  RegToolsStorePage,
  RegPrintOutstandingPage
} from "../pages/admin/regional/pages";
import { appPath } from "../lib/paths";

const LegacyUserMenuRedirect = () => {
  const { nik } = useParams();
  return <Navigate to={appPath(`/admin/access/users/${encodeURIComponent(nik)}/menu`)} replace />;
};

const LegacyStoreScopeRedirect = () => {
  const { nik } = useParams();
  return <Navigate to={appPath(`/admin/access/users/${encodeURIComponent(nik)}/store-scope`)} replace />;
};

const Router = () => {
  const location = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);


  return (
      <Routes>
        
        <Route path={`${process.env.PUBLIC_URL}`} element={<Layout />}>
          <Route index element={<RootRedirect />}></Route>
          <Route path="crypto" element={<Crypto />}></Route>
          <Route path="analytics" element={<Analytics />}></Route>
          <Route path="sales" element={<Sales />}></Route>
          <Route path="_blank" element={<Blank />}></Route>

          <Route path="project-card" element={<ProjectCardPage />}></Route>
          <Route path="project-list" element={<ProjectListPage />}></Route>

          
          <Route path="invest" >
            <Route index element={<Overview />}></Route>
            <Route path="index" element={<Overview />}></Route>
            <Route path="schemes" element={<Plan />}></Route>
            <Route element={<ProfileLayout />} >
              <Route path="profile" element={<Profile />}></Route>
              <Route path="profile-notify" element={<ProfileNotify />}></Route>
              <Route path="profile-setting" element={<ProfileSetting />}></Route>
              <Route path="profile-connected" element={<ProfileConnected />}></Route>
            </Route>
            <Route path="profile-activity" element={<ProfileActivity />}></Route>
            <Route path="invest" element={<Investment />}></Route>
            <Route path="invest-form/:investId" element={<InvestmentProcess />}></Route>
            <Route path="scheme-details/:schemeId" element={<InvestmentDetails />}></Route>
            <Route path="welcome" element={<Welcome />}></Route>
            <Route path="kyc-application" element={<KycApplications />}></Route>
            <Route path="kyc-form" element={<KycForms />}></Route>
          </Route>

          <Route element={<UserContextProvider />} >
            <Route path="user-list-regular" element={<UserListRegular />}></Route>
            <Route path="user-list-compact" element={<UserListCompact />}></Route>
            <Route path="user-contact-card" element={<UserContactCard />}></Route>
            <Route path="user-details-regular/:userId" element={<UserDetails />}></Route>
          </Route>

          <Route >
            <Route path="user-profile-notification" element={<UserProfileNotification />} ></Route>
            <Route path="user-profile-regular" element={<UserProfileRegular />}></Route>
            <Route path="user-profile-activity" element={<UserProfileActivity />}></Route>
            <Route path="user-profile-setting" element={<UserProfileSetting />}></Route>
          </Route>

          <Route path="kyc-list-regular" element={<KycListRegular />}></Route>
          <Route path="kyc-details-regular/:kycId" element={<KycDetailsRegular />}></Route>
          <Route path="transaction-basic" element={<TransListBasic />}></Route>
          <Route path="transaction-crypto" element={<TransListCrypto />}></Route>
          <Route element={<ProductContextProvider />}>
            <Route path="product-list" element={<ProductList />}></Route>
            <Route path="product-card" element={<ProductCard />}></Route>
            <Route path="product-details/:productId" element={<ProductDetails />}></Route>
          </Route>

          <Route path="invoice-list" element={<InvoiceList />}></Route>
          <Route path="invoice-details/:invoiceId" element={<InvoiceDetails />}></Route>
          <Route path="pricing-table" element={<PricingTable />}></Route>
          <Route path="image-gallery" element={<GalleryPreview />}></Route>

          <Route path="pages">
            <Route path="terms-policy" element={<Terms />}></Route>
            <Route path="faq" element={<Faq />}></Route>
            <Route path="regular-v1" element={<Regularv1 />}></Route>
            <Route path="regular-v2" element={<Regularv2 />}></Route>
          </Route>

          <Route path="app-messages" element={<AppMessages />}></Route>
          <Route path="app-chat" element={<Chat />}></Route>
          <Route path="app-calender" element={<Calender />}></Route>
          <Route path="app-inbox" element={<Inbox />}></Route>
          <Route path="app-kanban" element={<Kanban />}></Route>

        {/* MENU WEBSITE — legacy demo routes (not for STORE_LOGIN users) */}
        
          <Route path="app-file-manager">
            <Route index element={<FileManager />}></Route>
            <Route path="files" element={<FileManagerFiles />}></Route>
            <Route path="starred" element={<FileManagerStarred />}></Route>
            <Route path="shared" element={<FileManagerShared />}></Route>
            <Route path="recovery" element={<FileManagerRecovery />}></Route>
            <Route path="settings" element={<FileManagerSettings />}></Route>
          </Route>

          <Route path="components">
            <Route index element={<Component />}></Route>
            <Route path="accordions" element={<Accordian />}></Route>
            <Route path="alerts" element={<Alerts />}></Route>
            <Route path="avatar" element={<Avatar />}></Route>
            <Route path="badges" element={<Badges />}></Route>
            <Route path="breadcrumbs" element={<Breadcrumbs />}></Route>
            <Route path="button-group" element={<ButtonGroup />}></Route>
            <Route path="buttons" element={<Buttons />}></Route>
            <Route path="cards" element={<Cards />}></Route>
            <Route path="carousel" element={<Carousel />}></Route>
            <Route path="dropdowns" element={<Dropdowns />}></Route>
            <Route path="form-elements" element={<FormElements />}></Route>
            <Route path="form-layouts" element={<FormLayouts />}></Route>
            <Route path="checkbox-radio" element={<CheckboxRadio />}></Route>
            <Route path="advanced-control" element={<AdvancedControls />}></Route>
            <Route path="input-group" element={<InputGroup />}></Route>
            <Route path="form-upload" element={<FormUpload />}></Route>
            <Route path="number-spinner" element={<NumberSpinner />}></Route>
            <Route path="form-validation" element={<FormValidation />}></Route>
            <Route path="datetime-picker" element={<DateTimePicker />}></Route>
            <Route path="modals" element={<Modals />}></Route>
            <Route path="pagination" element={<Pagination />}></Route>
            <Route path="popovers" element={<Popovers />}></Route>
            <Route path="progress" element={<Progress />}></Route>
            <Route path="spinner" element={<Spinner />}></Route>
            <Route path="tabs" element={<Tabs />}></Route>
            <Route path="toast" element={<Toast />}></Route>
            <Route path="tooltips" element={<Tooltips />}></Route>
            <Route path="typography" element={<Typography />}></Route>
            <Route path="noUislider" element={<NouiSlider />}></Route>
            <Route path="wizard-basic" element={<WizardForm />}></Route>
            <Route path="quill" element={<QuillPreview />}></Route>
            <Route path="tinymce" element={<TinymcePreview />}></Route>
            <Route path="util-border" element={<UtilBorder />}></Route>
            <Route path="util-colors" element={<UtilColors />}></Route>
            <Route path="util-display" element={<UtilDisplay />}></Route>
            <Route path="util-embeded" element={<UtilEmbeded />}></Route>
            <Route path="util-flex" element={<UtilFlex />}></Route>
            <Route path="util-others" element={<UtilOthers />}></Route>
            <Route path="util-sizing" element={<UtilSizing />}></Route>
            <Route path="util-spacing" element={<UtilSpacing />}></Route>
            <Route path="util-text" element={<UtilText />}></Route>

            <Route path="widgets">
              <Route path="cards" element={<CardWidgets />}></Route>
              <Route path="charts" element={<ChartWidgets />}></Route>
              <Route path="rating" element={<RatingWidgets />}></Route>
            </Route>

            <Route path="misc">
              <Route path="slick-slider" element={<SlickPage />}></Route>
              <Route path="sweet-alert" element={<SweetAlertPage />}></Route>
              <Route path="beautiful-dnd" element={<BeautifulDnd />}></Route>
              <Route path="dual-list" element={<DualListPage />}></Route>
              <Route path="map" element={<GoogleMapPage />}></Route>
              <Route path="toastify" element={<ReactToastify />}></Route>
              <Route path="jsTree" element={<JsTreePreview />}></Route>
            </Route>
          </Route>
          <Route path="charts">
            <Route path="chartjs" element={<ChartPage />}></Route>
            <Route path="knobs" element={<KnobPreview />}></Route>
          </Route>
          
          <Route path="table-basic" element={<BasicTable />}></Route>
          <Route path="table-datatable" element={<DataTablePage />}></Route>
          <Route path="table-special" element={<SpecialTablePage />}></Route>
          <Route path="email-template" element={<EmailTemplate />}></Route>
          <Route path="nioicon" element={<NioIconPage />}></Route>
          <Route path="svg-icons" element={<SVGIconPage />}></Route>

        </Route>

        {/* Store Portal (STORE_LOGIN) — must be before admin routes for /store/* paths */}
        <Route
          element={
            <ProtectedRoute>
              <StoreLayoutGuard />
            </ProtectedRoute>
          }
        >
          <Route element={<StoreShell />}>
            <Route path="store">
              <Route index element={<StoreDashboard />} />
              <Route path="cashier" element={<StoreCashierPage />} />
              <Route path="sales-detail" element={<SalesDetail />} />
              <Route path="daily-collection-report" element={<Dcr />} />
              <Route path="daily-sales-summary" element={<DailySalesSummary />} />
              <Route path="sales/daily-sales-summary" element={<DailySalesSummary />} />
              <Route path="sales/asbc-nilai" element={<AsbcNilai />} />
              <Route path="sales/batch" element={<SalesBatch />} />
              <Route path="sales/sales-by-man-power" element={<SalesByManPower />} />
              <Route path="sales/item-best-seller" element={<BestSeller />} />
              <Route path="sales/promosi" element={<Promosi />} />
              <Route path="sales/sales-refund" element={<Refund />} />
              <Route path="setoran/slip-setoran-bank" element={<SlipSetoranBankPage />} />
              <Route path="kas-kecil/kas-list" element={<KasListPage />} />
              <Route path="user/info-karyawan/:employeeId" element={<EmployeeDetailPage />} />
              <Route path="user/info-karyawan" element={<InfoKaryawan />} />
              <Route path="profile" element={<AdminProfilePage />} />
              <Route path="403" element={<ForbiddenPage />} />
              <Route path="*" element={<StorePlaceholder />} />
            </Route>
          </Route>
        </Route>

        {/* Admin Panel */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayoutGuard />
            </ProtectedRoute>
          }
        >
          <Route element={<AdminShell />}>
          <Route path="admin">
            <Route index element={<Navigate to={appPath("/admin/dashboard")} replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="master/branches" element={<BranchesPage />} />
            <Route path="master/stores" element={<StoresPage />} />
            <Route path="master/employees" element={<EmployeesPage />} />
            <Route path="security/roles" element={<RolesPage />} />
            <Route path="security/modules" element={<ModulesPage />} />
            <Route path="security/permissions" element={<PermissionsPage />} />
            <Route path="security/role-permissions" element={<RolePermissionsPage />} />
            <Route path="security/user-roles" element={<UserRolesPage />} />
            <Route path="security/area-stores" element={<AreaStoresPage />} />
            <Route path="access/access-check" element={<AccessCheckPage />} />
            <Route path="access/effective-access" element={<EffectiveAccessPage />} />
            <Route path="access/user-menu-preview" element={<UserMenuPreviewPage />} />
            <Route path="access/store-scope-preview" element={<StoreScopePreviewPage />} />
            <Route path="access/users/:nik/menu" element={<UserMenuPreviewPage />} />
            <Route path="access/users/:nik/store-scope" element={<StoreScopePreviewPage />} />
            <Route path="system/audit-log" element={<AuditLogPage />} />
            <Route path="system/password-reset-log" element={<PasswordResetLogPage />} />
            {/* HRD module — roll 76 migration */}
            <Route path="hrd/dashboard" element={<HrdDashboardPage />} />
            <Route path="hrd/abs/online-attendance" element={<HrdAbsOnlineAttendancePage />} />
            <Route path="hrd/abs/all-attendance" element={<HrdAbsAllAttendancePage />} />
            <Route path="hrd/abs/generate-store" element={<HrdAbsGenerateStorePage />} />
            <Route path="hrd/abs/generate-nasional" element={<HrdAbsGenerateNasionalPage />} />
            <Route path="hrd/abs/personel" element={<HrdAbsPersonelPage />} />
            <Route path="hrd/abs/personel/new" element={<HrdPersonelInfoPage />} />
            <Route path="hrd/abs/personel/:id" element={<HrdPersonelInfoPage />} />
            <Route path="hrd/abs/personel-kontrak" element={<HrdAbsKontrakPage />} />
            <Route path="hrd/abs/personel-status" element={<HrdAbsStatusPage />} />
            <Route path="hrd/abs/personel-promosi" element={<HrdAbsPromosiPage />} />
            <Route path="hrd/abs/personel-mutasi" element={<HrdAbsMutasiPage />} />
            <Route path="hrd/abs/personel-resign" element={<HrdAbsResignPage />} />
            <Route path="hrd/par/adhoc" element={<HrdParAdhocPage />} />
            <Route path="hrd/par/dinas" element={<HrdParDinasPage />} />
            <Route path="hrd/par/izin" element={<HrdParIzinPage />} />
            <Route path="hrd/par/cuti" element={<HrdParCutiPage />} />
            <Route path="hrd/par/sakit" element={<HrdParSakitPage />} />
            <Route path="hrd/par/overtime" element={<HrdParOvertimePage />} />
            <Route path="hrd/par/alfa" element={<HrdParAlfaPage />} />
            <Route path="hrd/par/holiday" element={<HrdParHolidayPage />} />
            <Route path="hrd/par/overtime-amount" element={<HrdParOtAmountPage />} />
            <Route path="hrd/par/policy" element={<HrdParPolicyPage />} />
            <Route path="hrd/par/perusahaan" element={<HrdParPerusahaanPage />} />
            <Route path="hrd/par/cabang" element={<HrdParCabangPage />} />
            <Route path="hrd/par/divisi" element={<HrdParDivisiPage />} />
            <Route path="hrd/par/departemen" element={<HrdParDepartemenPage />} />
            <Route path="hrd/par/golongan" element={<HrdParGolonganPage />} />
            <Route path="hrd/par/pangkat" element={<HrdParPangkatPage />} />
            <Route path="hrd/par/jabatan" element={<HrdParJabatanPage />} />
            <Route path="hrd/par/sm-dept" element={<HrdParSmDeptPage />} />
            <Route path="hrd/par/eom" element={<HrdParEomPage />} />
            <Route path="hrd/rpt/absen-total" element={<HrdRptAbsenTotalPage />} />
            <Route path="hrd/rpt/absen-nasional" element={<HrdRptAbsenNasionalPage />} />
            <Route path="hrd/rpt/absen-wfh" element={<HrdRptAbsenWfhPage />} />
            <Route path="hrd/rpt/detail-kehadiran" element={<HrdRptDetailHadirPage />} />
            <Route path="hrd/rpt/export-employee" element={<HrdRptExportEmpPage />} />
            <Route path="hrd/rpt/cuti" element={<HrdRptCutiPage />} />
            <Route path="hrd/rpt/lembur" element={<HrdRptLemburPage />} />
            <Route path="hrd/rpt/slip-gaji" element={<HrdRptSlipGajiPage />} />
            <Route path="hrd/rpt/kpi" element={<HrdRptKpiPage />} />
            <Route path="hrd/cab/variable" element={<HrdCabVariablePage />} />
            <Route path="hrd/cab/formula" element={<HrdCabFormulaPage />} />
            <Route path="hrd/cab/benefit" element={<HrdCabBenefitPage />} />
            <Route path="hrd/cab/deduction" element={<HrdCabDeductionPage />} />
            <Route path="hrd/cab/salary-entry" element={<HrdCabSalaryEntryPage />} />
            <Route path="hrd/cab/salary-inquiry" element={<HrdCabSalaryInquiryPage />} />
            <Route path="hrd/cab/salary-report" element={<HrdCabSalaryReportPage />} />
            <Route path="hrd/cab/thr" element={<HrdCabThrPage />} />
            <Route path="hrd/cab/monthly-process" element={<HrdCabMonthlyPage />} />
            <Route path="hrd/cab/payment-request" element={<HrdCabPaymentPage />} />
            <Route path="regional/dashboard" element={<RegDashboardPage />} />
            <Route path="regional/rpt/sales/total-sales" element={<RegMobileTotSalesPage />} />
            <Route path="regional/mobile/total-sales" element={<RegMobileTotSalesPage />} />
            <Route path="regional/absen/list" element={<RegAbsenListPage />} />
            <Route path="regional/util/scan-plu" element={<RegPluScanPage />} />
            <Route path="regional/plu/scan" element={<RegPluScanPage />} />
            <Route path="regional/slip/dcr" element={<RegSlipDcrPage />} />
            <Route path="regional/mp/ar-list" element={<RegMpArListPage />} />
            <Route path="regional/mp/ar-realisasi" element={<RegMpArRealisasiPage />} />
            <Route path="regional/mp/retur" element={<RegMpReturPage />} />
            <Route path="regional/rpt/sales/sales-article" element={<RegRptSalesArticlePage />} />
            <Route path="regional/rpt/sales/sales-island" element={<RegRptSalesIslandPage />} />
            <Route path="regional/rpt/sales/gross-margin" element={<RegRptGrossMarginPage />} />
            <Route path="regional/rpt/sales/daily-sales" element={<RegRptDailySalesPage />} />
            <Route path="regional/rpt/sales/dcr" element={<RegRptDcrPage />} />
            <Route path="regional/rpt/sales/sales-detail" element={<RegRptSalesDetailPage />} />
            <Route path="regional/rpt/sales/payment-detail" element={<RegRptPaymentPage />} />
            <Route path="regional/rpt/sales/ar-detail" element={<RegRptArDetailPage />} />
            <Route path="regional/rpt/sales/promosi" element={<RegRptPromosiPage />} />
            <Route path="regional/rpt/sales/asbc-qty" element={<RegRptAsbcQtyPage />} />
            <Route path="regional/rpt/sales/koleksi" element={<RegRptKoleksiPage />} />
            <Route path="regional/rpt/sales/sales-manpower" element={<RegRptSalesManpowerPage />} />
            <Route path="regional/rpt/inv/tr-st-in" element={<RegRptTrStInPage />} />
            <Route path="regional/rpt/inv/outstanding" element={<RegRptOutstandingPage />} />
            <Route path="regional/rpt/inv/tr-st-out" element={<RegRptTrStOutPage />} />
            <Route path="regional/rpt/inv/st-list" element={<RegRptStListPage />} />
            <Route path="regional/rpt/inv/lbpp-brand" element={<RegRptLbppBrandPage />} />
            <Route path="regional/rpt/inv/last-stock" element={<RegRptLastStockPage />} />
            <Route path="regional/rpt/inv/last-stock-all" element={<RegRptLastStockAllPage />} />
            <Route path="regional/rpt/inv/daily-stock" element={<RegRptDailyStockPage />} />
            <Route path="regional/rpt/inv/cek-mutasi" element={<RegRptCekMutasiPage />} />
            <Route path="regional/rpt/inv/mutasi-harian" element={<RegRptMutasiHarianPage />} />
            <Route path="regional/rpt/inv/cek-qty0" element={<RegRptCekQty0Page />} />
            <Route path="regional/rpt/so/tr-so" element={<RegRptTrSoPage />} />
            <Route path="regional/rpt/so/so-diff" element={<RegRptSoDiffPage />} />
            <Route path="regional/rpt/so/so-adj" element={<RegRptSoAdjPage />} />
            <Route path="regional/rpt/so/tr-so-partial" element={<RegRptTrSoPartialPage />} />
            <Route path="regional/rpt/so/so-diff-partial" element={<RegRptSoDiffPartialPage />} />
            <Route path="regional/rpt/so/so-adj-partial" element={<RegRptSoAdjPartialPage />} />
            <Route path="regional/rpt/voucher/fisik" element={<RegRptVoucherFisikPage />} />
            <Route path="regional/rpt/voucher/imlek" element={<RegRptVoucherImlekPage />} />
            <Route path="regional/rpt/woro/rpt1" element={<RegRptWoro1Page />} />
            <Route path="regional/rpt/woro/rpt2" element={<RegRptWoro2Page />} />
            <Route path="regional/rpt/omni/realtime-stock" element={<RegRptOmniRtPage />} />
            <Route path="regional/rpt/omni/varian-stock" element={<RegRptOmniVarianPage />} />
            <Route path="regional/rpt/omni/order-online" element={<RegRptOmniOrderPage />} />
            <Route path="regional/rpt/member/list" element={<RegRptMemberPage />} />
            <Route path="regional/rpt/member/info" element={<RegRptMemberInfoPage />} />
            <Route path="regional/util/scan-selisih" element={<RegScanSelisihPage />} />
            <Route path="regional/util/adj-so-partial" element={<RegToolsAdjSoPage />} />
            <Route path="regional/util/group-head" element={<RegToolsGhPage />} />
            <Route path="regional/util/store-list" element={<RegToolsStorePage />} />
            <Route path="regional/util/print-outstanding" element={<RegPrintOutstandingPage />} />
          </Route>
          <Route path="dashboard" element={<Navigate to={appPath("/admin/dashboard")} replace />} />
          <Route path="profile" element={<AdminProfilePage />} />
          <Route path="403" element={<ForbiddenPage />} />
          <Route path="rbac/branches" element={<Navigate to={appPath("/admin/master/branches")} replace />} />
          <Route path="rbac/stores" element={<Navigate to={appPath("/admin/master/stores")} replace />} />
          <Route path="rbac/employees" element={<Navigate to={appPath("/admin/master/employees")} replace />} />
          <Route path="rbac/roles" element={<Navigate to={appPath("/admin/security/roles")} replace />} />
          <Route path="rbac/modules" element={<Navigate to={appPath("/admin/security/modules")} replace />} />
          <Route path="rbac/permissions" element={<Navigate to={appPath("/admin/security/permissions")} replace />} />
          <Route path="rbac/role-permissions" element={<Navigate to={appPath("/admin/security/role-permissions")} replace />} />
          <Route path="rbac/user-roles" element={<Navigate to={appPath("/admin/security/user-roles")} replace />} />
          <Route path="rbac/area-stores" element={<Navigate to={appPath("/admin/security/area-stores")} replace />} />
          <Route path="rbac/access-check" element={<Navigate to={appPath("/admin/access/access-check")} replace />} />
          <Route path="rbac/effective-access" element={<Navigate to={appPath("/admin/access/effective-access")} replace />} />
          <Route path="rbac/users/menu-preview" element={<Navigate to={appPath("/admin/access/user-menu-preview")} replace />} />
          <Route path="rbac/users/:nik/menu" element={<LegacyUserMenuRedirect />} />
          <Route path="rbac/users/store-scope-preview" element={<Navigate to={appPath("/admin/access/store-scope-preview")} replace />} />
          <Route path="rbac/users/:nik/store-scope" element={<LegacyStoreScopeRedirect />} />
          </Route>
        </Route>

        <Route path={`${process.env.PUBLIC_URL}`} element={<LayoutNoSidebar />}>
          <Route path="login" element={<RbacLogin />}></Route>
          <Route path="auth-success" element={<Success />}></Route>
            <Route path="auth-reset" element={<ForgotPassword />}></Route>
            <Route path="auth-register" element={<Register />}></Route>
            <Route path="auth-login" element={<Login />}></Route>

            <Route path="errors">
              <Route path="404-modern" element={<Error404Modern />}></Route>
              <Route path="404-classic" element={<Error404Classic />}></Route>
              <Route path="504-modern" element={<Error504Modern />}></Route>
              <Route path="504-classic" element={<Error504Classic />}></Route>
            </Route>
            <Route path="*" element={<Error404Modern />}></Route>
            
            <Route path="invoice-print/:invoiceId" element={<InvoicePrint />}></Route>
        </Route>

      </Routes>
  );
};
export default Router;
