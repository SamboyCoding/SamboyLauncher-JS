//#region Imports
import * as asar from "asar";
import * as child_process from "child_process";
import * as download from "download";
import { app, BrowserWindow, ipcMain, IpcMessageEvent, Menu, MenuItem } from "electron";
import * as isDev from "electron-is-dev";
import { autoUpdater } from "electron-updater";
import * as fs from "fs";
import * as hasha from "hasha";
import * as jsonfile from "jsonfile";
import * as mkdirp from "mkdirp";
import * as web from "node-fetch";
import * as os from "os";
import * as path from "path";
import * as rmfr from "rmfr";
import { Extract } from "unzipper";
import { Config } from "./config";
import * as config from "./config";
import { downloadAssetManifest, downloadAssets, downloadForgeJarAndGetJSON, downloadForgeLibraries, downloadGameClient, downloadVanillaLibraries, downloadVanillaNatives, getVanillaVersionList, getVanillaVersionManifest } from "./gameInstaller";
import { Logger } from "./logger";
import { AuthData, LibraryArtifact, LibraryMetadata, Mod, Pack, VanillaManifestVersion, VanillaVersionData } from "./objects";
//#endregion

// TODO: List is here because I feel like it
//  -Analytics - send a request when a pack is installed and when it is run
//  -Custom game resolutions
//  -Custom/Reworked memory allocation
//  -Custom JVM Args?

const fetch = web.default;
const launcherDir: string = path.join(process.platform === "win32" ?
    process.env.APPDATA : (process.platform === "darwin" ?
        path.join(process.env.HOME, "Library", "Preferences")
        : path.join(process.env.HOME, ".SamboyLauncher/")),
    "SamboyLauncher_JS");

const configuration: Config = config.load(launcherDir);

const packsDir = path.join(launcherDir, "packs");

const authData: AuthData = new AuthData();

//#region Utility Functions

function btoa(str: string): string {
    return Buffer.from(str, "binary").toString("base64");
}

function atob(str: string): string {
    return Buffer.from(str, "base64").toString("binary");
}

async function downloadFile(url: string, localPath: string): Promise<any> {
    return download(url, path.dirname(localPath), { filename: path.basename(localPath) });
}

async function mkdirpPromise(location: string): Promise<any> {
    return new Promise((ff, rj) => {
        mkdirp(location, (err, made) => {
            if (err) { return rj(err); }

            ff();
        });
    });
}

//#endregion

//#region Electron BP Code

let win: BrowserWindow;

function createWindow(): void {
    win = new BrowserWindow({
        frame: false,
        height: 720,
        width: 1280,
    });

    const menu: Menu = new Menu();

    if (isDev) {
        menu.append(new MenuItem({
            accelerator: "CmdOrCtrl+R",
            click: () => {
                win.webContents.reload();
            },
            label: "Reload",
        }));
    }

    menu.append(new MenuItem({
        accelerator: "CmdOrCtrl+Shift+I",
        click: () => {
            win.webContents.openDevTools();
        },
        label: "Open DevTools",
    }));

    win.setMenu(menu);

    win.loadFile("src/renderer/html/index.html");

    win.webContents.on("did-finish-load", () => {
        win.webContents.send("dark theme", configuration.darkTheme);
    });

    win.on("closed", () => {
        win = null;
    });
}

app.on("ready", async () => {
    await onReady();
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (win === null) {
        createWindow();
    }
});

//#endregion

async function onReady() {
    if (!fs.existsSync(launcherDir)) {
        await mkdirpPromise(launcherDir);
    }

    if (fs.existsSync(path.join(launcherDir, "authdata"))) {
        try {
            const content: any = jsonfile.readFileSync(path.join(launcherDir, "authdata"));

            if (content.accessToken) {
                authData.accessToken = content.accessToken;
            }

            if (content.clientToken) {
                authData.clientToken = content.clientToken;
            }

            if (content.hash) {
                authData.password = atob(content.hash);
            }

            if (content.username) {
                authData.username = content.username;
            }

            if (content.uuid) {
                authData.uuid = content.uuid;
            }

            if (content.email) {
                authData.email = content.email;
            }
        } catch (e) {
            jsonfile.writeFileSync(path.join(launcherDir, "authdata"), {});
        }
    } else {
        jsonfile.writeFileSync(path.join(launcherDir, "authdata"), {});
    }
}

ipcMain.on("get backgrounds", (event: IpcMessageEvent) => {
    if (fs.existsSync(path.join(__dirname, "..", "..", "src", "renderer", "resources", "backgrounds"))) {
        fs.readdir(path.join(__dirname, "..", "..", "src", "renderer", "resources", "backgrounds"), (err: NodeJS.ErrnoException, files: string[]) => {
            event.sender.send("backgrounds", files);
        });
    } else {
        event.sender.send("backgrounds", asar.listPackage("app.asar").filter((file: string) => file.indexOf("renderer") >= 0 && file.indexOf("backgrounds") >= 0)
            .map((file: string) => file.replace(".." + path.sep + "renderer", "..")));
    }
});

ipcMain.on("get installed packs", (event: IpcMessageEvent) => {
    if (!fs.existsSync(packsDir)) {
        return event.sender.send("installed packs", []);
    }

    fs.readdir(packsDir, (error, packFolders) => {
        if (error) { return event.sender.send("installed packs", []); }

        const packData = packFolders
            .filter((packFolder) => fs.existsSync(path.join(packsDir, packFolder, "install.json")))
            .map((packFolder) => path.join(packsDir, packFolder, "install.json"))
            .map((installJson) => jsonfile.readFileSync(installJson));

        event.sender.send("installed packs", packData);
    });
});

ipcMain.on("get top packs", (event: IpcMessageEvent) => {
    fetch("https://launcher.samboycoding.me/api/mostPopularPacks").then((resp) => {
        return resp.json();
    }).then((json) => {
        event.sender.send("top packs", json);
    });
});

ipcMain.on("set dark", (event: IpcMessageEvent, dark: boolean) => {
    configuration.darkTheme = dark;
    config.save(launcherDir, configuration);
    event.sender.send("dark theme", configuration.darkTheme);
});

// ---------------------
//#region Authentication

function saveAuthdata() {
    const content: any = {};

    if (authData.accessToken) {
        content.accessToken = authData.accessToken;
    }

    if (authData.clientToken) {
        content.clientToken = authData.clientToken;
    }

    if (authData.password) {
        content.hash = btoa(authData.password);
    }

    if (authData.username) {
        content.username = authData.username;
    }

    if (authData.uuid) {
        content.uuid = authData.uuid;
    }

    if (authData.email) {
        content.email = authData.email;
    }

    jsonfile.writeFileSync(path.join(launcherDir, "authdata"), content);
}

async function login(email: string, password: string, remember: boolean) {
    return new Promise((ff, rj) => {
        fetch("https://authserver.mojang.com/authenticate", {
            body: JSON.stringify({
                agent: {
                    name: "Minecraft",
                    version: 1,
                },
                clientToken: authData.clientToken ? authData.clientToken : undefined,
                password,
                requestUser: true,
                username: email,
            }),
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST",
        }).then((resp) => {
            return resp.json();
        }).then((json) => {
            try {
                if (json.error) {
                    rj(json.errorMessage);
                } else {
                    const at: string = json.accessToken;
                    const ct: string = json.clientToken;
                    const uid: string = json.selectedProfile.id;
                    const un: string = json.selectedProfile.name;

                    authData.accessToken = at;
                    authData.clientToken = ct;
                    authData.uuid = uid;
                    authData.username = un;
                    authData.email = email;
                    if (remember) {
                        authData.password = password;
                    } else {
                        authData.password = "";
                    }

                    saveAuthdata();

                    ff();
                }
            } catch (e) {
                rj(e);
            }
        });
    });
}

ipcMain.on("get profile", (event: IpcMessageEvent) => {
    if (authData.accessToken && authData.username && authData.uuid) {
        event.sender.send("profile", authData.username, authData.uuid);
    } else {
        event.sender.send("no profile");
    }
});

ipcMain.on("login", async (event: IpcMessageEvent, email: string, password: string, remember: boolean) => {
    try {
        await login(email, password, remember);

        event.sender.send("profile", authData.username, authData.uuid);
    } catch (e) {
        event.sender.send("login error", e);
    }
});

ipcMain.on("logout", (event: IpcMessageEvent) => {
    authData.accessToken = undefined;
    authData.password = undefined;
    authData.username = undefined;
    authData.uuid = undefined;

    saveAuthdata();

    event.sender.send("logged out");
});

ipcMain.on("validate session", (event: IpcMessageEvent) => {
    if (!authData.accessToken) { return; }

    fetch("https://authserver.mojang.com/validate", {
        body: JSON.stringify({
            accessToken: authData.accessToken,
            clientToken: authData.clientToken,
        }),
        headers: {
            "Content-Type": "application/json",
        },
        method: "POST",
    }).then(async (resp) => {
        if (resp.status === 204) { return; } // Session valid

        if (authData.email && authData.password) {
            try {
                await login(authData.email, authData.password, true); // Already set to remember, so remember again
            } catch (e) {
                event.sender.send("session invalid");
            }
        } else {
            event.sender.send("session invalid");
        }
    });
});

//#endregion
// ---------------------

// ----------------------------
//#region Pack (Un)Installation

ipcMain.on("get update actions", async (event: IpcMessageEvent, pack: Pack) => {
    // Work out what we need to do with this pack to update it.
    const responseData = {
        addMods: new Array<Mod>(),
        forge: {
            from: pack.forgeVersion,
            to: pack.updatedForgeVersion !== pack.forgeVersion ? pack.updatedForgeVersion : null,
        },
        removeMods: new Array<Mod>(),
        updateMods: new Array<any>(),
        version: {
            from: pack.installedVersion,
            to: pack.latestVersion,
        },
    };

    // Filter out the mods that are NOT in the installed mods list but in the pack's mod list.
    responseData.addMods = responseData.addMods.concat(pack.latestMods.filter(mod => !pack.mods.filter(installedMod => installedMod.slug === mod.slug).length));

    // Filter out the mods that ARE in the installled mods list but not in the pack's mod list.
    responseData.removeMods = responseData.removeMods.concat(pack.mods.filter(installedMod => !pack.latestMods.filter(mod => installedMod.slug === mod.slug).length));

    // Filter out the mods that are in both the installed and latest mod list, but where the version differs.
    responseData.updateMods = responseData.updateMods.concat(pack.latestMods.filter(mod => {
        const currentMod = pack.mods.filter(installedMod => installedMod.slug === mod.slug)[0];
        if (!currentMod) return false;

        return currentMod.fileId !== mod.fileId;
    }).map(mod => {
        const currentMod = pack.mods.filter(installedMod => installedMod.slug === mod.slug)[0];

        return {
            from: currentMod,
            to: mod,
        };
    }));

    event.sender.send("update actions", responseData);
});

ipcMain.on("update pack", async (event: IpcMessageEvent, pack: Pack, updateData: any) => {
    let currentPercent = 0;
    const percentPer = 97 / ((updateData.forge.to ? 1 : 0) + updateData.addMods.length + updateData.updateMods.length + updateData.removeMods.length);

    event.sender.send("pack update progress", -1, `Starting upgrade...`);

    // First things first, let's update forge if we need to.
    if (updateData.forge.to) {
        currentPercent += percentPer;
        event.sender.send("pack update progress", currentPercent / 100, `Updating forge from ${updateData.forge.from} to ${updateData.forge.to}...`);

        let unpack200 = "unpack200";

        if (process.platform === "win32") {
            // Oracle does stupid stuff on windows with the location of java, so find it manually
            if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java"))) {
                return;
            }

            const files = fs.readdirSync(path.join(process.env.PROGRAMFILES, "Java"));
            const installation = files.find((file) => file.startsWith("jre1.8") || file.startsWith("jdk1.8"));
            if (!installation) {
                return;
            }

            if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "unpack200.exe"))) {
                return;
            }

            unpack200 = path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "unpack200.exe");
        }

        const forgeVersionFolder = path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + updateData.forge.to);

        if (!fs.existsSync(path.join(forgeVersionFolder, "forge.jar"))) {
            await downloadForgeJarAndGetJSON(forgeVersionFolder, updateData.forge.to, pack.gameVersion, event.sender);

            const versionJSON = jsonfile.readFileSync(path.join(forgeVersionFolder, "version.json"));

            const libs = versionJSON.libraries.filter((lib: any) => lib.name.indexOf("net.minecraftforge:forge:") === -1);

            event.sender.send("pack update progress", currentPercent / 100, `Updating forge libraries, this may take a minute...`);

            await downloadForgeLibraries(launcherDir, libs, unpack200, event.sender);
        }
    }

    const modsDir = path.join(launcherDir, "packs", pack.packName, "mods");

    if (!fs.existsSync(modsDir))
        await mkdirpPromise(modsDir);

    // Now let's remove any mods that we don't need anymore, because that's easy

    // Firstly, mods we need to outright remove
    for (const i in updateData.removeMods) {
        const modToRemove: Mod = updateData.removeMods[i];

        currentPercent += percentPer;
        event.sender.send("pack update progress", currentPercent / 100, `Removing ${modToRemove.resolvedName}...`);

        const modPath = path.join(modsDir, modToRemove.resolvedVersion);
        fs.unlinkSync(modPath);
    }

    // Now remove old versions of mods we're updating and download the new ones
    for (const i in updateData.updateMods) {
        const modToRemove: Mod = updateData.updateMods[i].from;
        const modToAdd: Mod = updateData.updateMods[i].to;

        currentPercent += percentPer;
        event.sender.send("pack update progress", currentPercent / 100, `Updating ${modToRemove.resolvedName} from ${modToRemove.resolvedVersion} => ${modToAdd.resolvedVersion}...`);

        const modPath = path.join(modsDir, modToRemove.resolvedVersion);
        fs.unlinkSync(modPath);

        const url = `https://minecraft.curseforge.com/projects/${modToAdd.slug}/files/${modToAdd.fileId}/download`;

        await downloadFile(url, path.join(modsDir, modToAdd.resolvedVersion));
    }

    // Now download mods we're adding anew
    for (const i in updateData.addMods) {
        const modToAdd: Mod = updateData.addMods[i];

        currentPercent += percentPer;
        event.sender.send("pack update progress", currentPercent / 100, `Downloading ${modToAdd.resolvedName} (${modToAdd.resolvedVersion})...`);

        const url = `https://minecraft.curseforge.com/projects/${modToAdd.slug}/files/${modToAdd.fileId}/download`;

        await downloadFile(url, path.join(modsDir, modToAdd.resolvedVersion));
    }

    event.sender.send("pack update progress", 0.98, `Finishing up`);

    jsonfile.writeFileSync(path.join(launcherDir, "packs", pack.packName, "install.json"), {
        author: pack.author,
        forgeVersion: updateData.forge.to,
        gameVersion: pack.gameVersion,
        id: pack.id,
        installedMods: pack.latestMods,
        installedVersion: updateData.version.to,
        packName: pack.packName,
    });

    event.sender.send("pack update progress", 1, `Finished.`);

    event.sender.send("pack update complete");
});

ipcMain.on("uninstall pack", async (event: IpcMessageEvent, pack: Pack) => {
    const packDir = path.join(launcherDir, "packs", pack.packName);
    if (!fs.existsSync(packDir)) { return; }

    event.sender.send("uninstalling pack");

    await rmfr(packDir);

    event.sender.send("uninstalled pack");
});

ipcMain.on("install pack", async (event: IpcMessageEvent, pack: Pack) => {
    try {
        let unpack200 = "unpack200";
        let java = "java";

        if (process.platform === "win32") {
            // Oracle does stupid stuff on windows with the location of java, so find it manually
            if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java"))) {
                event.sender.send("install log", "[ERROR] NO JAVA INSTALLED FOR THE CORRECT ARCHITECTURE (IF YOU'RE ON A 64-BIT PC, AND THINK YOU HAVE JAVA, YOU NEED TO INSTALL 64-BIT JAVA)");
                event.sender.send("vanilla progress", "No Java found. Refusing to install.", 0);
                event.sender.send("modded progress", "No Java found. Refusing to install.", 0);
                event.sender.send("install failed", "Missing Java.");
                return;
            }

            const files = fs.readdirSync(path.join(process.env.PROGRAMFILES, "Java"));
            const installation = files.find((file) => file.startsWith("jre1.8") || file.startsWith("jdk1.8"));
            if (!installation) {
                event.sender.send("install log", "[ERROR] JAVA APPEARS TO BE INSTALLED, BUT IT'S NOT JAVA 8. MINECRAFT ONLY RUNS WITH JAVA 8, PLEASE INSTALL IT.)");
                event.sender.send("vanilla progress", "Wrong Java version found. Refusing to install.", 0);
                event.sender.send("modded progress", "Wrong Java version found. Refusing to install.", 0);
                event.sender.send("install failed", "Wrong Java version.");
                return;
            }

            if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "javaw.exe")) || !fs.existsSync(path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "unpack200.exe"))) {
                event.sender.send("install log", "[ERROR] BROKEN JAVA DETECTED. MISSING EITHER JAVAW OR UNPACK200. PLEASE CLEAN UP YOUR JAVA INSTALLATIONS.)");
                event.sender.send("vanilla progress", "Corrupt Java version found. Refusing to install.", 0);
                event.sender.send("modded progress", "Corrupt Java version found. Refusing to install.", 0);
                event.sender.send("install failed", "Corrupt Java.");
                return;
            }

            unpack200 = path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "unpack200.exe");
            java = path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "javaw.exe");
        } else {
            try {
                // Test java installation
                const result = child_process.spawnSync(java, ["-version"], {
                    encoding: "utf8",
                    stdio: "pipe",
                });

                // For some GODAWFUL reason this is sent to standard err instead of standard out.
                if (result.stderr.indexOf("1.8.0_") < 0) {
                    event.sender.send("install log", "[ERROR] INCORRECT JAVA VERSION DETECTED (NEED JAVA 8). REFUSING TO INSTALL. JAVA VERSION INFO: " + result);
                    event.sender.send("vanilla progress", "Incorrect Java version found. Refusing to install.", 0);
                    event.sender.send("modded progress", "Incorrect Java version found. Refusing to install.", 0);
                    event.sender.send("install failed", "Incorrect java version.");
                    return;
                }
            } catch (err) {
                event.sender.send("install log", "[ERROR] NO/BROKEN JAVA DETECTED (NEED WORKING JAVA 8). REFUSING TO INSTALL.");
                event.sender.send("vanilla progress", "Missing or Broken Java version found. Refusing to install.", 0);
                event.sender.send("modded progress", "Missing or Broken Java version found. Refusing to install.", 0);
                event.sender.send("install failed", "Broken or missing Java.");
                return;
            }
        }

        if (!fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".jar"))) {
            event.sender.send("vanilla progress", "Fetching version listing...", 0);
            event.sender.send("modded progress", "Waiting for base game to install...", -1);

            const versions: VanillaManifestVersion[] = await getVanillaVersionList();
            const version: VanillaManifestVersion = versions.find((ver) => ver.id === pack.gameVersion);

            if (!version) {
                event.sender.send("install failed", "Couldn't find version " + pack.gameVersion + " in installable version list.");
            }

            event.sender.send("vanilla progress", `Fetching version information for ${version.id}...`, 2 / 100);

            const versionData: VanillaVersionData = await getVanillaVersionManifest(launcherDir, version);

            const libraries: LibraryMetadata[] = versionData.libraries.filter((lib) => lib.downloads.artifact && lib.downloads.artifact.url);
            const natives: LibraryMetadata[] = versionData.libraries.filter((lib) => lib.natives);

            // -----------------
            // Vanilla Libraries
            // -----------------
            event.sender.send("vanilla progress", `Starting download of ${libraries.length} libraries for ${versionData.id}...`, 5 / 100);

            await downloadVanillaLibraries(launcherDir, libraries, event.sender);

            event.sender.send("vanilla progress", `Starting download of ${natives.length} natives for ${versionData.id}...`, 30 / 100);

            // ---------------
            // Vanilla Natives
            // ---------------

            const ourOs = process.platform === "darwin" ? "osx" : process.platform === "win32" ? "windows" : "linux";
            const arch = process.arch.indexOf("64") > -1 ? "64" : "32";
            const nativesFolder = path.join(launcherDir, "versions", version.id, "natives");

            await downloadVanillaNatives(launcherDir, ourOs, arch, nativesFolder, natives, event.sender);

            // ----------------------
            // Vanilla Asset Manifest
            // ----------------------

            await downloadAssetManifest(launcherDir, versionData.assetIndex, event.sender);

            // --------------
            // Vanilla Assets
            // --------------

            await downloadAssets(launcherDir, versionData.assetIndex, event.sender);

            // -----------
            // Game Client
            // -----------

            await downloadGameClient(launcherDir, versionData, event.sender);

            event.sender.send("vanilla progress", `Finished`, 1);
        } else {
            event.sender.send("vanilla progress", `Game client is already installed.`, 1);
        }

        const forgeVersionFolder = path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion);

        if (pack.forgeVersion && !fs.existsSync(path.join(forgeVersionFolder, "forge.jar"))) {
            if (!fs.existsSync(forgeVersionFolder)) {
                await mkdirpPromise(forgeVersionFolder);
            }

            // ---------
            // Forge JAR
            // ---------

            await downloadForgeJarAndGetJSON(forgeVersionFolder, pack.forgeVersion, pack.gameVersion, event.sender);

            // ----------
            // Forge Libs
            // ----------

            event.sender.send("modded progress", `Reading forge version info...`, 3 / 100);
            const versionJSON = jsonfile.readFileSync(path.join(forgeVersionFolder, "version.json"));

            event.sender.send("modded progress", `Preparing to install forge libraries...`, 4 / 100);

            const libs = versionJSON.libraries.filter((lib: any) => lib.name.indexOf("net.minecraftforge:forge:") === -1);

            await downloadForgeLibraries(launcherDir, libs, unpack200, event.sender);

            // Move to here to mark as installed once libs installed.
            fs.copyFileSync(path.join(forgeVersionFolder, "forge_temp.jar"), path.join(forgeVersionFolder, "forge.jar"));
            fs.unlinkSync(path.join(forgeVersionFolder, "forge_temp.jar"));
        }

        const packDir = path.join(packsDir, pack.packName);
        const modsDir = path.join(packDir, "mods");

        if (!fs.existsSync(modsDir)) {
            await mkdirpPromise(modsDir);
        }

        let installedMods: Mod[] = [];
        if (fs.existsSync(path.join(packDir, "install.json"))) {
            installedMods = jsonfile.readFileSync(path.join(packDir, "install.json")).installedMods;
        }

        if (pack.mods.length) {
            event.sender.send("modded progress", `Commencing mods download...`, 50 / 100);
            const percentPer = 45 / pack.mods.length;
            let current = 50;

            for (const index in pack.mods) {
                current += percentPer;
                const mod = pack.mods[index];

                event.sender.send("modded progress", `Downloading mod ${Number(index) + 1}/${pack.mods.length}: ${mod.resolvedName}`, current / 100);

                if (installedMods.find((m) => m.fileId === mod.fileId)) {
                    event.sender.send("install log", "[Modpack] \tVersion already downloaded; not downloading again.");
                    continue;
                }

                const url = `https://minecraft.curseforge.com/projects/${mod.slug}/files/${mod.fileId}/download`;

                event.sender.send("install log", "[Modpack] \tDownloading " + mod.resolvedVersion + " from " + url);

                await downloadFile(url, path.join(modsDir, mod.resolvedVersion));
            }
        }

        event.sender.send("modded progress", `Checking for overrides`, 0.95);

        const resp = await fetch("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, {
            method: "HEAD",
        });

        if (resp.status === 200) {
            event.sender.send("modded progress", `Downloading overrides`, 0.96);
            await downloadFile("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, path.join(packDir, "overrides.zip"));

            event.sender.send("modded progress", `Installing overrides`, 0.97);

            await new Promise((ff, rj) => {
                fs.createReadStream(path.join(packDir, "overrides.zip")).pipe(Extract({ path: packDir })).on("close", () => {
                    ff();
                });
            });
        } else {
            event.sender.send("install log", "[Modpack] \tNo overrides.");
        }

        event.sender.send("modded progress", `Finishing up`, 0.98);

        jsonfile.writeFileSync(path.join(packDir, "install.json"), {
            author: pack.author,
            forgeVersion: pack.forgeVersion,
            gameVersion: pack.gameVersion,
            id: pack.id,
            installedMods: pack.mods,
            installedVersion: pack.version,
            packName: pack.packName,
        });

        event.sender.send("modded progress", `Finished.`, 1);

        event.sender.send("install complete");
    } catch (e) {
        event.sender.send("install failed", "An exception occurred: " + e);
        event.sender.send("install log", "[Error] An Exception occurred: " + e);
    }
});

//#endregion
// ----------------------------

// ---------------------
//#region Pack Launching

ipcMain.on("launch pack", (event: IpcMessageEvent, pack: Pack) => {
    let gameArgs: string[] = [];
    let jvmArgs: string[] = [];
    const classPath: string[] = [];
    let mainClass: string;

    let vanillaManifest: VanillaVersionData;
    let forgeManifest: any;

    if (pack.forgeVersion) {
        // Launch forge
        if (!fs.existsSync(path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion, "forge.jar"))
            || !fs.existsSync(path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion, "version.json"))) {
            return event.sender.send("launch failed", "Forge version is no longer installed or installation corrupt. Please reinstall the pack.");
        }

        if (!fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".jar"))
            || !fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".json"))) {
            return event.sender.send("launch failed", "Base game version is no longer installed or installation corrupt. Please reinstall the pack.");
        }

        forgeManifest = jsonfile.readFileSync(path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion, "version.json"));
        vanillaManifest = jsonfile.readFileSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".json"));

        const arch = process.arch.indexOf("64") > -1 ? "x64" : "x86";

        gameArgs = forgeManifest.minecraftArguments.split(" ");
        jvmArgs = [];
        if (process.platform === "darwin") {
            jvmArgs.push("-XstartOnFirstThread");
        }
        if (process.platform === "win32") {
            jvmArgs.push("-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump");
        }
        if (process.platform === "win32" && os.release().startsWith("10.")) {
            jvmArgs = jvmArgs.concat(["-Dos.name=Windows 10", "-Dos.version=10.0"]);
        }
        if (arch === "x86") {
            jvmArgs.push("-Xss1M");
        }

        jvmArgs = jvmArgs.concat(["-Djava.library.path=${natives_directory}", "-Dminecraft.launcher.brand=${launcher_name}", "-Dminecraft.launcher.version=${launcher_version}", "-cp", "${classpath}"]);

        for (const index in vanillaManifest.libraries) {
            const library = vanillaManifest.libraries[index];
            if (library.downloads && library.downloads.artifact) {
                classPath.push(path.join(launcherDir, "libraries") + (process.platform === "win32" ? "\\" : "/") + library.downloads.artifact.path.split("/").join(process.platform === "win32" ? "\\" : "/"));
            }
        }

        for (const index in forgeManifest.libraries) {
            const library: any = forgeManifest.libraries[index];
            if (library.name.indexOf("net.minecraftforge:forge") === -1) { // Skip forge itself, we add it later
                const libnameSplit: string = library.name.split(":");

                const filePath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
                const localPath = [launcherDir, "libraries"].concat(filePath.split("/")).join(path.sep);

                classPath.push(localPath);
            }
        }

        classPath.push(path.join(launcherDir, "versions", vanillaManifest.id, vanillaManifest.id + ".jar"));
        classPath.push(path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion, "forge.jar"));

        mainClass = forgeManifest.mainClass;

    } else {
        // Launch base game
        if (!fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".jar"))
            || !fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".json"))) {
            return event.sender.send("launch failed", "Base game version is no longer installed or installation corrupt. Please reinstall the pack.");
        }

        vanillaManifest = jsonfile.readFileSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".json"));

        const ourOs = process.platform === "win32" ? "windows"
            : process.platform === "darwin" ? "osx"
                : "linux";
        const arch = process.arch.indexOf("64") > -1 ? "x64" : "x86";
        const version = os.release();

        // Some versions (pre-1.13) don't have a complex args system like this, just a simple `minecraftArguments` string
        // That needs to be split on spaces
        if (vanillaManifest.arguments) {
            gameArgs = [];
            for (const index in vanillaManifest.arguments.game) {
                const arg = vanillaManifest.arguments.game[index];

                if (typeof (arg) === "string") {
                    gameArgs.push(arg);
                } else {
                    let allow = false; // Default to false if rules exist and none match us
                    if (arg.rules.length) {
                        for (const rIndex in arg.rules) {
                            const rule = arg.rules[rIndex];
                            if (rule.os) {
                                if ((!rule.os.name || rule.os.name === ourOs)
                                    && (!rule.os.arch || rule.os.arch === arch)
                                    && (!rule.os.version || RegExp(rule.os.version).exec(version))) { // exec returns null on no match
                                    if (rule.action === "allow") {
                                        allow = true;
                                    } else {
                                        allow = false;
                                    }
                                    break;
                                }
                            } else if (rule.features && Object.keys(rule.features).length) {
                                if (rule.features.hasOwnProperty("has_custom_resolution")) {
                                    allow = true; // TODO: Change this to if the user has a resolution set once settings done
                                }
                            } else {
                                allow = rule.action === "allow";
                            }
                        }
                    } else {
                        allow = true; // Default to allow if no rules
                    }

                    if (allow) {
                        if (typeof (arg.value) === "string") {
                            gameArgs.push(arg.value);
                        } else {
                            gameArgs = gameArgs.concat(arg.value);
                        }
                    }
                }
            }

            for (const index in vanillaManifest.arguments.jvm) {
                const arg = vanillaManifest.arguments.jvm[index];

                if (typeof (arg) === "string") {
                    jvmArgs.push(arg);
                } else {
                    let allow = false; // Default to false if rules exist and none match us
                    if (arg.rules.length) {
                        for (const rIndex in arg.rules) {
                            const rule = arg.rules[rIndex];
                            if (rule.os) {
                                if ((!rule.os.name || rule.os.name === ourOs)
                                    && (!rule.os.arch || rule.os.arch === arch)
                                    && (!rule.os.version || RegExp(rule.os.version).exec(version))) { // exec returns null on no match
                                    if (rule.action === "allow") {
                                        allow = true;
                                    } else {
                                        allow = false;
                                    }
                                    break;
                                }
                            } else if (rule.features && Object.keys(rule.features).length) {
                                // No-op?
                            } else {
                                allow = rule.action === "allow";
                            }
                        }
                    } else {
                        allow = true; // Default to allow if no rules
                    }

                    if (allow) {
                        if (typeof (arg.value) === "string") {
                            jvmArgs.push(arg.value);
                        } else {
                            jvmArgs = jvmArgs.concat(arg.value);
                        }
                    }
                }
            }
        } else {
            gameArgs = vanillaManifest.minecraftArguments.split(" ");
            jvmArgs = [];
            if (process.platform === "darwin") {
                jvmArgs.push("-XstartOnFirstThread");
            }
            if (process.platform === "win32") {
                jvmArgs.push("-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump");
            }
            if (process.platform === "win32" && os.release().startsWith("10.")) {
                jvmArgs = jvmArgs.concat(["-Dos.name=Windows 10", "-Dos.version=10.0"]);
            }
            if (arch === "x86") {
                jvmArgs.push("-Xss1M");
            }

            jvmArgs = jvmArgs.concat(["-Djava.library.path=${natives_directory}", "-Dminecraft.launcher.brand=${launcher_name}", "-Dminecraft.launcher.version=${launcher_version}", "-cp", "${classpath}"]);
        }

        for (const index in vanillaManifest.libraries) {
            const library = vanillaManifest.libraries[index];
            if (library.downloads && library.downloads.artifact) {
                classPath.push(path.join(launcherDir, "libraries") + (process.platform === "win32" ? "\\" : "/") + library.downloads.artifact.path.split("/").join(process.platform === "win32" ? "\\" : "/"));
            }
        }

        classPath.push(path.join(launcherDir, "versions", vanillaManifest.id, vanillaManifest.id + ".jar"));

        mainClass = vanillaManifest.mainClass;
    }

    gameArgs = gameArgs.map((arg) => {
        switch (arg) {
            case "${auth_player_name}":
                return authData.username;
            case "${version_name}":
                return pack.gameVersion;
            case "${game_directory}":
                return path.join(launcherDir, "packs", pack.packName);
            case "${assets_root}":
                return path.join(launcherDir, "assets");
            case "${assets_index_name}":
                return vanillaManifest.assetIndex.id;
            case "${auth_uuid}":
                return authData.uuid;
            case "${auth_access_token}":
                return authData.accessToken;
            case "${user_type}":
                return "mojang";
            case "${version_type}":
                return "release";
            case "${resolution_width}":
                return "1280"; // TODO: Change once resolution controls in
            case "${resolution_height}":
                return "720"; // TODO: And this
            default:
                return arg;
        }
    });

    jvmArgs = jvmArgs.map((arg) => {
        return arg.replace("${natives_directory}", path.join(launcherDir, "versions", vanillaManifest.id, "natives"))
            .replace("${launcher_name}", "SamboyLauncher")
            .replace("${launcher_version}", "v2")
            .replace("${game_directory}", path.join(launcherDir, "packs", pack.packName))
            .replace("${classpath}", classPath.join(process.platform === "win32" ? ";" : ":"));
    });

    let memFreeGigs = Math.floor(os.freemem() / 1000 / // KB
        1000 / // MB
        1000); // GB

    if (process.platform === "linux") {
        // Free memory is done differently (because of course) on linux.
        const result = child_process.spawnSync("free", ["-b"], {
            encoding: "utf8",
            stdio: "pipe",
        });
        const lines = result.stdout.split("\n");
        const line = lines[1].split(/\s+/);
        const free = parseInt(line[3], 10),
            buffers = parseInt(line[5], 10),
            actualFree = free + buffers;

        memFreeGigs = actualFree / 1024 / 1024 / 1024;
    }

    const memGigs = memFreeGigs > 6 ? 6 : memFreeGigs;

    jvmArgs = jvmArgs.concat([`-Xmx${memGigs}G`, `-Xms${memGigs - 1}G`, "-Djava.net.preferIPv4Stack=true"]);

    let java = "java";

    if (process.platform === "win32") {
        // Oracle does stupid stuff on windows with the location of java, so find it manually
        if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java"))) {
            event.sender.send("launch failed", "No Java installed. If on 64-bit windows, try installing 64-bit java.");
            return;
        }

        const files = fs.readdirSync(path.join(process.env.PROGRAMFILES, "Java"));
        const installation = files.find((file) => file.startsWith("jre1.8") || file.startsWith("jdk1.8"));
        if (!installation) {
            event.sender.send("launch failed", "No correct Java version found. Install Java 8.");
            return;
        }

        if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "javaw.exe"))) {
            event.sender.send("launch failed", "Corrupt Java installation detected. Remove " + path.join(process.env.PROGRAMFILES, "Java", installation) + " and try again.");
            return;
        }

        java = path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "javaw.exe");
    }

    const finalArgs = jvmArgs.concat([mainClass]).concat(gameArgs);

    const gameProcess = child_process.spawn(java, finalArgs, {
        cwd: path.join(launcherDir, "packs", pack.packName),
        detached: true,
        stdio: "pipe",
    });

    event.sender.send("game launched");
    event.sender.send("game output", java + " " + finalArgs.join(" "));

    gameProcess.stdout.on("data", (data) => {
        event.sender.send("game output", data.toString("utf8").trim());
    });
    gameProcess.stderr.on("data", (data) => {
        event.sender.send("game error", data.toString("utf8").trim());
    });
    gameProcess.on("close", (code) => {
        event.sender.send("game closed", code);
    });
});

//#endregion
// ---------------------

// -----------------------
//#region Launcher Updates

autoUpdater.autoDownload = true;
autoUpdater.logger = Logger;

autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update downloaded");
});

ipcMain.on("check updates", (event: IpcMessageEvent) => {
    Logger.info("Checking for updates...");
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify().then((update) => {
            if (update) {
                Logger.info("Update found! " + JSON.stringify(update.updateInfo));
                event.sender.send("update available", update.updateInfo.version);
            } else {
                Logger.info("No update found.");
                event.sender.send("no update");
            }
        }).catch((e) => {
            Logger.warn("Error checking for updates: " + e);
            event.sender.send("update error");
        });
    } else {
        event.sender.send("update devmode");
    }
});

ipcMain.on("install update", (event: IpcMessageEvent) => {
    autoUpdater.quitAndInstall();
});

//#endregion
// -----------------------
