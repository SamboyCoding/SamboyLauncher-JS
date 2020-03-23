import {join} from "path";
import ApiClient from "../ApiClient";
import EnvironmentManager from "../managers/EnvironmentManager";
import ForgeVersion from "./ForgeVersion";
import InstalledModRecord from "./InstalledModRecord";
import InstalledPackJSON from "./InstalledPackJSON";
import MCVersion from "./MCVersion";
import ModJar from "./ModJar";
import User from "./User";

export default class InstalledPack {
    public id: string;
    public name: string;
    public desc: string;
    public author: User;
    public installedVersion: string;

    public installedMods: InstalledModRecord[];

    // TODO
    // public overrides: OverrideFile[];
    public gameVersion: MCVersion;
    public forgeVersion: ForgeVersion;

    private constructor() {

    }

    get packDirectory(): string {
        return join(EnvironmentManager.packsDir, this.name.replace(/[^\w\d]/g, "_"));
    }

    public static async FromJSON(installJson: InstalledPackJSON) {
        let ret = new InstalledPack();
        ret.id = installJson.id;
        ret.name = installJson.packName;
        ret.desc = installJson.description;
        ret.author = installJson.author;
        ret.installedVersion = installJson.installedVersion;
        ret.gameVersion = await MCVersion.Get(installJson.gameVersion);
        ret.forgeVersion = await ForgeVersion.Get(installJson.forgeVersion);
        ret.installedMods = installJson.installedMods;

        //TODO: Load overrides

        return ret;
    }

    public ToJSON(): InstalledPackJSON {
        return {
            packName: this.name,
            gameVersion: this.gameVersion.name,
            forgeVersion: this.forgeVersion.name,
            installedMods: this.installedMods,
            installedVersion: this.installedVersion,
            description: this.desc,
            id: this.id,
            author: this.author,
        };
    }

    get modsDirectory(): string {
        return join(this.packDirectory, "mods");
    }

    get modJars(): Promise<ModJar[]> {
        return Promise.all(this.installedMods.map(async fileSpec => await ApiClient.getModJar(fileSpec.addonId, fileSpec.fileId)))
    }
}
