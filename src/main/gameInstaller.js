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
var web = require("node-fetch");
var jsonfile = require("jsonfile");
var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");
var fetch = web["default"];
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
//# sourceMappingURL=gameInstaller.js.map