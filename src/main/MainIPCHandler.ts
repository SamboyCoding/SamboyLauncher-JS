import {spawnSync} from "child_process";
import {ipcMain, IpcMessageEvent} from "electron";
import {existsSync} from "fs";
import {dirname, join, basename} from "path";
import * as rimraf from "rimraf";
import Env from "./Env";
import {Logger} from "./logger";
import ForgeVersion from "./objects/ForgeVersion";
import MCVersion from "./objects/MCVersion";
import Utils from "./util/Utils";

export default class MainIPCHandler {
    public static Init() {
        ipcMain.on("install pack client", MainIPCHandler.installPackClient);
    }

    private static async installPackClient(event: IpcMessageEvent, packName: string, gameVersionId: string, forgeVersionId: string) {
        Logger.infoImpl("IPCMain", `Installing client ${gameVersionId} with forge ${forgeVersionId} for pack ${packName}`);

        let minecraftVersion: MCVersion;
        try {
            minecraftVersion = await MCVersion.Get(gameVersionId);

            if (!minecraftVersion) {
                throw new Error("Unable to locate MC version " + gameVersionId + ". Aborting.");
            }
        } catch (e) {
            Logger.errorImpl("IPCMain", e);
            event.sender.send("install error", packName, e.message);
            return;
        }

        let pct = 0;
        let totalSize = 0;
        minecraftVersion.libraries.forEach(lib => totalSize += lib.size);

        //30% to libraries, 10% to natives, 50% to assets, 10% to client.
        //But this is only the first 75%, with another 25% to forge.

        let promises = minecraftVersion.libraries.map(async lib => {
            const dest = join(Env.librariesDir, lib.path);
            await Utils.mkdirpPromise(dirname(dest));
            await Utils.downloadWithSigCheck(lib.url, dest, lib.sha1);
            pct += 0.3 * lib.size / totalSize;

            event.sender.send("install progress", packName, pct * 0.75);
        });

        try {
            await Promise.all(promises);
        } catch (e) {
            Logger.errorImpl("IPCMain", e);
            event.sender.send("install error", packName, e.message);
            return;
        }

        pct = 0.3;

        //Minecraft client jar.
        const versionFolder = join(Env.versionsDir, minecraftVersion.name);

        if (!existsSync(versionFolder)) {

            try {
                let dest = join(versionFolder, minecraftVersion.name + ".jar");
                await Utils.mkdirpPromise(dirname(dest));
                await Utils.downloadWithSigCheck(minecraftVersion.clientJar.url, dest, minecraftVersion.clientJar.sha1);
            } catch (e) {
                Logger.errorImpl("IPCMain", e);
                event.sender.send("install error", packName, e.message);
                return;
            }

            pct += 0.1;

            event.sender.send("install progress", packName, pct * 0.75);

            totalSize = 0;
            minecraftVersion.natives.forEach(nat => totalSize += nat.size);

            const nativesDir = join(versionFolder, "natives");
            await Utils.mkdirpPromise(nativesDir);

            promises = minecraftVersion.natives.map(async nat => {
                const zipPath = join(Env.librariesDir, nat.path);
                await Utils.downloadWithSigCheck(nat.url, zipPath, nat.sha1);
                await Utils.extractArchive(zipPath, nativesDir);

                if (existsSync(join(nativesDir, "META-INF")))
                    rimraf.sync(join(nativesDir, "META-INF"));

                pct += 0.1 * nat.size / totalSize;
                event.sender.send("install progress", packName, pct * 0.75);
            });

            try {
                await Promise.all(promises);
            } catch (e) {
                Logger.errorImpl("IPCMain", e);
                event.sender.send("install error", packName, e.message);
                return;
            }
        }

        totalSize = 0;
        pct = 0.5;
        minecraftVersion.assets.forEach(asset => totalSize += asset.size);

        const objectsDir = join(Env.assetsDir, "objects");
        await Utils.mkdirpPromise(objectsDir);

        promises = Array.from(minecraftVersion.assets.values()).sort().map(async asset => {
            const path = `${asset.hash.substr(0, 2)}/${asset.hash}`;
            const dest = join(objectsDir, path);
            await Utils.mkdirpPromise(dirname(dest));

            await Utils.downloadWithSigCheck(`https://resources.download.minecraft.net/${path}`, dest, asset.hash);

            pct += 0.5 * asset.size / totalSize;
            event.sender.send("install progress", packName, pct * 0.75);
        });

        try {
            await Promise.all(promises);
        } catch (e) {
            Logger.errorImpl("IPCMain", e.message + "\n" + e.stack);
            event.sender.send("install error", packName, e.message);
            return;
        }

        Logger.debugImpl("IPCMain", "Finished getting assets");

        pct = 0.75;

        //Forge is complex.

        //Get forge installer
        let forge = await ForgeVersion.Get(forgeVersionId);

        //Get forge libraries
        let libs = forge.getRequiredLibraries();
        totalSize = 0;
        libs.forEach(lib => totalSize += lib.size); //If we're an old version these all have a size of 1, but that's fine.

        promises = libs.map(async lib => {
            const dest = join(Env.librariesDir, lib.path);
            await Utils.mkdirpPromise(dirname(dest));
            if (lib.size !== 1) {
                if(lib.url)
                    await Utils.downloadWithSigCheck(lib.url, dest, lib.sha1);
                else {
                    //No url, try to get from inside installer
                    if(!await Utils.tryExtractFileFromArchive(forge.installerJarPath, dirname(dest), "maven/" + lib.path))
                        throw new Error(`${basename(lib.path)} does not specify a url and couldn't be found in the installer's builtin maven`);

                    Logger.debugImpl("IPCMain", `Extracted ${basename(lib.path)} from installer's builtin maven.`);
                }
            }
            else if (!existsSync(dest)) {
                try {
                    await Utils.downloadFile(lib.url, dest); //Old version, no sha1
                    Logger.debugImpl("IPCMain", `Downloaded forge lib: ${dest}`);
                } catch (e) {
                    Logger.warnImpl("IPCMain", `Failed to get forge library: ${lib.url}. Trying packed...`);
                    await Utils.handlePackedForgeLibrary(lib.url, dest);
                }
            } else {
                Logger.debugImpl("IPCMain", `${dest} already exists, but no checksum. Have to assume it's good.`);
            }

            pct += 0.1 * lib.size / totalSize;

            event.sender.send("install progress", packName, pct);
        });

        try {
            await Promise.all(promises);
        } catch (e) {
            Logger.errorImpl("IPCMain", e.message + "\n" + e.stack);
            event.sender.send("install error", packName, e.message);
            return;
        }

        //Patch forge if we have to.
        if (forge.needsPatch) {
            //TODO: Make this check the output SHA1s and not execute if not needed.
            let commands = await forge.getPatchCommands();
            for (let args of commands) {
                Logger.infoImpl("IPCMain", "Running post-processor command 'java " + args.join(" ") + "'");

                //TODO: Make async so we don't lock the ui
                let result = spawnSync("java", args);
                if (result.error)
                    return Logger.errorImpl("IPCMain", "Patch failed with error " + result.error);
                if (result.status !== 0)
                    return Logger.errorImpl("IPCMain", "Patch failed; exit code " + result.status);
                Logger.debugImpl("IPCMain", "Success!");

                pct += 0.15 / commands.length;
                event.sender.send("install progress", packName, pct);
            }
        } else {
            pct += 0.15;
            event.sender.send("install progress", packName, pct);
        }

        //And we're done!
    }
}
