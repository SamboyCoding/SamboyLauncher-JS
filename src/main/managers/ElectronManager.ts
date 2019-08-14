import {app, BrowserWindow, ipcMain, IpcMainEvent, Menu, MenuItem} from "electron";
import * as isDev from "electron-is-dev";
import {join} from "path";
import Logger from "../logger";

export default class ElectronManager {
    public static win: BrowserWindow;

    public static SetupElectron() {
        return new Promise(ff => {
            Logger.infoImpl("ElectronManager", "Init");

            app.commandLine.appendSwitch("--enable-experimental-web-platform-features");

            app.on("ready", async () => {
                try {
                    await ElectronManager.onReady();
                    ElectronManager.createWindow().then(ff);
                } catch (e) {
                    Logger.errorImpl("ElectronManager", "Exception initializing! " + e);
                }
            });

            app.on("window-all-closed", () => {
                if (process.platform !== "darwin") {
                    app.quit();
                }
            });

            app.on("activate", async () => {
                if (ElectronManager.win === null) {
                    await ElectronManager.createWindow();
                }
            });

            ipcMain.on("maximize", (event: IpcMainEvent) => {
                if (ElectronManager.win.isMaximized())
                    ElectronManager.win.restore();
                else
                    ElectronManager.win.maximize();
            });

            ipcMain.on("minimize", (event: IpcMainEvent) => {
                ElectronManager.win.minimize();
            });
        });
    }

    private static async createWindow() {
        Logger.infoImpl("ElectronManager", "Initializing ElectronManager.win...");
        ElectronManager.win = new BrowserWindow({
            frame: false,
            height: 720,
            width: 1280,
            webPreferences: {
                nodeIntegration: true,
            },
            show: false,
        });

        const menu: Menu = new Menu();

        if (isDev) {
            menu.append(new MenuItem({
                accelerator: "CmdOrCtrl+R",
                click: () => {
                    ElectronManager.win.webContents.reload();
                },
                label: "Reload",
            }));
        }

        menu.append(new MenuItem({
            accelerator: "CmdOrCtrl+Shift+I",
            click: () => {
                ElectronManager.win.webContents.openDevTools();
            },
            label: "Open DevTools",
        }));

        ElectronManager.win.setMenu(menu);

        ElectronManager.win.once("ready-to-show", () => {
            Logger.infoImpl("ElectronManager", "Showing window...");
            ElectronManager.win.show();
        });

        ElectronManager.win.on("closed", () => {
            ElectronManager.win = null;
        });

        await ElectronManager.win.loadFile(join(__dirname, "../../../webContents/index.html"));

    }

    private static async onReady() {
        Logger.infoImpl("ElectronManager", "Ready.");
    }
}
