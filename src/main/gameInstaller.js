"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var child_process = require("child_process");
var download = require("download");
var fs = require("fs");
var hasha = require("hasha");
var jsonfile = require("jsonfile");
var JSZip = require("jszip");
var mkdirp = require("mkdirp");
var web = require("node-fetch");
var path = require("path");
var unzipper_1 = require("unzipper");
var fetch = web["default"];
function downloadFile(url, localPath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2, download(url, path.dirname(localPath), { filename: path.basename(localPath) })];
        });
    });
}
function mkdirpPromise(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2, new Promise(function (ff, rj) {
                    mkdirp(filePath, function (err, made) {
                        if (err)
                            return rj(err);
                        ff();
                    });
                })];
        });
    });
}
function getVanillaVersionList() {
    return __awaiter(this, void 0, void 0, function () {
        var resp, json;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json")];
                case 1:
                    resp = _a.sent();
                    return [4, resp.json()];
                case 2:
                    json = _a.sent();
                    return [2, json.versions];
            }
        });
    });
}
exports.getVanillaVersionList = getVanillaVersionList;
function getVanillaVersionManifest(launcherDir, version) {
    return __awaiter(this, void 0, void 0, function () {
        var resp, json, verFolder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, fetch(version.url)];
                case 1:
                    resp = _a.sent();
                    return [4, resp.json()];
                case 2:
                    json = _a.sent();
                    verFolder = path.join(launcherDir, "versions", version.id);
                    if (!!fs.existsSync(verFolder)) return [3, 4];
                    return [4, mkdirpPromise(verFolder)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    jsonfile.writeFileSync(path.join(verFolder, version.id + ".json"), json);
                    return [2, json];
            }
        });
    });
}
exports.getVanillaVersionManifest = getVanillaVersionManifest;
function downloadVanillaLibraries(launcherDir, libraries, webContents) {
    return __awaiter(this, void 0, void 0, function () {
        var currentPercent, percentPer, _a, _b, _i, index, library, dest, directory, success2, correctHash, fileHash;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    currentPercent = 5;
                    percentPer = 25 / libraries.length;
                    _a = [];
                    for (_b in libraries)
                        _a.push(_b);
                    _i = 0;
                    _c.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3, 8];
                    index = _a[_i];
                    currentPercent += percentPer;
                    library = libraries[index];
                    webContents.send("vanilla progress", "Downloading library " + (Number(index) + 1) + " of " + libraries.length + ":  " + library.name + " ...", currentPercent / 100);
                    dest = path.join(launcherDir, "libraries", library.downloads.artifact.path);
                    directory = path.dirname(dest);
                    return [4, mkdirpPromise(directory)];
                case 2:
                    _c.sent();
                    success2 = false;
                    _c.label = 3;
                case 3:
                    if (!!success2) return [3, 7];
                    if (!!fs.existsSync(dest)) return [3, 5];
                    webContents.send("install log", "[Vanilla] \tDownloading " + library.downloads.artifact.url + " => " + dest);
                    return [4, downloadFile(library.downloads.artifact.url, dest)];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    webContents.send("install log", "[Vanilla] \tVerifying checksum of " + dest + "...");
                    correctHash = library.downloads.artifact.sha1;
                    return [4, hasha.fromFile(dest, { algorithm: "sha1" })];
                case 6:
                    fileHash = _c.sent();
                    webContents.send("install log", "[Vanilla] \tShould be " + correctHash.toUpperCase() + " - is " + fileHash.toUpperCase());
                    success2 = fileHash === correctHash;
                    if (!success2) {
                        webContents.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + dest + " - redownloading...");
                        fs.unlinkSync(dest);
                    }
                    return [3, 3];
                case 7:
                    _i++;
                    return [3, 1];
                case 8: return [2];
            }
        });
    });
}
exports.downloadVanillaLibraries = downloadVanillaLibraries;
function downloadVanillaNatives(launcherDir, ourOs, arch, nativesFolder, natives, webContents) {
    return __awaiter(this, void 0, void 0, function () {
        var percentPer, currentPercent, _loop_1, _a, _b, _i, index;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    percentPer = 25 / natives.length;
                    currentPercent = 30;
                    webContents.send("install log", "[Vanilla] Current OS is " + ourOs + "-" + arch, 30 / 100);
                    if (!!fs.existsSync(nativesFolder)) return [3, 2];
                    return [4, mkdirpPromise(nativesFolder)];
                case 1:
                    _c.sent();
                    _c.label = 2;
                case 2:
                    _loop_1 = function (index) {
                        var native, shouldInstall, rule, artifact, dest, directory, success2, correctHash, fileHash;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    currentPercent += (percentPer / 2);
                                    native = natives[index];
                                    webContents.send("vanilla progress", "Downloading native " + (Number(index) + 1) + " of " + natives.length + ":  " + native.name + " ...", currentPercent / 100);
                                    shouldInstall = false;
                                    if (native.rules) {
                                        rule = native.rules.find(function (r) { return r.os && r.os.name === ourOs; });
                                        if (rule) {
                                            shouldInstall = rule.action === "allow";
                                        }
                                        else {
                                            rule = native.rules.find(function (r) { return !r.os; });
                                            if (rule) {
                                                shouldInstall = rule.action === "allow";
                                            }
                                        }
                                    }
                                    else {
                                        shouldInstall = true;
                                    }
                                    if (!shouldInstall) {
                                        webContents.send("install log", "[Vanilla] \tSkipping native as it doesn't need to be installed on our OS", 30 / 100);
                                        return [2, "continue"];
                                    }
                                    artifact = void 0;
                                    if (ourOs === "osx") {
                                        artifact = native.downloads.classifiers["natives-macos"];
                                        if (!artifact && arch === "64") {
                                            artifact = native.downloads.classifiers["natives-macos-64"];
                                        }
                                        else if (!artifact) {
                                            artifact = native.downloads.classifiers["natives-macos-32"];
                                        }
                                    }
                                    else if (ourOs === "linux") {
                                        artifact = native.downloads.classifiers["natives-linux"];
                                        if (!artifact && arch === "64") {
                                            artifact = native.downloads.classifiers["natives-linux-64"];
                                        }
                                        else if (!artifact) {
                                            artifact = native.downloads.classifiers["natives-linux-32"];
                                        }
                                    }
                                    else {
                                        artifact = native.downloads.classifiers["natives-windows"];
                                        if (!artifact && arch === "64") {
                                            artifact = native.downloads.classifiers["natives-windows-64"];
                                        }
                                        else if (!artifact) {
                                            artifact = native.downloads.classifiers["natives-windows-32"];
                                        }
                                    }
                                    dest = path.join(launcherDir, "libraries", artifact.path);
                                    directory = path.dirname(dest);
                                    if (!!fs.existsSync(directory)) return [3, 2];
                                    return [4, mkdirpPromise(directory)];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2:
                                    success2 = false;
                                    _a.label = 3;
                                case 3:
                                    if (!!success2) return [3, 7];
                                    if (!!fs.existsSync(dest)) return [3, 5];
                                    webContents.send("install log", "[Vanilla] \tDownloading " + artifact.url + " => " + dest);
                                    return [4, downloadFile(artifact.url, dest)];
                                case 4:
                                    _a.sent();
                                    _a.label = 5;
                                case 5:
                                    webContents.send("install log", "[Vanilla] \tVerifying checksum of " + dest + "...");
                                    correctHash = artifact.sha1;
                                    return [4, hasha.fromFile(dest, { algorithm: "sha1" })];
                                case 6:
                                    fileHash = _a.sent();
                                    webContents.send("install log", "[Vanilla] \tShould be " + correctHash.toUpperCase() + " - is " + fileHash.toUpperCase());
                                    success2 = fileHash === correctHash;
                                    if (!success2) {
                                        webContents.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + dest + " - redownloading...");
                                        fs.unlinkSync(dest);
                                    }
                                    return [3, 3];
                                case 7:
                                    currentPercent += (percentPer / 2);
                                    webContents.send("vanilla progress", "Installing native " + (Number(index) + 1) + " of " + natives.length + ":  " + native.name + " ...", currentPercent / 100);
                                    return [4, new Promise(function (ff, rj) {
                                            fs.createReadStream(dest).pipe(unzipper_1.Extract({ path: nativesFolder })).on("close", function () {
                                                ff();
                                            });
                                        })];
                                case 8:
                                    _a.sent();
                                    return [2];
                            }
                        });
                    };
                    _a = [];
                    for (_b in natives)
                        _a.push(_b);
                    _i = 0;
                    _c.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3, 6];
                    index = _a[_i];
                    return [5, _loop_1(index)];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3, 3];
                case 6: return [2];
            }
        });
    });
}
exports.downloadVanillaNatives = downloadVanillaNatives;
function downloadAssetManifest(launcherDir, index, webContents) {
    return __awaiter(this, void 0, void 0, function () {
        var assetIndexFolder, assetIndexFile, success, correctChecksum, actual;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    webContents.send("vanilla progress", "Downloading asset index " + index.id + "...", 56 / 100);
                    assetIndexFolder = path.join(launcherDir, "assets", "indexes");
                    assetIndexFile = path.join(assetIndexFolder, index.id + ".json");
                    if (!!fs.existsSync(assetIndexFolder)) return [3, 2];
                    return [4, mkdirpPromise(assetIndexFolder)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    success = false;
                    _a.label = 3;
                case 3:
                    if (!!success) return [3, 7];
                    if (!!fs.existsSync(assetIndexFile)) return [3, 5];
                    webContents.send("install log", "[Vanilla] \tDownloading " + index.url);
                    return [4, downloadFile(index.url, assetIndexFile)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    correctChecksum = index.sha1;
                    return [4, hasha.fromFile(assetIndexFile, { algorithm: "sha1" })];
                case 6:
                    actual = _a.sent();
                    webContents.send("install log", "[Vanilla] \tChecking Checksum; Should be " + correctChecksum + " - is " + actual);
                    success = correctChecksum === actual;
                    if (!success) {
                        fs.unlinkSync(assetIndexFile);
                    }
                    return [3, 3];
                case 7: return [2];
            }
        });
    });
}
exports.downloadAssetManifest = downloadAssetManifest;
function downloadAssets(launcherDir, index, webContents) {
    return __awaiter(this, void 0, void 0, function () {
        var assetIndexFolder, assetIndexFile, assets, percentPer, currentPercent, count, current, _a, _b, _i, i, asset, hash, url, directory, success2, assetLocalPath, downloaded, actualSha1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    assetIndexFolder = path.join(launcherDir, "assets", "indexes");
                    assetIndexFile = path.join(assetIndexFolder, index.id + ".json");
                    assets = jsonfile.readFileSync(assetIndexFile).objects;
                    percentPer = 40 / Object.keys(assets).length;
                    currentPercent = 56;
                    count = Object.keys(assets).length;
                    current = 0;
                    _a = [];
                    for (_b in assets)
                        _a.push(_b);
                    _i = 0;
                    _c.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3, 9];
                    i = _a[_i];
                    currentPercent += percentPer;
                    current++;
                    asset = assets[i];
                    hash = asset.hash;
                    url = "http://resources.download.minecraft.net/" + hash.substring(0, 2) + "/" + hash;
                    directory = path.join(launcherDir, "assets", "objects", hash.substring(0, 2));
                    if (!!fs.existsSync(directory)) return [3, 3];
                    return [4, mkdirpPromise(directory)];
                case 2:
                    _c.sent();
                    _c.label = 3;
                case 3:
                    webContents.send("vanilla progress", "Downloading asset " + current + "/" + count + ": " + i, currentPercent / 100);
                    success2 = false;
                    assetLocalPath = path.join(directory, hash);
                    _c.label = 4;
                case 4:
                    if (!!success2) return [3, 8];
                    downloaded = false;
                    if (!!fs.existsSync(assetLocalPath)) return [3, 6];
                    return [4, downloadFile(url, assetLocalPath)];
                case 5:
                    _c.sent();
                    downloaded = true;
                    _c.label = 6;
                case 6: return [4, hasha.fromFile(assetLocalPath, { algorithm: "sha1" })];
                case 7:
                    actualSha1 = _c.sent();
                    if (downloaded) {
                        webContents.send("install log", "[Vanilla] \tChecking checksum; should be " + hash.toUpperCase() + " - is " + actualSha1.toUpperCase());
                    }
                    success2 = actualSha1 === hash;
                    if (!success2) {
                        webContents.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + i + " - redownloading...");
                        fs.unlinkSync(assetLocalPath);
                    }
                    return [3, 4];
                case 8:
                    _i++;
                    return [3, 1];
                case 9: return [2];
            }
        });
    });
}
exports.downloadAssets = downloadAssets;
function downloadGameClient(launcherDir, versionData, webContents) {
    return __awaiter(this, void 0, void 0, function () {
        var success, filePath, downloaded, actualSha1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    webContents.send("vanilla progress", "Downloading game client...", 98 / 100);
                    success = false;
                    filePath = path.join(launcherDir, "versions", versionData.id, versionData.id + ".jar");
                    _a.label = 1;
                case 1:
                    if (!!success) return [3, 5];
                    downloaded = false;
                    if (!!fs.existsSync(filePath)) return [3, 3];
                    return [4, downloadFile(versionData.downloads.client.url, filePath)];
                case 2:
                    _a.sent();
                    downloaded = true;
                    _a.label = 3;
                case 3: return [4, hasha.fromFile(filePath, { algorithm: "sha1" })];
                case 4:
                    actualSha1 = _a.sent();
                    if (downloaded) {
                        webContents.send("install log", "[Vanilla] \tChecking checksum; should be " + versionData.downloads.client.sha1.toUpperCase() + " - is " + actualSha1.toUpperCase());
                    }
                    success = actualSha1 === versionData.downloads.client.sha1;
                    if (!success) {
                        webContents.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for game client - redownloading...");
                        fs.unlinkSync(filePath);
                    }
                    return [3, 1];
                case 5: return [2];
            }
        });
    });
}
exports.downloadGameClient = downloadGameClient;
function downloadForgeJarAndGetJSON(forgeVersionFolder, forgeVersion, gameVersion, webContents) {
    return __awaiter(this, void 0, void 0, function () {
        var forgeJarURL, e_1, buf, zip;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    webContents.send("modded progress", "Commencing minecraft forge download...", 0 / 100);
                    forgeJarURL = "http://files.minecraftforge.net/maven/net/minecraftforge/forge/" + gameVersion + "-" + forgeVersion + "-" + gameVersion + "/forge-" + gameVersion + "-" + forgeVersion + "-" + gameVersion + "-universal.jar";
                    webContents.send("modded progress", "Downloading forge " + forgeVersion, 1 / 100);
                    webContents.send("install log", "[Modpack] \tDownloading " + forgeJarURL);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4, downloadFile(forgeJarURL, path.join(forgeVersionFolder, "forge_temp.jar"))];
                case 2:
                    _a.sent();
                    return [3, 4];
                case 3:
                    e_1 = _a.sent();
                    return [3, 4];
                case 4:
                    if (!!fs.existsSync(path.join(forgeVersionFolder, "forge_temp.jar"))) return [3, 6];
                    forgeJarURL = "http://files.minecraftforge.net/maven/net/minecraftforge/forge/" + gameVersion + "-" + forgeVersion + "/forge-" + gameVersion + "-" + forgeVersion + "-universal.jar";
                    webContents.send("install log", "[Modpack] \tFalling back to old-style url: " + forgeJarURL);
                    return [4, downloadFile(forgeJarURL, path.join(forgeVersionFolder, "forge_temp.jar"))];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    buf = fs.readFileSync(path.join(forgeVersionFolder, "forge_temp.jar"));
                    return [4, JSZip.loadAsync(buf)];
                case 7:
                    zip = _a.sent();
                    webContents.send("modded progress", "Extracting forge version info...", 2 / 100);
                    return [4, new Promise(function (ff, rj) {
                            zip.file("version.json")
                                .nodeStream()
                                .pipe(fs.createWriteStream(path.join(forgeVersionFolder, "version.json")))
                                .on("finish", function () {
                                ff();
                            });
                        })];
                case 8:
                    _a.sent();
                    return [2];
            }
        });
    });
}
exports.downloadForgeJarAndGetJSON = downloadForgeJarAndGetJSON;
function downloadForgeLibraries(launcherDir, libs, unpack200, webContents) {
    return __awaiter(this, void 0, void 0, function () {
        var percentPer, current, _a, _b, _i, index, lib, libnameSplit, filePath, url, localPath, e_2, tempFolder, decompressed, end, checkString, length, checksumLength, actualContent;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    webContents.send("install log", "[Modpack] \tNeed to install " + libs.length + " libraries for forge.");
                    percentPer = 46 / libs.length;
                    current = 4;
                    _a = [];
                    for (_b in libs)
                        _a.push(_b);
                    _i = 0;
                    _c.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3, 15];
                    index = _a[_i];
                    current += percentPer;
                    lib = libs[index];
                    libnameSplit = lib.name.split(":");
                    filePath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
                    url = (lib.url ? lib.url : "https://libraries.minecraft.net/") + filePath;
                    webContents.send("modded progress", "Downloading " + lib.name, current / 100);
                    localPath = [launcherDir, "libraries"].concat(filePath.split("/")).join(path.sep);
                    webContents.send("install log", "[Modpack] \tDownloading " + url + " => " + localPath);
                    if (fs.existsSync(localPath)) {
                        return [3, 14];
                    }
                    if (!!fs.existsSync(path.dirname(localPath))) return [3, 3];
                    return [4, mkdirpPromise(path.dirname(localPath))];
                case 2:
                    _c.sent();
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    return [4, downloadFile(url, localPath)];
                case 4:
                    _c.sent();
                    return [3, 6];
                case 5:
                    e_2 = _c.sent();
                    return [3, 6];
                case 6:
                    if (!!fs.existsSync(localPath)) return [3, 14];
                    url += ".pack.xz";
                    webContents.send("install log", "[Modpack] \tFalling back to XZ'd Packed jar file: " + url);
                    tempFolder = path.join(launcherDir, "temp");
                    if (!!fs.existsSync(tempFolder)) return [3, 8];
                    return [4, mkdirpPromise(tempFolder)];
                case 7:
                    _c.sent();
                    _c.label = 8;
                case 8: return [4, downloadFile(url, path.join(tempFolder, path.basename(localPath) + ".pack.xz"))];
                case 9:
                    _c.sent();
                    if (!fs.existsSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"))) {
                        webContents.send("install log", "[Modpack] [Error] Unable to acquire even packed jar; aborting");
                        webContents.send("install failed", "Unable to acquire even packed jar for " + lib.name);
                        return [2];
                    }
                    webContents.send("install log", "[Modpack] \t Reversing LZMA on " + path.join(tempFolder, path.basename(localPath) + ".pack.xz") + " using 7za...");
                    if (!(process.platform === "win32")) return [3, 12];
                    if (!!fs.existsSync(path.join(launcherDir, "7za.exe"))) return [3, 11];
                    webContents.send("install log", "[Modpack] \t\t Grabbing 7za binary...");
                    return [4, downloadFile("https://launcher.samboycoding.me/res/7za.exe", path.join(launcherDir, "7za.exe"))];
                case 10:
                    _c.sent();
                    _c.label = 11;
                case 11:
                    child_process.execFileSync(path.join(launcherDir, "7za.exe"), ["x", path.join(tempFolder, path.basename(localPath) + ".pack.xz"), "-y"], { cwd: tempFolder });
                    return [3, 13];
                case 12:
                    try {
                        child_process.execSync("xz -dk \"" + path.join(tempFolder, path.basename(localPath) + ".pack.xz") + "\"", { cwd: tempFolder });
                    }
                    catch (e) {
                        webContents.send("install failed", "Unable to unpack .xz file (probably due to missing XZ command-line application - try installing xz) for " + lib.name);
                        webContents.send("install log", "[Modpack] [Error] Failed to call xz - probably not installed. Error: " + e);
                        return [2];
                    }
                    _c.label = 13;
                case 13:
                    decompressed = fs.readFileSync(path.join(tempFolder, path.basename(localPath) + ".pack"));
                    fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack"));
                    end = Buffer.from(decompressed.subarray(decompressed.length - 4, decompressed.length));
                    checkString = end.toString("ascii");
                    if (checkString !== "SIGN") {
                        webContents.send("install log", "[Modpack] [Error] Failed to verify signature of pack file. Aborting install.");
                        webContents.send("install failed", "Failed to verify pack file signature for " + lib.name);
                        return [2];
                    }
                    webContents.send("install log", "[Modpack] \t\tPack file is signed. Stripping checksum...");
                    length = decompressed.length;
                    webContents.send("install log", "[Modpack] \t\tFile Length: " + length);
                    checksumLength = decompressed[length - 8] & 255 | (decompressed[length - 7] & 255) << 8 |
                        (decompressed[length - 6] & 255) << 16 |
                        (decompressed[length - 5] & 255) << 24;
                    webContents.send("install log", "[Modpack] \t\tCalculated checksum length: " + checksumLength);
                    webContents.send("install log", "[Modpack] \t\tActual file content length: " + (length - checksumLength - 8));
                    actualContent = decompressed.subarray(0, length - checksumLength - 8);
                    fs.writeFileSync(path.join(tempFolder, path.basename(localPath) + ".pack"), actualContent);
                    fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"));
                    webContents.send("install log", "[Modpack] \t" + unpack200 + " \"" + path.join(tempFolder, path.basename(localPath) + ".pack") + "\" \"" + localPath + "\"");
                    child_process.execFileSync(unpack200, [path.join(tempFolder, path.basename(localPath) + ".pack"), localPath]);
                    if (!fs.existsSync(localPath)) {
                        webContents.send("install log", "[Modpack] \t[Error] Failed to unpack packed file - result missing. Aborting install.");
                        webContents.send("install failed", "Unable to unpack .pack file (result file doesn't exist) for " + lib.name);
                        return [2];
                    }
                    fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack"));
                    _c.label = 14;
                case 14:
                    _i++;
                    return [3, 1];
                case 15: return [2];
            }
        });
    });
}
exports.downloadForgeLibraries = downloadForgeLibraries;
//# sourceMappingURL=gameInstaller.js.map