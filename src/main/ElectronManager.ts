import {app, BrowserWindow, Menu, MenuItem} from "electron";
import * as isDev from "electron-is-dev";
import * as fs from "fs";
import * as jsonfile from "jsonfile";
import * as path from "path";
import Config from "./config";
import Env from "./Env";
import {Logger} from "./logger";
import Utils from "./util/Utils";

export default class ElectronManager {
    public static win: BrowserWindow;

    public static init() {
        Logger.infoImpl("ElectronManager", "Init");

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
    }

    private static createWindow(): void {
        Logger.infoImpl("ElectronManager", "Initializing ElectronManager.win...");
        ElectronManager.win = new BrowserWindow({
            frame: false,
            height: 720,
            width: 1280,
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

        ElectronManager.win.loadFile("src/renderer/html/index.html");

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
