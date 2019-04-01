import {existsSync, readdirSync, readFileSync} from "fs";
import {join} from "path";
import Env from "../Env";
import {Logger} from "../logger";
import InstallJson from "./InstallJson";

export default class InstalledPack {
    private static byNameMap: Map<string, InstalledPack> = new Map<string, InstalledPack>();

    public static loadInstalledPacks() {
        Logger.infoImpl("InstalledPackManager", "Locating installed packs...");

        const folders = readdirSync(Env.packsDir);
        Logger.debugImpl("InstalledPackManager", "Scanning " + folders.length + " paths...");

        for(const folder of folders) {
            const path = join(Env.packsDir, folder);
            Logger.debugImpl("InstalledPackManager", "Scanning " + path + " for modpack...");

            if(existsSync(join(path, "install.json"))) {
                const pack = new InstalledPack(path);

                InstalledPack.byNameMap.set(pack.name, pack);
            }
        }
    }

    public name: string;
    public installedVersion: string;
    public installedMods: ModJar[];
    public overrides: OverrideFile[];
    public gameVersion: MCVersion;
    public forgeVersion: ForgeVersion;


    constructor(baseDir: string) {
        const installJsonPath = join(baseDir, "install.json");
        const installJson = JSON.parse(readFileSync(installJsonPath).toString("utf8")) as InstallJson;

        this.name = installJson.packName;
        this.installedVersion = installJson.installedVersion;

        //TODO: Load jars, overrides, mc version, forge version.
    }

    get packDirectory(): string {
        return join(Env.packsDir, this.name.replace(/[\\/:*?"<>|]/g, "_"));
    }

    get modsDirectory(): string {
        return join(this.packDirectory, "mods");
    }
}
