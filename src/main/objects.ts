export class AuthData {
    public clientToken: string;
    public accessToken: string;
    public uuid: string;
    public username: string;
    public email: string;
    public password: string;
}

export class Author {
    public id: number;
    public name: string;
}

export class Mod {
    public fileId: string;
    public resolvedName: string;
    public resolvedVersion: string;
    public slug: string;
}

export class Pack {
    public author: Author;
    public description: string;
    public forgeVersion: string;
    public gameVersion: string;
    public id: number;
    public mods: Mod[];
    public numInstalls: number;
    public numRuns: number;
    public packName: string;
    public version: string;
    public updatedForgeVersion: string;
    public latestMods: Mod[];
    public latestVersion: string;
}

export class VanillaManifestVersion {
    public id: string;
    public type: string;
    public url: string;
    public time: string;
    public releaseTime: string;
}

export class AssetIndexMetadata {
    public id: string;
    public sha1: string;
    public size: number;
    public totalSize: number;
    public url: string;
}

export class GameDownloadInfo {
    public sha1: string;
    public size: number;
    public url: string;
}

export class DownloadOptions {
    public client: GameDownloadInfo;
    public server: GameDownloadInfo;
    // tslint:disable-next-line:variable-name
    public windows_server: GameDownloadInfo;
}

export class LibraryArtifact {
    public path: string;
    public sha1: string;
    public size: number;
    public url: string;
}

export class LibraryClassifiers {
    public javadoc: LibraryArtifact;
    public "natives-linux": LibraryArtifact;
    public "natives-linux-32": LibraryArtifact;
    public "natives-linux-64": LibraryArtifact;
    public "natives-macos": LibraryArtifact;
    public "natives-macos-32": LibraryArtifact;
    public "natives-macos-64": LibraryArtifact;
    public "natives-windows": LibraryArtifact;
    public "natives-windows-32": LibraryArtifact;
    public "natives-windows-64": LibraryArtifact;
    public sources: LibraryArtifact;
}

export class LibraryDownloads {
    public artifact: LibraryArtifact;
    public classifiers: LibraryClassifiers;
}

export class LibraryNativesInfo {
    public linux: string;
    public osx: string;
    public windows: string;
}

export class OSRule {
    public name: string;
    public arch: string;
    public version: string;
}

export class ConditionalAllow {
    public action: string;
    public os: OSRule;
    public features: any;
}

export class LibraryMetadata {
    public downloads: LibraryDownloads;
    public name: string;
    public natives: LibraryNativesInfo;
    public rules: ConditionalAllow[];
}

export class ConditionalArgument {
    public rules: ConditionalAllow[];
    public value: string | string[];
}

export class VanillaVersionArguments {
    public game: Array<string | ConditionalArgument>;
    public jvm: Array<string | ConditionalArgument>;
}

export class VanillaVersionData {
    /**
     * For pre-1.13 versions, just a string
     */
    public minecraftArguments: string;
    /**
     * Used since 1.13, more complex argument system
     */
    public arguments: VanillaVersionArguments;
    public assetIndex: AssetIndexMetadata;
    public assets: string;
    public downloads: DownloadOptions;
    public id: string;
    public libraries: LibraryMetadata[];
    public mainClass: string;
    public minimumLauncherVersion: number;
    public releaseTime: string;
    public time: string;
    public type: string;
}
