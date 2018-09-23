import * as fs from "fs";
import * as jsonfile from "jsonfile";
import * as path from "path";

export class Config {
    public darkTheme: boolean;
}

export function load(launcherDir: string): Config {
    return fs.existsSync(path.join(launcherDir, "config.json")) ? jsonfile.readFileSync(path.join(launcherDir, "config.json")) : new Config();
}

export function save(launcherDir: string, config: Config) {
    return jsonfile.writeFileSync(path.join(launcherDir, "config.json"), config);
}
