import {Mod} from "./mod";
import User from "./User";

export default class InstalledPackJSON {
    public packName: string;
    public description: string;
    public author: User;
    public forgeVersion: string;
    public gameVersion: string;
    public id: string;
    public installedVersion: string;
    public installedMods: Mod[];
}
