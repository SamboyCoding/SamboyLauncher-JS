import {existsSync} from "fs";
import * as jsonfile from "jsonfile";
import * as path from "path";
import Logger from "../logger";
import EnvironmentManager from "./EnvironmentManager";

export default class ConfigurationManager {
    private static fileLoc = path.join(EnvironmentManager.launcherDir, "config.json");

    public static LoadFromDisk() {
        if (existsSync(ConfigurationManager.fileLoc)) {
            Logger.infoImpl("ConfigManager", "Loading config from " + ConfigurationManager.fileLoc);
            const data = jsonfile.readFileSync(ConfigurationManager.fileLoc);
            Object.assign(ConfigurationManager, data);
        } else {
            Logger.infoImpl("ConfigManager", "Creating default config file " + ConfigurationManager.fileLoc);
            ConfigurationManager.save();
        }
    }

    public static async save() {
        Logger.infoImpl("ConfigManager", "Saving config file: " + ConfigurationManager.fileLoc);
        return jsonfile.writeFileSync(ConfigurationManager.fileLoc, ConfigurationManager);
    }
}
