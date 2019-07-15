import {spawn} from "child_process";
import {ipcMain, IpcMessageEvent} from "electron";
import {existsSync, unlinkSync} from "fs";
import {writeFileSync} from "jsonfile";
import * as os from "os";
import {join} from "path";
import Logger from "../logger";
import ForgeVersion from "../model/ForgeVersion";
import InstalledPackJSON from "../model/InstalledPackJSON";
import MavenArtifact from "../model/MavenArtifact";
import MCVersion from "../model/MCVersion";
import ModJar from "../model/ModJar";
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
        ipcMain.on("install mods", MainIPCHandler.installMods);

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

        ipcMain.on("update pack versions", async (event: IpcMessageEvent, packName: string, gameVersion: string, forgeVersion: string) => {
            let pack = await InstalledPackManager.GetPackDetails(packName);
            pack.gameVersion = await MCVersion.Get(gameVersion);
            pack.forgeVersion = await ForgeVersion.Get(forgeVersion);

            await InstalledPackManager.SaveModifiedPackData();
            event.sender.send("pack versions updated", packName);
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
        let dirName = name.replace(/\s/g, "_").trim();
        let dir = join(EnvironmentManager.packsDir, dirName);
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

    private static async installMods(event: IpcMessageEvent, packName: string, mods: ModJar[]) {
        Logger.infoImpl("InstallMods", `Renderer requested that we install ${mods.length} mod/s.`);

        let pack = await InstalledPackManager.GetPackDetails(packName);

        let alreadyInstalled = pack.installedMods.filter(im => !!mods.find(m => im.slug === m.slug));
        Logger.debugImpl("InstallMods", `${alreadyInstalled.length} of those are already installed;`);

        let wrongVersion = alreadyInstalled.filter(im => mods.find(m => im.slug === m.slug).id !== im.id);
        Logger.debugImpl("InstallMods", `And of those, ${wrongVersion.length} currently have/has the wrong version installed`);

        wrongVersion.forEach(wv => {
            let installPath = join(pack.modsDirectory, wv.filename);
            if (!existsSync(installPath)) {
                Logger.warnImpl("InstallMods", `${wv.slug} is supposedly already installed (but wrong version), but the file ${wv.filename} couldn't be found in the mods dir.`);
                return;
            }

            Logger.debugImpl("InstallMods", `Delete file: ${installPath}`);
            unlinkSync(installPath);
        });

        //Find any mods where we don't have one installed with the same slug and ver id.
        let actuallyNeedInstall = mods.filter(m => !pack.installedMods.find(im => im.slug === m.slug && im.id === m.id));
        Logger.debugImpl("InstallMods", `We're actually about to install ${actuallyNeedInstall.length} mod/s`);

        actuallyNeedInstall.forEach(async jar => {
            await Utils.downloadWithMD5(`https://www.curseforge.com/minecraft/mc-mods/${jar.slug}/download/${jar.id}/file`, join(pack.modsDirectory, jar.filename), jar.md5);
            event.sender.send("mod installed", packName, jar.slug, jar.id);
            pack.installedMods.push(jar);

            InstalledPackManager.SaveModifiedPackData();
        });
    }
}
