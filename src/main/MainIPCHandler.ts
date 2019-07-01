import {ipcMain, IpcMessageEvent} from "electron";
import {existsSync} from "fs";
import {writeFileSync} from "jsonfile";
import {join} from "path";
import ClientInstaller from "./ClientInstaller";
import ElectronManager from "./ElectronManager";
import Env from "./Env";
import {Logger} from "./logger";
import InstalledPackJSON from "./objects/InstalledPackJSON";
import Utils from "./util/Utils";

export default class MainIPCHandler {
    public static Init() {
        ipcMain.on("install pack client", MainIPCHandler.installPackClient);
        ipcMain.on("create pack", MainIPCHandler.createPack);
    }

    private static async installPackClient(event: IpcMessageEvent, packName: string, gameVersionId: string, forgeVersionId: string) {

        ClientInstaller.installClient(packName, gameVersionId, forgeVersionId)
            .then(() => {
                //And we're done!
                Logger.infoImpl("IPCMain", "Install complete!");
                event.sender.send("install complete", packName, gameVersionId, forgeVersionId);
            })
            .catch((e: Error | string) => {
                Logger.errorImpl("IPCMain", `${e}`);
                ElectronManager.win.webContents.send("install error", packName, (e instanceof Error ? e.message : e));
            });
    }

    private static async createPack(event: IpcMessageEvent, name: string, gameVersion: string, forgeVersion: string) {
        name = name.replace(/\s/g, "_").trim();
        let dir = join(Env.packsDir, name);
        if(existsSync(dir))
            return event.sender.send("pack create failed", name, "Directory already exists");

        await Utils.mkdirpPromise(dir);

        let install: InstalledPackJSON = {
            id: "",
            gameVersion,
            forgeVersion,
            installedVersion: "1.0",
            author: {
                id: "",
                name: "Me"
            },
            installedMods: [],
            packName: name,
        };

        writeFileSync(join(dir, "install.json"), install);

        event.sender.send("pack created", install);
    }
}
