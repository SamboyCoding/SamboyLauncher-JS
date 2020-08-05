import {spawn} from "child_process";
import datauri from "datauri";
import {app, dialog, ipcMain, IpcMainEvent} from "electron";
import {existsSync, unlinkSync} from "fs";
import {readFileSync, writeFileSync} from "jsonfile";
import * as os from "os";
import {isAbsolute, join} from "path";
import * as rimraf from "rimraf";
import Logger from "../logger";
import ForgeVersion from "../model/ForgeVersion";
import InstalledPack from "../model/InstalledPack";
import InstalledPackJSON from "../model/InstalledPackJSON";
import MainProcessBoundDownloadRequest from "../model/MainProcessBoundDownloadRequest";
import MavenArtifact from "../model/MavenArtifact";
import MCVersion from "../model/MCVersion";
import ModJar from "../model/ModJar";
import Utils from "../util/Utils";
import AuthenticationManager from "./AuthenticationManager";
import ClientInstallManager from "./ClientInstallManager";
import ConfigurationManager from "./ConfigurationManager";
import DownloadManager from "./DownloadManager";
import ElectronManager from "./ElectronManager";
import EnvironmentManager from "./EnvironmentManager";
import InstalledPackManager from "./InstalledPackManager";

export default class MainIPCHandler {
    private static dataUrlMap: Map<string, string> = new Map<string, string>();

    public static Init() {
        ipcMain.on("renderer log", (event, message) => Logger.infoImpl("Renderer", message));

        ipcMain.on("install pack client", MainIPCHandler.installPackClient);
        ipcMain.on("create pack", MainIPCHandler.createPack);
        ipcMain.on("launch pack", MainIPCHandler.launchPack);
        ipcMain.on("install mods", MainIPCHandler.installMods);
        ipcMain.on("generate data url", MainIPCHandler.generateDataUrl);
        ipcMain.on("process download request", (event, request: MainProcessBoundDownloadRequest) => {
            DownloadManager.HandleRequest(request).catch(e => {
                Logger.errorImpl("IPCMain", "Download Manager threw exception: " + e.stack);
            });
        })

        ipcMain.on("sign in", async (event: IpcMainEvent, email: string, password: string) => {
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

        ipcMain.on("import pack", async (event: IpcMainEvent) => {
            let result = await dialog.showOpenDialog(ElectronManager.win, {
                filters: [{
                    extensions: ["json"],
                    name: "Pack JSON"
                }],
                properties: [
                    "openFile"
                ],
                title: "Import Pack JSON..."
            });

            let files = result.filePaths;

            if (!files || !files.length) return;

            let json: InstalledPackJSON = readFileSync(files[0]);
            if (!json.packName) return event.sender.send("import failed", "Couldn't import pack, because the specified file was not a pack JSON");

            let pack = await InstalledPack.FromJSON(json);

            event.sender.send("importing pack", pack.name);
            this.installPackClient(event, pack.name, pack.gameVersion.name, pack.forgeVersion.name).then(async () => {
                InstalledPackManager.PostImport(pack, json);

                event.sender.send("importing mods", pack.name, pack.installedMods.length);

                this.installMods(event, pack.name, await pack.modJars).then(() => {
                    event.sender.send("pack imported", pack.name);

                    Logger.infoImpl("IPCMain", "Reloading installed packs...");
                    InstalledPackManager.LoadFromDisk();

                    ElectronManager.win.webContents.send("installed packs", InstalledPackManager.GetPackNames());
                    ElectronManager.win.webContents.send("created packs", InstalledPackManager.GetOwnedPackNames());
                });
            });
        });

        ipcMain.on("get pack data", async (event: IpcMainEvent, name: string) => {
            let pack = await InstalledPackManager.GetPackDetails(name);
            event.sender.send("pack data", pack);
        });

        ipcMain.on("get pack json", async (event: IpcMainEvent, name: string) => {
            event.sender.send("pack json", InstalledPackManager.GetPackJSON(name));
        });

        ipcMain.on("get installed packs", () => {
            ElectronManager.win.webContents.send("installed packs", InstalledPackManager.GetPackNames());
            ElectronManager.win.webContents.send("created packs", InstalledPackManager.GetOwnedPackNames());

            //While we're at it, let's send the username, as this event means we're ready on renderer
            if (AuthenticationManager.username)
                ElectronManager.win.webContents.send("username", AuthenticationManager.username);

            ElectronManager.win.webContents.send("gc mode", ConfigurationManager.gcMode);
        });

        ipcMain.on("update pack versions", async (event: IpcMainEvent, packName: string, gameVersion: string, forgeVersion: string) => {
            let pack = await InstalledPackManager.GetPackDetails(packName);
            pack.gameVersion = await MCVersion.Get(gameVersion);
            pack.forgeVersion = await ForgeVersion.Get(forgeVersion);

            await InstalledPackManager.SaveModifiedPackData();
            event.sender.send("pack versions updated", packName);
        });

        ipcMain.on("remove mod", async (event: IpcMainEvent, packName: string, slug: string) => {
            Logger.debugImpl("IPCMain", `Renderer requested we remove mod ${slug} from ${packName}`);
            let pack = await InstalledPackManager.GetPackDetails(packName);
            let jars = await pack.modJars;
            let idx = jars.findIndex(m => m.addonSlug === slug);

            if (idx < 0)
                return Logger.warnImpl("IPCMain", `Renderer requested we remove mod ${slug} from ${packName} but it's not present`);

            let file = join(pack.modsDirectory, jars[idx].filename);
            Logger.debugImpl("IPCMain", `Delete file: ${file}`);
            if (!existsSync(file))
                Logger.errorImpl("IPCMain", `Renderer requested we remove mod ${slug} from ${packName}, and it's apparently installed, but the file ${file} does not exist!`);
            else
                unlinkSync(file);

            pack.installedMods.splice(idx, 1);

            await InstalledPackManager.SaveModifiedPackData();

            event.sender.send("mod removed", packName, slug);
        });

        ipcMain.on("delete pack", async (event: IpcMainEvent, name: string) => {
            let pack = await InstalledPackManager.GetPackDetails(name);

            Logger.warnImpl("IPCMain", `Deleting pack ${name}...`);
            let dir = pack.packDirectory;
            Logger.debugImpl("IPCMain", `Delete dir: ${dir}`);
            try {
                rimraf.sync(dir);
            } catch (e) {
                event.sender.send("delete pack failed", name);
            }

            Logger.infoImpl("IPCMain", "Reloading installed packs...");
            InstalledPackManager.LoadFromDisk();

            ElectronManager.win.webContents.send("installed packs", InstalledPackManager.GetPackNames());
            ElectronManager.win.webContents.send("created packs", InstalledPackManager.GetOwnedPackNames());
        });

        ipcMain.on("set gc mode", (event: IpcMainEvent, mode: string) => {
            ConfigurationManager.gcMode = mode;
        });
    }

    private static async installPackClient(event: IpcMainEvent, packName: string, gameVersionId: string, forgeVersionId: string) {

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

    private static async createPack(event: IpcMainEvent, name: string, description: string, gameVersion: string, forgeVersion: string) {
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

    private static async launchPack(event: IpcMainEvent, packName: string) {
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

        //CMS
        if (ConfigurationManager.gcMode === "cms") {
            Logger.debugImpl("Launch", "Using CMS GC");
            args = args.concat(["-XX:UseSSE=4", "-XX:+UseConcMarkSweepGC", "-XX:+UseCMSCompactAtFullCollection", "-XX:+UseParNewGC", "-XX:+DisableExplicitGC", "-XX:+AggressiveOpts"]);
        }

        //CPWs G1GC
        else if (ConfigurationManager.gcMode === "g1") {
            Logger.debugImpl("Launch", "Using GARBAGE-FIRST GC");
            args = args.concat(["-XX:+UseG1GC", "-Dsun.rmi.dgc.server.gcInterval=2147483646", "-XX:+UnlockExperimentalVMOptions", "-XX:G1NewSizePercent=20", "-XX:G1ReservePercent=20", "-XX:MaxGCPauseMillis=50", "-XX:G1HeapRegionSize=32M"]);
        }

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
            if (memGig > 7) {
                args.push("-Xmx7G");
                if (ConfigurationManager.gcMode === "g1")
                    args.push(`-Xms7G`);
            } else {
                args.push(`-Xmx${memGig}G`);
                if (ConfigurationManager.gcMode === "g1")
                    args.push(`-Xms${memGig}G`);
            }
        } else {
            args.push("-Xmx5G"); //FIXME: Defaults to 5G ram on linux/mac
            if (ConfigurationManager.gcMode === "g1")
                args.push(`-Xms5G`);
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

    private static async installMods(event: IpcMainEvent, packName: string, mods: ModJar[]) {
        return new Promise(async ff => {
            Logger.infoImpl("InstallMods", `Renderer requested that we install ${mods.length} mod/s.`);

            let pack = await InstalledPackManager.GetPackDetails(packName);

            let jars = await pack.modJars;

            let alreadyInstalled = jars.filter(im => !!mods.find(m => im.addonSlug === m.addonSlug) && existsSync(join(pack.modsDirectory, im.filename)));
            Logger.debugImpl("InstallMods", `${alreadyInstalled.length} of those are already installed;`);

            let wrongVersion = alreadyInstalled.filter(im => mods.find(m => im.addonSlug === m.addonSlug).fileId !== im.fileId);
            Logger.debugImpl("InstallMods", `And of those, ${wrongVersion.length} currently have/has the wrong version installed`);

            wrongVersion.forEach(wv => {
                let installPath = join(pack.modsDirectory, wv.filename);
                if (!existsSync(installPath)) {
                    Logger.warnImpl("InstallMods", `${wv.addonSlug} is supposedly already installed (but wrong version), but the file ${wv.filename} couldn't be found in the mods dir.`);
                    return;
                }

                Logger.debugImpl("InstallMods", `Delete file: ${installPath}`);
                unlinkSync(installPath);
            });

            //Find any mods where we don't have one installed with the same slug and ver id.
            let actuallyNeedInstall = mods.filter(m => !existsSync(join(pack.modsDirectory, m.filename)) || !jars.find(im => im.addonSlug === m.addonSlug && im.fileId === m.fileId));
            Logger.debugImpl("InstallMods", `We're actually about to install ${actuallyNeedInstall.length} mod/s`);

            Promise.all(actuallyNeedInstall.map(async jar => {
                //TODO: Can we restore MD5 at some point
                // await Utils.downloadWithMD5(`https://www.curseforge.com/minecraft/mc-mods/${jar.slug}/download/${jar.id}/file`, join(pack.modsDirectory, jar.filename), jar.md5);
                await Utils.downloadFile(jar.downloadUrl, join(pack.modsDirectory, jar.filename));
                Logger.debugImpl("InstallMods", `Downloaded ${jar.downloadUrl}`);
                event.sender.send("mod installed", packName, jar);

                //Once again remove any other versions, this is the actually correct one. Fix for importing packs and double-clicking the install button
                pack.installedMods = jars.filter(m => m.addonSlug !== jar.addonSlug);

                pack.installedMods.push(jar);

                InstalledPackManager.SaveModifiedPackData();
            })).then(ff);
        });
    }

    private static async generateDataUrl(event: IpcMainEvent, key: string) {
        let ret: string;
        try {
            let path = isAbsolute(key) ? key : join(app.getAppPath(), "..", "..", key);

            if(MainIPCHandler.dataUrlMap.has(path))
                ret = MainIPCHandler.dataUrlMap.get(path);
            else {

                Logger.infoImpl("GDU", "Load file " + path);
                ret = await datauri(path);
                Logger.infoImpl("GDU", "Loaded");

                MainIPCHandler.dataUrlMap.set(path, ret);
            }
        } catch(e) {
            Logger.warnImpl("GDU", "Couldn't handle request: " + e.message);
            ret = null;
        }

        event.sender.send("data url generated", key, ret);
    }
}
