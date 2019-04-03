import * as child_process from "child_process";
import * as fs from "fs";
import hasha from "hasha";
import * as jsonfile from "jsonfile";
import * as JSZip from "jszip";
import * as mkdirp from "mkdirp";
import * as web from "node-fetch";
import * as path from "path";
import {Extract} from "unzipper";
import {AssetIndexMetadata, GameVersionData, LibraryArtifact, LibraryMetadata, VanillaManifestVersion} from "./objects";
import * as download from 'download';

const fetch = web.default;

async function downloadFile(url: string, localPath: string): Promise<any> {
    return download(url, path.dirname(localPath), { filename: path.basename(localPath) });
}

async function mkdirpPromise(filePath: string): Promise<any> {
    return new Promise((ff, rj) => {
        mkdirp(filePath, (err, made) => {
            if (err) return rj(err);

            ff();
        });
    });
}

export async function getVanillaVersionList(): Promise<VanillaManifestVersion[]> {
    const resp = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json");
    const json = await resp.json();

    return json.versions;
}

export async function getVanillaVersionManifest(launcherDir: string, version: VanillaManifestVersion): Promise<GameVersionData> {
    const resp = await fetch(version.url);
    const json = await resp.json();

    const verFolder = path.join(launcherDir, "versions", version.id);

    if (!fs.existsSync(verFolder))
        await mkdirpPromise(verFolder);

    jsonfile.writeFileSync(path.join(verFolder, version.id + ".json"), json);

    return json;
}

export async function downloadVanillaLibraries(launcherDir: string, libraries: LibraryMetadata[], webContents: Electron.WebContents) {
    let currentPercent: number = 5;
    const percentPer: number = 25 / libraries.length;

    for (const index in libraries) {
        currentPercent += percentPer;
        const library: LibraryMetadata = libraries[index];

        webContents.send("vanilla progress", `Downloading library ${Number(index) + 1} of ${libraries.length}:  ${library.name} ...`, currentPercent / 100);

        const dest = path.join(launcherDir, "libraries", library.downloads.artifact.path);
        const directory = path.dirname(dest);

        await mkdirpPromise(directory);

        let success2 = false;
        while (!success2) {
            if (!fs.existsSync(dest)) {
                webContents.send("install log", "[Vanilla] \tDownloading " + library.downloads.artifact.url + " => " + dest);
                await downloadFile(library.downloads.artifact.url, dest);
            }

            webContents.send("install log", "[Vanilla] \tVerifying checksum of " + dest + "...");
            const correctHash = library.downloads.artifact.sha1;

            const fileHash = await hasha.fromFile(dest, { algorithm: "sha1" });

            webContents.send("install log", "[Vanilla] \tShould be " + correctHash.toUpperCase() + " - is " + fileHash.toUpperCase());
            success2 = fileHash === correctHash;

            if (!success2) {
                webContents.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + dest + " - redownloading...");
                fs.unlinkSync(dest);
            }
        }
    }
}

export async function downloadVanillaNatives(launcherDir: string, ourOs: string, arch: string, nativesFolder: string, natives: LibraryMetadata[], webContents: Electron.WebContents) {
    const percentPer = 25 / natives.length;
    let currentPercent = 30;

    webContents.send("install log", `[Vanilla] Current OS is ${ourOs}-${arch}`, 30 / 100);

    if (!fs.existsSync(nativesFolder)) {
        await mkdirpPromise(nativesFolder);
    }

    for (const index in natives) {
        currentPercent += (percentPer / 2);
        const native: LibraryMetadata = natives[index];
        webContents.send("vanilla progress", `Downloading native ${Number(index) + 1} of ${natives.length}:  ${native.name} ...`, currentPercent / 100);

        let shouldInstall = false;
        if (native.rules) {
            let rule = native.rules.find((r) => r.os && r.os.name === ourOs);
            // If there's a rule specific to our os, follow that.
            if (rule) {
                shouldInstall = rule.action === "allow";
            } else {
                // Otherwise, try to find a rule for any os
                rule = native.rules.find((r) => !r.os);
                if (rule) {
                    // If one exists, follow that
                    shouldInstall = rule.action === "allow";
                }
                // If one doesn't exist, we'll default to NOT install.
            }
        } else {
            shouldInstall = true;
        } // If no rules we install.

        if (!shouldInstall) {
            webContents.send("install log", `[Vanilla] \tSkipping native as it doesn't need to be installed on our OS`, 30 / 100);
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
        } else if (ourOs === "linux") {
            artifact = native.downloads.classifiers["natives-linux"];
            if (!artifact && arch === "64") {
                artifact = native.downloads.classifiers["natives-linux-64"];
            } else if (!artifact) {
                artifact = native.downloads.classifiers["natives-linux-32"];
            }
        } else {
            artifact = native.downloads.classifiers["natives-windows"];
            if (!artifact && arch === "64") {
                artifact = native.downloads.classifiers["natives-windows-64"];
            } else if (!artifact) {
                artifact = native.downloads.classifiers["natives-windows-32"];
            }
        }

        const dest = path.join(launcherDir, "libraries", artifact.path);
        const directory = path.dirname(dest);

        if (!fs.existsSync(directory)) {
            await mkdirpPromise(directory);
        }

        let success2 = false;
        while (!success2) {
            if (!fs.existsSync(dest)) {
                webContents.send("install log", "[Vanilla] \tDownloading " + artifact.url + " => " + dest);
                await downloadFile(artifact.url, dest);
            }

            webContents.send("install log", "[Vanilla] \tVerifying checksum of " + dest + "...");
            const correctHash = artifact.sha1;

            const fileHash = await hasha.fromFile(dest, { algorithm: "sha1" });

            webContents.send("install log", "[Vanilla] \tShould be " + correctHash.toUpperCase() + " - is " + fileHash.toUpperCase());
            success2 = fileHash === correctHash;

            if (!success2) {
                webContents.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + dest + " - redownloading...");
                fs.unlinkSync(dest);
            }
        }

        currentPercent += (percentPer / 2);
        webContents.send("vanilla progress", `Installing native ${Number(index) + 1} of ${natives.length}:  ${native.name} ...`, currentPercent / 100);

        await new Promise((ff, rj) => {
            fs.createReadStream(dest).pipe(Extract({ path: nativesFolder })).on("close", () => {
                ff();
            });
        });
    }
}

export async function downloadAssetManifest(launcherDir: string, index: AssetIndexMetadata, webContents: Electron.WebContents) {
    webContents.send("vanilla progress", `Downloading asset index ${index.id}...`, 56 / 100);
    const assetIndexFolder = path.join(launcherDir, "assets", "indexes");
    const assetIndexFile = path.join(assetIndexFolder, index.id + ".json");
    if (!fs.existsSync(assetIndexFolder)) {
        await mkdirpPromise(assetIndexFolder);
    }

    let success = false;
    while (!success) {
        if (!fs.existsSync(assetIndexFile)) {
            webContents.send("install log", "[Vanilla] \tDownloading " + index.url);
            await downloadFile(index.url, assetIndexFile);
        }

        const correctChecksum = index.sha1;
        const actual = await hasha.fromFile(assetIndexFile, { algorithm: "sha1" });

        webContents.send("install log", "[Vanilla] \tChecking Checksum; Should be " + correctChecksum + " - is " + actual);

        success = correctChecksum === actual;

        if (!success) {
            fs.unlinkSync(assetIndexFile);
        }
    }
}

export async function downloadAssets(launcherDir: string, index: AssetIndexMetadata, webContents: Electron.WebContents) {
    const assetIndexFolder = path.join(launcherDir, "assets", "indexes");
    const assetIndexFile = path.join(assetIndexFolder, index.id + ".json");

    const assets = jsonfile.readFileSync(assetIndexFile).objects;
    const percentPer = 40 / Object.keys(assets).length;
    let currentPercent = 56;

    const count = Object.keys(assets).length;
    let current = 0;

    for (const i in assets) {
        currentPercent += percentPer;
        current++;

        const asset = assets[i];
        const hash = asset.hash;
        const url = "http://resources.download.minecraft.net/" + hash.substring(0, 2) + "/" + hash;
        const directory = path.join(launcherDir, "assets", "objects", hash.substring(0, 2));

        if (!fs.existsSync(directory)) {
            await mkdirpPromise(directory);
        }

        webContents.send("vanilla progress", `Downloading asset ${current}/${count}: ${i}`, currentPercent / 100);

        let success2 = false;
        const assetLocalPath = path.join(directory, hash);
        while (!success2) {
            let downloaded = false;
            if (!fs.existsSync(assetLocalPath)) {
                await downloadFile(url, assetLocalPath);
                downloaded = true;
            }

            const actualSha1 = await hasha.fromFile(assetLocalPath, { algorithm: "sha1" });
            if (downloaded) {
                webContents.send("install log", "[Vanilla] \tChecking checksum; should be " + hash.toUpperCase() + " - is " + actualSha1.toUpperCase());
            }

            success2 = actualSha1 === hash;
            if (!success2) {
                webContents.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + i + " - redownloading...");
                fs.unlinkSync(assetLocalPath);
            }
        }
    }
}

export async function downloadGameClient(launcherDir: string, versionData: GameVersionData, webContents: Electron.WebContents) {
    webContents.send("vanilla progress", `Downloading game client...`, 98 / 100);
    let success = false;
    const filePath = path.join(launcherDir, "versions", versionData.id, versionData.id + ".jar");
    while (!success) {
        let downloaded = false;
        if (!fs.existsSync(filePath)) {
            await downloadFile(versionData.downloads.client.url, filePath);
            downloaded = true;
        }

        const actualSha1 = await hasha.fromFile(filePath, { algorithm: "sha1" });
        if (downloaded) {
            webContents.send("install log", "[Vanilla] \tChecking checksum; should be " + versionData.downloads.client.sha1.toUpperCase() + " - is " + actualSha1.toUpperCase());
        }

        success = actualSha1 === versionData.downloads.client.sha1;
        if (!success) {
            webContents.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for game client - redownloading...");
            fs.unlinkSync(filePath);
        }
    }
}

export async function downloadForgeJarAndGetJSON(forgeVersionFolder: string, forgeVersion: string, gameVersion: string, webContents: Electron.WebContents) {
    webContents.send("modded progress", `Commencing minecraft forge download...`, 0 / 100);

    let forgeJarURL = `http://files.minecraftforge.net/maven/net/minecraftforge/forge/${gameVersion}-${forgeVersion}-${gameVersion}/forge-${gameVersion}-${forgeVersion}-${gameVersion}-universal.jar`;

    webContents.send("modded progress", `Downloading forge ${forgeVersion}`, 1 / 100);
    webContents.send("install log", "[Modpack] \tDownloading " + forgeJarURL);

    try {
        await downloadFile(forgeJarURL, path.join(forgeVersionFolder, "forge_temp.jar"));
    } catch (e) {
        // Ignore
    }

    if (!fs.existsSync(path.join(forgeVersionFolder, "forge_temp.jar"))) {
        forgeJarURL = `http://files.minecraftforge.net/maven/net/minecraftforge/forge/${gameVersion}-${forgeVersion}/forge-${gameVersion}-${forgeVersion}-universal.jar`;
        webContents.send("install log", "[Modpack] \tFalling back to old-style url: " + forgeJarURL);

        await downloadFile(forgeJarURL, path.join(forgeVersionFolder, "forge_temp.jar"));
    }

    const buf = fs.readFileSync(path.join(forgeVersionFolder, "forge_temp.jar"));
    const zip = await JSZip.loadAsync(buf);

    webContents.send("modded progress", `Extracting forge version info...`, 2 / 100);

    await new Promise((ff, rj) => {
        zip.file("version.json")
            .nodeStream()
            .pipe(fs.createWriteStream(path.join(forgeVersionFolder, "version.json")))
            .on("finish", () => {
                ff();
            });
    });
}

export async function downloadForgeLibraries(launcherDir: string, libs: any, unpack200: string, webContents: Electron.WebContents) {
    webContents.send("install log", "[Modpack] \tNeed to install " + libs.length + " libraries for forge.");

    const percentPer = 46 / libs.length;
    let current = 4;

    for (const index in libs) {
        current += percentPer;
        const lib = libs[index];
        const libnameSplit = lib.name.split(":");

        const filePath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
        let url = (lib.url ? lib.url : "https://libraries.minecraft.net/") + filePath;

        webContents.send("modded progress", `Downloading ${lib.name}`, current / 100);

        const localPath = [launcherDir, "libraries"].concat(filePath.split("/")).join(path.sep);
        webContents.send("install log", "[Modpack] \tDownloading " + url + " => " + localPath);

        if (fs.existsSync(localPath)) {
            continue;
        }

        if (!fs.existsSync(path.dirname(localPath))) {
            await mkdirpPromise(path.dirname(localPath));
        }

        try {
            await downloadFile(url, localPath);
        } catch (e) {
            // Ignore
        }

        if (!fs.existsSync(localPath)) {
            url += ".pack.xz";
            webContents.send("install log", "[Modpack] \tFalling back to XZ'd Packed jar file: " + url);
            const tempFolder = path.join(launcherDir, "temp");
            if (!fs.existsSync(tempFolder)) {
                await mkdirpPromise(tempFolder);
            }
            await downloadFile(url, path.join(tempFolder, path.basename(localPath) + ".pack.xz"));

            if (!fs.existsSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"))) {
                webContents.send("install log", "[Modpack] [Error] Unable to acquire even packed jar; aborting");
                webContents.send("install failed", "Unable to acquire even packed jar for " + lib.name);
                return;
            }

            // let input = fs.readFileSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"));

            webContents.send("install log", "[Modpack] \t Reversing LZMA on " + path.join(tempFolder, path.basename(localPath) + ".pack.xz") + " using 7za...");

            // let decompressed = await lzma.decompress(input); //lzma-native doesn't work on windows.

            if (process.platform === "win32") {
                // So, annoyingly, we're going to need to download 7za and use that to unxz the file.
                if (!fs.existsSync(path.join(launcherDir, "7za.exe"))) {
                    webContents.send("install log", "[Modpack] \t\t Grabbing 7za binary...");
                    await downloadFile("https://launcher.samboycoding.me/res/7za.exe", path.join(launcherDir, "7za.exe"));
                }

                // Unpack, using 7za
                child_process.execFileSync(path.join(launcherDir, "7za.exe"), ["x", path.join(tempFolder, path.basename(localPath) + ".pack.xz"), "-y"], { cwd: tempFolder });
            } else {
                try {
                    child_process.execSync("xz -dk \"" + path.join(tempFolder, path.basename(localPath) + ".pack.xz") + "\"", { cwd: tempFolder });
                } catch (e) {
                    webContents.send("install failed", "Unable to unpack .xz file (probably due to missing XZ command-line application - try installing xz) for " + lib.name);
                    webContents.send("install log", "[Modpack] [Error] Failed to call xz - probably not installed. Error: " + e);
                    return;
                }
            }

            // Read the file
            const decompressed = fs.readFileSync(path.join(tempFolder, path.basename(localPath) + ".pack"));

            // Remove the existing pack file as we're going to strip the signature now
            fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack"));

            const end = Buffer.from(decompressed.subarray(decompressed.length - 4, decompressed.length));
            const checkString = end.toString("ascii");

            if (checkString !== "SIGN") {
                webContents.send("install log", "[Modpack] [Error] Failed to verify signature of pack file. Aborting install.");
                webContents.send("install failed", "Failed to verify pack file signature for " + lib.name);
                return;
            }

            webContents.send("install log", "[Modpack] \t\tPack file is signed. Stripping checksum...");

            const length = decompressed.length;
            webContents.send("install log", "[Modpack] \t\tFile Length: " + length);

            const checksumLength = decompressed[length - 8] & 255 | (decompressed[length - 7] & 255) << 8 |
                (decompressed[length - 6] & 255) << 16 |
                (decompressed[length - 5] & 255) << 24;
            webContents.send("install log", "[Modpack] \t\tCalculated checksum length: " + checksumLength);

            webContents.send("install log", "[Modpack] \t\tActual file content length: " + (length - checksumLength - 8));
            const actualContent = decompressed.subarray(0, length - checksumLength - 8);
            fs.writeFileSync(path.join(tempFolder, path.basename(localPath) + ".pack"), actualContent);

            fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"));

            webContents.send("install log", "[Modpack] \t" + unpack200 + " \"" + path.join(tempFolder, path.basename(localPath) + ".pack") + "\" \"" + localPath + "\"");

            child_process.execFileSync(unpack200, [path.join(tempFolder, path.basename(localPath) + ".pack"), localPath]);

            if (!fs.existsSync(localPath)) {
                webContents.send("install log", "[Modpack] \t[Error] Failed to unpack packed file - result missing. Aborting install.");
                webContents.send("install failed", "Unable to unpack .pack file (result file doesn't exist) for " + lib.name);
                return;
            }

            fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack"));
        }
    }
}

export async function downloadRiftJarAndGetJSON(riftVersionFolder: string, riftVersion: string, gameVersion: string, webContents: Electron.WebContents) {
    // First off, let's grab rift.
    webContents.send("modded progress", `Commencing rift mod loader download...`, 0 / 100);

    const url = `https://minecraft.curseforge.com/projects/rift/files/${riftVersion}/download`;

    webContents.send("modded progress", `Downloading rift ${riftVersion}`, 1 / 100);
    webContents.send("install log", "[Modpack] \tDownloading " + url);

    await downloadFile(url, path.join(riftVersionFolder, "rift_temp.jar"));

    // Now we need to grab the version JSON from inside our jar
    // It's called profile.json

    const buf = fs.readFileSync(path.join(riftVersionFolder, "rift_temp.jar"));
    const zip = await JSZip.loadAsync(buf);

    webContents.send("modded progress", `Extracting rift profile info...`, 2 / 100);

    await new Promise((ff, rj) => {
        zip.file("profile.json")
            .nodeStream()
            .pipe(fs.createWriteStream(path.join(riftVersionFolder, "profile.json")))
            .on("finish", () => {
                ff();
            });
    });
}

export async function downloadRiftLibraries(launcherDir: string, libs: LibraryMetadata[], webContents: Electron.WebContents) {
    const libsDir = path.join(launcherDir, "libraries");
    const percPer = 45 / libs.length;
    let currentPerc = 0;
    for (const index in libs) {
        const lib = libs[index];
        currentPerc += percPer;
        const libnameSplit = lib.name.split(":");
        const localPath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
        const url = (lib.url ? lib.url : "https://libraries.minecraft.net/") + localPath;

        if (!fs.existsSync(path.join(libsDir, path.dirname(localPath))))
            await mkdirpPromise(path.join(libsDir, path.dirname(localPath)));

        webContents.send("modded progress", `Downloading library ${(Number(index) + 1)}/${libs.length}: ${lib.name}`, (5 + currentPerc) / 100);
        webContents.send("install log", "[Modpack] \tDownloading " + url);

        await downloadFile(url, path.join(libsDir, localPath));
    }
}
