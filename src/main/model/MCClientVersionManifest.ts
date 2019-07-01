import ManifestArtifact from "./ManifestArtifact";

export default class MCClientVersionManifest {
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
    public assetIndex: ManifestArtifact;
    public assets: string;
    public downloads: {
        [key in "client" | "server" | "windows_server"]?: ManifestArtifact
    };
    public libraries: {
        downloads: {
            artifact?: ManifestArtifact,
            classifiers?: {
                [key: string]: ManifestArtifact
            }
        },
        name: string,
        natives: {
            [key in "linux" | "osx" | "windows"]?: string
        },
        extract: {
            exclude: string[]
        },
        rules: {
            action: "allow" | "deny",
            os: {
                name?: "windows" | "osx" | "linux",
                version?: string
            }
        }[],
    }[];
    public logging: {
        client: {
            argument: string,
            file: ManifestArtifact,
            type: string,
        }
    };
    public mainClass: string;
    public type: "release" | "snapshot" | "old_alpha" | "old_beta";
    public id: string;
    public minimumLauncherVersion: number;
}
