"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const isDev = require("electron-is-dev");
const config_1 = require("./config");
const logger_1 = require("./logger");
class ElectronManager {
    static init() {
        logger_1.Logger.infoImpl("ElectronManager", "Init");
        electron_1.app.on("ready", async () => {
            await ElectronManager.onReady();
            ElectronManager.createWindow();
        });
        electron_1.app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                electron_1.app.quit();
            }
        });
        electron_1.app.on("activate", () => {
            if (ElectronManager.win === null) {
                ElectronManager.createWindow();
            }
        });
    }
    static createWindow() {
        logger_1.Logger.infoImpl("ElectronManager", "Initializing ElectronManager.win...");
        ElectronManager.win = new electron_1.BrowserWindow({
            frame: false,
            height: 720,
            width: 1280,
        });
        const menu = new electron_1.Menu();
        if (isDev) {
            menu.append(new electron_1.MenuItem({
                accelerator: "CmdOrCtrl+R",
                click: () => {
                    ElectronManager.win.webContents.reload();
                },
                label: "Reload",
            }));
        }
        menu.append(new electron_1.MenuItem({
            accelerator: "CmdOrCtrl+Shift+I",
            click: () => {
                ElectronManager.win.webContents.openDevTools();
            },
            label: "Open DevTools",
        }));
        ElectronManager.win.setMenu(menu);
        ElectronManager.win.loadFile("src/renderer/html/index.html");
        ElectronManager.win.webContents.on("did-finish-load", () => {
            ElectronManager.win.webContents.send("dark theme", config_1.default.darkTheme);
        });
        ElectronManager.win.on("closed", () => {
            ElectronManager.win = null;
        });
    }
    static async onReady() {
        logger_1.Logger.infoImpl("ElectronManager", "Ready.");
    }
}
exports.default = ElectronManager;
//# sourceMappingURL=ElectronManager.js.map