import ManifestArtifact from "./ManifestArtifact";

class GameFeatureSpecification {
    public is_demo_user: boolean;
    public has_custom_resolution: boolean;
}

class GameArgumentRule {
    public action: "allow" | "deny";
    public features: GameFeatureSpecification;
}

export class RestrictedGameArgument {
    public rules: GameArgumentRule[];
    public value: string | string[];
}

class OsRestrictionRule {
    public name?: "windows" | "osx" | "linux";
    public arch?: "x86" | "x64";
    public version: string;
}

export class OsBasedRestriction {
    public action: "allow" | "deny";
    public os: OsRestrictionRule;
}

export class RestrictedJavaArgument {
    public rules: OsBasedRestriction[];
    public value: string | string[];
}

class GameDownloadSpecification {
    public client: ManifestArtifact;
    public client_mappings?: ManifestArtifact;
    public server: ManifestArtifact;
    public server_mappings?: ManifestArtifact;
    public windows_server?: ManifestArtifact; //Legacy
}

class LibraryDownloadSpecification {
    public artifact?: ManifestArtifact;
    public classifiers?: {
        [key: string]: ManifestArtifact;
    };
}

class LibraryNativeMapping {
    public linux?: string;
    public osx?: string;
    public windows?: string;
}

export class LibrarySpecification {
    public downloads: LibraryDownloadSpecification;
    public name: string;
    public natives: LibraryNativeMapping;
    public extract: {
        exclude: string[]
    };
    public rules: OsBasedRestriction[];
}

export default class MinecraftVersionManifest {
    public arguments?: { //Post-1.13
        game: (string | RestrictedGameArgument)[],
        jvm: (string | RestrictedJavaArgument)[]
    };
    public minecraftArguments?: string; //Legacy
    public assetIndex: ManifestArtifact;
    public assets: string;
    public downloads: GameDownloadSpecification;
    public libraries: LibrarySpecification[];
    public logging: {
        client: {
            argument: string,
            file: ManifestArtifact,
            type: 'log4j2-xml',
        }
    };
    public mainClass: string;
    public type: "release" | "snapshot" | "old_alpha" | "old_beta";
    public id: string;
    public minimumLauncherVersion: number;
}
