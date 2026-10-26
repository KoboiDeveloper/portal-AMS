import { Navigate } from "react-router-dom";
import { appPath } from "../lib/paths";

/** Legacy route — store dashboard now lives at /store */
const Invest = () => <Navigate to={appPath("/login")} replace />;

export default Invest;
