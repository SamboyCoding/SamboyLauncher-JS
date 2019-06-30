import {path7za} from "7zip-bin";
import * as path from "path";
import {Logger} from "./logger";
import Utils from "./util/Utils";

export default class Env {
    private static _appData: string;
    private static _launcher: string;
    private static _packs: string;
    private static _versions: string;
    private static _libraries: string;
    private static _assets: string;
    private static _temp: string;

    static get appDataDir() {
        if (!Env._appData)
            Env._appData = process.platform === "win32" ? process.env.APPDATA
                : (process.platform === "darwin" ? path.join(process.env.HOME, "Library", "Preferences")
                    : path.join(process.env.HOME, ".SamboyLauncher/"));

        return Env._appData;
    }

    static get launcherDir() {
        if (!Env._launcher)
            Env._launcher = path.join(Env.appDataDir, "SamboyLauncher_JS");

        return Env._launcher;
    }

    static get packsDir() {
        if (!Env._packs)
            Env._packs = path.join(Env.launcherDir, "packs");

        return Env._packs;
    }

    static get versionsDir() {
        if (!Env._versions)
            Env._versions = path.join(Env.launcherDir, "versions");

        return Env._versions;
    }

    static get librariesDir() {
        if (!Env._libraries)
            Env._libraries = path.join(Env.launcherDir, "libraries");

        return Env._libraries;
    }

    static get assetsDir() {
        if (!Env._assets)
            Env._assets = path.join(Env.launcherDir, "assets");

        return Env._assets;
    }

    static get tempDir() {
        if (!Env._temp)
            Env._temp = path.join(Env.launcherDir, "temp");

        return Env._temp;
    }
}

Logger.infoImpl("Environment", "Setting up environment paths...");

Utils.mkdirpPromise(Env.packsDir);
Utils.mkdirpPromise(Env.librariesDir);
Utils.mkdirpPromise(Env.assetsDir);
Utils.mkdirpPromise(Env.versionsDir);
Utils.mkdirpPromise(Env.tempDir);

Logger.debugImpl("Environment", "7zip path is " + path7za);
