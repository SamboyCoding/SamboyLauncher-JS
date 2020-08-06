import LegacyForgeVersionManifest from "./LegacyForgeVersionManifest";

export class LegacyForgeInstallData {
    public target: string;
    public minecraft: string;
    public path: string;
    public filePath: string;
}

export default class LegacyForgeInstallProfile {
    public install: LegacyForgeInstallData;
    public versionInfo: LegacyForgeVersionManifest;
}
