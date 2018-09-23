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
var asar = require("asar");
var child_process = require("child_process");
var download = require("download");
var electron_1 = require("electron");
var isDev = require("electron-is-dev");
var electron_updater_1 = require("electron-updater");
var fs = require("fs");
var jsonfile = require("jsonfile");
var mkdirp = require("mkdirp");
var web = require("node-fetch");
var os = require("os");
var path = require("path");
var rmfr = require("rmfr");
var unzipper_1 = require("unzipper");
var config = require("./config");
var gameInstaller_1 = require("./gameInstaller");
var logger_1 = require("./logger");
var objects_1 = require("./objects");
var fetch = web["default"];
var launcherDir = path.join(process.platform === "win32" ?
    process.env.APPDATA : (process.platform === "darwin" ?
    path.join(process.env.HOME, "Library", "Preferences")
    : path.join(process.env.HOME, ".SamboyLauncher/")), "SamboyLauncher_JS");
var configuration = config.load(launcherDir);
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
function mkdirpPromise(location) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2, new Promise(function (ff, rj) {
                    mkdirp(location, function (err, made) {
                        if (err) {
                            return rj(err);
                        }
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
    if (isDev) {
        menu.append(new electron_1.MenuItem({
            accelerator: "CmdOrCtrl+R",
            click: function () {
                win.webContents.reload();
            },
            label: "Reload"
        }));
    }
    menu.append(new electron_1.MenuItem({
        accelerator: "CmdOrCtrl+Shift+I",
        click: function () {
            win.webContents.openDevTools();
        },
        label: "Open DevTools"
    }));
    win.setMenu(menu);
    win.loadFile("src/renderer/html/index.html");
    win.webContents.on("did-finish-load", function () {
        win.webContents.send("dark theme", configuration.darkTheme);
    });
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
electron_1.ipcMain.on("get installed packs", function (event) {
    if (!fs.existsSync(packsDir)) {
        return event.sender.send("installed packs", []);
    }
    fs.readdir(packsDir, function (error, packFolders) {
        if (error) {
            return event.sender.send("installed packs", []);
        }
        var packData = packFolders
            .filter(function (packFolder) { return fs.existsSync(path.join(packsDir, packFolder, "install.json")); })
            .map(function (packFolder) { return path.join(packsDir, packFolder, "install.json"); })
            .map(function (installJson) { return jsonfile.readFileSync(installJson); });
        event.sender.send("installed packs", packData);
    });
});
electron_1.ipcMain.on("get top packs", function (event) {
    fetch("https://launcher.samboycoding.me/api/mostPopularPacks").then(function (resp) {
        return resp.json();
    }).then(function (json) {
        event.sender.send("top packs", json);
    });
});
electron_1.ipcMain.on("set dark", function (event, dark) {
    configuration.darkTheme = dark;
    config.save(launcherDir, configuration);
    event.sender.send("dark theme", configuration.darkTheme);
});
function saveAuthdata() {
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
    if (authData.email) {
        content.email = authData.email;
    }
    jsonfile.writeFileSync(path.join(launcherDir, "authdata"), content);
}
function login(email, password, remember) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2, new Promise(function (ff, rj) {
                    fetch("https://authserver.mojang.com/authenticate", {
                        body: JSON.stringify({
                            agent: {
                                name: "Minecraft",
                                version: 1
                            },
                            clientToken: authData.clientToken ? authData.clientToken : undefined,
                            password: password,
                            requestUser: true,
                            username: email
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
                                rj(json.errorMessage);
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
                })];
        });
    });
}
electron_1.ipcMain.on("get profile", function (event) {
    if (authData.accessToken && authData.username && authData.uuid) {
        event.sender.send("profile", authData.username, authData.uuid);
    }
    else {
        event.sender.send("no profile");
    }
});
electron_1.ipcMain.on("login", function (event, email, password, remember) { return __awaiter(_this, void 0, void 0, function () {
    var e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4, login(email, password, remember)];
            case 1:
                _a.sent();
                event.sender.send("profile", authData.username, authData.uuid);
                return [3, 3];
            case 2:
                e_1 = _a.sent();
                event.sender.send("login error", e_1);
                return [3, 3];
            case 3: return [2];
        }
    });
}); });
electron_1.ipcMain.on("logout", function (event) {
    authData.accessToken = undefined;
    authData.password = undefined;
    authData.username = undefined;
    authData.uuid = undefined;
    saveAuthdata();
    event.sender.send("logged out");
});
electron_1.ipcMain.on("validate session", function (event) {
    if (!authData.accessToken) {
        return;
    }
    fetch("https://authserver.mojang.com/validate", {
        body: JSON.stringify({
            accessToken: authData.accessToken,
            clientToken: authData.clientToken
        }),
        headers: {
            "Content-Type": "application/json"
        },
        method: "POST"
    }).then(function (resp) { return __awaiter(_this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (resp.status === 204) {
                        return [2];
                    }
                    if (!(authData.email && authData.password)) return [3, 5];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4, login(authData.email, authData.password, true)];
                case 2:
                    _a.sent();
                    return [3, 4];
                case 3:
                    e_2 = _a.sent();
                    event.sender.send("session invalid");
                    return [3, 4];
                case 4: return [3, 6];
                case 5:
                    event.sender.send("session invalid");
                    _a.label = 6;
                case 6: return [2];
            }
        });
    }); });
});
electron_1.ipcMain.on("get update actions", function (event, pack) { return __awaiter(_this, void 0, void 0, function () {
    var responseData;
    return __generator(this, function (_a) {
        responseData = {
            addMods: new Array(),
            forge: {
                from: pack.forgeVersion,
                to: pack.updatedForgeVersion !== pack.forgeVersion ? pack.updatedForgeVersion : null
            },
            removeMods: new Array(),
            updateMods: new Array(),
            version: {
                from: pack.installedVersion,
                to: pack.latestVersion
            }
        };
        responseData.addMods = responseData.addMods.concat(pack.latestMods.filter(function (mod) { return !pack.mods.filter(function (installedMod) { return installedMod.slug === mod.slug; }).length; }));
        responseData.removeMods = responseData.removeMods.concat(pack.mods.filter(function (installedMod) { return !pack.latestMods.filter(function (mod) { return installedMod.slug === mod.slug; }).length; }));
        responseData.updateMods = responseData.updateMods.concat(pack.latestMods.filter(function (mod) {
            var currentMod = pack.mods.filter(function (installedMod) { return installedMod.slug === mod.slug; })[0];
            if (!currentMod)
                return false;
            return currentMod.fileId !== mod.fileId;
        }).map(function (mod) {
            var currentMod = pack.mods.filter(function (installedMod) { return installedMod.slug === mod.slug; })[0];
            return {
                from: currentMod,
                to: mod
            };
        }));
        event.sender.send("update actions", responseData);
        return [2];
    });
}); });
electron_1.ipcMain.on("update pack", function (event, pack, updateData) { return __awaiter(_this, void 0, void 0, function () {
    var currentPercent, percentPer, unpack200, files, installation, forgeVersionFolder, versionJSON, libs, modsDir, i, modToRemove, modPath, _a, _b, _i, i, modToRemove, modToAdd, modPath, url, _c, _d, _e, i, modToAdd, url;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                currentPercent = 0;
                percentPer = 97 / ((updateData.forge.to ? 1 : 0) + updateData.addMods.length + updateData.updateMods.length + updateData.removeMods.length);
                event.sender.send("pack update progress", -1, "Starting upgrade...");
                if (!updateData.forge.to) return [3, 3];
                currentPercent += percentPer;
                event.sender.send("pack update progress", currentPercent / 100, "Updating forge from " + updateData.forge.from + " to " + updateData.forge.to + "...");
                unpack200 = "unpack200";
                if (process.platform === "win32") {
                    if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java"))) {
                        return [2];
                    }
                    files = fs.readdirSync(path.join(process.env.PROGRAMFILES, "Java"));
                    installation = files.find(function (file) { return file.startsWith("jre1.8") || file.startsWith("jdk1.8"); });
                    if (!installation) {
                        return [2];
                    }
                    if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "unpack200.exe"))) {
                        return [2];
                    }
                    unpack200 = path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "unpack200.exe");
                }
                forgeVersionFolder = path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + updateData.forge.to);
                if (!!fs.existsSync(path.join(forgeVersionFolder, "forge.jar"))) return [3, 3];
                return [4, gameInstaller_1.downloadForgeJarAndGetJSON(forgeVersionFolder, updateData.forge.to, pack.gameVersion, event.sender)];
            case 1:
                _f.sent();
                versionJSON = jsonfile.readFileSync(path.join(forgeVersionFolder, "version.json"));
                libs = versionJSON.libraries.filter(function (lib) { return lib.name.indexOf("net.minecraftforge:forge:") === -1; });
                event.sender.send("pack update progress", currentPercent / 100, "Updating forge libraries, this may take a minute...");
                return [4, gameInstaller_1.downloadForgeLibraries(launcherDir, libs, unpack200, event.sender)];
            case 2:
                _f.sent();
                _f.label = 3;
            case 3:
                modsDir = path.join(launcherDir, "packs", pack.packName, "mods");
                if (!!fs.existsSync(modsDir)) return [3, 5];
                return [4, mkdirpPromise(modsDir)];
            case 4:
                _f.sent();
                _f.label = 5;
            case 5:
                for (i in updateData.removeMods) {
                    modToRemove = updateData.removeMods[i];
                    currentPercent += percentPer;
                    event.sender.send("pack update progress", currentPercent / 100, "Removing " + modToRemove.resolvedName + "...");
                    modPath = path.join(modsDir, modToRemove.resolvedVersion);
                    fs.unlinkSync(modPath);
                }
                _a = [];
                for (_b in updateData.updateMods)
                    _a.push(_b);
                _i = 0;
                _f.label = 6;
            case 6:
                if (!(_i < _a.length)) return [3, 9];
                i = _a[_i];
                modToRemove = updateData.updateMods[i].from;
                modToAdd = updateData.updateMods[i].to;
                currentPercent += percentPer;
                event.sender.send("pack update progress", currentPercent / 100, "Updating " + modToRemove.resolvedName + " from " + modToRemove.resolvedVersion + " => " + modToAdd.resolvedVersion + "...");
                modPath = path.join(modsDir, modToRemove.resolvedVersion);
                fs.unlinkSync(modPath);
                url = "https://minecraft.curseforge.com/projects/" + modToAdd.slug + "/files/" + modToAdd.fileId + "/download";
                return [4, downloadFile(url, path.join(modsDir, modToAdd.resolvedVersion))];
            case 7:
                _f.sent();
                _f.label = 8;
            case 8:
                _i++;
                return [3, 6];
            case 9:
                _c = [];
                for (_d in updateData.addMods)
                    _c.push(_d);
                _e = 0;
                _f.label = 10;
            case 10:
                if (!(_e < _c.length)) return [3, 13];
                i = _c[_e];
                modToAdd = updateData.addMods[i];
                currentPercent += percentPer;
                event.sender.send("pack update progress", currentPercent / 100, "Downloading " + modToAdd.resolvedName + " (" + modToAdd.resolvedVersion + ")...");
                url = "https://minecraft.curseforge.com/projects/" + modToAdd.slug + "/files/" + modToAdd.fileId + "/download";
                return [4, downloadFile(url, path.join(modsDir, modToAdd.resolvedVersion))];
            case 11:
                _f.sent();
                _f.label = 12;
            case 12:
                _e++;
                return [3, 10];
            case 13:
                event.sender.send("pack update progress", 0.98, "Finishing up");
                jsonfile.writeFileSync(path.join(launcherDir, "packs", pack.packName, "install.json"), {
                    author: pack.author,
                    forgeVersion: updateData.forge.to,
                    gameVersion: pack.gameVersion,
                    id: pack.id,
                    installedMods: pack.latestMods,
                    installedVersion: updateData.version.to,
                    packName: pack.packName
                });
                event.sender.send("pack update progress", 1, "Finished.");
                event.sender.send("pack update complete");
                return [2];
        }
    });
}); });
electron_1.ipcMain.on("uninstall pack", function (event, pack) { return __awaiter(_this, void 0, void 0, function () {
    var packDir;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                packDir = path.join(launcherDir, "packs", pack.packName);
                if (!fs.existsSync(packDir)) {
                    return [2];
                }
                event.sender.send("uninstalling pack");
                return [4, rmfr(packDir)];
            case 1:
                _a.sent();
                event.sender.send("uninstalled pack");
                return [2];
        }
    });
}); });
electron_1.ipcMain.on("install pack", function (event, pack) { return __awaiter(_this, void 0, void 0, function () {
    var unpack200, java, files, installation, result, versions, version, versionData, libraries, natives, ourOs, arch, nativesFolder, forgeVersionFolder, versionJSON, libs, packDir_1, modsDir, installedMods, percentPer, current, _loop_1, _a, _b, _i, index, resp, e_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 26, , 27]);
                unpack200 = "unpack200";
                java = "java";
                if (process.platform === "win32") {
                    if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java"))) {
                        event.sender.send("install log", "[ERROR] NO JAVA INSTALLED FOR THE CORRECT ARCHITECTURE (IF YOU'RE ON A 64-BIT PC, AND THINK YOU HAVE JAVA, YOU NEED TO INSTALL 64-BIT JAVA)");
                        event.sender.send("vanilla progress", "No Java found. Refusing to install.", 0);
                        event.sender.send("modded progress", "No Java found. Refusing to install.", 0);
                        event.sender.send("install failed", "Missing Java.");
                        return [2];
                    }
                    files = fs.readdirSync(path.join(process.env.PROGRAMFILES, "Java"));
                    installation = files.find(function (file) { return file.startsWith("jre1.8") || file.startsWith("jdk1.8"); });
                    if (!installation) {
                        event.sender.send("install log", "[ERROR] JAVA APPEARS TO BE INSTALLED, BUT IT'S NOT JAVA 8. MINECRAFT ONLY RUNS WITH JAVA 8, PLEASE INSTALL IT.)");
                        event.sender.send("vanilla progress", "Wrong Java version found. Refusing to install.", 0);
                        event.sender.send("modded progress", "Wrong Java version found. Refusing to install.", 0);
                        event.sender.send("install failed", "Wrong Java version.");
                        return [2];
                    }
                    if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "javaw.exe")) || !fs.existsSync(path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "unpack200.exe"))) {
                        event.sender.send("install log", "[ERROR] BROKEN JAVA DETECTED. MISSING EITHER JAVAW OR UNPACK200. PLEASE CLEAN UP YOUR JAVA INSTALLATIONS.)");
                        event.sender.send("vanilla progress", "Corrupt Java version found. Refusing to install.", 0);
                        event.sender.send("modded progress", "Corrupt Java version found. Refusing to install.", 0);
                        event.sender.send("install failed", "Corrupt Java.");
                        return [2];
                    }
                    unpack200 = path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "unpack200.exe");
                    java = path.join(process.env.PROGRAMFILES, "Java", installation, "bin", "javaw.exe");
                }
                else {
                    try {
                        result = child_process.spawnSync(java, ["-version"], {
                            encoding: "utf8",
                            stdio: "pipe"
                        });
                        if (result.stderr.indexOf("1.8.0_") < 0) {
                            event.sender.send("install log", "[ERROR] INCORRECT JAVA VERSION DETECTED (NEED JAVA 8). REFUSING TO INSTALL. JAVA VERSION INFO: " + result);
                            event.sender.send("vanilla progress", "Incorrect Java version found. Refusing to install.", 0);
                            event.sender.send("modded progress", "Incorrect Java version found. Refusing to install.", 0);
                            event.sender.send("install failed", "Incorrect java version.");
                            return [2];
                        }
                    }
                    catch (err) {
                        event.sender.send("install log", "[ERROR] NO/BROKEN JAVA DETECTED (NEED WORKING JAVA 8). REFUSING TO INSTALL.");
                        event.sender.send("vanilla progress", "Missing or Broken Java version found. Refusing to install.", 0);
                        event.sender.send("modded progress", "Missing or Broken Java version found. Refusing to install.", 0);
                        event.sender.send("install failed", "Broken or missing Java.");
                        return [2];
                    }
                }
                if (!!fs.existsSync(path.join(launcherDir, "versions", pack.gameVersion, pack.gameVersion + ".jar"))) return [3, 8];
                event.sender.send("vanilla progress", "Fetching version listing...", 0);
                event.sender.send("modded progress", "Waiting for base game to install...", -1);
                return [4, gameInstaller_1.getVanillaVersionList()];
            case 1:
                versions = _c.sent();
                version = versions.find(function (ver) { return ver.id === pack.gameVersion; });
                if (!version) {
                    event.sender.send("install failed", "Couldn't find version " + pack.gameVersion + " in installable version list.");
                }
                event.sender.send("vanilla progress", "Fetching version information for " + version.id + "...", 2 / 100);
                return [4, gameInstaller_1.getVanillaVersionManifest(launcherDir, version)];
            case 2:
                versionData = _c.sent();
                libraries = versionData.libraries.filter(function (lib) { return lib.downloads.artifact && lib.downloads.artifact.url; });
                natives = versionData.libraries.filter(function (lib) { return lib.natives; });
                event.sender.send("vanilla progress", "Starting download of " + libraries.length + " libraries for " + versionData.id + "...", 5 / 100);
                return [4, gameInstaller_1.downloadVanillaLibraries(launcherDir, libraries, event.sender)];
            case 3:
                _c.sent();
                event.sender.send("vanilla progress", "Starting download of " + natives.length + " natives for " + versionData.id + "...", 30 / 100);
                ourOs = process.platform === "darwin" ? "osx" : process.platform === "win32" ? "windows" : "linux";
                arch = process.arch.indexOf("64") > -1 ? "64" : "32";
                nativesFolder = path.join(launcherDir, "versions", version.id, "natives");
                return [4, gameInstaller_1.downloadVanillaNatives(launcherDir, ourOs, arch, nativesFolder, natives, event.sender)];
            case 4:
                _c.sent();
                return [4, gameInstaller_1.downloadAssetManifest(launcherDir, versionData.assetIndex, event.sender)];
            case 5:
                _c.sent();
                return [4, gameInstaller_1.downloadAssets(launcherDir, versionData.assetIndex, event.sender)];
            case 6:
                _c.sent();
                return [4, gameInstaller_1.downloadGameClient(launcherDir, versionData, event.sender)];
            case 7:
                _c.sent();
                event.sender.send("vanilla progress", "Finished", 1);
                return [3, 9];
            case 8:
                event.sender.send("vanilla progress", "Game client is already installed.", 1);
                _c.label = 9;
            case 9:
                forgeVersionFolder = path.join(launcherDir, "versions", "forge-" + pack.gameVersion + "-" + pack.forgeVersion);
                if (!(pack.forgeVersion && !fs.existsSync(path.join(forgeVersionFolder, "forge.jar")))) return [3, 14];
                if (!!fs.existsSync(forgeVersionFolder)) return [3, 11];
                return [4, mkdirpPromise(forgeVersionFolder)];
            case 10:
                _c.sent();
                _c.label = 11;
            case 11: return [4, gameInstaller_1.downloadForgeJarAndGetJSON(forgeVersionFolder, pack.forgeVersion, pack.gameVersion, event.sender)];
            case 12:
                _c.sent();
                event.sender.send("modded progress", "Reading forge version info...", 3 / 100);
                versionJSON = jsonfile.readFileSync(path.join(forgeVersionFolder, "version.json"));
                event.sender.send("modded progress", "Preparing to install forge libraries...", 4 / 100);
                libs = versionJSON.libraries.filter(function (lib) { return lib.name.indexOf("net.minecraftforge:forge:") === -1; });
                return [4, gameInstaller_1.downloadForgeLibraries(launcherDir, libs, unpack200, event.sender)];
            case 13:
                _c.sent();
                fs.copyFileSync(path.join(forgeVersionFolder, "forge_temp.jar"), path.join(forgeVersionFolder, "forge.jar"));
                fs.unlinkSync(path.join(forgeVersionFolder, "forge_temp.jar"));
                _c.label = 14;
            case 14:
                packDir_1 = path.join(packsDir, pack.packName);
                modsDir = path.join(packDir_1, "mods");
                if (!!fs.existsSync(modsDir)) return [3, 16];
                return [4, mkdirpPromise(modsDir)];
            case 15:
                _c.sent();
                _c.label = 16;
            case 16:
                installedMods = [];
                if (fs.existsSync(path.join(packDir_1, "install.json"))) {
                    installedMods = jsonfile.readFileSync(path.join(packDir_1, "install.json")).installedMods;
                }
                if (!pack.mods.length) return [3, 20];
                event.sender.send("modded progress", "Commencing mods download...", 50 / 100);
                percentPer = 45 / pack.mods.length;
                current = 50;
                _loop_1 = function (index) {
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
                _a = [];
                for (_b in pack.mods)
                    _a.push(_b);
                _i = 0;
                _c.label = 17;
            case 17:
                if (!(_i < _a.length)) return [3, 20];
                index = _a[_i];
                return [5, _loop_1(index)];
            case 18:
                _c.sent();
                _c.label = 19;
            case 19:
                _i++;
                return [3, 17];
            case 20:
                event.sender.send("modded progress", "Checking for overrides", 0.95);
                return [4, fetch("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, {
                        method: "HEAD"
                    })];
            case 21:
                resp = _c.sent();
                if (!(resp.status === 200)) return [3, 24];
                event.sender.send("modded progress", "Downloading overrides", 0.96);
                return [4, downloadFile("https://launcher.samboycoding.me/api/packoverrides/" + pack.id, path.join(packDir_1, "overrides.zip"))];
            case 22:
                _c.sent();
                event.sender.send("modded progress", "Installing overrides", 0.97);
                return [4, new Promise(function (ff, rj) {
                        fs.createReadStream(path.join(packDir_1, "overrides.zip")).pipe(unzipper_1.Extract({ path: packDir_1 })).on("close", function () {
                            ff();
                        });
                    })];
            case 23:
                _c.sent();
                return [3, 25];
            case 24:
                event.sender.send("install log", "[Modpack] \tNo overrides.");
                _c.label = 25;
            case 25:
                event.sender.send("modded progress", "Finishing up", 0.98);
                jsonfile.writeFileSync(path.join(packDir_1, "install.json"), {
                    author: pack.author,
                    forgeVersion: pack.forgeVersion,
                    gameVersion: pack.gameVersion,
                    id: pack.id,
                    installedMods: pack.mods,
                    installedVersion: pack.version,
                    packName: pack.packName
                });
                event.sender.send("modded progress", "Finished.", 1);
                event.sender.send("install complete");
                return [3, 27];
            case 26:
                e_3 = _c.sent();
                event.sender.send("install failed", "An exception occurred: " + e_3);
                event.sender.send("install log", "[Error] An Exception occurred: " + e_3);
                return [3, 27];
            case 27: return [2];
        }
    });
}); });
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
                if (typeof (arg) === "string") {
                    gameArgs.push(arg);
                }
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
                if (typeof (arg) === "string") {
                    jvmArgs.push(arg);
                }
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
    var memFreeGigs = Math.floor(os.freemem() / 1000 /
        1000 /
        1000);
    if (process.platform === "linux") {
        var result = child_process.spawnSync("free", ["-b"], {
            encoding: "utf8",
            stdio: "pipe"
        });
        var lines = result.stdout.split("\n");
        var line = lines[1].split(/\s+/);
        var free = parseInt(line[3], 10), buffers = parseInt(line[5], 10), actualFree = free + buffers;
        memFreeGigs = actualFree / 1024 / 1024 / 1024;
    }
    var memGigs = memFreeGigs > 6 ? 6 : memFreeGigs;
    jvmArgs = jvmArgs.concat(["-Xmx" + memGigs + "G", "-Xms" + (memGigs - 1) + "G", "-Djava.net.preferIPv4Stack=true"]);
    var java = "java";
    if (process.platform === "win32") {
        if (!fs.existsSync(path.join(process.env.PROGRAMFILES, "Java"))) {
            event.sender.send("launch failed", "No Java installed. If on 64-bit windows, try installing 64-bit java.");
            return;
        }
        var files = fs.readdirSync(path.join(process.env.PROGRAMFILES, "Java"));
        var installation = files.find(function (file) { return file.startsWith("jre1.8") || file.startsWith("jdk1.8"); });
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
    var finalArgs = jvmArgs.concat([mainClass]).concat(gameArgs);
    var gameProcess = child_process.spawn(java, finalArgs, {
        cwd: path.join(launcherDir, "packs", pack.packName),
        detached: true,
        stdio: "pipe"
    });
    event.sender.send("game launched");
    event.sender.send("game output", java + " " + finalArgs.join(" "));
    gameProcess.stdout.on("data", function (data) {
        event.sender.send("game output", data.toString("utf8").trim());
    });
    gameProcess.stderr.on("data", function (data) {
        event.sender.send("game error", data.toString("utf8").trim());
    });
    gameProcess.on("close", function (code) {
        event.sender.send("game closed", code);
    });
});
electron_updater_1.autoUpdater.autoDownload = true;
electron_updater_1.autoUpdater.logger = logger_1.Logger;
electron_updater_1.autoUpdater.on("update-downloaded", function () {
    win.webContents.send("update downloaded");
});
electron_1.ipcMain.on("check updates", function (event) {
    logger_1.Logger.info("Checking for updates...");
    if (!isDev) {
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify().then(function (update) {
            if (update) {
                logger_1.Logger.info("Update found! " + JSON.stringify(update.updateInfo));
                event.sender.send("update available", update.updateInfo.version);
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