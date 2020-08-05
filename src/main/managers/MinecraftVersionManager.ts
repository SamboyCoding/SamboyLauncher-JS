import {exists, existsSync} from "fs";
import hasha from "hasha";
import {readFileSync as readJsonSync, writeFileSync as writeJsonSync} from "jsonfile";
import mkdirp from "mkdirp";
import {dirname, join} from "path";
import DownloadQueueEntry from "../model/DownloadQueueEntry";
import DownloadWrapper from "../model/DownloadWrapper";
import FileToDownload from "../model/FileToDownload";
import MinecraftAssetIndex from "../model/MinecraftAssetIndex";
import MinecraftVersionListing, {VersionSpecification} from "../model/MinecraftVersionListing";
import MinecraftVersionManifest, {LibrarySpecification} from "../model/MinecraftVersionManifest";
import RuleHelper from "../util/RuleHelper";
import DownloadManager from "./DownloadManager";
import EnvironmentManager from "./EnvironmentManager";

export default class MinecraftVersionManager {
    public static async FetchVersionListing(): Promise<DownloadWrapper<MinecraftVersionListing> | null> {
        return await DownloadManager.DownloadFile("https://launchermeta.mojang.com/mc/game/version_manifest.json");
    }

    //THIS METHOD IS SYNCHRONOUS FOR CACHE I/O.
    private static async GetOrDownloadFile<T>(forEntry: DownloadQueueEntry, url: string, destPath: string): Promise<T> {
        if(existsSync(destPath))
            return readJsonSync(destPath);

        //Make cache folder if we need to (which we quite possibly do)
        if(!existsSync(dirname(destPath)))
            await mkdirp(dirname(destPath));

        //Download to cache
        const downloaded = await DownloadManager.DownloadFile<T>(url);
        writeJsonSync(destPath, downloaded.content);

        //Push this file as downloaded
        forEntry.downloadStats.PushCompletedFile(downloaded);

        //Return the body
        return downloaded.content;
    }

    //This method is entirely synchronous in terms of file I/O because it only touches one file. Assets should be done asynchronously for the love of god.
    private static async GetOrDownloadVersionManifest(forEntry: DownloadQueueEntry, url: string): Promise<MinecraftVersionManifest> {
        const jsonFileName = url.substr(url.lastIndexOf("/") + 1);
        const versionName = jsonFileName.replace(".json", "");

        //Use cache if we can, and we can do it synchronously because this is only one file.
        return await this.GetOrDownloadFile<MinecraftVersionManifest>(forEntry, url, join(EnvironmentManager.versionsDir, versionName, jsonFileName));
    }

    private static async GetOrDownloadAssetIndex(forEntry: DownloadQueueEntry, url: string): Promise<MinecraftAssetIndex> {
        const jsonFileName = url.substr(url.lastIndexOf("/") + 1);

        //Use cache if we can, and we can do it synchronously because this is only one file.
        return await this.GetOrDownloadFile<MinecraftAssetIndex>(forEntry, url, join(EnvironmentManager.assetsDir, "indexes", jsonFileName));
    }

    static async GetFileListForGameVersion(downloadQueueEntry: DownloadQueueEntry, versionSpecification: VersionSpecification): Promise<FileToDownload[]> {
        //Let's pull down the files we need, first.
        //Namely, the game manifest, and the asset manifest
        downloadQueueEntry.log += `\nCalculating files we need to download for vanilla client version ${versionSpecification.id}...`;
        downloadQueueEntry.log += `\n\tPulling version manifest for ${versionSpecification.id}...`;
        const manifest = await this.GetOrDownloadVersionManifest(downloadQueueEntry, versionSpecification.url);
        downloadQueueEntry.log += `\n\tPulling asset index "${manifest.assets}"...`;
        const assetIndex = await this.GetOrDownloadAssetIndex(downloadQueueEntry, manifest.assetIndex.url);

        const ret: FileToDownload[] = [];

        downloadQueueEntry.log += `\n\tCalculating assets we are missing...`;
        let promises = Object.keys(assetIndex.objects).map(async relativePath => {
            let assetData = assetIndex.objects[relativePath];
            let localPath = join(EnvironmentManager.assetsDir, "objects", assetData.hash.substr(0, 2), assetData.hash);
            try {
                //Attempt to calculate the hash asynchronously
                const actualHash = await hasha.fromFile(localPath, {algorithm: "sha1"});

                //Correct hash - we don't need to process this file
                if(actualHash === assetData.hash) return null;
            } catch(e) {
                //Expected if file is missing
            }

            //Got to here, either file is missing or doesn't have the correct hash, so re-download.
            return {
                sha1: assetData.hash,
                sizeBytes: assetData.size,
                sourceUrl: `https://resources.download.minecraft.net/${assetData.hash.substr(0, 2)}/${assetData.hash}`,
                destPath: localPath,
            } as FileToDownload;
        });

        //Filter out the null values - those we don't need.
        const assetsToDownload = (await Promise.all<FileToDownload>(promises)).filter(f => !!f);
        const totalAssetsSizeBytes = assetsToDownload.map(f => f.sizeBytes).reduce((previousValue, currentValue) => previousValue + currentValue, 0);
        downloadQueueEntry.log += `\n\tNeed to download ${assetsToDownload.length} asset(s) totalling ${DownloadManager.BytesToMiB(totalAssetsSizeBytes)}MiB.`;

        ret.push(...assetsToDownload);

        downloadQueueEntry.log += "\n\tCalculating libraries that we are missing...";

        //For god knows what reason, mojang double-up on libraries that include natives (they're in the manifest twice)
        //Filter it down a bit.
        const librariesByName = {};
        manifest.libraries.forEach(lib => {
            librariesByName[lib.name] = lib;

            return true;
        });

        const deDupedLibraries: LibrarySpecification[] = Object.values(librariesByName);

        const entriesMatchingRules = deDupedLibraries.filter(lib => {
            if(!lib.rules || RuleHelper.ProcessOSRules(lib.rules)) return true;
            downloadQueueEntry.log += `\n\t\tSkipping library "${lib.name}" due to an OS-restriction`;
        });

        //Work out which ones are libraries (i.e. have an artifact)
        const requiredLibraries = entriesMatchingRules.filter(lib => !!lib.downloads.artifact);

        promises = requiredLibraries.map(async lib => {
            const localPath = join(EnvironmentManager.librariesDir, lib.downloads.artifact.path);
            try {
                const actualHash = await hasha.fromFile(localPath, {algorithm: "sha1"});

                //Correct hash? don't process
                if(actualHash === lib.downloads.artifact.sha1) return null;
            } catch(e) {
                //Expected if file missing
            }

            return {
                sizeBytes: lib.downloads.artifact.size,
                destPath: localPath,
                sourceUrl: lib.downloads.artifact.url,
                sha1: lib.downloads.artifact.sha1
            } as FileToDownload;
        });

        const librariesToDownload = (await Promise.all(promises)).filter(f => !!f);
        const totalLibrarySizeBytes = librariesToDownload.map(f => f.sizeBytes).reduce((previousValue, currentValue) => previousValue + currentValue, 0);
        downloadQueueEntry.log += `\n\tNeed to download ${librariesToDownload.length} libraries totalling ${DownloadManager.BytesToMiB(totalLibrarySizeBytes)}MiB`;
        ret.push(...librariesToDownload);

        downloadQueueEntry.log += "\n\tWorking out which natives we need to download...";
        const requiredNatives = entriesMatchingRules.filter(lib => !!lib.natives && !!lib.natives[RuleHelper.GetOurOsName()]);

        const artifacts = requiredNatives.map(nat => nat.downloads.classifiers[nat.natives[RuleHelper.GetOurOsName()].replace("${arch}", RuleHelper.GetOurArchWithoutX())]);
        promises = artifacts.map(async artifact => {
            const localPath = join(EnvironmentManager.librariesDir, artifact.path);
            try {
                const actualHash = await hasha.fromFile(localPath, {algorithm: "sha1"});

                //Correct hash? don't process
                if(actualHash === artifact.sha1) return null;
            } catch(e) {
                //File missing
            }

            return {
                sizeBytes: artifact.size,
                destPath: localPath,
                sourceUrl: artifact.url,
                sha1: artifact.sha1
            } as FileToDownload;
        });

        const nativesToDownload = (await Promise.all(promises)).filter(f => !!f);
        const totalNativeSizeBytes = nativesToDownload.map(f => f.sizeBytes).reduce((previousValue, currentValue) => previousValue + currentValue, 0);
        downloadQueueEntry.log += `\n\tNeed to download ${nativesToDownload.length} natives totalling ${DownloadManager.BytesToMiB(totalNativeSizeBytes)}MiB`;
        ret.push(...nativesToDownload);

        downloadQueueEntry.log += "\n\tChecking if game platform jar exists...";
        const pathForPlatformJar = join(EnvironmentManager.versionsDir, downloadQueueEntry.initialRequest.gameVersionId, downloadQueueEntry.initialRequest.gameVersionId + ".jar");
        let shouldDownload = true;
        try {
            const actualHash = await hasha.fromFile(pathForPlatformJar, {algorithm: "sha1"});
            downloadQueueEntry.log += `It does. SHA1 is ${actualHash}, expected is ${manifest.downloads.client.sha1}...`
            if(actualHash === manifest.downloads.client.sha1) {
                downloadQueueEntry.log += "Which matches, so we're not downloading again.";
                shouldDownload = false;
            }
            else
                downloadQueueEntry.log += "Which doesn't match, so we'll download fresh.";
        } catch(e) {
            downloadQueueEntry.log += "It doesn't, so we'll download it.";
        }

        if(shouldDownload) {
            const sizeBytes = manifest.downloads.client.size;
            downloadQueueEntry.log += `\n\tGame platform jar is ${DownloadManager.BytesToMiB(sizeBytes)}MiB.`;
            ret.push({
                sha1: manifest.downloads.client.sha1,
                sourceUrl: manifest.downloads.client.url,
                destPath: pathForPlatformJar,
                sizeBytes: sizeBytes
            });
        }

        return ret;
    }
}
