import ManifestArtifact from "./ManifestArtifact";

export default class ForgeVersionManifest {
    public arguments?: {
        game: (string | {
            rules: {
                action: "allow" | "deny",
                features: {
                    [key: string]: boolean
                }
            }[],
            value: string | string[]
        })[],
        jvm: (string | {
            rules: {
                action: "allow" | "deny",
                os: {
                    name?: "windows" | "osx" | "linux",
                    version?: string
                }
            }[],
            value: string | string[]
        })[]
    };
    public minecraftArguments?: string;
    public libraries: {
        downloads?: {
            artifact?: ManifestArtifact,
        },
        name: string,
        url?: string,
        clientreq?: string,
    }[];
    public mainClass: string;
    public type: "release" | "snapshot" | "old_alpha" | "old_beta";
    public id: string;
}
