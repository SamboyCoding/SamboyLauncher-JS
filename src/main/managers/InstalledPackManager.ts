import {existsSync, lstatSync, readdirSync} from "fs";
import {readFileSync} from "jsonfile";
import {join} from "path";
import Logger from "../logger";
import InstalledPack from "../model/InstalledPack";
import InstalledPackJSON from "../model/InstalledPackJSON";
import AuthenticationManager from "./AuthenticationManager";
import EnvironmentManager from "./EnvironmentManager";

export default class InstalledPackManager {
    private static packs: Map<string, InstalledPack> = new Map<string, InstalledPack>();
    private static packJsons: InstalledPackJSON[] = [];

    public static LoadFromDisk() {
        let dir = EnvironmentManager.packsDir;
        let packDirs = readdirSync(dir)
            .map(name => join(EnvironmentManager.packsDir, name))
            .filter(source => lstatSync(source).isDirectory());

        let jsonPaths = packDirs
            .map(dir => join(dir, "install.json"))
            .filter(json => existsSync(json));

        for (let path of jsonPaths) {
            try {
                this.packJsons.push(readFileSync(path));
            } catch (e) {
                Logger.warnImpl("Installed Pack Manager", `Failed to read ${path}; corrupt file?`);
            }
        }

        Logger.infoImpl("Installed Pack Manager", `Loaded ${this.packJsons.length} installed pack JSON(s)`);
    }

    public static GetPackNames(): string[] {
        return this.packJsons.map(json => json.packName);
    }

    public static GetOwnedPackNames(): string[] {
        return this.packJsons.filter(json => (json.author.name === "Me" && !json.author.uuid) || json.author.uuid === AuthenticationManager.uuid).map(json => json.packName);
    }

    public static GetPackJSON(name: string) {
        return this.packJsons.find(json => json.packName === name);
    }

    public static async GetPackDetails(name: string): Promise<InstalledPack | null> {
        if (!this.packs.has(name)) {
            let json = this.packJsons.find(json => json.packName === name);
            if (json)
                this.packs.set(name, await InstalledPack.FromJSON(json));
            else
                this.packs.set(name, null);
        }

        return this.packs.get(name);
    }

}
