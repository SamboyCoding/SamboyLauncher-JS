import {spawn} from "child_process";
import {copyFileSync, existsSync, readdirSync} from "fs";
import {basename, dirname, join} from "path";
import rimraf from "rimraf";
import ElectronManager from "./ElectronManager";
import Env from "./Env";
import {Logger} from "./logger";
import ForgeVersion from "./objects/ForgeVersion";
import MCVersion from "./objects/MCVersion";
import Utils from "./util/Utils";

export default class ClientInstaller {
    public static async installClient(packName: string, gameVersionId: string, forgeVersionId: string) {
        return new Promise((ff, rj) => {
            MCVersion.Get(gameVersionId)
                .then(minecraftVersion => {
                    if (!minecraftVersion)
                        throw new Error("Couldn't find mc version");

                    if (existsSync(join(Env.versionsDir, minecraftVersion.name, minecraftVersion.name + ".jar")))
                        throw new Error("ntd"); //Nothing to do

                    return minecraftVersion;
                })
                .then(minecraftVersion => this.downloadVanillaLibs(packName, minecraftVersion))
                .then(minecraftVersion => this.downloadVanillaClient(packName, minecraftVersion))
                .then(minecraftVersion => this.downloadVanillaNatives(packName, minecraftVersion))
                .then(minecraftVersion => this.downloadAssets(packName, minecraftVersion))
                .catch((e: Error) => {
                    if (e.message === "ntd")
                        return; //Nothing to do

                    return e; //Propagate down
                })
                .then((e) => {
                    if (e)
                        throw e; //Rethrow so we don't attempt forge.

                    if (existsSync(join(Env.versionsDir, forgeVersionId, forgeVersionId + ".json")))
                        throw new Error("ntd"); //Nothing to do
                })
                .then(() => ForgeVersion.Get(forgeVersionId)) //Do this after the check as it involves downloading forge's installer, which is intensive.
                .then(forge => {
                    if (!forge)
                        throw new Error("Couldn't find forge version");

                    return forge;
                })
                .then(forge => this.downloadForgeLibs(packName, forge))
                .then(forge => {
                    if (forge.needsPatch)
                        return this.runForgePostProcessors(packName, forge);
                    return Promise.resolve();
                })
                .then(() => {
                    Logger.infoImpl("IPCMain", "Finishing up by copying the forge version json...");

                    //Copy install json to forge
                    let dir = join(Env.versionsDir, forgeVersionId);
                    return Utils.mkdirpPromise(dir);
                })
                .then(() => {
                    let dir = join(Env.versionsDir, forgeVersionId);
                    Logger.debugImpl("IPCMain", `Copy file: ${join(Env.tempDir, "version.json")} => ${join(dir, forgeVersionId + ".json")}`);
                    copyFileSync(join(Env.tempDir, "version.json"), join(dir, forgeVersionId + ".json"));
                    return true;
                })
                .catch((e: Error) => {
                    if (e.message === "ntd")
                        return true;

                    this.cleanupTemp();

                    rj(e);
                    return false;
                })
                .then((success) => {
                    if (success) {
                        this.cleanupTemp();
                        ff();
                    }
                });
        });
    }

    private static cleanupTemp() {
        //Cleanup temp dir in the background
        let content = readdirSync(Env.tempDir);
        for (let file of content) {
            rimraf.sync(join(Env.tempDir, file));
        }
    }

    private static async downloadVanillaLibs(packName: string, minecraftVersion: MCVersion) {
        let pct = 0;
        let totalSize = 0;
        minecraftVersion.libraries.forEach(lib => totalSize += lib.size);

        let promises = minecraftVersion.libraries.map(async lib => {
            const dest = join(Env.librariesDir, lib.path);
            await Utils.mkdirpPromise(dirname(dest));
            await Utils.downloadWithSigCheck(lib.url, dest, lib.sha1);
            pct += 0.3 * lib.size / totalSize;

            ElectronManager.win.webContents.send("install progress", packName, pct * 0.66);
        });

        await Promise.all(promises);

        return minecraftVersion;
    }

    private static async downloadVanillaClient(packName: string, minecraftVersion: MCVersion) {
        const versionFolder = join(Env.versionsDir, minecraftVersion.name);

        let dest = join(versionFolder, minecraftVersion.name + ".jar");
        await Utils.mkdirpPromise(dirname(dest));
        await Utils.downloadWithSigCheck(minecraftVersion.clientJar.url, dest, minecraftVersion.clientJar.sha1);

        ElectronManager.win.webContents.send("install progress", packName, 0.4 * 0.66);

        return minecraftVersion;
    }

    private static async downloadVanillaNatives(packName: string, minecraftVersion: MCVersion) {
        const versionFolder = join(Env.versionsDir, minecraftVersion.name);
        const nativesDir = join(versionFolder, "natives");

        let totalSize = 0;
        minecraftVersion.natives.forEach(nat => totalSize += nat.size);

        await Utils.mkdirpPromise(nativesDir);

        let pct = 0.4;

        let promises = minecraftVersion.natives.map(async nat => {
            const zipPath = join(Env.librariesDir, nat.path);
            await Utils.downloadWithSigCheck(nat.url, zipPath, nat.sha1);
            await Utils.extractArchive(zipPath, nativesDir);

            if (existsSync(join(nativesDir, "META-INF")))
                rimraf.sync(join(nativesDir, "META-INF"));

            pct += 0.1 * nat.size / totalSize;
            ElectronManager.win.webContents.send("install progress", packName, pct * 0.66);
        });

        await Promise.all(promises);

        return minecraftVersion;
    }

    private static async downloadAssets(packName: string, minecraftVersion: MCVersion) {
        let totalSize = 0;
        let pct = 0.5;
        minecraftVersion.assets.forEach(asset => totalSize += asset.size);

        const objectsDir = join(Env.assetsDir, "objects");
        await Utils.mkdirpPromise(objectsDir);

        let promises = Array.from(minecraftVersion.assets.values()).sort().map(async asset => {
            const path = `${asset.hash.substr(0, 2)}/${asset.hash}`;
            const dest = join(objectsDir, path);
            await Utils.mkdirpPromise(dirname(dest));

            await Utils.downloadWithSigCheck(`https://resources.download.minecraft.net/${path}`, dest, asset.hash);

            pct += 0.5 * asset.size / totalSize;
            ElectronManager.win.webContents.send("install progress", packName, pct * 0.66);
        });

        try {
            await Promise.all(promises);
        } catch (e) {
            Logger.errorImpl("IPCMain", e.message + "\n" + e.stack);
            ElectronManager.win.webContents.send("install error", packName, e.message);
            return;
        }

        Logger.debugImpl("IPCMain", "Finished getting assets");
    }

    private static async downloadForgeLibs(packName: string, forge: ForgeVersion) {
        //Get forge libraries

        let pct = 0.66;
        let libs = forge.getRequiredLibraries();
        let totalSize = 0;
        libs.forEach(lib => totalSize += lib.size); //If we're an old version these all have a size of 1, but that's fine.

        let promises = libs.map(async lib => {
            const dest = join(Env.librariesDir, lib.path);
            await Utils.mkdirpPromise(dirname(dest));
            if (lib.size !== 1) {
                //New (1.13+) lib
                if (lib.url)
                //Url, just download from there.
                    await Utils.downloadWithSigCheck(lib.url, dest, lib.sha1);
                else {
                    //No url, try to get from inside installer
                    if (!await Utils.tryExtractFileFromArchive(forge.installerJarPath, dirname(dest), "maven/" + lib.path))
                        throw new Error(`${basename(lib.path)} does not specify a url and couldn't be found in the installer's builtin maven`);

                    Logger.debugImpl("IPCMain", `Extracted ${basename(lib.path)} from installer's builtin maven.`);
                }
            } else if (!existsSync(dest)) {
                //Old lib, and doesn't exist.
                try {
                    await Utils.downloadFile(lib.url, dest); //Old version, no sha1 to check
                    Logger.debugImpl("IPCMain", `Downloaded forge lib: ${dest}`);
                } catch (e) {
                    Logger.warnImpl("IPCMain", `Failed to get forge library: ${lib.url}. Trying packed...`);
                    await Utils.handlePackedForgeLibrary(lib.url, dest);
                }
            } else {
                Logger.debugImpl("IPCMain", `${dest} already exists, but no checksum. Have to assume it's good.`);
            }

            pct += (forge.needsPatch ? 0.14 : 0.34) * lib.size / totalSize; //Brings us up to ~80% if we need to patch or 100% if we don't

            ElectronManager.win.webContents.send("install progress", packName, pct);
        });

        await Promise.all(promises);

        return forge;
    }

    private static async runForgePostProcessors(packName: string, forge: ForgeVersion): Promise<void> {
        return new Promise((ff, rj) => {
            forge.getPatchCommands()
                .then(commands => this.doPostProcessRecursive(packName, 0.8, 0.2 / commands.length, commands))
                .then(ff)
                .catch(e => rj(e));
        });
    }

    private static doPostProcessRecursive(packName: string, pct: number, pctPer: number, argsList: string[][]) {
        return new Promise((ff, rj) => {
            let args = argsList[0];

            Logger.infoImpl("IPCMain", "Running post-processor command 'java " + args.join(" ") + "'");

            let process = spawn("java", args, {
                stdio: "ignore"
            });

            process.on("error", err => {
                return rj("Patch failed with error " + err);
            });

            process.on("exit", code => {
                if (code !== 0)
                    return rj("Patch failed; exit code " + code);

                Logger.debugImpl("IPCMain", "Success!");

                pct += pctPer;
                ElectronManager.win.webContents.send("install progress", packName, pct);

                argsList.splice(0, 1);
                if (argsList.length === 0)
                    return ff();

                this.doPostProcessRecursive(packName, pct, pctPer, argsList)
                    .then(ff);
            });
        });
    }
}
