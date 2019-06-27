import fetch from "node-fetch";
import {Logger} from "../logger";
import ManifestArtifact from "./ManifestArtifact";

export default class MCVersion {
    private static _cache = new Map<string, MCVersion>();
    public manifestUrl: string;
    public name: string;
    public type: string;
    public arguments: {
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
    public assetIndex: {
        id: string,
        sha1: string,
        size: number,
        totalSize: number,
        url: string
    };
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

    constructor(data: { id: string, type: string, url: string }) {
        this.manifestUrl = data.url;
        this.name = data.id;
        this.type = data.type;
    }

    public static async Get(name?: string) {
        if (MCVersion._cache.size === 0) {
            Logger.infoImpl("Minecraft Version Manager", "Loading version listing...");

            //Load from url
            const resp = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json");
            const json: { latest: any, versions: { id: string, type: string, url: string }[] } = await resp.json();

            json.versions.forEach(ver => MCVersion._cache.set(ver.id, new MCVersion(ver)));
        }

        if (name) {
            let ret = MCVersion._cache.get(name);
        }
    }
}
