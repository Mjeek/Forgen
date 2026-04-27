import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import path from "path";
import { initDb } from "../backend/db";
import { registerIpcHandlers } from "../backend/ipc";
import { startApiServer, stopApiServer } from "../backend/services/api-server";
import { IPC } from "../shared/ipc-channels";

const isDev = !app.isPackaged;

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#0b0e14",
    autoHideMenuBar: true,
    title: "Forgen",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return win;
}

async function bootstrap() {
  await app.whenReady();
  initDb();
  registerIpcHandlers();
  startApiServer();

  // App-level IPC
  ipcMain.handle(IPC.app.version, () => app.getVersion());
  ipcMain.handle(IPC.app.openExternal, (_e, url: string) => shell.openExternal(url));
  ipcMain.handle(IPC.app.chooseFile, async (_e, filters?: Electron.FileFilter[]) => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: filters ?? [{ name: "All Files", extensions: ["*"] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopApiServer();
});

bootstrap();
