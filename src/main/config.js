"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const jsonfile = require("jsonfile");
const path = require("path");
const Env_1 = require("./Env");
const logger_1 = require("./logger");
class Config {
    static load() {
        if (fs_1.existsSync(Config.fileLoc)) {
            logger_1.Logger.infoImpl("ConfigManager", "Loading config from " + Config.fileLoc);
            const data = jsonfile.readFileSync(Config.fileLoc);
            Object.assign(Config, data);
        }
        else {
            logger_1.Logger.infoImpl("ConfigManager", "Creating default config file " + Config.fileLoc);
            Config.save();
        }
    }
    static async save() {
        logger_1.Logger.infoImpl("ConfigManager", "Saving config file: " + Config.fileLoc);
        return jsonfile.writeFileSync(Config.fileLoc, Config);
    }
}
Config.fileLoc = path.join(Env_1.default.launcherDir, "config.json");
exports.default = Config;
//# sourceMappingURL=config.js.map