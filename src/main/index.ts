import { app, BrowserWindow, ipcMain, IpcMessageEvent, Menu, MenuItem } from "electron";
import * as fs from "fs";
import * as jsonfile from "jsonfile";
import * as web from "node-fetch";
import * as path from "path";
import { getVanillaVersionList, getVanillaVersionManifest } from "./gameInstaller";
import { AuthData, Pack, VanillaManifestVersion, VanillaVersionData, LibraryMetadata, LibraryArtifact, Mod } from './objects';
import * as mkdirp from "mkdirp";
import * as hasha from "hasha";
import * as JSZip from "jszip";
import * as download from "download";
import * as child_process from "child_process";
import { Extract } from "unzipper";
import * as asar from "asar";
import { autoUpdater } from "electron-updater";
import * as rmfr from "rmfr";
import * as os from "os";
import { Logger } from "./logger";
import * as isDev from "electron-is-dev";


autoUpdater.autoDownload = true;
autoUpdater.logger = Logger;

autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update downloaded");
});

const fetch = web.default;
const launcherDir: string = path.join(process.platform === "win32" ?
    process.env.APPDATA : (process.platform === "darwin" ?
        path.join(process.env.HOME, "Library", "Preferences")
        : path.join(process.env.HOME, ".SamboyLauncher/")),
    "SamboyLauncher_JS");

const packsDir = path.join(launcherDir, "packs");

const authData: AuthData = new AuthData();

function btoa(str: string): string {
    return Buffer.from(str, "binary").toString("base64");
}

function atob(str: string): string {
    return Buffer.from(str, "base64").toString("binary");
}

async function downloadFile(url: string, localPath: string): Promise<any> {
    return download(url, path.dirname(localPath), { filename: path.basename(localPath) });
}

async function mkdirpPromise(path: string): Promise<any> {
    return new Promise((ff, rj) => {
        mkdirp(path, (err, made) => {
            if (err) return rj(err);

            ff();
        })
    });
}

let win: BrowserWindow;

function createWindow(): void {
    win = new BrowserWindow({
        frame: false,
        height: 720,
        width: 1280,
    });

    const menu: Menu = new Menu();

    menu.append(new MenuItem({
        accelerator: "CmdOrCtrl+R",
        click: () => {
            win.webContents.reload();
        },
        label: "Reload",
    }));

    menu.append(new MenuItem({
        accelerator: "CmdOrCtrl+Shift+I",
        click: () => {
            win.webContents.openDevTools();
        },
        label: "Open DevTools",
    }));

    win.setMenu(menu);

    win.loadFile("src/renderer/html/index.html");

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

ipcMain.on("get profile", (event: IpcMessageEvent) => {
    if (authData.accessToken && authData.username && authData.uuid) {
        event.sender.send("profile", authData.username, authData.uuid);
    } else {
        event.sender.send("no profile");
    }
});

ipcMain.on("get installed packs", (event: IpcMessageEvent) => {
    if (!fs.existsSync(packsDir))
        return event.sender.send("installed packs", []);

    fs.readdir(packsDir, (error, packFolders) => {
        if (error) return event.sender.send("installed packs", []);

        let packData = packFolders
            .filter(packFolder => fs.existsSync(path.join(packsDir, packFolder, "install.json")))
            .map(packFolder => path.join(packsDir, packFolder, "install.json"))
            .map(installJson => jsonfile.readFileSync(installJson));

        event.sender.send("installed packs", packData);
    })
});

ipcMain.on("login", (event: IpcMessageEvent, username: string, password: string, remember: boolean) => {
    fetch("https://authserver.mojang.com/authenticate", {
        body: JSON.stringify({
            agent: {
                name: "Minecraft",
                version: 1,
            },
            clientToken: authData.clientToken ? authData.clientToken : undefined,
            password,
            requestUser: true,
            username,
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
                event.sender.send("login error", json.errorMessage);
            } else {
                const at: string = json.accessToken;
                const ct: string = json.clientToken;
                const uid: string = json.selectedProfile.id;
                const un: string = json.selectedProfile.name;

                authData.accessToken = at;
                authData.clientToken = ct;
                authData.uuid = uid;
                authData.username = un;
                if (remember) {
                    authData.password = password;
                } else {
                    authData.password = "";
                }

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

                jsonfile.writeFileSync(path.join(launcherDir, "authdata"), content);

                event.sender.send("profile", authData.username, authData.uuid);
            }
        } catch (e) {
            event.sender.send("login error", e);
        }
    });
});

ipcMain.on("get top packs", (event: IpcMessageEvent) => {
    fetch("https://launcher.samboycoding.me/api/mostPopularPacks").then((resp) => {
        return resp.json();
    }).then((json) => {
        event.sender.send("top packs", json);
    });
});

ipcMain.on("install pack", async (event: IpcMessageEvent, pack: Pack) => {
    try {
        let unpack200 = "unpack200";
        let java = "java";

        if (process.platform === "win32") {
            //Oracle does stupid stuff on windows with the location of java, so find it manually
            if (!fs.existsSync(path.join(process.env["PROGRAMFILES"], "Java"))) {
                event.sender.send("install log", "[ERROR] NO JAVA INSTALLED FOR THE CORRECT ARCHITECTURE (IF YOU'RE ON A 64-BIT PC, AND THINK YOU HAVE JAVA, YOU NEED TO INSTALL 64-BIT JAVA)");
                event.sender.send("vanilla progress", "No Java found. Refusing to install.", 0);
                event.sender.send("modded progress", "No Java found. Refusing to install.", 0);
                return;
            }

            let files = fs.readdirSync(path.join(process.env["PROGRAMFILES"], "Java"));
            let installation = files.find(file => file.startsWith("jre1.8") || file.startsWith("jdk1.8"));
            if (!installation) {
                event.sender.send("install log", "[ERROR] JAVA APPEARS TO BE INSTALLED, BUT IT'S NOT JAVA 8. MINECRAFT ONLY RUNS WITH JAVA 8, PLEASE INSTALL IT.)");
                event.sender.send("vanilla progress", "Wrong Java version found. Refusing to install.", 0);
                event.sender.send("modded progress", "Wrong Java version found. Refusing to install.", 0);
                return;
            }

            if (!fs.existsSync(path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "javaw.exe")) || !fs.existsSync(path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "unpack200.exe"))) {
                event.sender.send("install log", "[ERROR] BROKEN JAVA DETECTED. MISSING EITHER JAVAW OR UNPACK200. PLEASE CLEAN UP YOUR JAVA INSTALLATIONS.)");
                event.sender.send("vanilla progress", "Corrupt Java version found. Refusing to install.", 0);
                event.sender.send("modded progress", "Corrupt Java version found. Refusing to install.", 0);
                return;
            }

            unpack200 = path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "unpack200.exe");
            java = path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "javaw.exe");
        }

        if (!fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".jar"))) {
            event.sender.send("vanilla progress", "Fetching version listing...", 0);
            event.sender.send("modded progress", "Waiting for base game to install...", -1);

            let versions: VanillaManifestVersion[] = await getVanillaVersionList();
            let version: VanillaManifestVersion = versions.find(version => version.id === pack.gameVersion);

            if (!version) {
                event.sender.send("install failed", "Couldn't find version " + pack.gameVersion + " in installable version list.");
            }

            event.sender.send("vanilla progress", `Fetching version information for ${version.id}...`, 2 / 100);

            let versionData: VanillaVersionData = await getVanillaVersionManifest(launcherDir, version);

            let libraries: LibraryMetadata[] = versionData.libraries.filter(lib => lib.downloads.artifact && lib.downloads.artifact.url);
            let natives: LibraryMetadata[] = versionData.libraries.filter(lib => lib.natives);

            event.sender.send("vanilla progress", `Starting download of ${libraries.length} libraries for ${versionData.id}...`, 5 / 100);

            let currentPercent: number = 5;
            let percentPer: number = 25 / libraries.length;

            for (let index in libraries) {
                currentPercent += percentPer;
                let library: LibraryMetadata = libraries[index];

                event.sender.send("vanilla progress", `Downloading library ${Number(index) + 1} of ${libraries.length}:  ${library.name} ...`, currentPercent / 100);

                let dest = path.join(launcherDir, "libraries", library.downloads.artifact.path);
                let directory = path.dirname(dest);

                await mkdirpPromise(directory);

                let success = false;
                while (!success) {
                    if (!fs.existsSync(dest)) {
                        event.sender.send("install log", "[Vanilla] \tDownloading " + library.downloads.artifact.url + " => " + dest);
                        await downloadFile(library.downloads.artifact.url, dest);
                    }

                    event.sender.send("install log", "[Vanilla] \tVerifying checksum of " + dest + "...");
                    let correctHash = library.downloads.artifact.sha1

                    let fileHash = await hasha.fromFile(dest, { algorithm: "sha1" });

                    event.sender.send("install log", "[Vanilla] \tShould be " + correctHash.toUpperCase() + " - is " + fileHash.toUpperCase());
                    success = fileHash === correctHash;

                    if (!success) {
                        event.sender.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + dest + " - redownloading...");
                        fs.unlinkSync(dest);
                    }
                }
            }

            event.sender.send("vanilla progress", `Starting download of ${natives.length} natives for ${versionData.id}...`, 30 / 100);

            let ourOs = process.platform === "darwin" ? "osx" : process.platform === "win32" ? "windows" : "linux";
            let arch = process.arch.indexOf("64") > -1 ? "64" : "32";

            percentPer = 25 / natives.length;

            event.sender.send("install log", `[Vanilla] Current OS is ${ourOs}-${arch}`, 30 / 100);
            let nativesFolder = path.join(launcherDir, "versions", version.id, "natives");

            if (!fs.existsSync(nativesFolder))
                await mkdirpPromise(nativesFolder);

            for (let index in natives) {
                currentPercent += (percentPer / 2);
                let native: LibraryMetadata = natives[index];
                event.sender.send("vanilla progress", `Downloading native ${Number(index) + 1} of ${natives.length}:  ${native.name} ...`, currentPercent / 100);

                let shouldInstall = false;
                if (native.rules) {
                    let rule = native.rules.find(rule => rule.os && rule.os.name === ourOs);
                    //If there's a rule specific to our os, follow that.
                    if (rule) {
                        shouldInstall = rule.action === "allow";
                    } else {
                        //Otherwise, try to find a rule for any os
                        rule = native.rules.find(rule => !rule.os);
                        if (rule) {
                            //If one exists, follow that
                            shouldInstall = rule.action === "allow";
                        }
                        //If one doesn't exist, we'll default to NOT install.
                    }
                } else
                    shouldInstall = true; //If no rules we install.

                if (!shouldInstall) {
                    event.sender.send("install log", `[Vanilla] \tSkipping native as it doesn't need to be installed on our OS`, 30 / 100);
                    continue;
                }

                let artifact: LibraryArtifact;
                if (ourOs === "osx") {
                    artifact = native.downloads.classifiers["natives-macos"];
                    if (!artifact && arch === "64") {
                        artifact = native.downloads.classifiers["natives-macos-64"];
                    } else if (!artifact) {
                        artifact = native.downloads.classifiers["natives-macos-32"];
                    }
                }
                else if (ourOs === "linux") {
                    artifact = native.downloads.classifiers["natives-linux"];
                    if (!artifact && arch === "64") {
                        artifact = native.downloads.classifiers["natives-linux-64"];
                    } else if (!artifact) {
                        artifact = native.downloads.classifiers["natives-linux-32"];
                    }
                }
                else {
                    artifact = native.downloads.classifiers["natives-windows"];
                    if (!artifact && arch === "64") {
                        artifact = native.downloads.classifiers["natives-windows-64"];
                    } else if (!artifact) {
                        artifact = native.downloads.classifiers["natives-windows-32"];
                    }
                }

                let dest = path.join(launcherDir, "libraries", artifact.path);
                let directory = path.dirname(dest);

                if (!fs.existsSync(directory))
                    await mkdirpPromise(directory);

                let success = false;
                while (!success) {
                    if (!fs.existsSync(dest)) {
                        event.sender.send("install log", "[Vanilla] \tDownloading " + artifact.url + " => " + dest);
                        await downloadFile(artifact.url, dest);
                    }

                    event.sender.send("install log", "[Vanilla] \tVerifying checksum of " + dest + "...");
                    let correctHash = artifact.sha1;

                    let fileHash = await hasha.fromFile(dest, { algorithm: "sha1" });

                    event.sender.send("install log", "[Vanilla] \tShould be " + correctHash.toUpperCase() + " - is " + fileHash.toUpperCase());
                    success = fileHash === correctHash;

                    if (!success) {
                        event.sender.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + dest + " - redownloading...");
                        fs.unlinkSync(dest);
                    }
                }

                currentPercent += (percentPer / 2);
                event.sender.send("vanilla progress", `Installing native ${Number(index) + 1} of ${natives.length}:  ${native.name} ...`, currentPercent / 100);

                await new Promise((ff, rj) => {
                    fs.createReadStream(dest).pipe(Extract({ path: nativesFolder })).on("close", () => {
                        ff();
                    })
                });
            }

            event.sender.send("vanilla progress", `Downloading asset index ${versionData.assetIndex.id}...`, 56 / 100);
            let assetIndexFolder = path.join(launcherDir, "assets", "indexes");
            let assetIndexFile = path.join(assetIndexFolder, versionData.assetIndex.id + ".json");
            if (!fs.existsSync(assetIndexFolder))
                await mkdirpPromise(assetIndexFolder);

            let success = false;
            while (!success) {
                if (!fs.existsSync(assetIndexFile)) {
                    event.sender.send("install log", "[Vanilla] \tDownloading " + versionData.assetIndex.url);
                    await downloadFile(versionData.assetIndex.url, assetIndexFile);
                }

                let correctChecksum = versionData.assetIndex.sha1;
                let actual = await hasha.fromFile(assetIndexFile, { algorithm: "sha1" });

                event.sender.send("install log", "[Vanilla] \tChecking Checksum; Should be " + correctChecksum + " - is " + actual);

                success = correctChecksum === actual;

                if (!success) {
                    fs.unlinkSync(assetIndexFile);
                }
            }

            let assets = jsonfile.readFileSync(assetIndexFile).objects;
            percentPer = 40 / Object.keys(assets).length;
            currentPercent = 56;

            let count = Object.keys(assets).length;
            let current = 0;

            for (let index in assets) {
                currentPercent += percentPer;
                current++;

                let asset = assets[index];
                let hash = asset.hash;
                let url = "http://resources.download.minecraft.net/" + hash.substring(0, 2) + "/" + hash;
                let directory = path.join(launcherDir, "assets", "objects", hash.substring(0, 2));

                if (!fs.existsSync(directory))
                    await mkdirpPromise(directory);

                event.sender.send("vanilla progress", `Downloading asset ${current}/${count}: ${index}`, currentPercent / 100);

                let success = false;
                let filePath = path.join(directory, hash);
                while (!success) {
                    let downloaded = false;
                    if (!fs.existsSync(filePath)) {
                        await downloadFile(url, filePath);
                        downloaded = true;
                    }

                    let actualSha1 = await hasha.fromFile(filePath, { algorithm: "sha1" });
                    if (downloaded)
                        event.sender.send("install log", "[Vanilla] \tChecking checksum; should be " + hash.toUpperCase() + " - is " + actualSha1.toUpperCase());

                    success = actualSha1 === hash;
                    if (!success) {
                        event.sender.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + index + " - redownloading...");
                        fs.unlinkSync(filePath);
                    }
                }
            }

            event.sender.send("vanilla progress", `Downloading game client...`, 98 / 100);
            success = false;
            let filePath = path.join(launcherDir, "versions", versionData.id, versionData.id + ".jar");
            while (!success) {
                let downloaded = false;
                if (!fs.existsSync(filePath)) {
                    await downloadFile(versionData.downloads.client.url, filePath);
                    downloaded = true;
                }

                let actualSha1 = await hasha.fromFile(filePath, { algorithm: "sha1" });
                if (downloaded)
                    event.sender.send("install log", "[Vanilla] \tChecking checksum; should be " + versionData.downloads.client.sha1.toUpperCase() + " - is " + actualSha1.toUpperCase());

                success = actualSha1 === versionData.downloads.client.sha1;
                if (!success) {
                    event.sender.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for game client - redownloading...");
                    fs.unlinkSync(filePath);
                }
            }
            event.sender.send("vanilla progress", `Finished`, 1);
        } else {
            event.sender.send("vanilla progress", `Game client is already installed.`, 1);
        }

        let forgeVersionFolder = path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion)

        if (pack.forgeVersion && !fs.existsSync(path.join(forgeVersionFolder, "forge.jar"))) {
            if (!fs.existsSync(forgeVersionFolder))
                await mkdirpPromise(forgeVersionFolder);

            event.sender.send("modded progress", `Commencing minecraft forge download...`, 0 / 100);

            let forgeJarURL = `http://files.minecraftforge.net/maven/net/minecraftforge/forge/${pack.gameVersion}-${pack.forgeVersion}-${pack.gameVersion}/forge-${pack.gameVersion}-${pack.forgeVersion}-${pack.gameVersion}-universal.jar`;

            event.sender.send("modded progress", `Downloading forge ${pack.forgeVersion}`, 1 / 100);
            event.sender.send("install log", "[Modpack] \tDownloading " + forgeJarURL);

            try {
                await downloadFile(forgeJarURL, path.join(forgeVersionFolder, "forge_temp.jar"));
            } catch (e) {
                //Ignore
            }

            if (!fs.existsSync(path.join(forgeVersionFolder, "forge_temp.jar"))) {
                forgeJarURL = `http://files.minecraftforge.net/maven/net/minecraftforge/forge/${pack.gameVersion}-${pack.forgeVersion}/forge-${pack.gameVersion}-${pack.forgeVersion}-universal.jar`;
                event.sender.send("install log", "[Modpack] \tFalling back to old-style url: " + forgeJarURL);

                await downloadFile(forgeJarURL, path.join(forgeVersionFolder, "forge_temp.jar"));
            }

            let buf = fs.readFileSync(path.join(forgeVersionFolder, "forge_temp.jar"));
            let zip = await JSZip.loadAsync(buf);

            event.sender.send("modded progress", `Extracting forge version info...`, 2 / 100);

            await new Promise((ff, rj) => {
                zip.file("version.json")
                    .nodeStream()
                    .pipe(fs.createWriteStream(path.join(forgeVersionFolder, "version.json")))
                    .on('finish', function () {
                        ff();
                    });
            });

            event.sender.send("modded progress", `Reading forge version info...`, 3 / 100);
            let versionJSON = jsonfile.readFileSync(path.join(forgeVersionFolder, "version.json"));

            event.sender.send("modded progress", `Preparing to install forge libraries...`, 4 / 100);

            let libs = versionJSON.libraries.filter((lib: any) => lib.name.indexOf("net.minecraftforge:forge:") === -1);

            event.sender.send("install log", "[Modpack] \tNeed to install " + libs.length + " libraries for forge.");

            let percentPer = 46 / libs.length;
            let current = 4;

            for (let index in libs) {
                current += percentPer;
                let lib = libs[index];
                let libnameSplit = lib.name.split(":");

                let filePath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
                let url = (lib.url ? lib.url : "https://libraries.minecraft.net/") + filePath;

                event.sender.send("modded progress", `Downloading ${lib.name}`, current / 100);

                let localPath = [launcherDir, "libraries"].concat(filePath.split("/")).join(path.sep);
                event.sender.send("install log", "[Modpack] \tDownloading " + url + " => " + localPath);

                if (fs.existsSync(localPath))
                    continue;

                if (!fs.existsSync(path.dirname(localPath)))
                    await mkdirpPromise(path.dirname(localPath));

                try {
                    await downloadFile(url, localPath);
                } catch (e) {
                    //Ignore
                }

                if (!fs.existsSync(localPath)) {
                    url += ".pack.xz";
                    event.sender.send("install log", "[Modpack] \tFalling back to XZ'd Packed jar file: " + url);
                    let tempFolder = path.join(launcherDir, "temp");
                    if (!fs.existsSync(tempFolder))
                        await mkdirpPromise(tempFolder);
                    await downloadFile(url, path.join(tempFolder, path.basename(localPath) + ".pack.xz"));

                    if (!fs.existsSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"))) {
                        event.sender.send("install log", "[Modpack] [Error] Unable to acquire even packed jar; aborting");
                        event.sender.send("install failed", "Unable to acquire even packed jar for " + lib.name);
                        return;
                    }

                    //let input = fs.readFileSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"));

                    event.sender.send("install log", "[Modpack] \t Reversing LZMA on " + path.join(tempFolder, path.basename(localPath) + ".pack.xz") + " using 7za...");

                    //let decompressed = await lzma.decompress(input); //lzma-native doesn't work on windows.

                    if (process.platform === "win32") {
                        //So, annoyingly, we're going to need to download 7za and use that to unxz the file.
                        if (!fs.existsSync(path.join(launcherDir, "7za.exe"))) {
                            event.sender.send("install log", "[Modpack] \t\t Grabbing 7za binary...");
                            await downloadFile("https://launcher.samboycoding.me/res/7za.exe", path.join(launcherDir, "7za.exe"));
                        }

                        //Unpack, using 7za
                        child_process.execFileSync(path.join(launcherDir, "7za.exe"), ["x", path.join(tempFolder, path.basename(localPath) + ".pack.xz"), "-y"], { cwd: tempFolder });
                    } else {
                        try {
                            child_process.execSync("xz -dk \"" + path.join(tempFolder, path.basename(localPath) + ".pack.xz") + "\"", { cwd: tempFolder });
                        } catch (e) {
                            event.sender.send("install failed", "Unable to unpack .xz file (probably due to missing XZ command-line application - try installing xz) for " + lib.name);
                            event.sender.send("install log", "[Modpack] [Error] Failed to call xz - probably not installed. Error: " + e);
                            return;
                        }
                    }

                    //Read the file
                    let decompressed = fs.readFileSync(path.join(tempFolder, path.basename(localPath) + ".pack"));

                    //Remove the existing pack file as we're going to strip the signature now
                    fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack"));

                    let end = Buffer.from(decompressed.subarray(decompressed.length - 4, decompressed.length));
                    let checkString = end.toString("ascii");

                    if (checkString !== "SIGN") {
                        event.sender.send("install log", "[Modpack] [Error] Failed to verify signature of pack file. Aborting install.");
                        event.sender.send("install failed", "Failed to verify pack file signature for " + lib.name);
                        return;
                    }

                    event.sender.send("install log", "[Modpack] \t\tPack file is signed. Stripping checksum...");

                    let length = decompressed.length;
                    event.sender.send("install log", "[Modpack] \t\tFile Length: " + length);

                    let checksumLength = decompressed[length - 8] & 255 | (decompressed[length - 7] & 255) << 8 |
                        (decompressed[length - 6] & 255) << 16 |
                        (decompressed[length - 5] & 255) << 24;
                    event.sender.send("install log", "[Modpack] \t\tCalculated checksum length: " + checksumLength);

                    event.sender.send("install log", "[Modpack] \t\tActual file content length: " + (length - checksumLength - 8));
                    let actualContent = decompressed.subarray(0, length - checksumLength - 8);
                    fs.writeFileSync(path.join(tempFolder, path.basename(localPath) + ".pack"), actualContent);

                    fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"));

                    event.sender.send("install log", "[Modpack] \t" + unpack200 + " \"" + path.join(tempFolder, path.basename(localPath) + ".pack") + "\" \"" + localPath + "\"");

                    child_process.execFileSync(unpack200, [path.join(tempFolder, path.basename(localPath) + ".pack"), localPath]);

                    if (!fs.existsSync(localPath)) {
                        event.sender.send("install log", "[Modpack] \t[Error] Failed to unpack packed file - result missing. Aborting install.");
                        event.sender.send("install failed", "Unable to unpack .pack file (result file doesn't exist) for " + lib.name);
                        return;
                    }

                    fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack"));
                }
            }

            //Move to here to mark as installed once libs installed.
            fs.copyFileSync(path.join(forgeVersionFolder, "forge_temp.jar"), path.join(forgeVersionFolder, "forge.jar"));
            fs.unlinkSync(path.join(forgeVersionFolder, "forge_temp.jar"));
        }

        let packDir = path.join(packsDir, pack.packName);
        let modsDir = path.join(packDir, "mods");

        if (!fs.existsSync(modsDir))
            await mkdirpPromise(modsDir);

        let installedMods: Mod[] = [];
        if (fs.existsSync(path.join(packDir, "install.json"))) {
            installedMods = jsonfile.readFileSync(path.join(packDir, "install.json")).installedMods;
        }

        if (pack.mods.length) {
            event.sender.send("modded progress", `Commencing mods download...`, 50 / 100);
            let percentPer = 45 / pack.mods.length;
            let current = 50;

            for (let index in pack.mods) {
                current += percentPer;
                let mod = pack.mods[index];

                event.sender.send("modded progress", `Downloading mod ${Number(index) + 1}/${pack.mods.length}: ${mod.resolvedName}`, current / 100);

                if (installedMods.find(m => m.fileId === mod.fileId)) {
                    event.sender.send("install log", "[Modpack] \tVersion already downloaded; not downloading again.");
                    continue;
                }

                let url = `https://minecraft.curseforge.com/projects/${mod.slug}/files/${mod.fileId}/download`;

                event.sender.send("install log", "[Modpack] \tDownloading " + mod.resolvedVersion + " from " + url);

                await downloadFile(url, path.join(modsDir, mod.resolvedVersion));
            }
        }

        event.sender.send("modded progress", `Checking for overrides`, 0.95);

        let resp = await fetch("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, {
            method: "HEAD"
        });

        if (resp.status === 200) {
            event.sender.send("modded progress", `Downloading overrides`, 0.96);
            await downloadFile("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, path.join(packDir, "overrides.zip"));

            event.sender.send("modded progress", `Installing overrides`, 0.97);

            await new Promise((ff, rj) => {
                fs.createReadStream(path.join(packDir, "overrides.zip")).pipe(Extract({ path: packDir })).on("close", () => {
                    ff();
                })
            });
        } else {
            event.sender.send("install log", "[Modpack] \tNo overrides.");
        }

        event.sender.send("modded progress", `Finishing up`, 0.98);

        jsonfile.writeFileSync(path.join(packDir, "install.json"), {
            id: pack.id,
            packName: pack.packName,
            installedVersion: pack.version,
            installedMods: pack.mods,
            author: pack.author
        });

        event.sender.send("modded progress", `Finished.`, 1);

        event.sender.send("install complete");
    } catch (e) {
        event.sender.send("install failed", "An exception occurred: " + e);
        event.sender.send("install log", "[Error] An Exception occurred: " + e);
    }
});

ipcMain.on("uninstall pack", (event: IpcMessageEvent, pack: Pack) => {

});

ipcMain.on("launch pack", (event: IpcMessageEvent, pack: Pack) => {
    let gameArgs: string[] = [];
    let jvmArgs: string[] = [];
    let classPath: string[] = [];
    let mainClass: string;

    let vanillaManifest: VanillaVersionData;
    let forgeManifest: any;

    if (pack.forgeVersion) {
        //Launch forge
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

        let arch = process.arch.indexOf("64") > -1 ? "x64" : "x86";

        gameArgs = forgeManifest.minecraftArguments.split(" ");
        jvmArgs = [];
        if (process.platform === "darwin")
            jvmArgs.push("-XstartOnFirstThread");
        if (process.platform === "win32")
            jvmArgs.push("-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump");
        if (process.platform === "win32" && os.release().startsWith("10."))
            jvmArgs = jvmArgs.concat(["-Dos.name=Windows 10", "-Dos.version=10.0"]);
        if (arch === "x86")
            jvmArgs.push("-Xss1M");

        jvmArgs = jvmArgs.concat(["-Djava.library.path=${natives_directory}", "-Dminecraft.launcher.brand=${launcher_name}", "-Dminecraft.launcher.version=${launcher_version}", "-cp", "${classpath}"])

        for (let index in vanillaManifest.libraries) {
            let library = vanillaManifest.libraries[index];
            if (library.downloads && library.downloads.artifact) {
                classPath.push(path.join(launcherDir, "libraries") + (process.platform === "win32" ? "\\" : "/") + library.downloads.artifact.path.split("/").join(process.platform === "win32" ? "\\" : "/"));
            }
        }

        for (let index in forgeManifest.libraries) {
            let library: any = forgeManifest.libraries[index];
            if (library.name.indexOf("net.minecraftforge:forge") === -1) { //Skip forge itself, we add it later
                let libnameSplit: string = library.name.split(":");

                let filePath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
                let localPath = [launcherDir, "libraries"].concat(filePath.split("/")).join(path.sep);

                classPath.push(localPath);
            }
        }

        classPath.push(path.join(launcherDir, "versions", vanillaManifest.id, vanillaManifest.id + ".jar"))
        classPath.push(path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion, "forge.jar"))

        mainClass = forgeManifest.mainClass;

    } else {
        //Launch base game
        if (!fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".jar"))
            || !fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".json"))) {
            return event.sender.send("launch failed", "Base game version is no longer installed or installation corrupt. Please reinstall the pack.");
        }

        vanillaManifest = jsonfile.readFileSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".json"));

        let ourOs = process.platform === "win32" ? "windows"
            : process.platform === "darwin" ? "osx"
                : "linux";
        let arch = process.arch.indexOf("64") > -1 ? "x64" : "x86";
        let version = os.release();

        //Some versions (pre-1.13) don't have a complex args system like this, just a simple `minecraftArguments` string
        //That needs to be split on spaces
        if (vanillaManifest.arguments) {
            gameArgs = [];
            for (let index in vanillaManifest.arguments.game) {
                let arg = vanillaManifest.arguments.game[index];

                if (typeof (arg) === "string")
                    gameArgs.push(arg);
                else {
                    let allow = false; //Default to false if rules exist and none match us
                    if (arg.rules.length) {
                        for (let rIndex in arg.rules) {
                            let rule = arg.rules[rIndex];
                            if (rule.os) {
                                if ((!rule.os.name || rule.os.name === ourOs)
                                    && (!rule.os.arch || rule.os.arch === arch)
                                    && (!rule.os.version || RegExp(rule.os.version).exec(version))) { //exec returns null on no match
                                    if (rule.action === "allow") {
                                        allow = true;
                                    } else {
                                        allow = false;
                                    }
                                    break;
                                }
                            } else if (rule.features && Object.keys(rule.features).length) {
                                if (rule.features.hasOwnProperty("has_custom_resolution")) {
                                    allow = true; //TODO: Change this to if the user has a resolution set once settings done
                                }
                            } else {
                                allow = rule.action === "allow";
                            }
                        }
                    } else {
                        allow = true; //Default to allow if no rules
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

            for (let index in vanillaManifest.arguments.jvm) {
                let arg = vanillaManifest.arguments.jvm[index];

                if (typeof (arg) === "string")
                    jvmArgs.push(arg);
                else {
                    let allow = false; //Default to false if rules exist and none match us
                    if (arg.rules.length) {
                        for (let rIndex in arg.rules) {
                            let rule = arg.rules[rIndex];
                            if (rule.os) {
                                if ((!rule.os.name || rule.os.name === ourOs)
                                    && (!rule.os.arch || rule.os.arch === arch)
                                    && (!rule.os.version || RegExp(rule.os.version).exec(version))) { //exec returns null on no match
                                    if (rule.action === "allow") {
                                        allow = true;
                                    } else {
                                        allow = false;
                                    }
                                    break;
                                }
                            } else if (rule.features && Object.keys(rule.features).length) {
                                //No-op?
                            } else {
                                allow = rule.action === "allow";
                            }
                        }
                    } else {
                        allow = true; //Default to allow if no rules
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
            if (process.platform === "darwin")
                jvmArgs.push("-XstartOnFirstThread");
            if (process.platform === "win32")
                jvmArgs.push("-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump");
            if (process.platform === "win32" && os.release().startsWith("10."))
                jvmArgs = jvmArgs.concat(["-Dos.name=Windows 10", "-Dos.version=10.0"]);
            if (arch === "x86")
                jvmArgs.push("-Xss1M");

            jvmArgs = jvmArgs.concat(["-Djava.library.path=${natives_directory}", "-Dminecraft.launcher.brand=${launcher_name}", "-Dminecraft.launcher.version=${launcher_version}", "-cp", "${classpath}"])
        }

        for (let index in vanillaManifest.libraries) {
            let library = vanillaManifest.libraries[index];
            if (library.downloads && library.downloads.artifact) {
                classPath.push(path.join(launcherDir, "libraries") + (process.platform === "win32" ? "\\" : "/") + library.downloads.artifact.path.split("/").join(process.platform === "win32" ? "\\" : "/"));
            }
        }

        classPath.push(path.join(launcherDir, "versions", vanillaManifest.id, vanillaManifest.id + ".jar"))

        mainClass = vanillaManifest.mainClass;
    }

    gameArgs = gameArgs.map(arg => {
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
                return "1280"; //TODO: Change once resolution controls in
            case "${resolution_height}":
                return "720"; //TODO: And this
            default:
                return arg;
        }
    });

    jvmArgs = jvmArgs.map(arg => {
        return arg.replace("${natives_directory}", path.join(launcherDir, "versions", vanillaManifest.id, "natives"))
            .replace("${launcher_name}", "SamboyLauncher")
            .replace("${launcher_version}", "v2")
            .replace("${game_directory}", path.join(launcherDir, "packs", pack.packName))
            .replace("${classpath}", classPath.join(process.platform === "win32" ? ";" : ":"));
    });

    let memGigs = 2;

    jvmArgs = jvmArgs.concat([`-Xmx${memGigs}G`, `-Xms${memGigs - 1}G`, "-Djava.net.preferIPv4Stack=true"]);

    let java = "java";

    if (process.platform === "win32") {
        //Oracle does stupid stuff on windows with the location of java, so find it manually
        if (!fs.existsSync(path.join(process.env["PROGRAMFILES"], "Java"))) {
            event.sender.send("launch failed", "No Java installed. If on 64-bit windows, try installing 64-bit java.");
            return;
        }

        let files = fs.readdirSync(path.join(process.env["PROGRAMFILES"], "Java"));
        let installation = files.find(file => file.startsWith("jre1.8") || file.startsWith("jdk1.8"));
        if (!installation) {
            event.sender.send("launch failed", "No correct Java version found. Install Java 8.");
            return;
        }

        if (!fs.existsSync(path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "javaw.exe"))) {
            event.sender.send("launch failed", "Corrupt Java installation detected. Remove " + path.join(process.env["PROGRAMFILES"], "Java", installation) + " and try again.");
            return;
        }

        java = path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "javaw.exe");
    }

    let finalArgs = jvmArgs.concat([mainClass]).concat(gameArgs);

    let gameProcess = child_process.spawn(java, finalArgs, {
        cwd: path.join(launcherDir, "packs", pack.packName),
        stdio: "pipe",
        detached: true,
    });

    event.sender.send("game launched");
    event.sender.send("game output", java + " " + finalArgs.join(" "));

    gameProcess.stdout.on('data', function (data) {
        event.sender.send("game output", data.toString("utf8").trim());
    });
    gameProcess.stderr.on('data', function (data) {
        event.sender.send("game error", data.toString("utf8").trim());
    });
    gameProcess.on('close', function (code) {
        event.sender.send("game closed", code);
    });
});

ipcMain.on("uninstall pack", async (event: IpcMessageEvent, pack: Pack) => {
    let packDir = path.join(launcherDir, "packs", pack.packName);
    if (!fs.existsSync(packDir)) return;

    event.sender.send("uninstalling pack");

    await rmfr(packDir);

    event.sender.send("uninstalled pack");
});

ipcMain.on("check updates", (event: IpcMessageEvent) => {
    Logger.info("Checking for updates...");
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify().then((update) => {
            if (update) {
                Logger.info("Update found! " + update.updateInfo.releaseName);
                event.sender.send("update available", update.updateInfo.releaseName);
            } else {
                Logger.info("No update found.");
                event.sender.send("no update");
            }
        }).catch(e => {
            Logger.warn("Error checking for updates: " + e);
            event.sender.send("update error");
        });
    } else {
        event.sender.send("update devmode");
    }
});

ipcMain.on("install update", (event: IpcMessageEvent) => {
    autoUpdater.quitAndInstall();
})