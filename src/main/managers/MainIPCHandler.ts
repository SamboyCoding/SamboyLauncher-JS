import {ipcMain, IpcMessageEvent} from "electron";
import {existsSync} from "fs";
import {writeFileSync} from "jsonfile";
import * as os from "os";
import {join} from "path";
import Logger from "../logger";
import InstalledPackJSON from "../model/InstalledPackJSON";
import MavenArtifact from "../model/MavenArtifact";
import Utils from "../util/Utils";
import ClientInstallManager from "./ClientInstallManager";
import ElectronManager from "./ElectronManager";
import EnvironmentManager from "./EnvironmentManager";
import InstalledPackManager from "./InstalledPackManager";

export default class MainIPCHandler {
    public static Init() {
        ipcMain.on("install pack client", MainIPCHandler.installPackClient);
        ipcMain.on("create pack", MainIPCHandler.createPack);
        ipcMain.on("launch pack", MainIPCHandler.launchPack);

        ipcMain.on("get pack data", async (event: IpcMessageEvent, name: string) => {
            let pack = await InstalledPackManager.GetPackDetails(name);
            event.sender.send("pack data", pack);
        });
        ipcMain.on("get pack json", async (event: IpcMessageEvent, name: string) => {
            event.sender.send("pack json", InstalledPackManager.GetPackJSON(name));
        });

        ipcMain.on("get installed packs", () => {
            ElectronManager.win.webContents.send("installed packs", InstalledPackManager.GetPackNames());
            ElectronManager.win.webContents.send("created packs", InstalledPackManager.GetOwnedPackNames());
        });
    }

    private static async installPackClient(event: IpcMessageEvent, packName: string, gameVersionId: string, forgeVersionId: string) {

        ClientInstallManager.installClient(packName, gameVersionId, forgeVersionId)
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

    private static async createPack(event: IpcMessageEvent, name: string, description: string, gameVersion: string, forgeVersion: string) {
        name = name.replace(/\s/g, "_").trim();
        let dir = join(EnvironmentManager.packsDir, name);
        if (existsSync(dir))
            return event.sender.send("pack create failed", name, "Directory already exists");

        await Utils.mkdirpPromise(dir);

        let install: InstalledPackJSON = {
            id: "",
            description,
            gameVersion,
            forgeVersion,
            installedVersion: "1.0",
            author: {
                uuid: "",
                name: "Me"
            },
            installedMods: [],
            packName: name,
        };

        writeFileSync(join(dir, "install.json"), install);

        event.sender.send("pack created", install);
    }

    private static async launchPack(event: IpcMessageEvent, packName: string) {
        let pack = await InstalledPackManager.GetPackDetails(packName);

        //Let's build a classpath.
        let classpath: MavenArtifact[] = [];

        //First, add vanilla libs.
        classpath = classpath.concat(pack.gameVersion.libraries.map(lib => join(EnvironmentManager.librariesDir, lib.path)).map(absolutePath => MavenArtifact.FromFile(EnvironmentManager.librariesDir, absolutePath)));

        //That was easy.
        //Now, forge. Mostly easy, some stuff overrides though

        pack.forgeVersion.getRequiredLibraries(false).forEach(lib => {
            let absolutePath = join(EnvironmentManager.librariesDir, lib.path);
            let artifact = MavenArtifact.FromFile(EnvironmentManager.librariesDir, absolutePath);

            let idx = classpath.findIndex(entry => entry.domain === artifact.domain && entry.name === artifact.name);

            if (idx >= 0) {
                Logger.debugImpl("Launch", "Overriding vanilla CP entry with modded: " + artifact.name);
                classpath[idx] = artifact; //Forge always overrides vanilla.
            } else
                classpath.push(artifact);
        });

        let classpathString = classpath
            .map(entry => join(EnvironmentManager.librariesDir, entry.fullPath))
            .join(os.platform() === "win32" ? ";" : ":");

        //TODO: Build args (both jvm and game), get main class, and launch.
    }
}
