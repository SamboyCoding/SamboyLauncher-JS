import {readFileSync, writeFileSync} from "jsonfile";
import fetch from "node-fetch";
import * as os from "os";
import * as path from "path";
import Logger from "../logger";
import EnvironmentManager from "../managers/EnvironmentManager";
import Utils from "../util/Utils";
import ManifestArtifact from "./ManifestArtifact";
import MCAssetDefinition from "./MCAssetDefinition";
import MCAssetIndex from "./MCAssetIndex";
import MCClientVersionManifest from "./MCClientVersionManifest";
import { join } from 'path';
import { existsSync } from 'fs';

export default class MCVersion {
    private static _cache = new Map<string, MCVersion>();
    public manifestUrl: string;
    public name: string;
    public type: "release" | "snapshot" | "old_alpha" | "old_beta";

    public assetIndex: ManifestArtifact;
    public clientJar: ManifestArtifact;
    public libraries: ManifestArtifact[] = [];
    public natives: ManifestArtifact[] = [];
    public assets: Map<string, MCAssetDefinition> = new Map<string, MCAssetDefinition>();

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

    constructor(data: { id: string, type: "release" | "snapshot" | "old_alpha" | "old_beta", url: string }) {
        this.manifestUrl = data.url;
        this.name = data.id;
        this.type = data.type;
    }

    public static async Get(name?: string): Promise<MCVersion | null> {
        if (MCVersion._cache.size === 0) {
            Logger.infoImpl("Minecraft Version Manager", "Loading version listing...");

            //Load from url
            let json: { latest: any, versions: { id: string, type: "release" | "snapshot" | "old_alpha" | "old_beta", url: string }[] };
            try {
                const resp = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json");
                json = await resp.json();
            } catch (e) {
                Logger.errorImpl("Minecraft Version Manager", "Error loading version listing! " + e);
                return null;
            }

            json.versions.forEach(ver => MCVersion._cache.set(ver.id, new MCVersion(ver)));

            let releases = json.versions.filter(v => v.type === "release").length;
            let snapshots = json.versions.filter(v => v.type === "snapshot").length;
            let oldBetas = json.versions.filter(v => v.type === "old_beta").length;
            let oldAlphas = json.versions.filter(v => v.type === "old_alpha").length;

            Logger.infoImpl("Minecraft Version Manager", `Loaded ${json.versions.length} versions, of which ${releases} are release builds, ${snapshots} are snapshots, ${oldBetas} are beta builds, and ${oldAlphas} are alpha builds.`);
        }

        if (name) {
            let mcVersion = MCVersion._cache.get(name);

            if (mcVersion.assetIndex) return mcVersion; //Already fetched.

            Logger.infoImpl("Minecraft Version Manager", "Fetching data for version " + name + "...");

            const manifestFile = join(EnvironmentManager.versionsDir, name, name + ".json");

            let mfest: MCClientVersionManifest;
            if(existsSync(manifestFile)) {
                Logger.debugImpl("Minecraft Version Manager", "Loading from local file; version is installed");
                mfest = readFileSync(manifestFile) as MCClientVersionManifest;
            }
            else {
                const resp2 = await fetch(mcVersion.manifestUrl);
                mfest = await resp2.json() as MCClientVersionManifest;

                writeFileSync(manifestFile, mfest, {spaces: 4});
            }

            mcVersion.assetIndex = mfest.assetIndex;
            mcVersion.arguments = mfest.arguments;
            mcVersion.clientJar = mfest.downloads.client;

            //Identify libs and natives.
            let ourOs = os.platform() === "darwin" ? "osx" : os.platform() === "win32" ? "windows" : "linux";
            for (let libOrNative of mfest.libraries) {
                //First, check rules.

                if (libOrNative.rules) {
                    if(!Utils.handleOSBasedRule(libOrNative.rules)) {
                        Logger.debugImpl("Minecraft Version Manager", "\tWill not install lib/native " + libOrNative.name + " as it is disallowed.");
                        continue;
                    }
                }

                if (libOrNative.downloads.artifact && !mcVersion.libraries.find(l => l.url === libOrNative.downloads.artifact.url))
                    mcVersion.libraries.push(libOrNative.downloads.artifact);

                if (libOrNative.natives && libOrNative.natives[ourOs]) {
                    let arch = os.arch() === "x64" ? "64" : "32";
                    let key = libOrNative.natives[ourOs].replace("${arch}", arch);

                    if (!mcVersion.natives.find(l => l.url === libOrNative.downloads.classifiers[key].url))
                        mcVersion.natives.push(libOrNative.downloads.classifiers[key]);
                }
            }

            const indexDir = path.join(EnvironmentManager.assetsDir, "indexes");
            const indexPath = path.join(indexDir, mcVersion.assetIndex.id + ".json");

            //This does nothing if the file already exists and the signature is valid.
            await Utils.downloadWithSigCheck(mcVersion.assetIndex.url, indexPath, mcVersion.assetIndex.sha1);
            const index = readFileSync(indexPath) as MCAssetIndex;

            for (let filename in index.objects) {
                mcVersion.assets.set(filename, index.objects[filename]);
            }

            return mcVersion;
        }
    }
}
