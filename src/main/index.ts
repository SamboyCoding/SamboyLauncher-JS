//#region Imports
import {ipcMain, IpcMessageEvent} from "electron";
import * as isDev from "electron-is-dev";
import {autoUpdater} from "electron-updater";
import fetch from "node-fetch";
import AuthData from "./AuthData";
import Config from "./config";
import ElectronManager from "./ElectronManager";
import {Logger} from "./logger";
import MainIPCHandler from "./MainIPCHandler";
import MCVersion from "./objects/MCVersion";
//#endregion

Config.load();
ElectronManager.init();
AuthData.load();
MCVersion.Get(); //Preload these.
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
                clientToken: AuthData.clientToken ? AuthData.clientToken : undefined,
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

                    AuthData.accessToken = at;
                    AuthData.clientToken = ct;
                    AuthData.uuid = uid;
                    AuthData.username = un;
                    AuthData.email = email;
                    if (remember) {
                        AuthData.password = password;
                    } else {
                        AuthData.password = "";
                    }

                    AuthData.save();

                    ff();
                }
            } catch (e) {
                rj(e);
            }
        });
    });
}

ipcMain.on("get profile", (event: IpcMessageEvent) => {
    if (AuthData.accessToken && AuthData.username && AuthData.uuid) {
        event.sender.send("profile", AuthData.username, AuthData.uuid);
    } else {
        event.sender.send("no profile");
    }
});

ipcMain.on("login", async (event: IpcMessageEvent, email: string, password: string, remember: boolean) => {
    try {
        await login(email, password, remember);

        event.sender.send("profile", AuthData.username, AuthData.uuid);
    } catch (e) {
        event.sender.send("login error", e);
    }
});

ipcMain.on("logout", (event: IpcMessageEvent) => {
    AuthData.accessToken = undefined;
    AuthData.password = undefined;
    AuthData.username = undefined;
    AuthData.uuid = undefined;

    AuthData.save();

    event.sender.send("logged out");
});

ipcMain.on("validate session", (event: IpcMessageEvent) => {
    if (!AuthData.accessToken) {
        return;
    }

    fetch("https://authserver.mojang.com/validate", {
        body: JSON.stringify({
            accessToken: AuthData.accessToken,
            clientToken: AuthData.clientToken,
        }),
        headers: {
            "Content-Type": "application/json",
        },
        method: "POST",
    }).then(async (resp) => {
        if (resp.status === 204) {
            return;
        } // Session valid

        if (AuthData.email && AuthData.password) {
            try {
                await login(AuthData.email, AuthData.password, true); // Already set to remember, so remember again
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
autoUpdater.logger = Logger;

autoUpdater.on("update-downloaded", () => {
    ElectronManager.win.webContents.send("update downloaded");
});

ipcMain.on("check updates", (event: IpcMessageEvent) => {
    Logger.info("Checking for updates...");
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify().then((update) => {
            if (update) {
                Logger.info("Update found! " + JSON.stringify(update.updateInfo));
                event.sender.send("update available", update.updateInfo.version);
            } else {
                Logger.info("No update found.");
                event.sender.send("no update");
            }
        }).catch((e) => {
            Logger.warn("Error checking for updates: " + e);
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
