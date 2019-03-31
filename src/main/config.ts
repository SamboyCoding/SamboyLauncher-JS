import {existsSync} from "fs";
import * as jsonfile from "jsonfile";
import * as path from "path";
import Env from "./Env";
import {Logger} from "./logger";

export default class Config {
    public static darkTheme: boolean;
    private static fileLoc = path.join(Env.launcherDir, "config.json");

    public static load() {
        if (existsSync(Config.fileLoc)) {
            Logger.infoImpl("ConfigManager", "Loading config from " + Config.fileLoc);
            const data = jsonfile.readFileSync(Config.fileLoc);
            Object.assign(Config, data);
        } else {
            Logger.infoImpl("ConfigManager", "Creating default config file " + Config.fileLoc);
            Config.save();
        }
    }

    public static async save() {
        Logger.infoImpl("ConfigManager", "Saving config file: " + Config.fileLoc);
        return jsonfile.writeFileSync(Config.fileLoc, Config);
    }
}
