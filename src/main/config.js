"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const jsonfile = require("jsonfile");
const path = require("path");
class Config {
}
exports.Config = Config;
function load(launcherDir) {
    return fs.existsSync(path.join(launcherDir, "config.json")) ? jsonfile.readFileSync(path.join(launcherDir, "config.json")) : new Config();
}
exports.load = load;
function save(launcherDir, config) {
    return jsonfile.writeFileSync(path.join(launcherDir, "config.json"), config);
}
exports.save = save;
//# sourceMappingURL=config.js.map