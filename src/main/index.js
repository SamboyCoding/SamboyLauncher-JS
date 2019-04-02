"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asar = require("asar");
const child_process = require("child_process");
const download = require("download");
const electron_1 = require("electron");
const isDev = require("electron-is-dev");
const electron_updater_1 = require("electron-updater");
const fs = require("fs");
const fs_1 = require("fs");
const jsonfile = require("jsonfile");
const mkdirp = require("mkdirp");
const web = require("node-fetch");
const os = require("os");
const path = require("path");
const rmfr = require("rmfr");
const unzipper_1 = require("unzipper");
const config = require("./config");
const gameInstaller_1 = require("./gameInstaller");
const logger_1 = require("./logger");
const objects_1 = require("./objects");
const fetch = web.default;
const launcherDir = path.join(process.platform === "win32" ?
    process.env.APPDATA : (process.platform === "darwin" ?
    path.join(process.env.HOME, "Library", "Preferences")
    : path.join(process.env.HOME, ".SamboyLauncher/")), "SamboyLauncher_JS");
const configuration = config.load(launcherDir);
const packsDir = path.join(launcherDir, "packs");
const authData = new objects_1.AuthData();
function btoa(str) {
    return Buffer.from(str, "binary").toString("base64");
}
function atob(str) {
    return Buffer.from(str, "base64").toString("binary");
}
async function downloadFile(url, localPath) {
    return download(url, path.dirname(localPath), { filename: path.basename(localPath) });
}
async function mkdirpPromise(location) {
    return new Promise((ff, rj) => {
        mkdirp(location, (err, made) => {
            if (err) {
                return rj(err);
            }
            ff();
        });
    });
}
let win;
function createWindow() {
    console.log("[Info] Initializing window...");
    win = new electron_1.BrowserWindow({
        frame: false,
        height: 720,
        width: 1280,
    });
    const menu = new electron_1.Menu();
    if (isDev) {
        menu.append(new electron_1.MenuItem({
            accelerator: "CmdOrCtrl+R",
            click: () => {
                win.webContents.reload();
            },
            label: "Reload",
        }));
    }
    menu.append(new electron_1.MenuItem({
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
console.log("[Info] Electron Init");
electron_1.app.on("ready", async () => {
    await onReady();
    createWindow();
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (win === null) {
        createWindow();
    }
});
async function onReady() {
    if (!fs.existsSync(launcherDir)) {
        await mkdirpPromise(launcherDir);
    }
    if (fs.existsSync(path.join(launcherDir, "authdata"))) {
        try {
            const content = jsonfile.readFileSync(path.join(launcherDir, "authdata"));
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
        }
        catch (e) {
            jsonfile.writeFileSync(path.join(launcherDir, "authdata"), {});
        }
    }
    else {
        jsonfile.writeFileSync(path.join(launcherDir, "authdata"), {});
    }
}
electron_1.ipcMain.on("get backgrounds", (event) => {
    if (fs.existsSync(path.join(__dirname, "..", "..", "src", "renderer", "resources", "backgrounds"))) {
        fs.readdir(path.join(__dirname, "..", "..", "src", "renderer", "resources", "backgrounds"), (err, files) => {
            event.sender.send("backgrounds", files);
        });
    }
    else {
        event.sender.send("backgrounds", asar.listPackage("app.asar").filter((file) => file.indexOf("renderer") >= 0 && file.indexOf("backgrounds") >= 0)
            .map((file) => file.replace(".." + path.sep + "renderer", "..")));
    }
});
electron_1.ipcMain.on("get installed packs", (event) => {
    if (!fs.existsSync(packsDir)) {
        return event.sender.send("installed packs", []);
    }
    fs.readdir(packsDir, (error, packFolders) => {
        if (error) {
            return event.sender.send("installed packs", []);
        }
        const packData = packFolders
            .filter((packFolder) => fs.existsSync(path.join(packsDir, packFolder, "install.json")))
            .map((packFolder) => path.join(packsDir, packFolder, "install.json"))
            .map((installJson) => jsonfile.readFileSync(installJson));
        event.sender.send("installed packs", packData);
    });
});
electron_1.ipcMain.on("get top packs", (event) => {
    fetch("https://launcher.samboycoding.me/api/mostPopularPacks").then((resp) => {
        return resp.json();
    }).then((json) => {
        event.sender.send("top packs", json);
    });
});
electron_1.ipcMain.on("set dark", (event, dark) => {
    configuration.darkTheme = dark;
    config.save(launcherDir, configuration);
    event.sender.send("dark theme", configuration.darkTheme);
});
function saveAuthdata() {
    const content = {};
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
async function login(email, password, remember) {
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
                }
                else {
                    const at = json.accessToken;
                    const ct = json.clientToken;
                    const uid = json.selectedProfile.id;
                    const un = json.selectedProfile.name;
                    authData.accessToken = at;
                    authData.clientToken = ct;
                    authData.uuid = uid;
                    authData.username = un;
                    authData.email = email;
                    if (remember) {
                        authData.password = password;
                    }
                    else {
                        authData.password = "";
                    }
                    saveAuthdata();
                    ff();
                }
            }
            catch (e) {
                rj(e);
            }
        });
    });
}
electron_1.ipcMain.on("get profile", (event) => {
    if (authData.accessToken && authData.username && authData.uuid) {
        event.sender.send("profile", authData.username, authData.uuid);
    }
    else {
        event.sender.send("no profile");
    }
});
electron_1.ipcMain.on("login", async (event, email, password, remember) => {
    try {
        await login(email, password, remember);
        event.sender.send("profile", authData.username, authData.uuid);
    }
    catch (e) {
        event.sender.send("login error", e);
    }
});
electron_1.ipcMain.on("logout", (event) => {
    authData.accessToken = undefined;
    authData.password = undefined;
    authData.username = undefined;
    authData.uuid = undefined;
    saveAuthdata();
    event.sender.send("logged out");
});
electron_1.ipcMain.on("validate session", (event) => {
    if (!authData.accessToken) {
        return;
    }
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
        if (resp.status === 204) {
            return;
        }
        if (authData.email && authData.password) {
            try {
                await login(authData.email, authData.password, true);
            }
            catch (e) {
                event.sender.send("session invalid");
            }
        }
        else {
            event.sender.send("session invalid");
        }
    });
});
electron_1.ipcMain.on("get update actions", async (event, pack) => {
    const responseData = {
        addMods: new Array(),
        forge: {
            from: pack.forgeVersion,
            to: pack.updatedForgeVersion !== pack.forgeVersion ? pack.updatedForgeVersion : null,
        },
        removeMods: new Array(),
        rift: {
            from: pack.riftVersion,
            to: pack.updatedRiftVersion !== pack.riftVersion ? pack.updatedRiftVersion : null,
        },
        updateMods: new Array(),
        version: {
            from: pack.installedVersion,
            to: pack.latestVersion,
        },
    };
    responseData.addMods = responseData.addMods.concat(pack.latestMods.filter(mod => !pack.mods.filter(installedMod => installedMod.slug === mod.slug).length));
    responseData.removeMods = responseData.removeMods.concat(pack.mods.filter(installedMod => !pack.latestMods.filter(mod => installedMod.slug === mod.slug).length));
    responseData.updateMods = responseData.updateMods.concat(pack.latestMods.filter(mod => {
        const currentMod = pack.mods.filter(installedMod => installedMod.slug === mod.slug)[0];
        if (!currentMod)
            return false;
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
electron_1.ipcMain.on("update pack", async (event, pack, updateData) => {
    let currentPercent = 0;
    const percentPer = 97 / ((updateData.forge.to ? 1 : 0) + (updateData.rift.to ? 1 : 0) + updateData.addMods.length + updateData.updateMods.length + updateData.removeMods.length + 1);
    event.sender.send("pack update progress", -1, `Starting upgrade...`);
    if (updateData.forge.to) {
        currentPercent += percentPer;
        event.sender.send("pack update progress", currentPercent / 100, `Updating forge from ${updateData.forge.from} to ${updateData.forge.to}...`);
        let unpack200 = "unpack200";
        if (process.platform === "win32") {
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
            await gameInstaller_1.downloadForgeJarAndGetJSON(forgeVersionFolder, updateData.forge.to, pack.gameVersion, event.sender);
            const versionJSON = jsonfile.readFileSync(path.join(forgeVersionFolder, "version.json"));
            const libs = versionJSON.libraries.filter((lib) => lib.name.indexOf("net.minecraftforge:forge:") === -1);
            event.sender.send("pack update progress", currentPercent / 100, `Updating forge libraries, this may take a minute...`);
            await gameInstaller_1.downloadForgeLibraries(launcherDir, libs, unpack200, event.sender);
            fs.copyFileSync(path.join(forgeVersionFolder, "forge_temp.jar"), path.join(forgeVersionFolder, "forge.jar"));
            fs.unlinkSync(path.join(forgeVersionFolder, "forge_temp.jar"));
        }
    }
    if (updateData.rift.to) {
        currentPercent += percentPer;
        event.sender.send("pack update progress", currentPercent / 100, `Updating rift from ${updateData.rift.from} to ${updateData.rift.to}...`);
        const riftVersionFolder = path.join(launcherDir, "versions", "rift-" + pack.gameVersion + "-" + updateData.rift.to);
        if (!fs.existsSync(path.join(riftVersionFolder, ".installed"))) {
            if (!fs.existsSync(riftVersionFolder)) {
                await mkdirpPromise(riftVersionFolder);
            }
            await gameInstaller_1.downloadRiftJarAndGetJSON(riftVersionFolder, updateData.rift.to, pack.gameVersion, event.sender);
            const profileJSON = jsonfile.readFileSync(path.join(riftVersionFolder, "profile.json"));
            const riftLibraryData = profileJSON.libraries.find(l => l.name.startsWith("org.dimdev:rift"));
            const riftVersion = riftLibraryData.name.split(":")[2];
            const correctRiftFolder = path.join(launcherDir, "libraries", "org", "dimdev", "rift", riftVersion);
            if (!fs.existsSync(correctRiftFolder))
                await mkdirpPromise(correctRiftFolder);
            fs.copyFileSync(path.join(riftVersionFolder, "rift_temp.jar"), path.join(correctRiftFolder, "rift-" + riftVersion + ".jar"));
            fs.unlinkSync(path.join(riftVersionFolder, "rift_temp.jar"));
            const libsToDownload = profileJSON.libraries.filter(l => !l.name.startsWith("org.dimdev:rift"));
            await gameInstaller_1.downloadRiftLibraries(launcherDir, libsToDownload, event.sender);
            fs.writeFileSync(path.join(riftVersionFolder, ".installed"), "1", { encoding: "utf8" });
        }
    }
    const modsDir = path.join(launcherDir, "packs", pack.packName.replace(/[\\/:*?"<>|]/g, "_"), "mods");
    if (!fs.existsSync(modsDir))
        await mkdirpPromise(modsDir);
    for (const i in updateData.removeMods) {
        const modToRemove = updateData.removeMods[i];
        currentPercent += percentPer;
        event.sender.send("pack update progress", currentPercent / 100, `Removing ${modToRemove.resolvedName}...`);
        const modPath = path.join(modsDir, modToRemove.resolvedVersion);
        if (fs_1.existsSync(modPath))
            fs.unlinkSync(modPath);
    }
    for (const i in updateData.updateMods) {
        const modToRemove = updateData.updateMods[i].from;
        const modToAdd = updateData.updateMods[i].to;
        currentPercent += percentPer;
        event.sender.send("pack update progress", currentPercent / 100, `Updating ${modToRemove.resolvedName} from ${modToRemove.resolvedVersion} => ${modToAdd.resolvedVersion}...`);
        const modPath = path.join(modsDir, modToRemove.resolvedVersion);
        fs.unlinkSync(modPath);
        const url = `https://minecraft.curseforge.com/projects/${modToAdd.slug}/files/${modToAdd.fileId}/download`;
        await downloadFile(url, path.join(modsDir, modToAdd.resolvedVersion));
    }
    for (const i in updateData.addMods) {
        const modToAdd = updateData.addMods[i];
        currentPercent += percentPer;
        event.sender.send("pack update progress", currentPercent / 100, `Downloading ${modToAdd.resolvedName} (${modToAdd.resolvedVersion})...`);
        const url = `https://minecraft.curseforge.com/projects/${modToAdd.slug}/files/${modToAdd.fileId}/download`;
        await downloadFile(url, path.join(modsDir, modToAdd.resolvedVersion));
    }
    currentPercent += percentPer;
    event.sender.send("pack update progress", currentPercent / 100, `Applying updated overrides...`);
    const resp = await fetch("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, {
        method: "HEAD",
    });
    if (resp.status === 200) {
        await downloadFile("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, path.join(launcherDir, "packs", pack.packName.replace(/[\\/:*?"<>|]/g, "_"), "overrides.zip"));
        await new Promise((ff, rj) => {
            fs.createReadStream(path.join(path.join(launcherDir, "packs", pack.packName.replace(/[\\/:*?"<>|]/g, "_")), "overrides.zip")).pipe(unzipper_1.Extract({ path: path.join(launcherDir, "packs", pack.packName.replace(/[\\/:*?"<>|]/g, "_")) })).on("close", () => {
                ff();
            });
        });
    }
    event.sender.send("pack update progress", 0.98, `Finishing up`);
    jsonfile.writeFileSync(path.join(launcherDir, "packs", pack.packName.replace(/[\\/:*?"<>|]/g, "_"), "install.json"), {
        author: pack.author,
        forgeVersion: updateData.forge.to ? updateData.forge.to : updateData.forge.from,
        gameVersion: pack.gameVersion,
        id: pack.id,
        installedMods: pack.latestMods,
        installedVersion: updateData.version.to,
        packName: pack.packName,
        riftVersion: updateData.rift.to ? updateData.rift.to : updateData.rift.from,
    });
    event.sender.send("pack update progress", 1, `Finished.`);
    event.sender.send("pack update complete");
});
electron_1.ipcMain.on("uninstall pack", async (event, pack) => {
    const packDir = path.join(launcherDir, "packs", pack.packName.replace(/[\\/:*?"<>|]/g, "_"));
    if (!fs.existsSync(packDir)) {
        return;
    }
    event.sender.send("uninstalling pack");
    await rmfr(packDir);
    event.sender.send("uninstalled pack");
});
electron_1.ipcMain.on("install pack", async (event, pack) => {
    try {
        let unpack200 = "unpack200";
        let java = "java";
        if (process.platform === "win32") {
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
        }
        else {
            try {
                const result = child_process.spawnSync(java, ["-version"], {
                    encoding: "utf8",
                    stdio: "pipe",
                });
                if (result.stderr.indexOf("1.8.0_") < 0) {
                    event.sender.send("install log", "[ERROR] INCORRECT JAVA VERSION DETECTED (NEED JAVA 8). REFUSING TO INSTALL. JAVA VERSION INFO: " + result);
                    event.sender.send("vanilla progress", "Incorrect Java version found. Refusing to install.", 0);
                    event.sender.send("modded progress", "Incorrect Java version found. Refusing to install.", 0);
                    event.sender.send("install failed", "Incorrect java version.");
                    return;
                }
            }
            catch (err) {
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
            const versions = await gameInstaller_1.getVanillaVersionList();
            const version = versions.find((ver) => ver.id === pack.gameVersion);
            if (!version) {
                event.sender.send("install failed", "Couldn't find version " + pack.gameVersion + " in installable version list.");
            }
            event.sender.send("vanilla progress", `Fetching version information for ${version.id}...`, 2 / 100);
            const versionData = await gameInstaller_1.getVanillaVersionManifest(launcherDir, version);
            const libraries = versionData.libraries.filter((lib) => lib.downloads.artifact && lib.downloads.artifact.url);
            const natives = versionData.libraries.filter((lib) => lib.natives);
            event.sender.send("vanilla progress", `Starting download of ${libraries.length} libraries for ${versionData.id}...`, 5 / 100);
            await gameInstaller_1.downloadVanillaLibraries(launcherDir, libraries, event.sender);
            event.sender.send("vanilla progress", `Starting download of ${natives.length} natives for ${versionData.id}...`, 30 / 100);
            const ourOs = process.platform === "darwin" ? "osx" : process.platform === "win32" ? "windows" : "linux";
            const arch = process.arch.indexOf("64") > -1 ? "64" : "32";
            const nativesFolder = path.join(launcherDir, "versions", version.id, "natives");
            await gameInstaller_1.downloadVanillaNatives(launcherDir, ourOs, arch, nativesFolder, natives, event.sender);
            await gameInstaller_1.downloadAssetManifest(launcherDir, versionData.assetIndex, event.sender);
            await gameInstaller_1.downloadAssets(launcherDir, versionData.assetIndex, event.sender);
            await gameInstaller_1.downloadGameClient(launcherDir, versionData, event.sender);
            event.sender.send("vanilla progress", `Finished`, 1);
        }
        else {
            event.sender.send("vanilla progress", `Game client is already installed.`, 1);
        }
        const forgeVersionFolder = path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion);
        if (pack.forgeVersion && !fs.existsSync(path.join(forgeVersionFolder, "forge.jar"))) {
            if (!fs.existsSync(forgeVersionFolder)) {
                await mkdirpPromise(forgeVersionFolder);
            }
            await gameInstaller_1.downloadForgeJarAndGetJSON(forgeVersionFolder, pack.forgeVersion, pack.gameVersion, event.sender);
            event.sender.send("modded progress", `Reading forge version info...`, 3 / 100);
            const versionJSON = jsonfile.readFileSync(path.join(forgeVersionFolder, "version.json"));
            event.sender.send("modded progress", `Preparing to install forge libraries...`, 4 / 100);
            const libs = versionJSON.libraries.filter((lib) => lib.name.indexOf("net.minecraftforge:forge:") === -1);
            const success = await gameInstaller_1.downloadForgeLibraries(launcherDir, libs, unpack200, event.sender);
            if (!success)
                return;
            fs.copyFileSync(path.join(forgeVersionFolder, "forge_temp.jar"), path.join(forgeVersionFolder, "forge.jar"));
            fs.unlinkSync(path.join(forgeVersionFolder, "forge_temp.jar"));
        }
        const riftVersionFolder = path.join(launcherDir, "versions", "rift-" + pack.gameVersion + "-" + pack.riftVersion);
        if (pack.riftVersion && !fs.existsSync(path.join(riftVersionFolder, ".installed"))) {
            if (!fs.existsSync(riftVersionFolder)) {
                await mkdirpPromise(riftVersionFolder);
            }
            await gameInstaller_1.downloadRiftJarAndGetJSON(riftVersionFolder, pack.riftVersion, pack.gameVersion, event.sender);
            event.sender.send("modded progress", `Reading rift profile data...`, 3 / 100);
            const profileJSON = jsonfile.readFileSync(path.join(riftVersionFolder, "profile.json"));
            const riftLibraryData = profileJSON.libraries.find(l => l.name.startsWith("org.dimdev:rift"));
            const riftVersion = riftLibraryData.name.split(":")[2];
            event.sender.send("install log", "[Modpack] \tRift version identified as " + riftVersion);
            const correctRiftFolder = path.join(launcherDir, "libraries", "org", "dimdev", "rift", riftVersion);
            if (!fs.existsSync(correctRiftFolder))
                await mkdirpPromise(correctRiftFolder);
            event.sender.send("modded progress", `Installing Rift jar in correct location...`, 4 / 100);
            fs.copyFileSync(path.join(riftVersionFolder, "rift_temp.jar"), path.join(correctRiftFolder, "rift-" + riftVersion + ".jar"));
            event.sender.send("install log", "[Modpack] \tCopied file " + path.join(riftVersionFolder, "rift_temp.jar") + " => " + path.join(correctRiftFolder, "rift-" + riftVersion + ".jar"));
            fs.unlinkSync(path.join(riftVersionFolder, "rift_temp.jar"));
            event.sender.send("install log", "[Modpack] \tDeleted file: " + path.join(riftVersionFolder, "rift_temp.jar"));
            const libsToDownload = profileJSON.libraries.filter(l => !l.name.startsWith("org.dimdev:rift"));
            await gameInstaller_1.downloadRiftLibraries(launcherDir, libsToDownload, event.sender);
            fs.writeFileSync(path.join(riftVersionFolder, ".installed"), "1", { encoding: "utf8" });
        }
        const packDir = path.join(packsDir, pack.packName.replace(/[\\/:*?"<>|]/g, "_"));
        const modsDir = path.join(packDir, "mods");
        if (!fs.existsSync(modsDir)) {
            await mkdirpPromise(modsDir);
        }
        let installedMods = [];
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
                fs.createReadStream(path.join(packDir, "overrides.zip")).pipe(unzipper_1.Extract({ path: packDir })).on("close", () => {
                    ff();
                });
            });
        }
        else {
            event.sender.send("install log", "[Modpack] \tNo overrides.");
        }
        event.sender.send("modded progress", `Finishing up`, 0.98);
        jsonfile.writeFileSync(path.join(packDir, "install.json"), {
            author: pack.author,
            forgeVersion: pack.forgeVersion ? pack.forgeVersion : undefined,
            gameVersion: pack.gameVersion,
            id: pack.id,
            installedMods: pack.mods,
            installedVersion: pack.version,
            packName: pack.packName,
            riftVersion: pack.riftVersion ? pack.riftVersion : undefined,
        });
        event.sender.send("modded progress", `Finished.`, 1);
        event.sender.send("install complete");
    }
    catch (e) {
        event.sender.send("install failed", "An exception occurred: " + e);
        event.sender.send("install log", "[Error] An Exception occurred: " + e);
    }
});
electron_1.ipcMain.on("launch pack", (event, pack) => {
    let gameArgs = [];
    let jvmArgs = [];
    const classPath = [];
    let mainClass;
    let vanillaManifest;
    let forgeManifest;
    if (pack.forgeVersion) {
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
        for (const index in forgeManifest.libraries) {
            const library = forgeManifest.libraries[index];
            if (library.name.indexOf("net.minecraftforge:forge") === -1) {
                const libnameSplit = library.name.split(":");
                const filePath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
                const localPath = [launcherDir, "libraries"].concat(filePath.split("/")).join(path.sep);
                classPath.push(localPath);
            }
        }
        for (const index in vanillaManifest.libraries) {
            const library = vanillaManifest.libraries[index];
            const libnameSplit = library.name.split(":");
            const searchTerm = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/";
            if (classPath.find(cpEntry => cpEntry.indexOf(searchTerm) > 0))
                continue;
            if (library.downloads && library.downloads.artifact) {
                classPath.push(path.join(launcherDir, "libraries") + (process.platform === "win32" ? "\\" : "/") + library.downloads.artifact.path.split("/").join(process.platform === "win32" ? "\\" : "/"));
            }
        }
        classPath.push(path.join(launcherDir, "versions", vanillaManifest.id, vanillaManifest.id + ".jar"));
        classPath.push(path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion, "forge.jar"));
        mainClass = forgeManifest.mainClass;
    }
    else {
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
        if (vanillaManifest.arguments) {
            gameArgs = [];
            for (const index in vanillaManifest.arguments.game) {
                const arg = vanillaManifest.arguments.game[index];
                if (typeof (arg) === "string") {
                    gameArgs.push(arg);
                }
                else {
                    let allow = false;
                    if (arg.rules.length) {
                        for (const rIndex in arg.rules) {
                            const rule = arg.rules[rIndex];
                            if (rule.os) {
                                if ((!rule.os.name || rule.os.name === ourOs)
                                    && (!rule.os.arch || rule.os.arch === arch)
                                    && (!rule.os.version || RegExp(rule.os.version).exec(version))) {
                                    if (rule.action === "allow") {
                                        allow = true;
                                    }
                                    else {
                                        allow = false;
                                    }
                                    break;
                                }
                            }
                            else if (rule.features && Object.keys(rule.features).length) {
                                if (rule.features.hasOwnProperty("has_custom_resolution")) {
                                    allow = true;
                                }
                            }
                            else {
                                allow = rule.action === "allow";
                            }
                        }
                    }
                    else {
                        allow = true;
                    }
                    if (allow) {
                        if (typeof (arg.value) === "string") {
                            gameArgs.push(arg.value);
                        }
                        else {
                            gameArgs = gameArgs.concat(arg.value);
                        }
                    }
                }
            }
            for (const index in vanillaManifest.arguments.jvm) {
                const arg = vanillaManifest.arguments.jvm[index];
                if (typeof (arg) === "string") {
                    jvmArgs.push(arg);
                }
                else {
                    let allow = false;
                    if (arg.rules.length) {
                        for (const rIndex in arg.rules) {
                            const rule = arg.rules[rIndex];
                            if (rule.os) {
                                if ((!rule.os.name || rule.os.name === ourOs)
                                    && (!rule.os.arch || rule.os.arch === arch)
                                    && (!rule.os.version || RegExp(rule.os.version).exec(version))) {
                                    if (rule.action === "allow") {
                                        allow = true;
                                    }
                                    else {
                                        allow = false;
                                    }
                                    break;
                                }
                            }
                            else if (rule.features && Object.keys(rule.features).length) {
                            }
                            else {
                                allow = rule.action === "allow";
                            }
                        }
                    }
                    else {
                        allow = true;
                    }
                    if (allow) {
                        if (typeof (arg.value) === "string") {
                            jvmArgs.push(arg.value);
                        }
                        else {
                            jvmArgs = jvmArgs.concat(arg.value);
                        }
                    }
                }
            }
        }
        else {
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
    if (pack.riftVersion) {
        if (!fs.existsSync(path.join(launcherDir, "versions", "rift-" + pack.gameVersion + "-" + pack.riftVersion, ".installed"))
            || !fs.existsSync(path.join(launcherDir, "versions", "rift-" + pack.gameVersion + "-" + pack.riftVersion, "profile.json"))) {
            return event.sender.send("launch failed", "Rift version is no longer installed or installation corrupt. Please reinstall the pack.");
        }
        if (!fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".jar"))
            || !fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".json"))) {
            return event.sender.send("launch failed", "Base game version is no longer installed or installation corrupt. Please reinstall the pack.");
        }
        const riftManifest = jsonfile.readFileSync(path.join(launcherDir, "versions", "rift-" + pack.gameVersion + "-" + pack.riftVersion, "profile.json"));
        gameArgs = gameArgs.concat(riftManifest.arguments.game);
        for (const index in riftManifest.libraries) {
            const library = riftManifest.libraries[index];
            const libnameSplit = library.name.split(":");
            const filePath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
            const localPath = [launcherDir, "libraries"].concat(filePath.split("/")).join(path.sep);
            classPath.push(localPath);
        }
        mainClass = riftManifest.mainClass;
    }
    gameArgs = gameArgs.map((arg) => {
        switch (arg) {
            case "${auth_player_name}":
                return authData.username;
            case "${version_name}":
                return pack.gameVersion;
            case "${game_directory}":
                return path.join(launcherDir, "packs", pack.packName.replace(/[\\/:*?"<>|]/g, "_"));
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
                return "1280";
            case "${resolution_height}":
                return "720";
            case "${user_properties}":
                return "{}";
            default:
                return arg;
        }
    });
    jvmArgs = jvmArgs.map((arg) => {
        return arg.replace("${natives_directory}", path.join(launcherDir, "versions", vanillaManifest.id, "natives"))
            .replace("${launcher_name}", "SamboyLauncher")
            .replace("${launcher_version}", "v2")
            .replace("${game_directory}", path.join(launcherDir, "packs", pack.packName.replace(/[\\/:*?"<>|]/g, "_")))
            .replace("${classpath}", classPath.join(process.platform === "win32" ? ";" : ":"));
    });
    jvmArgs.push("-XX:+UseG1GC");
    jvmArgs.push("-XX:+UnlockExperimentalVMOptions");
    jvmArgs.push("-Dsun.rmi.dgc.server.gcInterval=2147483646");
    if (process.platform !== "win32")
        jvmArgs.push("-XX:+DisableExplicitGC");
    jvmArgs.push("-XX:MaxGCPauseMillis=50");
    jvmArgs.push("-XX:G1HeapRegionSize=32M");
    jvmArgs.push("-XX:G1NewSizePercent=20");
    jvmArgs.push("-XX:G1ReservePercent=20");
    jvmArgs.push("-XX:SurvivorRatio=2");
    let memFreeGigs = Math.floor(os.freemem() / 1000 /
        1000 /
        1000);
    if (process.platform === "linux") {
        const result = child_process.spawnSync("free", ["-b"], {
            encoding: "utf8",
            stdio: "pipe",
        });
        const lines = result.stdout.split("\n");
        const line = lines[1].split(/\s+/);
        const free = parseInt(line[3], 10), buffers = parseInt(line[5], 10), actualFree = free + buffers;
        memFreeGigs = actualFree / 1024 / 1024 / 1024;
    }
    else if (process.platform === "darwin") {
        memFreeGigs = 3;
    }
    const memGigs = memFreeGigs > 6 ? 6 : memFreeGigs;
    jvmArgs = jvmArgs.concat([`-Xmx${memGigs}G`, `-Xms${memGigs - 1}G`, "-Djava.net.preferIPv4Stack=true"]);
    let java = "java";
    if (process.platform === "win32") {
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
        cwd: path.join(launcherDir, "packs", pack.packName.replace(/[\\/:*?"<>|]/g, "_")),
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
electron_updater_1.autoUpdater.autoDownload = true;
electron_updater_1.autoUpdater.logger = logger_1.Logger;
electron_updater_1.autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update downloaded");
});
electron_1.ipcMain.on("check updates", (event) => {
    logger_1.Logger.info("Checking for updates...");
    if (!isDev) {
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify().then((update) => {
            if (update) {
                logger_1.Logger.info("Update found! " + JSON.stringify(update.updateInfo));
                event.sender.send("update available", update.updateInfo.version);
            }
            else {
                logger_1.Logger.info("No update found.");
                event.sender.send("no update");
            }
        }).catch((e) => {
            logger_1.Logger.warn("Error checking for updates: " + e);
            event.sender.send("update error");
        });
    }
    else {
        event.sender.send("update devmode");
    }
});
electron_1.ipcMain.on("install update", (event) => {
    electron_updater_1.autoUpdater.quitAndInstall();
});
//# sourceMappingURL=index.js.map