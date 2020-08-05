import ManifestArtifact from "./ManifestArtifact";
import {RestrictedGameArgument, RestrictedJavaArgument} from "./MinecraftVersionManifest";

export default class ForgeVersionManifest {
    public arguments?: { //Post-1.13
        game: (string | RestrictedGameArgument)[],
        jvm: (string | RestrictedJavaArgument)[]
    };
    public minecraftArguments?: string;
    public libraries: {
        downloads?: {
            artifact?: ManifestArtifact,
        },
        name: string,
        url?: string,
        clientreq?: boolean,
    }[];
    public mainClass: string;
    public type: "release" | "snapshot" | "old_alpha" | "old_beta";
    public id: string;
}
