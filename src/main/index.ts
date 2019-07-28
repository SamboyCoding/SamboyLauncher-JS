//#region Imports
import {spawnSync} from "child_process";
import {ipcMain, IpcMessageEvent} from "electron";
import * as isDev from "electron-is-dev";
import {autoUpdater} from "electron-updater";
import {existsSync} from "fs";
import * as os from "os";
import {join} from "path";
import * as rimraf from "rimraf";
import Logger from "./logger";
import AuthenticationManager from "./managers/AuthenticationManager";
import ConfigurationManager from "./managers/ConfigurationManager";
import ElectronManager from "./managers/ElectronManager";
import EnvironmentManager from "./managers/EnvironmentManager";
import InstalledPackManager from "./managers/InstalledPackManager";
import MainIPCHandler from "./managers/MainIPCHandler";
import MCVersion from "./model/MCVersion";
//#endregion

EnvironmentManager.Init();

//BUGFIX: Cleanup old launcher dir
if (existsSync(join(EnvironmentManager.launcherDir, "config.json"))) {
    //Invalidate
    Logger.stream.close();
    Logger.stream = undefined;

    //Windows is DUMB
    if (os.platform() === "win32")
        spawnSync("cmd", ["/c", `rmdir /s /q ${EnvironmentManager.launcherDir}`]);
    else
        rimraf.sync(EnvironmentManager.launcherDir);
    EnvironmentManager.Init(); //Re-make dirs

    Logger.errorImpl("Init", "Removed old incompat launcher dir!");
}

ConfigurationManager.LoadFromDisk();
AuthenticationManager.LoadFromDisk();
MCVersion.Get(); //Preload these.
InstalledPackManager.LoadFromDisk();
ElectronManager.SetupElectron();
MainIPCHandler.Init();

// ---------------------
//#region Authentication

// ipcMain.on("validate session", (event: IpcMessageEvent) => {
//     if (!AuthenticationManager.accessToken) {
//         return;
//     }
//
//     fetch("https://authserver.mojang.com/validate", {
//         body: JSON.stringify({
//             accessToken: AuthenticationManager.accessToken,
//             clientToken: AuthenticationManager.clientToken,
//         }),
//         headers: {
//             "Content-Type": "application/json",
//         },
//         method: "POST",
//     }).then(async (resp) => {
//         if (resp.status === 204) {
//             return;
//         } // Session valid
//
//         if (AuthenticationManager.email && AuthenticationManager.password) {
//             try {
//                 await login(AuthenticationManager.email, AuthenticationManager.password, true); // Already set to remember, so remember again
//             } catch (e) {
//                 event.sender.send("session invalid");
//             }
//         } else {
//             event.sender.send("session invalid");
//         }
//     });
// });

//#endregion
// ---------------------

// -----------------------
//#region Launcher Updates

autoUpdater.autoDownload = true;

//this is complaining cause the methods are private so I don't accidentally call them.
// @ts-ignore
autoUpdater.logger = Logger;

autoUpdater.on("update-downloaded", () => {
    ElectronManager.win.webContents.send("update downloaded");
});

ipcMain.on("check updates", (event: IpcMessageEvent) => {
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

ipcMain.on("install update", (event: IpcMessageEvent) => {
    autoUpdater.quitAndInstall();
});

process.on("uncaughtException", error => {
    Logger.errorImpl("Process", "Uncaught Exception: " + error.stack);
});

if (!isDev)
    autoUpdater.checkForUpdatesAndNotify();
else
    Logger.warnImpl("Updater", "Not checking for updates in dev");

//#endregion
// -----------------------
