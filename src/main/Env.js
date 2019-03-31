"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const logger_1 = require("./logger");
const Utils_1 = require("./util/Utils");
class Env {
}
exports.default = Env;
logger_1.Logger.infoImpl("Environment", "Setting up environment paths...");
Env.appDatadir = process.platform === "win32" ? process.env.APPDATA
    : (process.platform === "darwin" ? path.join(process.env.HOME, "Library", "Preferences")
        : path.join(process.env.HOME, ".SamboyLauncher/"));
Env.launcherDir = path.join(Env.appDatadir, "SamboyLauncher_JS");
Env.packsDir = path.join(Env.launcherDir, "packs");
if (!fs.existsSync(Env.launcherDir)) {
    Utils_1.default.mkdirpPromise(Env.launcherDir);
}
if (!fs.existsSync(Env.packsDir)) {
    Utils_1.default.mkdirpPromise(Env.packsDir);
}
//# sourceMappingURL=Env.js.map