import {OsBasedRestriction} from "./MinecraftVersionManifest";

export default class LegacyForgeVersionManifest {
    public minecraftArguments?: string;
    public libraries: {
        name: string,
        url?: string,
        clientreq?: boolean,
        rules?: OsBasedRestriction[],
        checksums: string[],
        natives?: {
            [key: string]: string
        }
    }[];
    public mainClass: string;
    public type: "release" | "snapshot" | "old_alpha" | "old_beta";
    public id: string;
}
