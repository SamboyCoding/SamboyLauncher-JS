import * as web from "node-fetch";
import { VanillaManifestVersion, VanillaVersionData } from './objects';
import * as jsonfile from "jsonfile";
import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';

const fetch = web.default;

async function mkdirpPromise(path: string): Promise<any> {
    return new Promise((ff, rj) => {
        mkdirp(path, (err, made) => {
            if (err) return rj(err);

            ff();
        })
    });
}

export async function getVanillaVersionList(): Promise<VanillaManifestVersion[]> {
    const resp = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json");
    const json = await resp.json();

    return json.versions;
}

export async function getVanillaVersionManifest(launcherDir: string, version: VanillaManifestVersion): Promise<VanillaVersionData> {
    const resp = await fetch(version.url);
    const json = await resp.json();

    let verFolder = path.join(launcherDir, "versions", version.id);

    if (!fs.existsSync(verFolder))
        await mkdirpPromise(verFolder);

    jsonfile.writeFileSync(path.join(verFolder, version.id + ".json"), json);

    return json;
}
