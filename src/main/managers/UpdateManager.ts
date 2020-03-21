import {ipcMain} from "electron";
import * as isDev from "electron-is-dev";
import {autoUpdater} from "electron-updater";
import Logger from "../logger";
import ElectronManager from "./ElectronManager";
import {IpcMainEvent} from "electron";

export default class UpdateManager {
    public static Init() {
        autoUpdater.autoDownload = true;

//this is complaining cause the methods are private so I don't accidentally call them.
// @ts-ignore
        autoUpdater.logger = Logger;

        autoUpdater.on("update-downloaded", () => {
            ElectronManager.win.webContents.send("update downloaded");
        });

        ipcMain.on("check updates", (event: IpcMainEvent) => {
            Logger.infoImpl("Updater", "Checking for updates...");
            if (!isDev) {
                autoUpdater.checkForUpdatesAndNotify().then((update) => {
                    if (update) {
                        Logger.infoImpl("Updater", "Update found! " + JSON.stringify(update.updateInfo));
                        event.sender.send("update available", update.updateInfo.version);
                    } else {
                        Logger.infoImpl("Updater", "No update found.");
                        event.sender.send("no update");
                    }
                }).catch((e) => {
                    Logger.warnImpl("Updater", "Error checking for updates: " + e);
                    event.sender.send("update error");
                });
            } else {
                event.sender.send("update devmode");
            }
        });

        ipcMain.on("install update", (event: IpcMainEvent) => {
            autoUpdater.quitAndInstall();
        });

        process.on("uncaughtException", error => {
            Logger.errorImpl("Process", "Uncaught Exception: " + error.stack);
        });

        if (!isDev)
            autoUpdater.checkForUpdatesAndNotify();
        else
            Logger.warnImpl("Updater", "Not checking for updates in dev");
    }
}
