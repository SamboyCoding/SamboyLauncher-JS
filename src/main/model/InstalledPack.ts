import {join} from "path";
import EnvironmentManager from "../managers/EnvironmentManager";
import ForgeVersion from "./ForgeVersion";
import InstalledPackJSON from "./InstalledPackJSON";
import MCVersion from "./MCVersion";
import ModJar from "./ModJar";

export default class InstalledPack {
    public name: string;
    public installedVersion: string;

    public installedMods: ModJar[];

    // TODO
    // public overrides: OverrideFile[];
    public gameVersion: MCVersion;
    public forgeVersion: ForgeVersion;

    private constructor() {

    }

    get packDirectory(): string {
        return join(EnvironmentManager.packsDir, this.name.replace(/\s/g, "_"));
    }

    public static async FromJSON(installJson: InstalledPackJSON) {
        let ret = new InstalledPack();
        ret.name = installJson.packName;
        ret.installedVersion = installJson.installedVersion;
        ret.gameVersion = await MCVersion.Get(installJson.gameVersion);
        ret.forgeVersion = await ForgeVersion.Get(installJson.forgeVersion);
        ret.installedMods = installJson.installedMods;

        //TODO: Load overrides

        return ret;
    }

    get modsDirectory(): string {
        return join(this.packDirectory, "mods");
    }
}
