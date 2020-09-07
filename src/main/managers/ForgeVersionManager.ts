import {promises as fsPromises} from "fs";
import mkdirp from "mkdirp";
import {basename, dirname, join} from "path";
import Logger from "../logger";
import DownloadQueueEntry from "../model/DownloadQueueEntry";
import FileToDownload from "../model/FileToDownload";
import LegacyForgeInstallProfile from "../model/LegacyForgeInstallProfile";
import ManifestArtifact from "../model/ManifestArtifact";
import MavenArtifact from "../model/MavenArtifact";
import MinecraftVersionManifest from "../model/MinecraftVersionManifest";
import ModernForgeInstallProfile from "../model/ModernForgeInstallProfile";
import NewForgeInstallProfile from "../model/NewForgeInstallProfile";
import ProcessorToRun from "../model/ProcessorToRun";
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

    private static GetForgeVersionComponents(id: string) {
        //Id will be in the format minecraft-forge or maybe minecraft-forge-minecraft
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
        return forgeVersion.split(".").map(Number);
    }

    public static async GetFilesForVersion(queueEntry: DownloadQueueEntry): Promise<FileToDownload[]> {
        const FORGE_MAVEN = "https://files.minecraftforge.net/maven";
        let ret: FileToDownload[] = [];
        let id = queueEntry.initialRequest.forgeVersionId;

        if (!id) return ret;

        queueEntry.log += `\nWorking out what files we need for forge ${id}...`;

        let forgeVersionComponents = this.GetForgeVersionComponents(id);

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
            return this.getLegacyInstallerFiles(queueEntry);
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

        //For modern versions, the format of version.json matches MinecraftVersionManifest so we can use that.
        //Need all the libraries from that, and all the libraries from the installer profile.
        queueEntry.log += "\n\tFinding libraries we need to install for forge...";

        const installProfile: ModernForgeInstallProfile = JSON.parse(await readFile(installProfilePath, {encoding: "utf8"}));
        const versionJson: MinecraftVersionManifest = JSON.parse(await readFile(versionJsonPath, {encoding: "utf8"}));

        let allLibraries = installProfile.libraries.concat(versionJson.libraries);
        //Remove exact duplicates
        queueEntry.log += `\n\tDe-duplicating forge library requirements. Started at ${allLibraries.length}...`;

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

    private static async getLegacyInstallerFiles(queueEntry: DownloadQueueEntry): Promise<FileToDownload[]> {
        let ret: FileToDownload[] = [];
        let id = queueEntry.initialRequest.forgeVersionId;

        queueEntry.log += `\n\tPulling legacy installer for forge ${id}...`;
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

        await writeFile(join(versionFolder, "version.json"), JSON.stringify(installProfile.versionInfo, null, 4));

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

    public static ShouldRunProcessorsForVersion(id: string) {
        const components = this.GetForgeVersionComponents(id);
        Logger.debugImpl("Forge Version Manager", `Checking if we should run processors for ${id} - components are ${JSON.stringify(components)}`);
        return components[0] >= 25;
    }

    public static async GetProcessorCommandsForVersion(id: string, queueEntry: DownloadQueueEntry): Promise<ProcessorToRun[]> {
        if(!this.ShouldRunProcessorsForVersion(id)) return; //Sanity check

        queueEntry.log += "\nBuilding list of processor commands to execute..."
        const versionDir = join(EnvironmentManager.versionsDir, id);
        const installProfile: NewForgeInstallProfile = JSON.parse(await readFile(join(versionDir, "install_profile.json"), "utf8"));

        let forgeInstallerPath = join(EnvironmentManager.librariesDir, MavenArtifact.FromString(`net.minecraftforge:forge:${id}:installer`).fullPath);

        //Build data list.
        let data = {
            "SIDE": "client",
            "MINECRAFT_JAR": join(EnvironmentManager.versionsDir, installProfile.minecraft, installProfile.minecraft + ".jar")
        };

        for(let key in installProfile.data) {
            let values = installProfile.data[key];
            let value: string = values[data.SIDE];

            let firstChar = value.charAt(0);
            switch(firstChar) {
                case "[":
                    //Maven artifact
                    let relativePath = MavenArtifact.FromString(value.substr(1, value.length - 2)).fullPath;
                    data[key] = join(EnvironmentManager.librariesDir, relativePath);
                    break;
                case "'":
                    //String literal
                    data[key] = value.substr(1, value.length - 2);
                    break;
                case "/":
                    //File in jar
                    await Utils.tryExtractFileFromArchive(forgeInstallerPath, EnvironmentManager.tempDir, value.substr(1));
                    let fileName = basename(value);
                    data[key] = join(EnvironmentManager.tempDir, fileName);
                    break;
            }
        }

        queueEntry.log += "\n\tProcessor Data Map:";
        for(let key in data) {
            queueEntry.log += `\n\t\t${key.padEnd(15)}\t${data[key]}`;
        }
        DownloadManager.SendFullQueueUpdate();

        //Find any processors which have already run.
        let thoseRun = [];
        for(let index in installProfile.processors) {
            let processor = installProfile.processors[index];
            if(!processor.outputs) {
                thoseRun[index] = null; //Unknown
                continue;
            }

            let mismatch = false;
            for(let key in processor.outputs) {
                let path = this.ReplaceKey(data, key);
                let sha = this.ReplaceKey(data, processor.outputs[key]);
                if(!await Utils.checkSha1Async(path, sha)) {
                    mismatch = true;
                    break;
                }
            }
            //Do all outputs match SHA sums?
            thoseRun[index] = !mismatch;
        }

        let lastRunIndex = thoseRun.lastIndexOf(true);
        if(lastRunIndex === thoseRun.length - 1) {
            //No processors need running as all have been run
            queueEntry.log += "\n\tSkipping all processors as the last one is up to date.";
            return [];
        }

        if(lastRunIndex >= 0) {
            queueEntry.log += `\n\tSkipping processors 0 through ${lastRunIndex} as they've already been run`;
            installProfile.processors.splice(0, lastRunIndex + 1);
        }

        //Determine main classes
        let mainClassMap = new Map<string, string>();
        for(let processor of installProfile.processors) {
            if(mainClassMap.has(processor.jar)) continue;

            let artifact = MavenArtifact.FromString(processor.jar);
            let localPathToProcessor = join(EnvironmentManager.librariesDir, artifact.fullPath);

            if(!await Utils.tryExtractFileFromArchive(localPathToProcessor, EnvironmentManager.tempDir, "META-INF/MANIFEST.MF")) {
                throw new Error(`Failed to extract MANIFEST from processor ${processor.jar}`);
            }

            let manifestContent = await readFile(join(EnvironmentManager.tempDir, "MANIFEST.MF"), "utf-8");
            let lines = manifestContent.split("\n");
            let mainClassLine = lines.find(l => l.startsWith("Main-Class:"));
            let mainClass = mainClassLine.replace("Main-Class:", "").trim();
            mainClassMap.set(processor.jar, mainClass);
        }

        await unlink(join(EnvironmentManager.tempDir, "MANIFEST.MF"));

        //Build command line.
        let ret: ProcessorToRun[] = [];

        queueEntry.log += "\n\tGathering processor commands to run...";
        for(let processor of installProfile.processors) {
            //Main classpath entries
            const classpath = processor.classpath.map(l => join(EnvironmentManager.librariesDir, MavenArtifact.FromString(l).fullPath));

            //Main class container jar
            classpath.push(join(EnvironmentManager.librariesDir, MavenArtifact.FromString(processor.jar).fullPath));

            //Arguments with maven artifacts and keys replaced.
            let processorArguments = processor.args.map(arg => this.ReplaceKey(data, this.ReplaceMavenArtifact(arg)));

            let outputSums = new Map<string, string>();
            for(let key in processor.outputs) {
                let path = this.ReplaceKey(data, key);
                let sha = this.ReplaceKey(data, processor.outputs[key]);
                outputSums.set(path, sha);
            }

            let classPathJoiner = process.platform === "win32" ? ";" : ":";

            ret.push({
                javaArgs: `-cp ${classpath.join(classPathJoiner)} ${mainClassMap.get(processor.jar)} ${processorArguments.join(" ")}`,
                outputShaSums: outputSums
            });
        }

        queueEntry.log += `\n\t${ret.length} processors to run.`;

        return ret;
    }

    private static ReplaceKey(data: {[key: string]: string}, value: string): string {
        let match = /{([A-Z_]+)}/g.exec(value);
        if(match) {
            //Replace the matching key with the data value at that key
            value = value.substr(1, value.length - 2);
            return value.replace(match[1], data[match[1]]);
        }
        return value;
    }

    private static ReplaceMavenArtifact(value: string): string {
        if(!value.startsWith("[")) return value;

        value = value.substr(1, value.length - 2);
        return join(EnvironmentManager.librariesDir, MavenArtifact.FromString(value).fullPath);
    }
}