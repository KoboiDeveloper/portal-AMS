import axios from "axios";
import { storage } from "../lib/storage";
import { isSuccess } from "../lib/response";

const authBase = `${process.env.REACT_APP_API_BASE_URL || "http://localhost:8000"}/api/v1`;

export const authService = {
  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);
    params.append("user_agent", navigator.userAgent);

    const { data } = await axios.post(`${authBase}/auth/login`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!isSuccess(data)) {
      throw data;
    }

    const token = data.token || data.data?.token;
    const user = data.data || {};
    const primaryRole = (user.roles || [])[0] || {};
    if (token) storage.setToken(token);
    storage.setUser({
      username: user.username || username,
      nik: user.nik,
      employeeName: user.employeeName || user.employee_name,
      employeeType: user.employeeType || user.employee_type || "",
      roleCode: user.roleCode || user.role_code || primaryRole.roleCode || primaryRole.role_code || "",
      storeId: user.storeId || user.store_id || primaryRole.storeId || primaryRole.store_id || "",
      branchId: user.branchId || user.branch_id || primaryRole.branchId || primaryRole.branch_id || "",
      isSuperAdmin: user.isSuperAdmin ?? user.is_super_admin ?? false,
      roles: user.roles || [],
    });

    return data;
  },

  logout: () => {
    storage.clearAll();
  },
};
