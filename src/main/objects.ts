export class AuthData {
    public clientToken: string;
    public accessToken: string;
    public uuid: string;
    public username: string;
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

export class LibraryDownloadRuleOS {
    public name: string;
}

export class LibraryDownloadRule {
    public action: string;
    public os: LibraryDownloadRuleOS
}

export class LibraryMetadata {
    public downloads: LibraryDownloads;
    public name: string;
    public natives: LibraryNativesInfo;
    public rules: LibraryDownloadRule[];
}

export class VanillaVersionData {
    public arguments: any;
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