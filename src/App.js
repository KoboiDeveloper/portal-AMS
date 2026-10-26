import Router from "./route/Index";

import ThemeProvider from "./layout/provider/Theme";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router />
        <ToastContainer position="top-right" autoClose={3000} />
      </AuthProvider>
    </ThemeProvider>
  );
};
export default App;