//#region Imports
import {ipcMain, IpcMessageEvent} from "electron";
import * as isDev from "electron-is-dev";
import {autoUpdater} from "electron-updater";
import fetch from "node-fetch";
import Logger from "./logger";
import AuthenticationManager from "./managers/AuthenticationManager";
import ConfigurationManager from "./managers/configurationManager";
import ElectronManager from "./managers/ElectronManager";
import EnvironmentManager from "./managers/EnvironmentManager";
import InstalledPackManager from "./managers/InstalledPackManager";
import MainIPCHandler from "./managers/MainIPCHandler";
import MCVersion from "./model/MCVersion";
//#endregion

EnvironmentManager.Init();
ConfigurationManager.LoadFromDisk();
AuthenticationManager.LoadFromDisk();
MCVersion.Get(); //Preload these.
InstalledPackManager.LoadFromDisk();
ElectronManager.SetupElectron();
MainIPCHandler.Init();

// ---------------------
//#region Authentication

async function login(email: string, password: string, remember: boolean) {
    return new Promise((ff, rj) => {
        fetch("https://authserver.mojang.com/authenticate", {
            body: JSON.stringify({
                agent: {
                    name: "Minecraft",
                    version: 1,
                },
                clientToken: AuthenticationManager.clientToken ? AuthenticationManager.clientToken : undefined,
                password,
                requestUser: true,
                username: email,
            }),
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST",
        }).then((resp) => {
            return resp.json();
        }).then((json) => {
            try {
                if (json.error) {
                    rj(json.errorMessage);
                } else {
                    const at: string = json.accessToken;
                    const ct: string = json.clientToken;
                    const uid: string = json.selectedProfile.id;
                    const un: string = json.selectedProfile.name;

                    AuthenticationManager.accessToken = at;
                    AuthenticationManager.clientToken = ct;
                    AuthenticationManager.uuid = uid;
                    AuthenticationManager.username = un;
                    AuthenticationManager.email = email;
                    if (remember) {
                        AuthenticationManager.password = password;
                    } else {
                        AuthenticationManager.password = "";
                    }

                    AuthenticationManager.save();

                    ff();
                }
            } catch (e) {
                rj(e);
            }
        });
    });
}

ipcMain.on("get profile", (event: IpcMessageEvent) => {
    if (AuthenticationManager.accessToken && AuthenticationManager.username && AuthenticationManager.uuid) {
        event.sender.send("profile", AuthenticationManager.username, AuthenticationManager.uuid);
    } else {
        event.sender.send("no profile");
    }
});

ipcMain.on("login", async (event: IpcMessageEvent, email: string, password: string, remember: boolean) => {
    try {
        await login(email, password, remember);

        event.sender.send("profile", AuthenticationManager.username, AuthenticationManager.uuid);
    } catch (e) {
        event.sender.send("login error", e);
    }
});

ipcMain.on("logout", (event: IpcMessageEvent) => {
    AuthenticationManager.accessToken = undefined;
    AuthenticationManager.password = undefined;
    AuthenticationManager.username = undefined;
    AuthenticationManager.uuid = undefined;

    AuthenticationManager.save();

    event.sender.send("logged out");
});

ipcMain.on("validate session", (event: IpcMessageEvent) => {
    if (!AuthenticationManager.accessToken) {
        return;
    }

    fetch("https://authserver.mojang.com/validate", {
        body: JSON.stringify({
            accessToken: AuthenticationManager.accessToken,
            clientToken: AuthenticationManager.clientToken,
        }),
        headers: {
            "Content-Type": "application/json",
        },
        method: "POST",
    }).then(async (resp) => {
        if (resp.status === 204) {
            return;
        } // Session valid

        if (AuthenticationManager.email && AuthenticationManager.password) {
            try {
                await login(AuthenticationManager.email, AuthenticationManager.password, true); // Already set to remember, so remember again
            } catch (e) {
                event.sender.send("session invalid");
            }
        } else {
            event.sender.send("session invalid");
        }
    });
});

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
    Logger.errorImpl("Process", "Uncaught Exception: " + error);
});

//#endregion
// -----------------------
