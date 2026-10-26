import AdminProjectListPage from "../../../../components/admin/AdminProjectListPage";
import { effectiveAccessConfig } from "../../config/crudConfigs";

const Page = () => <AdminProjectListPage config={effectiveAccessConfig} />;

export default Page;