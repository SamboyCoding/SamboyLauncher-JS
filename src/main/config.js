"use strict";
exports.__esModule = true;
var fs = require("fs");
var jsonfile = require("jsonfile");
var path = require("path");
var Config = (function () {
    function Config() {
    }
    return Config;
}());
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