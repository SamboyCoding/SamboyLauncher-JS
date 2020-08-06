import {LibrarySpecification} from "./MinecraftVersionManifest";

export class ModernForgeInstallProfileVariable {
    public client: string;
    public server: string;
}

export class ModernForgeInstallProfileData {
    [key: string]: ModernForgeInstallProfileVariable;
}

export class ModernForgeInstallProfileProcessor {
    public jar: string;
    public classpath: string[];
    public args: string[];
}

export default class ModernForgeInstallProfile {
    public spec: number;
    public profile: string;
    public version: string;
    public json: string;
    public path: string;
    public logo: string;
    public minecraft: string;
    public welcome: string;
    public data: ModernForgeInstallProfileData;
    public processors: ModernForgeInstallProfileProcessor[];
    public libraries: LibrarySpecification[];
}
