import {path7za} from "7zip-bin";
import * as path from "path";
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
                : (process.platform === "darwin" ? path.join(process.env.HOME, "Library", "Preferences")
                    : path.join(process.env.HOME, ".SamboyLauncher/"));

        return EnvironmentManager._appData;
    }

    static get launcherDir() {
        if (!EnvironmentManager._launcher)
            EnvironmentManager._launcher = path.join(EnvironmentManager.appDataDir, "SamboyLauncher_JS");

        return EnvironmentManager._launcher;
    }

    static get packsDir() {
        if (!EnvironmentManager._packs)
            EnvironmentManager._packs = path.join(EnvironmentManager.launcherDir, "packs");

        return EnvironmentManager._packs;
    }

    static get versionsDir() {
        if (!EnvironmentManager._versions)
            EnvironmentManager._versions = path.join(EnvironmentManager.launcherDir, "versions");

        return EnvironmentManager._versions;
    }

    static get librariesDir() {
        if (!EnvironmentManager._libraries)
            EnvironmentManager._libraries = path.join(EnvironmentManager.launcherDir, "libraries");

        return EnvironmentManager._libraries;
    }

    static get assetsDir() {
        if (!EnvironmentManager._assets)
            EnvironmentManager._assets = path.join(EnvironmentManager.launcherDir, "assets");

        return EnvironmentManager._assets;
    }

    static get tempDir() {
        if (!EnvironmentManager._temp)
            EnvironmentManager._temp = path.join(EnvironmentManager.launcherDir, "temp");

        return EnvironmentManager._temp;
    }
}

Logger.infoImpl("Environment", "Setting up environment paths...");

Utils.mkdirpPromise(EnvironmentManager.packsDir);
Utils.mkdirpPromise(EnvironmentManager.librariesDir);
Utils.mkdirpPromise(EnvironmentManager.assetsDir);
Utils.mkdirpPromise(EnvironmentManager.versionsDir);
Utils.mkdirpPromise(EnvironmentManager.tempDir);

Logger.debugImpl("Environment", "7zip path is " + path7za);
