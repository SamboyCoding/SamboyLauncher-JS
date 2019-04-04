import {app, BrowserWindow, Menu, MenuItem, ipcMain} from "electron";
import * as isDev from "electron-is-dev";
import {join} from "path";
import Config from "./config";
import {Logger} from "./logger";
import {format as formatUrl} from "url";
import IpcMessageEvent = Electron.IpcMessageEvent;

const isDevelopment = process.env.NODE_ENV !== 'production';

Logger.infoImpl("ElectronManager", "Env is " + process.env.NODE_ENV);

export default class ElectronManager {
    public static win: BrowserWindow;

    public static init() {
        Logger.infoImpl("ElectronManager", "Init");

        app.commandLine.appendSwitch("--enable-experimental-web-platform-features");

        app.on("ready", async () => {
            await ElectronManager.onReady();
            ElectronManager.createWindow();
        });

        app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                app.quit();
            }
        });

        app.on("activate", () => {
            if (ElectronManager.win === null) {
                ElectronManager.createWindow();
            }
        });

        ipcMain.on("maximize", (event: IpcMessageEvent) => {
            if(ElectronManager.win.isMaximized())
                ElectronManager.win.restore();
            else
                ElectronManager.win.maximize();
        });

        ipcMain.on("minimize", (event: IpcMessageEvent) => {
            ElectronManager.win.minimize();
        })
    }

    private static createWindow(): void {
        Logger.infoImpl("ElectronManager", "Initializing ElectronManager.win...");
        ElectronManager.win = new BrowserWindow({
            frame: false,
            height: 720,
            width: 1280,
            webPreferences: {
                nodeIntegration: true,
            }
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

        if (isDevelopment)
            ElectronManager.win.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
        else
            ElectronManager.win.loadFile(formatUrl({
                pathname: join(__dirname, "index.html"),
                protocol: 'file',
                slashes: true,
            }));

        ElectronManager.win.webContents.on("did-finish-load", () => {
            ElectronManager.win.webContents.send("dark theme", Config.darkTheme);
        });

        ElectronManager.win.on("closed", () => {
            ElectronManager.win = null;
        });
    }

    private static async onReady() {
        Logger.infoImpl("ElectronManager", "Ready.");
    }
}
