import {existsSync, promises as fsPromises} from "fs";
import mkdirp from "mkdirp";
import {dirname, join} from "path";
import DownloadQueueEntry from "../model/DownloadQueueEntry";
import FileToDownload from "../model/FileToDownload";
import LegacyForgeInstallProfile from "../model/LegacyForgeInstallProfile";
import MavenArtifact from "../model/MavenArtifact";
import MinecraftVersionManifest from "../model/MinecraftVersionManifest";
import ModernForgeInstallProfile from "../model/ModernForgeInstallProfile";
import RuleHelper from "../util/RuleHelper";
import Utils from "../util/Utils";
import DownloadManager from "./DownloadManager";
import EnvironmentManager from "./EnvironmentManager";

const {unlink, writeFile, readFile, copyFile} = fsPromises;

export default class ForgeVersionManager {
    private static async DownloadInstallerForVersion(queueEntry: DownloadQueueEntry, id: string) {
        const FORGE_MAVEN = "https://files.minecraftforge.net/maven";

        const installerPath = `net/minecraftforge/forge/${id}/forge-${id}-installer.jar`;
        const localInstallerPath = join(EnvironmentManager.librariesDir, installerPath);
        const sha1Response = await DownloadManager.DownloadFile<Buffer>(`${FORGE_MAVEN}/${installerPath}.sha1`, true);
        queueEntry.downloadStats.PushCompletedFile(sha1Response);
        const expectedInstallerSha = sha1Response.content.toString("utf8").trim();

        while (!await Utils.checkSha1Async(localInstallerPath, expectedInstallerSha)) {
            queueEntry.log += `\n\tSHA1 mismatch or file missing, pulling installer for forge ${id}...`;

            DownloadManager.SendFullQueueUpdate();

            let response = await DownloadManager.DownloadFile<Buffer>(`${FORGE_MAVEN}/${installerPath}`, true);
            queueEntry.downloadStats.PushCompletedFile(response);

            DownloadManager.SendFullQueueUpdate();

            if (!await Utils.existsAsync(dirname(localInstallerPath)))
                await mkdirp(dirname(localInstallerPath));

            await writeFile(localInstallerPath, response.content);
        }
    }

    public static async GetFilesForVersion(queueEntry: DownloadQueueEntry): Promise<FileToDownload[]> {
        const FORGE_MAVEN = "https://files.minecraftforge.net/maven";
        let ret: FileToDownload[] = [];
        let id = queueEntry.initialRequest.forgeVersionId;

        if (!id) return ret;

        queueEntry.log += `\nWorking out what files we need for forge ${id}...`;

        //Id will be in the format mcvers-forgevers or maybe mcvers-forgevers-mcvers
        let forgeVersion: string;
        let re = /-/g;
        let dashIndices: number[] = [];
        while (re.exec(id))
            dashIndices.push(re.lastIndex);

        if (dashIndices.length == 2)
            forgeVersion = id.substr(dashIndices[0], dashIndices[1]);
        else
            forgeVersion = id.substr(dashIndices[0]);

        //[10, 13, 4, 1614] for example
        let forgeVersionComponents = forgeVersion.split(".").map(Number);

        if (forgeVersionComponents[0] < 7 || (forgeVersionComponents[0] == 7 && forgeVersionComponents[1] < 8)) {
            //Less than 7.8.xx.xx == 1.5.1 or earlier.
            //Pre-1.5.2, we just do a jar merge. Pull the sha1 first though
            //e.g. https://files.minecraftforge.net/maven/net/minecraftforge/forge/1.5.1-7.7.2.682/forge-1.5.1-7.7.2.682-universal.zip.sha1
            queueEntry.log += `\n\tPulling SHA1 sum for forge-${id}-universal.zip...`;

            let path = `net/minecraftforge/forge/${id}/forge-${id}-universal.zip`;
            let forgeDownloadUrl = `${FORGE_MAVEN}/${path}`;

            const dl = await DownloadManager.DownloadFile<Buffer>(forgeDownloadUrl + `.sha1`, true);
            queueEntry.downloadStats.PushCompletedFile(dl);

            let sha1 = dl.content.toString("utf8");
            queueEntry.log += `SHA1 obtained. Is ${sha1}`;

            queueEntry.log += "\n\tPulling expected file size for forge zip...";
            let expectedSize = await DownloadManager.PullFileSizeFromHead(forgeDownloadUrl);
            queueEntry.log += `Expected size is ${expectedSize} bytes.`;

            ret.push({
                sizeBytes: expectedSize,
                sha1,
                destPath: join(EnvironmentManager.librariesDir, path),
                sourceUrl: forgeDownloadUrl
            });

            return ret; //Done here.
        }

        //Pre 14.23.5.2850 we use the legacy installer.
        if (forgeVersionComponents.length === 4 && (forgeVersionComponents[0] < 14 || (forgeVersionComponents[0] == 14 && forgeVersionComponents[3] < 2850))) {
            return this.getLegacyInstallerFiles(queueEntry, forgeVersion);
        }

        //Modern installer stuff here.
        await this.DownloadInstallerForVersion(queueEntry, id);

        const versionFolder = join(EnvironmentManager.versionsDir, id);
        if (!await Utils.existsAsync(versionFolder))
            await mkdirp(versionFolder);

        const localInstallerPath = join(EnvironmentManager.librariesDir, `net/minecraftforge/forge/${id}/forge-${id}-installer.jar`);

        //Pull out install_profile.json and version.json into versions/id/
        const installProfilePath = join(versionFolder, "install_profile.json");
        const versionJsonPath = join(versionFolder, "version.json");

        if (!await Utils.existsAsync(installProfilePath) && !await Utils.tryExtractFileFromArchive(localInstallerPath, versionFolder, "install_profile.json"))
            throw new Error("Failed to extract install_profile from modern installer jar.");
        if (!await Utils.existsAsync(versionJsonPath) && !await Utils.tryExtractFileFromArchive(localInstallerPath, versionFolder, "version.json"))
            throw new Error("Failed to extract version_json from modern installer jar.");

        //For modern versions, version.json's format matches MinecraftVersionManifest so we can use that.
        //Need all the libraries from that, and all the libraries from the installer profile.
        queueEntry.log += "\n\tFinding libraries we need to install for forge...";

        const installProfile: ModernForgeInstallProfile = JSON.parse(await readFile(installProfilePath, {encoding: "utf8"}));
        const versionJson: MinecraftVersionManifest = JSON.parse(await readFile(versionJsonPath, {encoding: "utf8"}));

        let allLibraries = installProfile.libraries.concat(versionJson.libraries);
        //Remove exact duplicates
        queueEntry.log += `\n\tDeduplicating forge library requirements. Started at ${allLibraries.length}...`;

        allLibraries = allLibraries.filter((value, index, array) => array.indexOf(value) === index);

        queueEntry.log += `and actually require ${allLibraries.length} libraries...`;

        // let byArtifact = allLibraries.reduce((map, current) => {
        //     map.set(MavenArtifact.FromString(current.name), current);
        //     return map;
        // }, new Map<MavenArtifact, LibrarySpecification>());
        //
        // let keyArray = Array.from(byArtifact.keys());
        // let actualLibraries: LibrarySpecification[] = [];
        // for(let [artifact, lib] of byArtifact.entries()) {
        //     let otherLibs = keyArray.filter(a => a.domain === artifact.domain && a.name === artifact.name && a.version !== artifact.version);
        //     if(otherLibs.length === 0) {
        //         //no other versions, just include this and move on
        //         actualLibraries.push(lib);
        //         continue
        //     }
        // }

        let toInstall = (await Promise.all(allLibraries.map(async l => {
            let localLibraryPath = join(EnvironmentManager.librariesDir, l.downloads.artifact.path);
            if (await Utils.checkSha1Async(localLibraryPath, l.downloads.artifact.sha1))
                return null;

            if (l.downloads.artifact.url === "") {
                //No url = we must extract from jar
                if (!await Utils.existsAsync(dirname(localLibraryPath)))
                    await mkdirp(dirname(localLibraryPath));

                if (!await Utils.checkSha1Async(localLibraryPath, l.downloads.artifact.sha1)
                    && (!await Utils.tryExtractFileFromArchive(localInstallerPath, dirname(localLibraryPath), "maven/" + l.downloads.artifact.path)
                        || !await Utils.checkSha1Async(localLibraryPath, l.downloads.artifact.sha1))) {
                    //File didn't already validate and either failed to extract or failed to verify sha1
                    throw new Error(`Failed to extract ${l.name} from installer's built-in maven repo, or extracted with bad signature.`);
                }

                return null; //Don't need to process, it's been extracted from the installer (or already existed)
            }

            return l;
        }))).filter(l => !!l);

        let totalSize = toInstall.map(l => l.downloads.artifact.size).reduce((last, current) => last + current, 0);

        queueEntry.log += `of which ${toInstall.length} need installing, for a total of ${DownloadManager.BytesToMiB(totalSize)}MiB to download`;
        ret.push(...toInstall.map(l => ({
            sourceUrl: l.downloads.artifact.url,
            destPath: join(EnvironmentManager.librariesDir, l.downloads.artifact.path),
            sha1: l.downloads.artifact.sha1,
            sizeBytes: l.downloads.artifact.size,
        })));

        return ret;
    }

    private static async getLegacyInstallerFiles(queueEntry: DownloadQueueEntry, forgeVersion: string): Promise<FileToDownload[]> {
        const FORGE_MAVEN = "https://files.minecraftforge.net/maven";
        let ret: FileToDownload[] = [];
        let id = queueEntry.initialRequest.forgeVersionId;

        queueEntry.log += `\n\tPulling legacy installer for forge ${forgeVersion}...`;
        //Again pull installer
        await this.DownloadInstallerForVersion(queueEntry, id);

        const versionFolder = join(EnvironmentManager.versionsDir, id);
        if (!await Utils.existsAsync(versionFolder))
            await mkdirp(versionFolder);

        const localInstallerPath = join(EnvironmentManager.librariesDir, `net/minecraftforge/forge/${id}/forge-${id}-installer.jar`);

        queueEntry.log += "\n\tPulling out install_profile...";

        //Pull out install_profile.json and version.json into versions/id/
        const installProfilePath = join(versionFolder, "install_profile.json");

        if (!await Utils.existsAsync(installProfilePath) && !await Utils.tryExtractFileFromArchive(localInstallerPath, versionFolder, "install_profile.json"))
            throw new Error("Failed to extract install_profile from legacy installer jar.");

        const installProfile: LegacyForgeInstallProfile = JSON.parse(await readFile(installProfilePath, {encoding: "utf8"}));

        //Special handling - first library is forge itself and their path is completely wacky.
        let forgeLib = installProfile.versionInfo.libraries.shift();
        let mavenArtifact = MavenArtifact.FromString(forgeLib.name);
        let localForgeJarPath = join(EnvironmentManager.librariesDir, mavenArtifact.fullPath);

        if(!await Utils.existsAsync(localForgeJarPath)) {
            queueEntry.log += "\n\tPulling out forge universal jar...";
            if (!await Utils.existsAsync(dirname(localForgeJarPath)))
                await mkdirp(dirname(localForgeJarPath));

            if (!await Utils.tryExtractFileFromArchive(localInstallerPath, EnvironmentManager.tempDir, installProfile.install.filePath)) {
                throw new Error("Failed to extract forge universal jar from legacy installer.");
            }

            queueEntry.log += "\n\t\tMoving jar into place..."
            //Move into place.
            let pathInTempFolder = join(EnvironmentManager.tempDir, installProfile.install.filePath);
            await copyFile(pathInTempFolder, localForgeJarPath);
            await unlink(pathInTempFolder);
        }

        queueEntry.log += "\n\tWorking out which libraries we need..."
        //Rest of the libraries are to be downloaded
        for(let library of installProfile.versionInfo.libraries) {
            if(library.clientreq === false) continue;
            if(library.natives) continue;

            if(library.rules && !RuleHelper.ProcessOSRules(library.rules)) {
                queueEntry.log += `\n\t\tSkipping library ${library.name} due to an OS-restriction`;
                continue;
            }

            let artifact = MavenArtifact.FromString(library.name);

            let baseUrl = "https://libraries.minecraft.net/";
            if(library.url)
                baseUrl = library.url;

            let fullUrl = baseUrl + artifact.fullPath;

            let sha1 = undefined;
            if(library.checksums)
                sha1 = library.checksums[0];

            let localDest = join(EnvironmentManager.librariesDir, artifact.fullPath);

            if(sha1 && await Utils.checkSha1Async(localDest, sha1)) continue;

            if(!sha1 && await Utils.existsAsync(localDest)) {
                queueEntry.log += `\n\t\tWARN: Don't have a SHA1 for ${library.name} but it's already downloaded, assuming it's good!`;
                continue;
            }

            ret.push({
                sourceUrl: fullUrl,
                destPath: localDest,
                sha1,
                sizeBytes: await DownloadManager.PullFileSizeFromHead(fullUrl)
            });
        }

        return ret;
    }
}
