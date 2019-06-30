import {ipcMain, IpcMessageEvent} from "electron";
import {existsSync} from "fs";
import {dirname, join} from "path";
import * as rimraf from "rimraf";
import Env from "./Env";
import {Logger} from "./logger";
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

        //Forge is complex.
    }
}
