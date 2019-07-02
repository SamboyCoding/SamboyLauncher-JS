import {spawn} from "child_process";
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
                Logger.errorImpl("IPCMain", (e instanceof Error ? e.message + "\n" + e.stack : e));
                ElectronManager.win.webContents.send("install error", packName, (e instanceof Error ? e.message : e));
            });
    }

    private static async createPack(event: IpcMessageEvent, name: string, description: string, gameVersion: string, forgeVersion: string) {
        name = name.replace(/\s/g, "_").trim();
        let dir = join(EnvironmentManager.packsDir, name);
        if (existsSync(dir))
            return event.sender.send("pack create failed", name, "Directory already exists");

        Logger.infoImpl("IPCMain", "Creating barebones pack installation in " + dir + "...");
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

        Logger.infoImpl("IPCMain", "Reloading installed packs...");
        InstalledPackManager.LoadFromDisk();
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

        //If we're not on a post-patch forge, add the vanilla jar
        let classpathString = "";
        if (!pack.forgeVersion.needsPatch)
            classpathString += join(EnvironmentManager.versionsDir, pack.gameVersion.name, pack.gameVersion.name + ".jar") + (os.platform() === "win32" ? ";" : ":");

        classpathString += classpath
            .map(entry => join(EnvironmentManager.librariesDir, entry.fullPath))
            .join(os.platform() === "win32" ? ";" : ":");

        let args: string[] = []; //["-cp", classpathString, "-Djava.library.path=" + join(EnvironmentManager.versionsDir, pack.gameVersion.name, "natives")];

        if(pack.gameVersion.arguments && pack.gameVersion.arguments.jvm.length) {
            for (let arg of pack.gameVersion.arguments.jvm) {
                if (typeof (arg) === 'string') {
                    args.push(arg);
                    continue;
                }

                if (!arg.rules || Utils.handleOSBasedRule(arg.rules)) {
                    if (typeof (arg.value) === 'string')
                        args.push(arg.value);
                    else
                        args = args.concat(arg.value);
                }
            }
        } else {
            args = args.concat(["-cp", "${classpath}", "-Djava.library.path=${natives_directory}"]);
        }

        args.push(pack.forgeVersion.manifest.mainClass);

        //TODO: Conditional game args like resolution
        if (pack.gameVersion.arguments) {
            if (pack.forgeVersion.needsPatch) //New
                args = args.concat(pack.gameVersion.arguments.game.concat(pack.forgeVersion.manifest.arguments.game).filter(arg => typeof (arg) === "string") as string[]);
            else //Old
                args = args.concat(pack.forgeVersion.manifest.arguments.game.filter(arg => typeof (arg) === "string") as string[]);
        }

        args = args.map(arg => {
            switch(arg) {
                case "${auth_player_name}":
                    return "memes"; //TODO
                case "${version_name}":
                    return pack.forgeVersion.manifest.id;
                case "${game_directory}":
                    return pack.packDirectory;
                case "${assets_root}":
                    return EnvironmentManager.assetsDir;
                case "${assets_index_name}":
                    return pack.gameVersion.assetIndex.id;
                case "${auth_uuid}":
                    return "dummy"; //TODO
                case "${auth_access_token}":
                    return "dummy"; //TODO
                case "${user_type}":
                    return "mojang";
                case "${version_type}":
                    return pack.forgeVersion.manifest.type;
                case "${classpath}":
                    return classpathString;
                case "${user_properties}":
                    return "{}";
                default:
                    return arg
                        .replace("${natives_directory}", join(EnvironmentManager.versionsDir, pack.gameVersion.name, "natives"))
                        .replace("${launcher_name}", "SamboyLauncher")
                        .replace("${launcher_version}", "2.0");
            }
        });

        Logger.debugImpl("Launch", "java " + args.join(" "));
        let process = spawn("java", args, {stdio: "inherit", cwd: pack.packDirectory});
    }
}
