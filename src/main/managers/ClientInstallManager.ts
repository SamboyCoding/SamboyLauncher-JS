import {spawn} from "child_process";
import {copyFileSync, existsSync, readdirSync} from "fs";
import * as os from "os";
import {basename, dirname, join} from "path";
import rimraf from "rimraf";
import Logger from "../logger";
import ForgeVersion from "../model/ForgeVersion";
import MCAssetDefinition from "../model/MCAssetDefinition";
import MCVersion from "../model/MCVersion";
import Utils from "../util/Utils";
import ElectronManager from "./ElectronManager";
import EnvironmentManager from "./EnvironmentManager";

export default class ClientInstallManager {
    public static async installClient(packName: string, gameVersionId: string, forgeVersionId: string): Promise<void> {
        return new Promise((ff, rj) => {
            MCVersion.Get(gameVersionId)
                .then(minecraftVersion => {
                    if (!minecraftVersion)
                        throw new Error("Couldn't find mc version");

                    let java = minecraftVersion.javaBinaryToUse;

                    if (!java)
                        throw new Error(`No java version found. Need 64-bit java ${minecraftVersion.isPost113 ? "8, 9, or 10" : "8"}`);

                    if (existsSync(join(EnvironmentManager.versionsDir, minecraftVersion.name, minecraftVersion.name + ".jar")))
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

                    throw e;
                })
                .then(() => {
                    if (existsSync(join(EnvironmentManager.versionsDir, forgeVersionId, forgeVersionId + ".json")))
                        throw new Error("ntd"); //Nothing to do
                })
                .then(() => ForgeVersion.Get(forgeVersionId)) //Do this after the check as it involves downloading forge's installer, which is intensive.
                .then(forge => {
                    if (!forge)
                        throw new Error("Couldn't find forge version");

                    return forge;
                })
                .then(forge => {
                    return new Promise<ForgeVersion>((ff, rj) => {
                        MCVersion.Get(gameVersionId)
                            .then(mcVersion => {
                                this.downloadForgeLibs(packName, forge, mcVersion.unpack200BinaryToUse)
                                    .then(ff)
                                    .catch(rj);
                            });
                    });
                })
                .then(forge => {
                    if (forge.needsPatch)
                        return this.runForgePostProcessors(packName, forge);
                    return Promise.resolve();
                })
                .then(() => {
                    Logger.infoImpl("Client Install Manager", "Finishing up by copying the forge version json...");

                    //Copy install json to forge
                    let dir = join(EnvironmentManager.versionsDir, forgeVersionId);
                    return Utils.mkdirpPromise(dir);
                })
                .then(() => {
                    let dir = join(EnvironmentManager.versionsDir, forgeVersionId);
                    Logger.debugImpl("Client Install Manager", `Copy file: ${join(EnvironmentManager.tempDir, "version.json")} => ${join(dir, forgeVersionId + ".json")}`);
                    copyFileSync(join(EnvironmentManager.tempDir, "version.json"), join(dir, forgeVersionId + ".json"));
                    return true;
                })
                .catch((e: Error) => {
                    if (e.message === "ntd")
                        return true;

                    //this.cleanupTemp();

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
        Logger.debugImpl("Client Install Manager", "Cleaning up temp dir");
        //Cleanup temp dir in the background
        let content = readdirSync(EnvironmentManager.tempDir);
        for (let file of content) {
            rimraf.sync(join(EnvironmentManager.tempDir, file));
        }
    }

    private static async downloadVanillaLibs(packName: string, minecraftVersion: MCVersion) {
        let pct = 0;
        let totalSize = 0;

        Logger.infoImpl("Client Install Manager", `Installing libraries for minecraft ${minecraftVersion.name}...`);

        minecraftVersion.libraries.forEach(lib => totalSize += lib.size);

        let promises = minecraftVersion.libraries.map(async lib => {
            const dest = join(EnvironmentManager.librariesDir, lib.path);
            await Utils.mkdirpPromise(dirname(dest));
            await Utils.downloadWithSHA1(lib.url, dest, lib.sha1);
            pct += 0.3 * lib.size / totalSize;

            ElectronManager.win.webContents.send("install progress", packName, pct * 0.66);
        });

        await Promise.all(promises);

        return minecraftVersion;
    }

    private static async downloadVanillaClient(packName: string, minecraftVersion: MCVersion) {
        const versionFolder = join(EnvironmentManager.versionsDir, minecraftVersion.name);

        Logger.infoImpl("Client Install Manager", `Installing minecraft client ${minecraftVersion.name}...`);

        let dest = join(versionFolder, minecraftVersion.name + ".jar");
        await Utils.mkdirpPromise(dirname(dest));
        await Utils.downloadWithSHA1(minecraftVersion.clientJar.url, dest, minecraftVersion.clientJar.sha1);

        ElectronManager.win.webContents.send("install progress", packName, 0.4 * 0.66);

        return minecraftVersion;
    }

    private static async downloadVanillaNatives(packName: string, minecraftVersion: MCVersion) {
        const versionFolder = join(EnvironmentManager.versionsDir, minecraftVersion.name);
        const nativesDir = join(versionFolder, "natives");

        Logger.infoImpl("Client Install Manager", `Installing natives for minecraft ${minecraftVersion.name}...`);

        let totalSize = 0;
        minecraftVersion.natives.forEach(nat => totalSize += nat.size);

        await Utils.mkdirpPromise(nativesDir);

        let pct = 0.4;

        let promises = minecraftVersion.natives.map(async nat => {
            const zipPath = join(EnvironmentManager.librariesDir, nat.path);
            await Utils.downloadWithSHA1(nat.url, zipPath, nat.sha1);
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
        Logger.infoImpl("Client Install Manager", `Installing assets for minecraft ${minecraftVersion.name}...`);

        let totalSize = 0;
        let pct = 0.5;
        minecraftVersion.assets.forEach(asset => totalSize += asset.size);

        const objectsDir = join(EnvironmentManager.assetsDir, "objects");
        await Utils.mkdirpPromise(objectsDir);

        let assets = Array.from(minecraftVersion.assets.values()).sort((a, b) => a.hash.localeCompare(b.hash));

        let threads = os.cpus().length;
        let threadJobs: MCAssetDefinition[][] = [];

        let idx = 0;
        let amountPer = Math.floor(assets.length / threads);

        Logger.infoImpl("Client Install Manager", `Spawning ${threads} threads to download ${assets.length} assets, each with a workload of ${amountPer}`);

        for (let i = 0; i < threads - 1; i++) {
            threadJobs.push(assets.slice(idx, idx + amountPer));
            idx += amountPer;
        }

        threadJobs.push(assets.slice(idx)); //Grab the remainder for the last thread

        try {
            await Promise.all(threadJobs.map(async job => {
                for (let asset of job) {
                    const path = `${asset.hash.substr(0, 2)}/${asset.hash}`;
                    const dest = join(objectsDir, path);
                    await Utils.mkdirpPromise(dirname(dest));

                    await Utils.downloadWithSHA1(`https://resources.download.minecraft.net/${path}`, dest, asset.hash);

                    pct += 0.5 * asset.size / totalSize;
                    ElectronManager.win.webContents.send("install progress", packName, pct * 0.66);
                }
            }));
        } catch (e) {
            Logger.errorImpl("Client Install Manager", e.message + "\n" + e.stack);
            ElectronManager.win.webContents.send("install error", packName, e.message);
            return;
        }

        Logger.debugImpl("Client Install Manager", "Finished getting assets");
    }

    private static async downloadForgeLibs(packName: string, forge: ForgeVersion, up200: string) {
        //Get forge libraries

        Logger.infoImpl("Client Install Manager", `Installing libraries for forge ${forge.manifest.id}`);
        let pct = 0.66;
        let libs = forge.getRequiredLibraries(true);
        let totalSize = 0;
        libs.forEach(lib => totalSize += lib.size); //If we're an old version these all have a size of 1, but that's fine.

        let dirtyHaxOldVersionJarToExtractProfileFrom: string;

        let promises = libs.map(async lib => {
            const dest = join(EnvironmentManager.librariesDir, lib.path);
            await Utils.mkdirpPromise(dirname(dest));
            if (lib.size !== 1) {
                //New (1.13+) lib
                if (lib.url)
                //Url, just download from there.
                    await Utils.downloadWithSHA1(lib.url, dest, lib.sha1);
                else {
                    //No url, try to get from inside installer
                    if (!await Utils.tryExtractFileFromArchive(forge.installerJarPath, dirname(dest), "maven/" + lib.path))
                        throw new Error(`${basename(lib.path)} does not specify a url and couldn't be found in the installer's builtin maven`);

                    Logger.debugImpl("Client Install Manager", `Extracted ${basename(lib.path)} from installer's builtin maven.`);
                }
            } else if (!existsSync(dest)) {
                //Old lib, and doesn't exist.
                if (lib.id.indexOf("minecraftforge:forge:") !== -1) {
                    //Forge itself, fix url
                    lib.url = lib.url.replace(".jar", "-universal.jar");
                    dirtyHaxOldVersionJarToExtractProfileFrom = join(EnvironmentManager.librariesDir, lib.path);
                }
                try {
                    await Utils.downloadFile(lib.url, dest); //Old version, no sha1 to check
                    Logger.debugImpl("Client Install Manager", `Downloaded forge lib: ${dest}`);
                } catch (e) {
                    Logger.warnImpl("Client Install Manager", `Failed to get forge library: ${lib.url}. Trying packed...`);
                    await Utils.handlePackedForgeLibrary(lib.url, dest, up200);
                }
            } else {
                Logger.debugImpl("Client Install Manager", `${dest} already exists, but no checksum. Have to assume it's good.`);

                if (lib.id.indexOf("minecraftforge:forge:") !== -1)
                    dirtyHaxOldVersionJarToExtractProfileFrom = join(EnvironmentManager.librariesDir, lib.path);
            }

            pct += (forge.needsPatch ? 0.14 : 0.34) * lib.size / totalSize; //Brings us up to ~80% if we need to patch or 100% if we don't

            ElectronManager.win.webContents.send("install progress", packName, pct);
        });

        await Promise.all(promises);

        if (dirtyHaxOldVersionJarToExtractProfileFrom) {
            Logger.infoImpl("Client Install Manager", "Extracting forge version.json from downloaded library...");
            await Utils.tryExtractFileFromArchive(dirtyHaxOldVersionJarToExtractProfileFrom, EnvironmentManager.tempDir, "version.json");
        }

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
            if (argsList.length === 0)
                return ff();

            let args = argsList[0];

            Logger.infoImpl("Client Install Manager", "Running post-processor command 'java " + args.join(" ") + "'");

            let process = spawn("java", args, {
                stdio: "ignore"
            });

            process.on("error", err => {
                return rj("Patch failed with error " + err);
            });

            process.on("exit", code => {
                if (code !== 0)
                    return rj("Patch failed; exit code " + code);

                Logger.debugImpl("Client Install Manager", "Success!");

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
