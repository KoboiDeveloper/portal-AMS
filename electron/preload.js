const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("amsPos", {
  isElectron: true,
  openCashDrawer: () => ipcRenderer.invoke("ams-pos:open-cash-drawer"),
  getEnv: () => ipcRenderer.invoke("ams-pos:get-env"),
});

function markElectron() {
  document.documentElement.classList.add("ams-electron");
  document.body?.classList.add("ams-electron");
}

window.addEventListener("DOMContentLoaded", markElectron);
// Kalau DOM sudah siap (navigasi SPA)
if (document.readyState !== "loading") {
  markElectron();
}
