import {Mod} from "./mod";
import User from "./User";

export default class InstalledPackJSON {
    public packName: string;
    public author: User;
    public forgeVersion: string;
    public gameVersion: string;
    public id: number;
    public installedVersion: string;
    public installedMods: Mod[];
}
