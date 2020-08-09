require("hazardous"); //Fix 7z in built app.

import {path7za} from "7zip-bin";
import {spawnSync} from "child_process";
import {existsSync, promises as fsPromises} from "fs";
import {dirname, join} from "path";
import Logger from "../logger";
import DetectedJavaInstallation from "../model/DetectedJavaInstallation";
import Utils from "../util/Utils";

const {readdir} = fsPromises;

export default class EnvironmentManager {
    private static _appData: string;
    private static _launcher: string;
    private static _packs: string;
    private static _versions: string;
    private static _libraries: string;
    private static _assets: string;
    private static _temp: string;
    private static _ourJre: string;

    private static _knownJavaRuntimes: DetectedJavaInstallation[] = [];

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

    static get ourJreDir() {
        if (!EnvironmentManager._ourJre)
            EnvironmentManager._ourJre = join(EnvironmentManager.launcherDir, "jre");

        return EnvironmentManager._ourJre;
    }

    static get javaRuntimes() {
        return EnvironmentManager._knownJavaRuntimes;
    }

    public static async Init() {
        if (!existsSync(EnvironmentManager.launcherDir)) {
            console.log("[Pre-Log] Creating launcher dir - first run?");
            await Utils.mkdirpPromise(EnvironmentManager.launcherDir); //Needed for logger
            console.log("[Pre-Log] Launcher dir should be initialized now. Switching to main logger.");
        }

        Logger.infoImpl("Environment", "Setting up environment paths...");

        await Utils.mkdirpPromise(EnvironmentManager.packsDir);
        await Utils.mkdirpPromise(EnvironmentManager.librariesDir);
        await Utils.mkdirpPromise(EnvironmentManager.assetsDir);
        await Utils.mkdirpPromise(EnvironmentManager.versionsDir);
        await Utils.mkdirpPromise(EnvironmentManager.tempDir);

        Logger.debugImpl("Environment", "7zip path is " + path7za);
        Logger.infoImpl("Environment", "Detecting java installations...");

        let detected = ["java"];

        if (process.platform === "win32") {
            //Check program files\java and program files\adoptopenjdk
            let subDirs = [];
            try {
                const root = join(process.env.ProgramFiles, "Java");
                subDirs = (await readdir(root)).map(d => join(root, d));
            } catch (e) {
            }
            try {
                const root = join(process.env.ProgramFiles, "AdoptOpenJDK");
                subDirs = subDirs.concat((await readdir(root)).map(d => join(root, d)));
            } catch (e) {
            }
            try {
                const root = join(process.env["ProgramFiles(x86)"], "Java");
                subDirs = subDirs.concat((await readdir(root)).map(d => join(root, d)));
            } catch (e) {
            }

            for (let subDir of subDirs) {
                if (await Utils.existsAsync(join(subDir, "bin", "java.exe"))) {
                    detected.unshift(join(subDir, "bin", "java.exe"));
                }
            }
        }

        if (process.platform === "linux") {
            //Test /usr/lib/jvm - this is where ubuntu and debian put it
            let subDirs = [];
            try {
                const root = "/usr/lib/jvm";
                subDirs = subDirs.concat((await readdir(root)).map(d => join(root, d)));
            } catch (e) {
            }

            for (let subDir of subDirs) {
                if (await Utils.existsAsync(join(subDir, "bin", "java"))) {
                    detected.unshift(join(subDir, "bin", "java"));
                }
            }
        }

        for (let candidate of detected) {
            try {
                Logger.debugImpl("Environment", `Testing ${candidate}...`);
                const process = spawnSync(candidate, ["-version"], {
                    stdio: "pipe",
                    windowsHide: true
                });
                const output = process.stderr.toString("utf8");

                //Sample outputs:
                // openjdk version "14.0.2" 2020-07-14
                // OpenJDK Runtime Environment AdoptOpenJDK (build 14.0.2+12)
                // OpenJDK 64-Bit Server VM AdoptOpenJDK (build 14.0.2+12, mixed mode, sharing)
                //===
                // java version "1.8.0_261"
                // Java(TM) SE Runtime Environment (build 1.8.0_261-b12)
                // Java HotSpot(TM) 64-Bit Server VM (build 25.261-b12, mixed mode)
                //===

                //First line, split on spaces, first param is vendor (java = oracle), third is version.
                //Third line, look for 64-Bit.

                let lines = output.trim().split("\n").map(s => s.trim());
                if (lines.length !== 3) continue;

                let firstSplit = lines[0].replace("\"", "").split(" ");
                if (firstSplit.length < 3) continue;

                let x64 = lines[2].indexOf("64-Bit") >= 0;

                let versionSplit = firstSplit[2].split(".").map(Number);
                let langVer = versionSplit[0] === 1 ? versionSplit[1] : versionSplit[0];

                let javaHome = dirname(dirname(candidate));
                if (javaHome === ".") javaHome = null;
                Logger.debugImpl("Environment", `Detected java installation. 64-bit: ${x64}. Language version ${langVer}. Provider is ${firstSplit[0]}. Java home: ${javaHome}`);

                this._knownJavaRuntimes.push({
                    arch: x64 ? "x64" : "x86",
                    javaHome,
                    languageVersion: langVer,
                    provider: firstSplit[0],
                });
            } catch (e) {
                //Ignore.
            }
        }
    }
}
