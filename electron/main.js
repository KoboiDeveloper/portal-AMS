const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFile, execFileSync } = require("child_process");

/** ESC/POS open cash drawer — pin 2 / pin 5 */
const DRAWER_KICK_PIN2 = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
const DRAWER_KICK_PIN5 = Buffer.from([0x1b, 0x70, 0x01, 0x19, 0xfa]);
/** Partial cut (GS V 1) — umum di Epson/Citizen-compatible */
const PAPER_CUT_PARTIAL = Buffer.from([0x1d, 0x56, 0x01]);
/** Full cut Citizen alternatif (ESC i) */
const PAPER_CUT_CITIZEN = Buffer.from([0x1b, 0x69]);

const HEADER_BLUE = "#2c3782";
const ROOT_ENV = path.join(__dirname, "..", ".env");

/** Load .env project ke process.env (tanpa dependency dotenv). */
function loadDotEnv() {
  try {
    const raw = fs.readFileSync(ROOT_ENV, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    // ignore
  }
}

loadDotEnv();

function env(key, fallback = "") {
  const v = process.env[key];
  if (v === undefined || v === null || String(v).trim() === "") return fallback;
  return String(v).trim();
}

function resolveAppUrl() {
  return env("ELECTRON_APP_URL") || env("ELECTRON_START_URL") || "http://127.0.0.1:3000";
}

const RAW_PRINT_SCRIPT = path.join(__dirname, "raw-print.ps1");

let cachedPrinterName = null;

/** Nama printer thermal terinstal di Windows (CITIZEN / EPSON / POS). */
function detectThermalPrinterName() {
  if (cachedPrinterName !== null) return cachedPrinterName;
  try {
    const ps =
      "$p = Get-Printer | Where-Object { $_.Name -match 'CITIZEN|EPSON|POS|THERMAL|Receipt|CT-D|TM-' } | Select-Object -First 1; if ($p) { Write-Output $p.Name }";
    const out = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
      { encoding: "utf8", windowsHide: true, timeout: 10000 }
    ).trim();
    cachedPrinterName = out || "";
  } catch {
    cachedPrinterName = "";
  }
  return cachedPrinterName;
}

/** Nama printer tujuan: env dulu, lalu auto-detect. */
function resolvePrinterName() {
  return env("ELECTRON_PRINTER_NAME") || detectThermalPrinterName();
}

/**
 * Target legacy (copy /b) — hanya untuk share \\host\name, COM, atau LPT.
 * Port USB (USB001) TIDAK bisa dipakai di sini; harus lewat spooler.
 */
function resolveLegacyTarget() {
  const share = env("ELECTRON_PRINTER_SHARE");
  if (!share) return "";
  if (/^\\\\/.test(share)) return share;
  if (/^(COM|LPT)\d+$/i.test(share)) return `\\\\.\\${share.toUpperCase()}`;
  if (/^USB\d+$/i.test(share)) return "";
  return `\\\\localhost\\${share}`;
}

function createWindow() {
  const startUrl = resolveAppUrl();
  const mode = env("CASH_DRAWER_MODE", "raw").toLowerCase();
  const target = resolvePrinterName() || resolveLegacyTarget();

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: "AMS POS",
    backgroundColor: HEADER_BLUE,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: HEADER_BLUE,
      symbolColor: "#ffffff",
      height: 40,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  console.log("[electron] webview →", startUrl);
  console.log("[electron] cash drawer mode →", mode);
  console.log("[electron] cash drawer target →", target || "(belum ketemu printer)");

  win.loadURL(startUrl).catch((err) => {
    console.error("[electron] loadURL failed:", err);
  });

  if (env("ELECTRON_OPEN_DEVTOOLS") === "1") {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

function withTempPayload(payload, fn) {
  const tmp = path.join(os.tmpdir(), `ams-drawer-kick-${Date.now()}.bin`);
  fs.writeFileSync(tmp, payload);
  return Promise.resolve()
    .then(() => fn(tmp))
    .finally(() => {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    });
}

/** Kirim RAW lewat spooler Windows (satu-satunya cara untuk port USBxxx). */
function sendViaSpooler(printerName, payload) {
  return withTempPayload(
    payload,
    (tmp) =>
      new Promise((resolve, reject) => {
        execFile(
          "powershell.exe",
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            RAW_PRINT_SCRIPT,
            "-PrinterName",
            printerName,
            "-FilePath",
            tmp,
          ],
          { windowsHide: true, timeout: 15000 },
          (err, stdout, stderr) => {
            if (err) {
              reject(
                new Error(
                  (stderr || err.message || "spooler RAW gagal").trim().split("\n")[0]
                )
              );
              return;
            }
            resolve(String(stdout || "").trim() || "RAW_OK");
          }
        );
      })
  );
}

/** Legacy copy /b — untuk share \\host\name, COM, LPT. */
function sendViaCopy(target, payload) {
  return withTempPayload(
    payload,
    (tmp) =>
      new Promise((resolve, reject) => {
        execFile(
          "cmd.exe",
          ["/c", "copy", "/b", tmp, target],
          { windowsHide: true },
          (err, stdout, stderr) => {
            if (err) {
              reject(
                new Error((stderr || err.message || "copy /b gagal").trim())
              );
              return;
            }
            resolve(String(stdout || "ok"));
          }
        );
      })
  );
}

/** Spooler dulu (support USB001), lalu fallback copy /b. */
async function sendRawToPrinter(payload) {
  const printerName = resolvePrinterName();
  const legacy = resolveLegacyTarget();

  if (printerName) {
    try {
      const out = await sendViaSpooler(printerName, payload);
      return { via: `spooler:${printerName}`, out };
    } catch (e) {
      if (!legacy) throw e;
    }
  }

  if (legacy) {
    const out = await sendViaCopy(legacy, payload);
    return { via: `copy:${legacy}`, out };
  }

  throw new Error(
    "Printer thermal tidak ketemu. Set ELECTRON_PRINTER_NAME di .env (contoh: CITIZEN CT-D150)"
  );
}

/**
 * Default: raw (hardware).
 * Kirim: kick cash drawer + cut kertas (satu job) — pola umum thermal POS.
 */
async function openCashDrawer() {
  const mode = env("CASH_DRAWER_MODE", "raw").toLowerCase();
  const pin = env("CASH_DRAWER_PIN", "2");
  const withCut = env("CASH_DRAWER_WITH_CUT", "1") !== "0";

  if (mode !== "raw") {
    if (Notification.isSupported()) {
      new Notification({
        title: "AMS POS",
        body: "Open cash drawer (simulate)",
      }).show();
    }
    return {
      ok: true,
      mode: "simulate",
      message: "Simulate OK — set CASH_DRAWER_MODE=raw di .env untuk hardware",
    };
  }

  const buildPayload = (kick) =>
    withCut ? Buffer.concat([kick, PAPER_CUT_PARTIAL]) : kick;

  const primary = pin === "5" ? DRAWER_KICK_PIN5 : DRAWER_KICK_PIN2;
  const secondary = pin === "5" ? DRAWER_KICK_PIN2 : DRAWER_KICK_PIN5;
  const altPin = pin === "5" ? "2" : "5";

  try {
    const res = await sendRawToPrinter(buildPayload(primary));
    console.log(
      "[electron] cash drawer RAW OK →",
      res.via,
      "pin",
      pin,
      withCut ? "+cut" : ""
    );
    return {
      ok: true,
      mode: "raw",
      message: `Cash drawer${withCut ? " + cut" : ""} OK → ${res.via} (pin ${pin})`,
    };
  } catch (e) {
    try {
      const res = await sendRawToPrinter(buildPayload(secondary));
      console.log("[electron] cash drawer RAW OK →", res.via, `pin ${altPin} (fallback)`);
      return {
        ok: true,
        mode: "raw",
        message: `Cash drawer OK → ${res.via} (pin ${altPin})`,
      };
    } catch (e2) {
      const msg = e?.message || e2?.message || "gagal kirim raw";
      console.error("[electron] cash drawer RAW FAIL:", msg);
      return { ok: false, mode: "raw", message: msg };
    }
  }
}

app.whenReady().then(() => {
  ipcMain.handle("ams-pos:open-cash-drawer", async () => openCashDrawer());
  ipcMain.handle("ams-pos:get-env", async () => ({
    isElectron: true,
    appUrl: resolveAppUrl(),
    cashDrawerMode: env("CASH_DRAWER_MODE", "raw"),
    printerTarget: resolvePrinterName() || resolveLegacyTarget(),
    hasPrinterShare: Boolean(resolvePrinterName() || resolveLegacyTarget()),
  }));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
