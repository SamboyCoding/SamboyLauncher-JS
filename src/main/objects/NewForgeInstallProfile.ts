import ManifestArtifact from "./ManifestArtifact";

export default class NewForgeInstallProfile {
    public version: string;
    public json: string;
    public path: string;
    public data: {
        [key: string]: {
            client: string,
            server: string
        }
    };
    processors: {
        jar: string,
        classpath: string[],
        args: string[],
        outputs?: {
            [key: string]: string
        },
    }[];
    libraries: {
        name: string,
        downloads: {
            artifact: ManifestArtifact,
        }
    }[];
}
