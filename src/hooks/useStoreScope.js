import { useAuth } from "../context/AuthContext";

export const useStoreScope = () => {
  const { storeScope, activeStore, activeStoreId, isStoreUser } = useAuth();
  return {
    storeScope,
    storeId: activeStoreId,
    storeName: activeStore?.store_name || "",
    branchId: activeStore?.branch_id || "",
    isStoreUser,
  };
};
