import * as fs from "fs";
import * as path from "path";
import {Logger} from "./logger";
import Utils from "./util/Utils";

export default class Env {
    public static appDatadir: string;

    public static launcherDir: string;

    public static packsDir: string;

}

Logger.infoImpl("Environment", "Setting up environment paths...");

Env.appDatadir = process.platform === "win32" ? process.env.APPDATA
    : (process.platform === "darwin" ? path.join(process.env.HOME, "Library", "Preferences")
        : path.join(process.env.HOME, ".SamboyLauncher/"));

Env.launcherDir = path.join(Env.appDatadir, "SamboyLauncher_JS");

Env.packsDir = path.join(Env.launcherDir, "packs");

if (!fs.existsSync(Env.launcherDir)) {
    Utils.mkdirpPromise(Env.launcherDir);
}

if (!fs.existsSync(Env.packsDir)) {
    Utils.mkdirpPromise(Env.packsDir);
}
