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
var _this = this;
exports.__esModule = true;
var electron_1 = require("electron");
var fs = require("fs");
var jsonfile = require("jsonfile");
var web = require("node-fetch");
var path = require("path");
var gameInstaller_1 = require("./gameInstaller");
var objects_1 = require("./objects");
var mkdirp = require("mkdirp");
var hasha = require("hasha");
var JSZip = require("jszip");
var download = require("download");
var child_process = require("child_process");
var unzipper_1 = require("unzipper");
var asar = require("asar");
var electron_updater_1 = require("electron-updater");
var rmfr = require("rmfr");
var os = require("os");
var logger_1 = require("./logger");
var isDev = require("electron-is-dev");
electron_updater_1.autoUpdater.autoDownload = true;
electron_updater_1.autoUpdater.logger = logger_1.Logger;
electron_updater_1.autoUpdater.on("update-downloaded", function () {
    win.webContents.send("update downloaded");
});
var fetch = web["default"];
var launcherDir = path.join(process.platform === "win32" ?
    process.env.APPDATA : (process.platform === "darwin" ?
    path.join(process.env.HOME, "Library", "Preferences")
    : path.join(process.env.HOME, ".SamboyLauncher/")), "SamboyLauncher_JS");
var packsDir = path.join(launcherDir, "packs");
var authData = new objects_1.AuthData();
function btoa(str) {
    return Buffer.from(str, "binary").toString("base64");
}
function atob(str) {
    return Buffer.from(str, "base64").toString("binary");
}
function downloadFile(url, localPath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2, download(url, path.dirname(localPath), { filename: path.basename(localPath) })];
        });
    });
}
function mkdirpPromise(path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2, new Promise(function (ff, rj) {
                    mkdirp(path, function (err, made) {
                        if (err)
                            return rj(err);
                        ff();
                    });
                })];
        });
    });
}
var win;
function createWindow() {
    win = new electron_1.BrowserWindow({
        frame: false,
        height: 720,
        width: 1280
    });
    var menu = new electron_1.Menu();
    menu.append(new electron_1.MenuItem({
        accelerator: "CmdOrCtrl+R",
        click: function () {
            win.webContents.reload();
        },
        label: "Reload"
    }));
    menu.append(new electron_1.MenuItem({
        accelerator: "CmdOrCtrl+Shift+I",
        click: function () {
            win.webContents.openDevTools();
        },
        label: "Open DevTools"
    }));
    win.setMenu(menu);
    win.loadFile("src/renderer/html/index.html");
    win.on("closed", function () {
        win = null;
    });
}
electron_1.app.on("ready", function () { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4, onReady()];
            case 1:
                _a.sent();
                createWindow();
                return [2];
        }
    });
}); });
electron_1.app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", function () {
    if (win === null) {
        createWindow();
    }
});
function onReady() {
    return __awaiter(this, void 0, void 0, function () {
        var content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!fs.existsSync(launcherDir)) return [3, 2];
                    return [4, mkdirpPromise(launcherDir)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    if (fs.existsSync(path.join(launcherDir, "authdata"))) {
                        try {
                            content = jsonfile.readFileSync(path.join(launcherDir, "authdata"));
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
                        }
                        catch (e) {
                            jsonfile.writeFileSync(path.join(launcherDir, "authdata"), {});
                        }
                    }
                    else {
                        jsonfile.writeFileSync(path.join(launcherDir, "authdata"), {});
                    }
                    return [2];
            }
        });
    });
}
electron_1.ipcMain.on("get backgrounds", function (event) {
    if (fs.existsSync(path.join(__dirname, "..", "..", "src", "renderer", "resources", "backgrounds"))) {
        fs.readdir(path.join(__dirname, "..", "..", "src", "renderer", "resources", "backgrounds"), function (err, files) {
            event.sender.send("backgrounds", files);
        });
    }
    else {
        event.sender.send("backgrounds", asar.listPackage("app.asar").filter(function (file) { return file.indexOf("renderer") >= 0 && file.indexOf("backgrounds") >= 0; })
            .map(function (file) { return file.replace(".." + path.sep + "renderer", ".."); }));
    }
});
electron_1.ipcMain.on("get profile", function (event) {
    if (authData.accessToken && authData.username && authData.uuid) {
        event.sender.send("profile", authData.username, authData.uuid);
    }
    else {
        event.sender.send("no profile");
    }
});
electron_1.ipcMain.on("get installed packs", function (event) {
    if (!fs.existsSync(packsDir))
        return event.sender.send("installed packs", []);
    fs.readdir(packsDir, function (error, packFolders) {
        if (error)
            return event.sender.send("installed packs", []);
        var packData = packFolders
            .filter(function (packFolder) { return fs.existsSync(path.join(packsDir, packFolder, "install.json")); })
            .map(function (packFolder) { return path.join(packsDir, packFolder, "install.json"); })
            .map(function (installJson) { return jsonfile.readFileSync(installJson); });
        event.sender.send("installed packs", packData);
    });
});
electron_1.ipcMain.on("login", function (event, username, password, remember) {
    fetch("https://authserver.mojang.com/authenticate", {
        body: JSON.stringify({
            agent: {
                name: "Minecraft",
                version: 1
            },
            clientToken: authData.clientToken ? authData.clientToken : undefined,
            password: password,
            requestUser: true,
            username: username
        }),
        headers: {
            "Content-Type": "application/json"
        },
        method: "POST"
    }).then(function (resp) {
        return resp.json();
    }).then(function (json) {
        try {
            if (json.error) {
                event.sender.send("login error", json.errorMessage);
            }
            else {
                var at = json.accessToken;
                var ct = json.clientToken;
                var uid = json.selectedProfile.id;
                var un = json.selectedProfile.name;
                authData.accessToken = at;
                authData.clientToken = ct;
                authData.uuid = uid;
                authData.username = un;
                if (remember) {
                    authData.password = password;
                }
                else {
                    authData.password = "";
                }
                var content = {};
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
        }
        catch (e) {
            event.sender.send("login error", e);
        }
    });
});
electron_1.ipcMain.on("get top packs", function (event) {
    fetch("https://launcher.samboycoding.me/api/mostPopularPacks").then(function (resp) {
        return resp.json();
    }).then(function (json) {
        event.sender.send("top packs", json);
    });
});
electron_1.ipcMain.on("install pack", function (event, pack) { return __awaiter(_this, void 0, void 0, function () {
    var unpack200, java, files, installation, versions, version, versionData, libraries, natives, currentPercent, percentPer, _a, _b, _i, index, library, dest, directory, success_1, correctHash, fileHash, ourOs_1, arch, nativesFolder_1, _loop_1, _c, _d, _e, index, assetIndexFolder, assetIndexFile, success, correctChecksum, actual, assets, count, current, _f, _g, _h, index, asset, hash, url, directory, success_2, filePath_1, downloaded, actualSha1, filePath, downloaded, actualSha1, forgeVersionFolder_1, forgeJarURL, e_1, buf, zip_1, versionJSON, libs, percentPer, current, _j, _k, _l, index, lib, libnameSplit, filePath, url, localPath, e_2, tempFolder, decompressed, end, checkString, length, checksumLength, actualContent, packDir_1, modsDir, installedMods, percentPer, current, _loop_2, _m, _o, _p, index, resp, e_3;
    return __generator(this, function (_q) {
        switch (_q.label) {
            case 0:
                _q.trys.push([0, 77, , 78]);
                unpack200 = "unpack200";
                java = "java";
                if (process.platform === "win32") {
                    if (!fs.existsSync(path.join(process.env["PROGRAMFILES"], "Java"))) {
                        event.sender.send("install log", "[ERROR] NO JAVA INSTALLED FOR THE CORRECT ARCHITECTURE (IF YOU'RE ON A 64-BIT PC, AND THINK YOU HAVE JAVA, YOU NEED TO INSTALL 64-BIT JAVA)");
                        event.sender.send("vanilla progress", "No Java found. Refusing to install.", 0);
                        event.sender.send("modded progress", "No Java found. Refusing to install.", 0);
                        return [2];
                    }
                    files = fs.readdirSync(path.join(process.env["PROGRAMFILES"], "Java"));
                    installation = files.find(function (file) { return file.startsWith("jre1.8") || file.startsWith("jdk1.8"); });
                    if (!installation) {
                        event.sender.send("install log", "[ERROR] JAVA APPEARS TO BE INSTALLED, BUT IT'S NOT JAVA 8. MINECRAFT ONLY RUNS WITH JAVA 8, PLEASE INSTALL IT.)");
                        event.sender.send("vanilla progress", "Wrong Java version found. Refusing to install.", 0);
                        event.sender.send("modded progress", "Wrong Java version found. Refusing to install.", 0);
                        return [2];
                    }
                    if (!fs.existsSync(path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "javaw.exe")) || !fs.existsSync(path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "unpack200.exe"))) {
                        event.sender.send("install log", "[ERROR] BROKEN JAVA DETECTED. MISSING EITHER JAVAW OR UNPACK200. PLEASE CLEAN UP YOUR JAVA INSTALLATIONS.)");
                        event.sender.send("vanilla progress", "Corrupt Java version found. Refusing to install.", 0);
                        event.sender.send("modded progress", "Corrupt Java version found. Refusing to install.", 0);
                        return [2];
                    }
                    unpack200 = path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "unpack200.exe");
                    java = path.join(process.env["PROGRAMFILES"], "Java", installation, "bin", "javaw.exe");
                }
                if (!!fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".jar"))) return [3, 38];
                event.sender.send("vanilla progress", "Fetching version listing...", 0);
                event.sender.send("modded progress", "Waiting for base game to install...", -1);
                return [4, gameInstaller_1.getVanillaVersionList()];
            case 1:
                versions = _q.sent();
                version = versions.find(function (version) { return version.id === pack.gameVersion; });
                if (!version) {
                    event.sender.send("install failed", "Couldn't find version " + pack.gameVersion + " in installable version list.");
                }
                event.sender.send("vanilla progress", "Fetching version information for " + version.id + "...", 2 / 100);
                return [4, gameInstaller_1.getVanillaVersionManifest(launcherDir, version)];
            case 2:
                versionData = _q.sent();
                libraries = versionData.libraries.filter(function (lib) { return lib.downloads.artifact && lib.downloads.artifact.url; });
                natives = versionData.libraries.filter(function (lib) { return lib.natives; });
                event.sender.send("vanilla progress", "Starting download of " + libraries.length + " libraries for " + versionData.id + "...", 5 / 100);
                currentPercent = 5;
                percentPer = 25 / libraries.length;
                _a = [];
                for (_b in libraries)
                    _a.push(_b);
                _i = 0;
                _q.label = 3;
            case 3:
                if (!(_i < _a.length)) return [3, 10];
                index = _a[_i];
                currentPercent += percentPer;
                library = libraries[index];
                event.sender.send("vanilla progress", "Downloading library " + (Number(index) + 1) + " of " + libraries.length + ":  " + library.name + " ...", currentPercent / 100);
                dest = path.join(launcherDir, "libraries", library.downloads.artifact.path);
                directory = path.dirname(dest);
                return [4, mkdirpPromise(directory)];
            case 4:
                _q.sent();
                success_1 = false;
                _q.label = 5;
            case 5:
                if (!!success_1) return [3, 9];
                if (!!fs.existsSync(dest)) return [3, 7];
                event.sender.send("install log", "[Vanilla] \tDownloading " + library.downloads.artifact.url + " => " + dest);
                return [4, downloadFile(library.downloads.artifact.url, dest)];
            case 6:
                _q.sent();
                _q.label = 7;
            case 7:
                event.sender.send("install log", "[Vanilla] \tVerifying checksum of " + dest + "...");
                correctHash = library.downloads.artifact.sha1;
                return [4, hasha.fromFile(dest, { algorithm: "sha1" })];
            case 8:
                fileHash = _q.sent();
                event.sender.send("install log", "[Vanilla] \tShould be " + correctHash.toUpperCase() + " - is " + fileHash.toUpperCase());
                success_1 = fileHash === correctHash;
                if (!success_1) {
                    event.sender.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + dest + " - redownloading...");
                    fs.unlinkSync(dest);
                }
                return [3, 5];
            case 9:
                _i++;
                return [3, 3];
            case 10:
                event.sender.send("vanilla progress", "Starting download of " + natives.length + " natives for " + versionData.id + "...", 30 / 100);
                ourOs_1 = process.platform === "darwin" ? "osx" : process.platform === "win32" ? "windows" : "linux";
                arch = process.arch.indexOf("64") > -1 ? "64" : "32";
                percentPer = 25 / natives.length;
                event.sender.send("install log", "[Vanilla] Current OS is " + ourOs_1 + "-" + arch, 30 / 100);
                nativesFolder_1 = path.join(launcherDir, "versions", version.id, "natives");
                if (!!fs.existsSync(nativesFolder_1)) return [3, 12];
                return [4, mkdirpPromise(nativesFolder_1)];
            case 11:
                _q.sent();
                _q.label = 12;
            case 12:
                _loop_1 = function (index) {
                    var native, shouldInstall, rule, artifact, dest, directory, success_3, correctHash, fileHash;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                currentPercent += (percentPer / 2);
                                native = natives[index];
                                event.sender.send("vanilla progress", "Downloading native " + (Number(index) + 1) + " of " + natives.length + ":  " + native.name + " ...", currentPercent / 100);
                                shouldInstall = false;
                                if (native.rules) {
                                    rule = native.rules.find(function (rule) { return rule.os && rule.os.name === ourOs_1; });
                                    if (rule) {
                                        shouldInstall = rule.action === "allow";
                                    }
                                    else {
                                        rule = native.rules.find(function (rule) { return !rule.os; });
                                        if (rule) {
                                            shouldInstall = rule.action === "allow";
                                        }
                                    }
                                }
                                else
                                    shouldInstall = true;
                                if (!shouldInstall) {
                                    event.sender.send("install log", "[Vanilla] \tSkipping native as it doesn't need to be installed on our OS", 30 / 100);
                                    return [2, "continue"];
                                }
                                artifact = void 0;
                                if (ourOs_1 === "osx") {
                                    artifact = native.downloads.classifiers["natives-macos"];
                                    if (!artifact && arch === "64") {
                                        artifact = native.downloads.classifiers["natives-macos-64"];
                                    }
                                    else if (!artifact) {
                                        artifact = native.downloads.classifiers["natives-macos-32"];
                                    }
                                }
                                else if (ourOs_1 === "linux") {
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
                                success_3 = false;
                                _a.label = 3;
                            case 3:
                                if (!!success_3) return [3, 7];
                                if (!!fs.existsSync(dest)) return [3, 5];
                                event.sender.send("install log", "[Vanilla] \tDownloading " + artifact.url + " => " + dest);
                                return [4, downloadFile(artifact.url, dest)];
                            case 4:
                                _a.sent();
                                _a.label = 5;
                            case 5:
                                event.sender.send("install log", "[Vanilla] \tVerifying checksum of " + dest + "...");
                                correctHash = artifact.sha1;
                                return [4, hasha.fromFile(dest, { algorithm: "sha1" })];
                            case 6:
                                fileHash = _a.sent();
                                event.sender.send("install log", "[Vanilla] \tShould be " + correctHash.toUpperCase() + " - is " + fileHash.toUpperCase());
                                success_3 = fileHash === correctHash;
                                if (!success_3) {
                                    event.sender.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + dest + " - redownloading...");
                                    fs.unlinkSync(dest);
                                }
                                return [3, 3];
                            case 7:
                                currentPercent += (percentPer / 2);
                                event.sender.send("vanilla progress", "Installing native " + (Number(index) + 1) + " of " + natives.length + ":  " + native.name + " ...", currentPercent / 100);
                                return [4, new Promise(function (ff, rj) {
                                        fs.createReadStream(dest).pipe(unzipper_1.Extract({ path: nativesFolder_1 })).on("close", function () {
                                            ff();
                                        });
                                    })];
                            case 8:
                                _a.sent();
                                return [2];
                        }
                    });
                };
                _c = [];
                for (_d in natives)
                    _c.push(_d);
                _e = 0;
                _q.label = 13;
            case 13:
                if (!(_e < _c.length)) return [3, 16];
                index = _c[_e];
                return [5, _loop_1(index)];
            case 14:
                _q.sent();
                _q.label = 15;
            case 15:
                _e++;
                return [3, 13];
            case 16:
                event.sender.send("vanilla progress", "Downloading asset index " + versionData.assetIndex.id + "...", 56 / 100);
                assetIndexFolder = path.join(launcherDir, "assets", "indexes");
                assetIndexFile = path.join(assetIndexFolder, versionData.assetIndex.id + ".json");
                if (!!fs.existsSync(assetIndexFolder)) return [3, 18];
                return [4, mkdirpPromise(assetIndexFolder)];
            case 17:
                _q.sent();
                _q.label = 18;
            case 18:
                success = false;
                _q.label = 19;
            case 19:
                if (!!success) return [3, 23];
                if (!!fs.existsSync(assetIndexFile)) return [3, 21];
                event.sender.send("install log", "[Vanilla] \tDownloading " + versionData.assetIndex.url);
                return [4, downloadFile(versionData.assetIndex.url, assetIndexFile)];
            case 20:
                _q.sent();
                _q.label = 21;
            case 21:
                correctChecksum = versionData.assetIndex.sha1;
                return [4, hasha.fromFile(assetIndexFile, { algorithm: "sha1" })];
            case 22:
                actual = _q.sent();
                event.sender.send("install log", "[Vanilla] \tChecking Checksum; Should be " + correctChecksum + " - is " + actual);
                success = correctChecksum === actual;
                if (!success) {
                    fs.unlinkSync(assetIndexFile);
                }
                return [3, 19];
            case 23:
                assets = jsonfile.readFileSync(assetIndexFile).objects;
                percentPer = 40 / Object.keys(assets).length;
                currentPercent = 56;
                count = Object.keys(assets).length;
                current = 0;
                _f = [];
                for (_g in assets)
                    _f.push(_g);
                _h = 0;
                _q.label = 24;
            case 24:
                if (!(_h < _f.length)) return [3, 32];
                index = _f[_h];
                currentPercent += percentPer;
                current++;
                asset = assets[index];
                hash = asset.hash;
                url = "http://resources.download.minecraft.net/" + hash.substring(0, 2) + "/" + hash;
                directory = path.join(launcherDir, "assets", "objects", hash.substring(0, 2));
                if (!!fs.existsSync(directory)) return [3, 26];
                return [4, mkdirpPromise(directory)];
            case 25:
                _q.sent();
                _q.label = 26;
            case 26:
                event.sender.send("vanilla progress", "Downloading asset " + current + "/" + count + ": " + index, currentPercent / 100);
                success_2 = false;
                filePath_1 = path.join(directory, hash);
                _q.label = 27;
            case 27:
                if (!!success_2) return [3, 31];
                downloaded = false;
                if (!!fs.existsSync(filePath_1)) return [3, 29];
                return [4, downloadFile(url, filePath_1)];
            case 28:
                _q.sent();
                downloaded = true;
                _q.label = 29;
            case 29: return [4, hasha.fromFile(filePath_1, { algorithm: "sha1" })];
            case 30:
                actualSha1 = _q.sent();
                if (downloaded)
                    event.sender.send("install log", "[Vanilla] \tChecking checksum; should be " + hash.toUpperCase() + " - is " + actualSha1.toUpperCase());
                success_2 = actualSha1 === hash;
                if (!success_2) {
                    event.sender.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for " + index + " - redownloading...");
                    fs.unlinkSync(filePath_1);
                }
                return [3, 27];
            case 31:
                _h++;
                return [3, 24];
            case 32:
                event.sender.send("vanilla progress", "Downloading game client...", 98 / 100);
                success = false;
                filePath = path.join(launcherDir, "versions", versionData.id, versionData.id + ".jar");
                _q.label = 33;
            case 33:
                if (!!success) return [3, 37];
                downloaded = false;
                if (!!fs.existsSync(filePath)) return [3, 35];
                return [4, downloadFile(versionData.downloads.client.url, filePath)];
            case 34:
                _q.sent();
                downloaded = true;
                _q.label = 35;
            case 35: return [4, hasha.fromFile(filePath, { algorithm: "sha1" })];
            case 36:
                actualSha1 = _q.sent();
                if (downloaded)
                    event.sender.send("install log", "[Vanilla] \tChecking checksum; should be " + versionData.downloads.client.sha1.toUpperCase() + " - is " + actualSha1.toUpperCase());
                success = actualSha1 === versionData.downloads.client.sha1;
                if (!success) {
                    event.sender.send("install log", "[Vanilla] \t[WARNING] SHA1 mismatch for game client - redownloading...");
                    fs.unlinkSync(filePath);
                }
                return [3, 33];
            case 37:
                event.sender.send("vanilla progress", "Finished", 1);
                return [3, 39];
            case 38:
                event.sender.send("vanilla progress", "Game client is already installed.", 1);
                _q.label = 39;
            case 39:
                forgeVersionFolder_1 = path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion);
                if (!(pack.forgeVersion && !fs.existsSync(path.join(forgeVersionFolder_1, "forge.jar")))) return [3, 65];
                if (!!fs.existsSync(forgeVersionFolder_1)) return [3, 41];
                return [4, mkdirpPromise(forgeVersionFolder_1)];
            case 40:
                _q.sent();
                _q.label = 41;
            case 41:
                event.sender.send("modded progress", "Commencing minecraft forge download...", 0 / 100);
                forgeJarURL = "http://files.minecraftforge.net/maven/net/minecraftforge/forge/" + pack.gameVersion + "-" + pack.forgeVersion + "-" + pack.gameVersion + "/forge-" + pack.gameVersion + "-" + pack.forgeVersion + "-" + pack.gameVersion + "-universal.jar";
                event.sender.send("modded progress", "Downloading forge " + pack.forgeVersion, 1 / 100);
                event.sender.send("install log", "[Modpack] \tDownloading " + forgeJarURL);
                _q.label = 42;
            case 42:
                _q.trys.push([42, 44, , 45]);
                return [4, downloadFile(forgeJarURL, path.join(forgeVersionFolder_1, "forge_temp.jar"))];
            case 43:
                _q.sent();
                return [3, 45];
            case 44:
                e_1 = _q.sent();
                return [3, 45];
            case 45:
                if (!!fs.existsSync(path.join(forgeVersionFolder_1, "forge_temp.jar"))) return [3, 47];
                forgeJarURL = "http://files.minecraftforge.net/maven/net/minecraftforge/forge/" + pack.gameVersion + "-" + pack.forgeVersion + "/forge-" + pack.gameVersion + "-" + pack.forgeVersion + "-universal.jar";
                event.sender.send("install log", "[Modpack] \tFalling back to old-style url: " + forgeJarURL);
                return [4, downloadFile(forgeJarURL, path.join(forgeVersionFolder_1, "forge_temp.jar"))];
            case 46:
                _q.sent();
                _q.label = 47;
            case 47:
                buf = fs.readFileSync(path.join(forgeVersionFolder_1, "forge_temp.jar"));
                return [4, JSZip.loadAsync(buf)];
            case 48:
                zip_1 = _q.sent();
                event.sender.send("modded progress", "Extracting forge version info...", 2 / 100);
                return [4, new Promise(function (ff, rj) {
                        zip_1.file("version.json")
                            .nodeStream()
                            .pipe(fs.createWriteStream(path.join(forgeVersionFolder_1, "version.json")))
                            .on('finish', function () {
                            ff();
                        });
                    })];
            case 49:
                _q.sent();
                event.sender.send("modded progress", "Reading forge version info...", 3 / 100);
                versionJSON = jsonfile.readFileSync(path.join(forgeVersionFolder_1, "version.json"));
                event.sender.send("modded progress", "Preparing to install forge libraries...", 4 / 100);
                libs = versionJSON.libraries.filter(function (lib) { return lib.name.indexOf("net.minecraftforge:forge:") === -1; });
                event.sender.send("install log", "[Modpack] \tNeed to install " + libs.length + " libraries for forge.");
                percentPer = 46 / libs.length;
                current = 4;
                _j = [];
                for (_k in libs)
                    _j.push(_k);
                _l = 0;
                _q.label = 50;
            case 50:
                if (!(_l < _j.length)) return [3, 64];
                index = _j[_l];
                current += percentPer;
                lib = libs[index];
                libnameSplit = lib.name.split(":");
                filePath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
                url = (lib.url ? lib.url : "https://libraries.minecraft.net/") + filePath;
                event.sender.send("modded progress", "Downloading " + lib.name, current / 100);
                localPath = [launcherDir, "libraries"].concat(filePath.split("/")).join(path.sep);
                event.sender.send("install log", "[Modpack] \tDownloading " + url + " => " + localPath);
                if (fs.existsSync(localPath))
                    return [3, 63];
                if (!!fs.existsSync(path.dirname(localPath))) return [3, 52];
                return [4, mkdirpPromise(path.dirname(localPath))];
            case 51:
                _q.sent();
                _q.label = 52;
            case 52:
                _q.trys.push([52, 54, , 55]);
                return [4, downloadFile(url, localPath)];
            case 53:
                _q.sent();
                return [3, 55];
            case 54:
                e_2 = _q.sent();
                return [3, 55];
            case 55:
                if (!!fs.existsSync(localPath)) return [3, 63];
                url += ".pack.xz";
                event.sender.send("install log", "[Modpack] \tFalling back to XZ'd Packed jar file: " + url);
                tempFolder = path.join(launcherDir, "temp");
                if (!!fs.existsSync(tempFolder)) return [3, 57];
                return [4, mkdirpPromise(tempFolder)];
            case 56:
                _q.sent();
                _q.label = 57;
            case 57: return [4, downloadFile(url, path.join(tempFolder, path.basename(localPath) + ".pack.xz"))];
            case 58:
                _q.sent();
                if (!fs.existsSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"))) {
                    event.sender.send("install log", "[Modpack] [Error] Unable to acquire even packed jar; aborting");
                    event.sender.send("install failed", "Unable to acquire even packed jar for " + lib.name);
                    return [2];
                }
                event.sender.send("install log", "[Modpack] \t Reversing LZMA on " + path.join(tempFolder, path.basename(localPath) + ".pack.xz") + " using 7za...");
                if (!(process.platform === "win32")) return [3, 61];
                if (!!fs.existsSync(path.join(launcherDir, "7za.exe"))) return [3, 60];
                event.sender.send("install log", "[Modpack] \t\t Grabbing 7za binary...");
                return [4, downloadFile("https://launcher.samboycoding.me/res/7za.exe", path.join(launcherDir, "7za.exe"))];
            case 59:
                _q.sent();
                _q.label = 60;
            case 60:
                child_process.execFileSync(path.join(launcherDir, "7za.exe"), ["x", path.join(tempFolder, path.basename(localPath) + ".pack.xz"), "-y"], { cwd: tempFolder });
                return [3, 62];
            case 61:
                try {
                    child_process.execSync("xz -dk \"" + path.join(tempFolder, path.basename(localPath) + ".pack.xz") + "\"", { cwd: tempFolder });
                }
                catch (e) {
                    event.sender.send("install failed", "Unable to unpack .xz file (probably due to missing XZ command-line application - try installing xz) for " + lib.name);
                    event.sender.send("install log", "[Modpack] [Error] Failed to call xz - probably not installed. Error: " + e);
                    return [2];
                }
                _q.label = 62;
            case 62:
                decompressed = fs.readFileSync(path.join(tempFolder, path.basename(localPath) + ".pack"));
                fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack"));
                end = Buffer.from(decompressed.subarray(decompressed.length - 4, decompressed.length));
                checkString = end.toString("ascii");
                if (checkString !== "SIGN") {
                    event.sender.send("install log", "[Modpack] [Error] Failed to verify signature of pack file. Aborting install.");
                    event.sender.send("install failed", "Failed to verify pack file signature for " + lib.name);
                    return [2];
                }
                event.sender.send("install log", "[Modpack] \t\tPack file is signed. Stripping checksum...");
                length = decompressed.length;
                event.sender.send("install log", "[Modpack] \t\tFile Length: " + length);
                checksumLength = decompressed[length - 8] & 255 | (decompressed[length - 7] & 255) << 8 |
                    (decompressed[length - 6] & 255) << 16 |
                    (decompressed[length - 5] & 255) << 24;
                event.sender.send("install log", "[Modpack] \t\tCalculated checksum length: " + checksumLength);
                event.sender.send("install log", "[Modpack] \t\tActual file content length: " + (length - checksumLength - 8));
                actualContent = decompressed.subarray(0, length - checksumLength - 8);
                fs.writeFileSync(path.join(tempFolder, path.basename(localPath) + ".pack"), actualContent);
                fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack.xz"));
                event.sender.send("install log", "[Modpack] \t" + unpack200 + " \"" + path.join(tempFolder, path.basename(localPath) + ".pack") + "\" \"" + localPath + "\"");
                child_process.execFileSync(unpack200, [path.join(tempFolder, path.basename(localPath) + ".pack"), localPath]);
                if (!fs.existsSync(localPath)) {
                    event.sender.send("install log", "[Modpack] \t[Error] Failed to unpack packed file - result missing. Aborting install.");
                    event.sender.send("install failed", "Unable to unpack .pack file (result file doesn't exist) for " + lib.name);
                    return [2];
                }
                fs.unlinkSync(path.join(tempFolder, path.basename(localPath) + ".pack"));
                _q.label = 63;
            case 63:
                _l++;
                return [3, 50];
            case 64:
                fs.copyFileSync(path.join(forgeVersionFolder_1, "forge_temp.jar"), path.join(forgeVersionFolder_1, "forge.jar"));
                fs.unlinkSync(path.join(forgeVersionFolder_1, "forge_temp.jar"));
                _q.label = 65;
            case 65:
                packDir_1 = path.join(packsDir, pack.packName);
                modsDir = path.join(packDir_1, "mods");
                if (!!fs.existsSync(modsDir)) return [3, 67];
                return [4, mkdirpPromise(modsDir)];
            case 66:
                _q.sent();
                _q.label = 67;
            case 67:
                installedMods = [];
                if (fs.existsSync(path.join(packDir_1, "install.json"))) {
                    installedMods = jsonfile.readFileSync(path.join(packDir_1, "install.json")).installedMods;
                }
                if (!pack.mods.length) return [3, 71];
                event.sender.send("modded progress", "Commencing mods download...", 50 / 100);
                percentPer = 45 / pack.mods.length;
                current = 50;
                _loop_2 = function (index) {
                    var mod, url;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                current += percentPer;
                                mod = pack.mods[index];
                                event.sender.send("modded progress", "Downloading mod " + (Number(index) + 1) + "/" + pack.mods.length + ": " + mod.resolvedName, current / 100);
                                if (installedMods.find(function (m) { return m.fileId === mod.fileId; })) {
                                    event.sender.send("install log", "[Modpack] \tVersion already downloaded; not downloading again.");
                                    return [2, "continue"];
                                }
                                url = "https://minecraft.curseforge.com/projects/" + mod.slug + "/files/" + mod.fileId + "/download";
                                event.sender.send("install log", "[Modpack] \tDownloading " + mod.resolvedVersion + " from " + url);
                                return [4, downloadFile(url, path.join(modsDir, mod.resolvedVersion))];
                            case 1:
                                _a.sent();
                                return [2];
                        }
                    });
                };
                _m = [];
                for (_o in pack.mods)
                    _m.push(_o);
                _p = 0;
                _q.label = 68;
            case 68:
                if (!(_p < _m.length)) return [3, 71];
                index = _m[_p];
                return [5, _loop_2(index)];
            case 69:
                _q.sent();
                _q.label = 70;
            case 70:
                _p++;
                return [3, 68];
            case 71:
                event.sender.send("modded progress", "Checking for overrides", 0.95);
                return [4, fetch("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, {
                        method: "HEAD"
                    })];
            case 72:
                resp = _q.sent();
                if (!(resp.status === 200)) return [3, 75];
                event.sender.send("modded progress", "Downloading overrides", 0.96);
                return [4, downloadFile("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, path.join(packDir_1, "overrides.zip"))];
            case 73:
                _q.sent();
                event.sender.send("modded progress", "Installing overrides", 0.97);
                return [4, new Promise(function (ff, rj) {
                        fs.createReadStream(path.join(packDir_1, "overrides.zip")).pipe(unzipper_1.Extract({ path: packDir_1 })).on("close", function () {
                            ff();
                        });
                    })];
            case 74:
                _q.sent();
                return [3, 76];
            case 75:
                event.sender.send("install log", "[Modpack] \tNo overrides.");
                _q.label = 76;
            case 76:
                event.sender.send("modded progress", "Finishing up", 0.98);
                jsonfile.writeFileSync(path.join(packDir_1, "install.json"), {
                    id: pack.id,
                    packName: pack.packName,
                    installedVersion: pack.version,
                    installedMods: pack.mods,
                    author: pack.author
                });
                event.sender.send("modded progress", "Finished.", 1);
                event.sender.send("install complete");
                return [3, 78];
            case 77:
                e_3 = _q.sent();
                event.sender.send("install failed", "An exception occurred: " + e_3);
                event.sender.send("install log", "[Error] An Exception occurred: " + e_3);
                return [3, 78];
            case 78: return [2];
        }
    });
}); });
electron_1.ipcMain.on("uninstall pack", function (event, pack) {
});
electron_1.ipcMain.on("launch pack", function (event, pack) {
    var gameArgs = [];
    var jvmArgs = [];
    var classPath = [];
    var mainClass;
    var vanillaManifest;
    var forgeManifest;
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
        var arch = process.arch.indexOf("64") > -1 ? "x64" : "x86";
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
        jvmArgs = jvmArgs.concat(["-Djava.library.path=${natives_directory}", "-Dminecraft.launcher.brand=${launcher_name}", "-Dminecraft.launcher.version=${launcher_version}", "-cp", "${classpath}"]);
        for (var index in vanillaManifest.libraries) {
            var library = vanillaManifest.libraries[index];
            if (library.downloads && library.downloads.artifact) {
                classPath.push(path.join(launcherDir, "libraries") + (process.platform === "win32" ? "\\" : "/") + library.downloads.artifact.path.split("/").join(process.platform === "win32" ? "\\" : "/"));
            }
        }
        for (var index in forgeManifest.libraries) {
            var library = forgeManifest.libraries[index];
            if (library.name.indexOf("net.minecraftforge:forge") === -1) {
                var libnameSplit = library.name.split(":");
                var filePath = libnameSplit[0].split(".").join("/") + "/" + libnameSplit[1] + "/" + libnameSplit[2] + "/" + libnameSplit[1] + "-" + libnameSplit[2] + ".jar";
                var localPath = [launcherDir, "libraries"].concat(filePath.split("/")).join(path.sep);
                classPath.push(localPath);
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
        var ourOs = process.platform === "win32" ? "windows"
            : process.platform === "darwin" ? "osx"
                : "linux";
        var arch = process.arch.indexOf("64") > -1 ? "x64" : "x86";
        var version = os.release();
        if (vanillaManifest.arguments) {
            gameArgs = [];
            for (var index in vanillaManifest.arguments.game) {
                var arg = vanillaManifest.arguments.game[index];
                if (typeof (arg) === "string")
                    gameArgs.push(arg);
                else {
                    var allow = false;
                    if (arg.rules.length) {
                        for (var rIndex in arg.rules) {
                            var rule = arg.rules[rIndex];
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
            for (var index in vanillaManifest.arguments.jvm) {
                var arg = vanillaManifest.arguments.jvm[index];
                if (typeof (arg) === "string")
                    jvmArgs.push(arg);
                else {
                    var allow = false;
                    if (arg.rules.length) {
                        for (var rIndex in arg.rules) {
                            var rule = arg.rules[rIndex];
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
            if (process.platform === "darwin")
                jvmArgs.push("-XstartOnFirstThread");
            if (process.platform === "win32")
                jvmArgs.push("-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump");
            if (process.platform === "win32" && os.release().startsWith("10."))
                jvmArgs = jvmArgs.concat(["-Dos.name=Windows 10", "-Dos.version=10.0"]);
            if (arch === "x86")
                jvmArgs.push("-Xss1M");
            jvmArgs = jvmArgs.concat(["-Djava.library.path=${natives_directory}", "-Dminecraft.launcher.brand=${launcher_name}", "-Dminecraft.launcher.version=${launcher_version}", "-cp", "${classpath}"]);
        }
        for (var index in vanillaManifest.libraries) {
            var library = vanillaManifest.libraries[index];
            if (library.downloads && library.downloads.artifact) {
                classPath.push(path.join(launcherDir, "libraries") + (process.platform === "win32" ? "\\" : "/") + library.downloads.artifact.path.split("/").join(process.platform === "win32" ? "\\" : "/"));
            }
        }
        classPath.push(path.join(launcherDir, "versions", vanillaManifest.id, vanillaManifest.id + ".jar"));
        mainClass = vanillaManifest.mainClass;
    }
    gameArgs = gameArgs.map(function (arg) {
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
                return "1280";
            case "${resolution_height}":
                return "720";
            default:
                return arg;
        }
    });
    jvmArgs = jvmArgs.map(function (arg) {
        return arg.replace("${natives_directory}", path.join(launcherDir, "versions", vanillaManifest.id, "natives"))
            .replace("${launcher_name}", "SamboyLauncher")
            .replace("${launcher_version}", "v2")
            .replace("${game_directory}", path.join(launcherDir, "packs", pack.packName))
            .replace("${classpath}", classPath.join(process.platform === "win32" ? ";" : ":"));
    });
    var memGigs = 2;
    jvmArgs = jvmArgs.concat(["-Xmx" + memGigs + "G", "-Xms" + (memGigs - 1) + "G", "-Djava.net.preferIPv4Stack=true"]);
    var java = "java";
    if (process.platform === "win32") {
        if (!fs.existsSync(path.join(process.env["PROGRAMFILES"], "Java"))) {
            event.sender.send("launch failed", "No Java installed. If on 64-bit windows, try installing 64-bit java.");
            return;
        }
        var files = fs.readdirSync(path.join(process.env["PROGRAMFILES"], "Java"));
        var installation = files.find(function (file) { return file.startsWith("jre1.8") || file.startsWith("jdk1.8"); });
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
    var finalArgs = jvmArgs.concat([mainClass]).concat(gameArgs);
    var gameProcess = child_process.spawn(java, finalArgs, {
        cwd: path.join(launcherDir, "packs", pack.packName),
        stdio: "pipe",
        detached: true
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
electron_1.ipcMain.on("uninstall pack", function (event, pack) { return __awaiter(_this, void 0, void 0, function () {
    var packDir;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                packDir = path.join(launcherDir, "packs", pack.packName);
                if (!fs.existsSync(packDir))
                    return [2];
                event.sender.send("uninstalling pack");
                return [4, rmfr(packDir)];
            case 1:
                _a.sent();
                event.sender.send("uninstalled pack");
                return [2];
        }
    });
}); });
electron_1.ipcMain.on("check updates", function (event) {
    logger_1.Logger.info("Checking for updates...");
    if (!isDev) {
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify().then(function (update) {
            if (update) {
                logger_1.Logger.info("Update found! " + update.updateInfo.releaseName);
                event.sender.send("update available", update.updateInfo.releaseName);
            }
            else {
                logger_1.Logger.info("No update found.");
                event.sender.send("no update");
            }
        })["catch"](function (e) {
            logger_1.Logger.warn("Error checking for updates: " + e);
            event.sender.send("update error");
        });
    }
    else {
        event.sender.send("update devmode");
    }
});
electron_1.ipcMain.on("install update", function (event) {
    electron_updater_1.autoUpdater.quitAndInstall();
});
//# sourceMappingURL=index.js.map