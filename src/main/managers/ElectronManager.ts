import {app, BrowserWindow, ipcMain, IpcMainEvent, Menu, MenuItem} from "electron";
import * as isDev from "electron-is-dev";
import {join} from "path";
import Logger from "../logger";
import MCVersion from "../model/MCVersion";
import installExtension, {VUEJS_DEVTOOLS} from "electron-devtools-installer";

export default class ElectronManager {
    public static win: BrowserWindow;

    public static SendIPCToMain(channel: string, ...args: any[]) {
        this.win.webContents.send(channel, ...args);
    }

    public static async SetupElectron() {
        Logger.infoImpl("ElectronManager", "Init");

        app.allowRendererProcessReuse = true;
        app.commandLine.appendSwitch("--enable-experimental-web-platform-features");

        if(isDev) {
            try {
                await installExtension(VUEJS_DEVTOOLS);
                Logger.infoImpl("ElectronManager", "Installed VueJS devtools");
            } catch(e) {
                Logger.errorImpl("ElectronManager", "Failed to install VueJS devtools: " + e);
            }
        }

        await app.whenReady();

        app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                Logger.infoImpl("ElectronManager", "All windows have been closed. Shutting down...");
                app.quit();
                Logger.infoImpl("ElectronManager", "Application quit complete. Terminating thread.");
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

        await ElectronManager.onReady();

        await ElectronManager.createWindow();
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

        ElectronManager.win.on("closed", () => {
            ElectronManager.win = null;
        });

        ElectronManager.win.show();
        ipcMain.on("renderer ready", this.sendInitialIPCData);

        Logger.debugImpl("ElectronManager", "Loading renderer html...");
        await ElectronManager.win.loadFile(join(__dirname, "../../../webContents/index.html"));
    }

    private static sendInitialIPCData() {
        Logger.debugImpl("ElectronManager", "Renderer HTML Loaded, sending initial ipc messages...");

        // ElectronManager.win.webContents.send("pack list", InstalledPackManager.InstalledPacks);

        let versions = MCVersion.GetVersionDataForRenderer();
        ElectronManager.win.webContents.send("mc versions", versions);
    }

    private static async onReady() {
        Logger.infoImpl("ElectronManager", "Ready.");
    }
}
