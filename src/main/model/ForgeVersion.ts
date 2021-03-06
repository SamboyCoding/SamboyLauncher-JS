import * as fs from "fs";
import {existsSync} from "fs";
import * as hasha from "hasha";
import {readFileSync} from "jsonfile";
import * as os from "os";
import {basename, join} from "path";
import Logger from "../logger";
import EnvironmentManager from "../managers/EnvironmentManager";
import Utils from "../util/Utils";
import ForgeVersionManifest from "./ForgeVersionManifest";
import ManifestArtifact from "./ManifestArtifact";
import MavenArtifact from "./MavenArtifact";
import NewForgeInstallProfile from "./NewForgeInstallProfile";

export default class ForgeVersion {
    private static _cache = new Map<string, ForgeVersion>();

    public name: string;
    public manifest: ForgeVersionManifest;
    public needsPatch: boolean = false;
    public data?: Map<string, MavenArtifact | string> = new Map<string, MavenArtifact | string>();
    public installProfile?: NewForgeInstallProfile;
    public installerJarPath?;

    public static async Get(name: string): Promise<ForgeVersion | null> {
        if (this._cache.has(name))
            return this._cache.get(name);

        Logger.infoImpl("Forge Version Manager", `Attempting to load data for forge ${name}...`);
        let ret = new ForgeVersion();
        ret.name = name;

        let jsonPath = join(EnvironmentManager.versionsDir, name, name + ".json");
        if (existsSync(jsonPath)) {
            Logger.debugImpl("Forge Version Manager", "Loading from local file; version is installed");
            ret.manifest = readFileSync(jsonPath);
            ret.needsPatch = !!ret.manifest.libraries[0].downloads;

            if (!ret.needsPatch)
                ret.manifest.arguments = {
                    game: ret.manifest.minecraftArguments.split(" "),
                    jvm: [],
                };

            return ret;
        }

        try {
            Logger.debugImpl("Forge Version Manager", `Attempting to download installer...`);
            const installJar = join(EnvironmentManager.tempDir, `forge-${name}-installer.jar`);
            try {
                const url = `http://files.minecraftforge.net/maven/net/minecraftforge/forge/${name}/forge-${name}-installer.jar`;
                await Utils.downloadFile(url, installJar);
                Logger.debugImpl("Forge Version Manager", `Downloaded: ${url} => ${installJar}`);
            } catch (e) {
                Logger.errorImpl("Forge Version Manager", e.message + "\n" + e.stack);
                return null;
            }

            ret.installerJarPath = installJar;

            Logger.debugImpl("Forge Version Manager", "Extracting installer profile...");
            let success = await Utils.tryExtractFileFromArchive(installJar, EnvironmentManager.tempDir, "install_profile.json");
            if (!success) return null;

            let json = readFileSync(join(EnvironmentManager.tempDir, "install_profile.json"));

            if (json.versionInfo) {
                Logger.debugImpl("Forge Version Manager", "OLD install profile detected.");
                ret.manifest = json.versionInfo as ForgeVersionManifest;

                ret.manifest.arguments = {
                    game: ret.manifest.minecraftArguments.split(" "),
                    jvm: [],
                };

                ret.data = null;
            } else {
                Logger.debugImpl("Forge Version Manager", "NEW (1.13+) install profile detected.");
                ret.needsPatch = true;
                ret.installProfile = json as NewForgeInstallProfile;

                let filename = ret.installProfile.json.substr(1); //Remove leading /

                Logger.debugImpl("Forge Version Manager", `Extracting version json: ${filename}`);

                await Utils.tryExtractFileFromArchive(installJar, EnvironmentManager.tempDir, filename);
                ret.manifest = readFileSync(join(EnvironmentManager.tempDir, filename));
            }

            return ret;
        } catch (e) {
            Logger.errorImpl("Forge Version Manager", e.message + "\n" + e.stack);
            return null;
        }
    }

    public getRequiredLibraries(includeInstallerLibs: boolean): ManifestArtifact[] {
        if (this.needsPatch) {
            //This is easy: grab all the libraries directly from the install profile as they're in Manifest format
            //These are the ones needed for the installer processors.
            let ret: ManifestArtifact[] = [];

            if (this.installProfile && includeInstallerLibs)
                ret = this.installProfile.libraries.map(lib => lib.downloads.artifact);

            //And then append all the ones from the version json, also in mojang format
            //These are the ones needed for the game to run
            return ret.concat(this.manifest.libraries.map(lib => lib.downloads.artifact));
        } else {
            //Convert from old format to new.

            let ret: ManifestArtifact[] = [];
            this.manifest.libraries.forEach(lib => {
                if (lib.clientreq === false) return;
                let mvn = MavenArtifact.FromString(lib.name);
                let url = lib.url ? lib.url : "https://libraries.minecraft.net/";

                ret.push({
                    size: 1,
                    sha1: "",
                    path: mvn.fullPath,
                    url: url + mvn.fullPath,
                    id: lib.name
                });
            });
            return ret;
        }
    }

    public async getPatchCommands(): Promise<string[][]> {
        let ret: string[][] = [];

        //Process all the data.

        let data = {};

        let version = this.installProfile.version;
        let mcVersion = version.substr(0, version.indexOf("-"));

        data["SIDE"] = "client";
        data["MINECRAFT_JAR"] = join(EnvironmentManager.versionsDir, mcVersion, mcVersion + ".jar");

        for (let key in this.installProfile.data) {
            let rawValue = this.installProfile.data[key].client;
            if (rawValue.startsWith("'")) {
                //Literal
                data[key] = rawValue.replace(/'/g, "");
            } else if (rawValue.startsWith("[")) {
                //Artifact
                let descriptor = rawValue.replace("[", "").replace("]", "");
                let artifact = MavenArtifact.FromString(descriptor);
                data[key] = join(EnvironmentManager.librariesDir, artifact.fullPath);
            } else {
                //Entry in the jar
                let pathInJar = rawValue.substr(1);
                if (!await Utils.tryExtractFileFromArchive(this.installerJarPath, EnvironmentManager.tempDir, pathInJar)) {
                    Logger.errorImpl("Forge Version Manager", `Failed to get ${pathInJar} from ${this.installerJarPath}, required for data point ${key}`);
                    continue;
                }
                data[key] = join(EnvironmentManager.tempDir, basename(pathInJar));
            }
        }

        let processors = this.installProfile.processors;
        let actualProcessors: { jar: string, classpath: string[], args: string[], outputs?: { [key: string]: string } }[] = [];
        let go = true;

        while (go) {
            let prc = processors[0];

            if (!prc.outputs) {
                actualProcessors.push(prc);
                processors.splice(0, 1);
                continue;
            }

            if (Object.keys(prc.outputs).every((outputFile) => {
                let hash = prc.outputs[outputFile];
                if (outputFile.startsWith("{"))
                    outputFile = data[outputFile.replace("{", "").replace("}", "")];
                else
                    outputFile = join(EnvironmentManager.librariesDir, MavenArtifact.FromString(outputFile.replace("[", "").replace("]", "")).fullPath);

                if (existsSync(outputFile)) {
                    Logger.debugImpl("Forge Version Manager", `Output artifact already exists: ${outputFile}. Checking hash...`);
                    if (hash.startsWith("'"))
                        hash = hash.replace(/'/g, "");
                    else
                        hash = data[hash.replace("{", "").replace("}", "")];

                    let actualHash = hasha.fromFileSync(outputFile, {algorithm: "sha1"});
                    let success = actualHash === hash;
                    if (success) {
                        Logger.debugImpl("Forge Version Manager", "Hash match");
                        return true;
                    } else {
                        Logger.warnImpl("Forge Version Manager", `Hash MISMATCH. Expecting ${hash}, got ${actualHash}`);
                        return false;
                    }
                }
            })) {
                Logger.debugImpl("Forge Version Manager", "We can safely skip this processor.");
                processors.splice(0, 1); //Remove from current

                //As we're still skipping, we can clear out any currently in actual as we know we're good up until now
                actualProcessors = [];
                if(processors.length === 0)
                    go = false;
            } else {
                actualProcessors = actualProcessors.concat(processors); //Add all the remaining ones
                Logger.debugImpl("Forge Version Manager", `Need to run ${actualProcessors.length} processors.`);
                go = false;
            }
        }

        for (let processor of actualProcessors) {

            let command: string[] = [];

            //Build classpath

            //First extract the manifest
            let processorJarPath = join(EnvironmentManager.librariesDir, MavenArtifact.FromString(processor.jar).fullPath);
            await Utils.tryExtractFileFromArchive(processorJarPath, EnvironmentManager.tempDir, "META-INF/MANIFEST.MF");

            //Find the main class
            let manifestContent = fs.readFileSync(join(EnvironmentManager.tempDir, "MANIFEST.MF")).toString("utf8");
            let mainClass = manifestContent.split("\n").find(line => line.startsWith("Main-Class:")).replace("Main-Class:", "").trim();

            //Build the classpath from the jar and it's requirements
            command.push("-cp");
            command.push([processorJarPath].concat(processor.classpath.map(descriptor => join(EnvironmentManager.librariesDir, MavenArtifact.FromString(descriptor).fullPath))).join(os.platform() === "win32" ? ";" : ":"));

            //Specify the class to execute.
            command.push(mainClass);

            for (const arg of processor.args) {
                if (arg.startsWith("{")) {
                    //Data point
                    command.push(data[arg.replace("{", "").replace("}", "")]);
                } else if (arg.startsWith("[")) {
                    //Artifact
                    command.push(join(EnvironmentManager.librariesDir, MavenArtifact.FromString(arg.replace("[", "").replace("]", "")).fullPath));
                } else {
                    //Raw arg
                    command.push(arg);
                }
            }

            ret.push(command);
        }

        return ret;
    }
}
