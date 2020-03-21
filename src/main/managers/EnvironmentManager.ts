require("hazardous"); //Fix 7z in built app.

import {path7za} from "7zip-bin";
import {existsSync} from "fs";
import {join} from "path";
import Logger from "../logger";
import Utils from "../util/Utils";

export default class EnvironmentManager {
    private static _appData: string;
    private static _launcher: string;
    private static _packs: string;
    private static _versions: string;
    private static _libraries: string;
    private static _assets: string;
    private static _temp: string;

    static get appDataDir() {
        if (!EnvironmentManager._appData)
            EnvironmentManager._appData = process.platform === "win32" ? process.env.APPDATA
                : (process.platform === "darwin" ? join(process.env.HOME, "Library", "Preferences")
                    : join(process.env.HOME, ".SamboyLauncher/"));

        return EnvironmentManager._appData;
    }

    static get launcherDir() {
        if (!EnvironmentManager._launcher)
            EnvironmentManager._launcher = join(EnvironmentManager.appDataDir, "SamboyLauncher_JS");

        return EnvironmentManager._launcher;
    }

    static get packsDir() {
        if (!EnvironmentManager._packs)
            EnvironmentManager._packs = join(EnvironmentManager.launcherDir, "packs");

        return EnvironmentManager._packs;
    }

    static get versionsDir() {
        if (!EnvironmentManager._versions)
            EnvironmentManager._versions = join(EnvironmentManager.launcherDir, "versions");

        return EnvironmentManager._versions;
    }

    static get librariesDir() {
        if (!EnvironmentManager._libraries)
            EnvironmentManager._libraries = join(EnvironmentManager.launcherDir, "libraries");

        return EnvironmentManager._libraries;
    }

    static get assetsDir() {
        if (!EnvironmentManager._assets)
            EnvironmentManager._assets = join(EnvironmentManager.launcherDir, "assets");

        return EnvironmentManager._assets;
    }

    static get tempDir() {
        if (!EnvironmentManager._temp)
            EnvironmentManager._temp = join(EnvironmentManager.launcherDir, "temp");

        return EnvironmentManager._temp;
    }

    public static async Init() {
        if(!existsSync(EnvironmentManager.launcherDir)) {
            console.log("[Pre-Log] Creating launcher dir - first run?");
            await Utils.mkdirpPromise(EnvironmentManager.launcherDir); //Needed for logger
            console.log("[Pre-Log] Launcher dir should be initialized now. Switching to main logger.")
        }

        Logger.infoImpl("Environment", "Setting up environment paths...");

        await Utils.mkdirpPromise(EnvironmentManager.packsDir);
        await Utils.mkdirpPromise(EnvironmentManager.librariesDir);
        await Utils.mkdirpPromise(EnvironmentManager.assetsDir);
        await Utils.mkdirpPromise(EnvironmentManager.versionsDir);
        await Utils.mkdirpPromise(EnvironmentManager.tempDir);

        Logger.debugImpl("Environment", "7zip path is " + path7za);
    }
}
