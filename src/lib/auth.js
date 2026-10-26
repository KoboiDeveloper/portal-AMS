import { storage } from "./storage";



export const getAuthUser = () => storage.getUser();



export const getAuthNik = () => storage.getUser()?.nik || "";



export const isAuthenticated = () => !!storage.getToken() && !!storage.getUser();



export const isSuperAdmin = () => !!storage.getUser()?.isSuperAdmin;



export const getActorId = () => {

  const user = storage.getUser();

  return user?.nik || user?.username || "SYSTEM";

};



export { isStoreLoginUser, pickActiveStore } from "./userSession";

