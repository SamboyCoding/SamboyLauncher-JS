import {join} from "path";
import EnvironmentManager from "../managers/EnvironmentManager";
import ForgeVersion from "./ForgeVersion";
import InstalledPackJSON from "./InstalledPackJSON";
import MCVersion from "./MCVersion";

export default class InstalledPack {
    public name: string;
    public installedVersion: string;

    // TODO
    // public installedMods: ModJar[];
    // public overrides: OverrideFile[];
    public gameVersion: MCVersion;
    public forgeVersion: ForgeVersion;

    private constructor() {

    }

    get packDirectory(): string {
        return join(EnvironmentManager.packsDir, this.name.replace(/[\\/:*?"<>|]/g, "_"));
    }

    public static async FromJSON(installJson: InstalledPackJSON) {
        let ret = new InstalledPack();
        ret.name = installJson.packName;
        ret.installedVersion = installJson.installedVersion;
        ret.gameVersion = await MCVersion.Get(installJson.gameVersion);
        ret.forgeVersion = await ForgeVersion.Get(installJson.forgeVersion);

        //TODO: Load jars, overrides

        return ret;
    }

    get modsDirectory(): string {
        return join(this.packDirectory, "mods");
    }
}
