import {spawn} from "child_process";
import {dialog, ipcMain, IpcMessageEvent} from "electron";
import {existsSync, unlinkSync} from "fs";
import {readFileSync, writeFileSync} from "jsonfile";
import * as os from "os";
import {join} from "path";
import Logger from "../logger";
import ForgeVersion from "../model/ForgeVersion";
import InstalledPack from "../model/InstalledPack";
import InstalledPackJSON from "../model/InstalledPackJSON";
import MavenArtifact from "../model/MavenArtifact";
import MCVersion from "../model/MCVersion";
import ModJar from "../model/ModJar";
import Utils from "../util/Utils";
import AuthenticationManager from "./AuthenticationManager";
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

        ipcMain.on("sign in", async (event: IpcMessageEvent, email: string, password: string) => {
            try {
                await AuthenticationManager.Login(email, password);
                event.sender.send("username", AuthenticationManager.username);
            } catch (e) {
                if (typeof (e) === "string")
                    event.sender.send("sign in error", e);
                else {
                    Logger.errorImpl("IPCMain", `Login process threw exception ${e.stack}`);
                    event.sender.send("sign in error", "Unexpected error logging you in. Please try again, possibly later.");
                }
            }
        });

        ipcMain.on("import pack", async (event: IpcMessageEvent) => {
            let files = dialog.showOpenDialog(ElectronManager.win, {
                filters: [{
                    extensions: ["json"],
                    name: "Pack JSON"
                }],
                properties: [
                    "openFile"
                ],
                title: "Import Pack JSON..."
            });

            if (!files.length) return;

            let json: InstalledPackJSON = readFileSync(files[0]);
            if (!json.packName) return event.sender.send("import failed", "Couldn't import pack, because the specified while was not a pack JSON");

            let pack = await InstalledPack.FromJSON(json);

            event.sender.send("importing pack", pack.name);
            this.installPackClient(event, pack.name, pack.gameVersion.name, pack.forgeVersion.name).then(async () => {
                InstalledPackManager.PostImport(pack, json);

                event.sender.send("importing mods", pack.name, pack.installedMods.length);

                this.installMods(event, pack.name, pack.installedMods).then(() => {
                    event.sender.send("pack imported", pack.name);

                    Logger.infoImpl("IPCMain", "Reloading installed packs...");
                    InstalledPackManager.LoadFromDisk();

                    ElectronManager.win.webContents.send("installed packs", InstalledPackManager.GetPackNames());
                    ElectronManager.win.webContents.send("created packs", InstalledPackManager.GetOwnedPackNames());
                });
            });
        });

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

            //While we're at it, let's send the username, as this event means we're ready on renderer
            if (AuthenticationManager.username)
                ElectronManager.win.webContents.send("username", AuthenticationManager.username);
        });

        ipcMain.on("update pack versions", async (event: IpcMessageEvent, packName: string, gameVersion: string, forgeVersion: string) => {
            let pack = await InstalledPackManager.GetPackDetails(packName);
            pack.gameVersion = await MCVersion.Get(gameVersion);
            pack.forgeVersion = await ForgeVersion.Get(forgeVersion);

            await InstalledPackManager.SaveModifiedPackData();
            event.sender.send("pack versions updated", packName);
        });

        ipcMain.on("remove mod", async (event: IpcMessageEvent, packName: string, slug: string) => {
            Logger.debugImpl("IPCMain", `Renderer requested we remove mod ${slug} from ${packName}`);
            let pack = await InstalledPackManager.GetPackDetails(packName);
            let idx = pack.installedMods.findIndex(m => m.slug === slug);

            if (idx < 0)
                return Logger.warnImpl("IPCMain", `Renderer requested we remove mod ${slug} from ${packName} but it's not present`);

            let file = join(pack.modsDirectory, pack.installedMods[idx].filename);
            Logger.debugImpl("IPCMain", `Delete file: ${file}`);
            if (!existsSync(file))
                Logger.errorImpl("IPCMain", `Renderer requested we remove mod ${slug} from ${packName}, and it's apparently installed, but the file ${file} does not exist!`);
            else
                unlinkSync(file);

            pack.installedMods.splice(idx, 1);

            await InstalledPackManager.SaveModifiedPackData();

            event.sender.send("mod removed", packName, slug);
        });
    }

    private static async installPackClient(event: IpcMessageEvent, packName: string, gameVersionId: string, forgeVersionId: string) {

        return new Promise((ff) => {
            ClientInstallManager.installClient(packName, gameVersionId, forgeVersionId)
                .then(() => {
                    //And we're done!
                    Logger.infoImpl("IPCMain", "Install complete!");
                    event.sender.send("install complete", packName, gameVersionId, forgeVersionId);
                    ff();
                })
                .catch((e: Error | string) => {
                    Logger.errorImpl("IPCMain", (e instanceof Error ? e.message + "\n" + e.stack : e));
                    event.sender.send("install error", packName, (e instanceof Error ? e.message : e));
                });
        });
    }

    private static async createPack(event: IpcMessageEvent, name: string, description: string, gameVersion: string, forgeVersion: string) {
        //Replace non alphanumeric
        let dirName = name.replace(/[^\w\d]/g, "_").trim();
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
                uuid: !!AuthenticationManager.uuid ? AuthenticationManager.uuid : "",
                name: !!AuthenticationManager.username ? AuthenticationManager.username : "Me"
            },
            installedMods: [],
            packName: name,
        };

        writeFileSync(join(dir, "install.json"), install);

        event.sender.send("pack created", install);

        Logger.infoImpl("IPCMain", "Reloading installed packs...");
        InstalledPackManager.LoadFromDisk();

        ElectronManager.win.webContents.send("installed packs", InstalledPackManager.GetPackNames());
        ElectronManager.win.webContents.send("created packs", InstalledPackManager.GetOwnedPackNames());
    }

    private static async launchPack(event: IpcMessageEvent, packName: string) {
        Logger.infoImpl("IPCMain", `Renderer requested pack launch for pack ${packName}`);

        let pack = await InstalledPackManager.GetPackDetails(packName);

        if(!pack.gameVersion.javaBinaryToUse)
            throw new Error(`No java version found. Need 64-bit java ${pack.gameVersion.isPost113 ? '8, 9, or 10' : '8'}`);

        Logger.infoImpl("IPCMain", `About to launch MC ${pack.gameVersion.name} + forge ${pack.forgeVersion.name}`);

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

        if (pack.gameVersion.arguments && pack.gameVersion.arguments.jvm.length) {
            for (let arg of pack.gameVersion.arguments.jvm) {
                if (typeof (arg) === "string") {
                    args.push(arg);
                    continue;
                }

                if (!arg.rules || Utils.handleOSBasedRule(arg.rules)) {
                    if (typeof (arg.value) === "string")
                        args.push(arg.value);
                    else
                        args = args.concat(arg.value);
                }
            }
        } else {
            args = args.concat(["-cp", "${classpath}", "-Djava.library.path=${natives_directory}"]);
        }

        if (os.platform() === "win32") {
            let memGig = Math.floor(os.freemem() / 1024 / 1024 / 1024);
            if (memGig > 6)
                args.push("-Xmx6G");
            else
                args.push(`-Xmx${memGig}G`);
        } else {
            args.push("-Xmx5G"); //FIXME: Defaults to 5G ram on linux/mac
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
            switch (arg) {
                case "${auth_player_name}":
                    return !!AuthenticationManager.username ? AuthenticationManager.username : "naughtyboiyoushouldsignin";
                case "${version_name}":
                    return pack.forgeVersion.manifest.id;
                case "${game_directory}":
                    return pack.packDirectory;
                case "${assets_root}":
                    return EnvironmentManager.assetsDir;
                case "${assets_index_name}":
                    return pack.gameVersion.assetIndex.id;
                case "${auth_uuid}":
                    return !!AuthenticationManager.uuid ? AuthenticationManager.uuid : "dummy";
                case "${auth_access_token}":
                    return !!AuthenticationManager.accessToken ? AuthenticationManager.accessToken : "dummy";
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

        Logger.debugImpl("Launch", pack.gameVersion.javaBinaryToUse + " " + args.join(" "));
        Logger.debugImpl("Launch", "CWD: " + pack.packDirectory);
        try {
            let process = spawn(pack.gameVersion.javaBinaryToUse, args, {stdio: "inherit", cwd: pack.packDirectory});

            process.on("error", err => {
                Logger.errorImpl("IPCMain", "Exception during launch " + err.stack);
            });

            process.on("exit", code => {
                if (code === 0) {
                    Logger.infoImpl("IPCMain", `Game instance for pack ${packName} exited with code 0.`);
                    event.sender.send("pack exit", packName);
                } else {
                    Logger.warnImpl("IPCMain", `Game instance for pack ${packName} appears to have crashed; exited with code ${code}`);
                    event.sender.send("pack crash", packName);
                }
            });
        } catch (e) {
            Logger.errorImpl("IPCMain", "Exception during launch " + e.stack);
        }
    }

    private static async installMods(event: IpcMessageEvent, packName: string, mods: ModJar[]) {
        return new Promise(async ff => {
            Logger.infoImpl("InstallMods", `Renderer requested that we install ${mods.length} mod/s.`);

            let pack = await InstalledPackManager.GetPackDetails(packName);

            let alreadyInstalled = pack.installedMods.filter(im => !!mods.find(m => im.slug === m.slug) && existsSync(join(pack.modsDirectory, im.filename)));
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
            let actuallyNeedInstall = mods.filter(m => !existsSync(join(pack.modsDirectory, m.filename)) || !pack.installedMods.find(im => im.slug === m.slug && im.id === m.id));
            Logger.debugImpl("InstallMods", `We're actually about to install ${actuallyNeedInstall.length} mod/s`);

            Promise.all(actuallyNeedInstall.map(async jar => {
                await Utils.downloadWithMD5(`https://www.curseforge.com/minecraft/mc-mods/${jar.slug}/download/${jar.id}/file`, join(pack.modsDirectory, jar.filename), jar.md5);
                event.sender.send("mod installed", packName, jar);
                pack.installedMods.push(jar);

                InstalledPackManager.SaveModifiedPackData();
            })).then(ff);
        });
    }
}
