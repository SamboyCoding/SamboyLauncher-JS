import {path7za} from "7zip-bin";
import {spawnSync} from "child_process";
import download from "download";
import * as fs from "fs";
import {existsSync, unlinkSync} from "fs";
import * as hasha from "hasha";
import mkdirp from "mkdirp";
import * as os from "os";
import * as path from "path";
import {basename, join} from "path";
import * as rimraf from "rimraf";
import Logger from "../logger";
import EnvironmentManager from "../managers/EnvironmentManager";

export default class Utils {
    public static toBase64(str: string): string {
        return Buffer.from(str, "binary").toString("base64");
    }

    public static fromBase64(str: string): string {
        return Buffer.from(str, "base64").toString("binary");
    }

    public static async downloadFile(url: string, localPath: string): Promise<any> {
        return download(url, path.dirname(localPath), {filename: path.basename(localPath)});
    }

    public static async downloadWithSHA1(url: string, localPath: string, sha1: string) {
        return this.downloadWithSig(url, localPath, sha1, "sha1");
    }

    public static async downloadWithMD5(url: string, localPath: string, md5: string) {
        return this.downloadWithSig(url, localPath, md5, "md5");
    }

    public static async downloadWithSig(url: string, localPath: string, sig: string, algorithm: string) {
        //First check if it already exists.
        if (existsSync(localPath)) {
            const hash = hasha.fromFileSync(localPath, {algorithm});
            if (hash !== sig) {
                Logger.warnImpl("Download", "Existing file has mismatched signature for " + localPath + ". Expecting: " + sig + "; got: " + hash);
                unlinkSync(localPath);
            } else {
                Logger.debugImpl("Download", `Using existing file for ${localPath} as its SHA1 matches.`);
                return;
            }
        }

        let sanity = 1;
        while (!existsSync(localPath)) {
            if (sanity > 5) throw new Error(`Failed to download ${url} => ${localPath} with valid signature after 5 attempts.`);

            try {
                await this.downloadFile(url, localPath);
            } catch (e) {
                Logger.warnImpl("Download", `Attempt ${sanity}: Failed to download ${url} with error ${e}`);
                sanity++;
                continue;
            }

            let hash;
            try {
                hash = hasha.fromFileSync(localPath, {algorithm});
            } catch (e) {
                Logger.warnImpl("Download", `${localPath} apparently downloaded but missing. Retrying.`);
                sanity++;
                continue;
            }

            if (hash !== sig) {
                Logger.warnImpl("Download", `Attempt ${sanity}: Mismatched signature for ${localPath}. Expecting: ${sig}; got: ${hash}`);
                rimraf.sync(localPath);
                sanity++;
                await this.sleepMs(1000); //Backoff because deleting isn't actually sync.
            } else {
                Logger.debugImpl("Download", `Downloaded ${localPath} and verified signature on attempt ${sanity}`);
                return;
            }
        }
    }

    public static async mkdirpPromise(location: string): Promise<any> {
        return new Promise((ff, rj) => {
            mkdirp(location, (err) => {
                if (err) {
                    return rj(err);
                }

                ff();
            });
        });
    }

    public static extractArchive(src: string, dest: string) {
        return new Promise(async (ff, rj) => {
            Logger.debugImpl("Extract", `Extracting ${src} to ${dest}`);

            await Utils.mkdirpPromise(dest);
            const result = spawnSync(path7za, ["x", src, "-y", "-o" + dest]);

            if (result.error) return rj(result.error);
            if (result.status !== 0) return rj(`7z exited with failure code ${result.status}`);

            ff();
        });
    }

    public static tryExtractFileFromArchive(src: string, dest: string, file: string) {
        return new Promise(async (ff, rj) => {
            Logger.debugImpl("Extract", `Extracting ${file} from ${src} to ${dest}`);

            await Utils.mkdirpPromise(dest);
            const result = spawnSync(path7za, ["e", src, "-y", "-o" + dest, file]);

            if (result.error || result.status !== 0) return ff(false);
            if (!existsSync(join(dest, basename(file)))) return ff(false);

            ff(true);
        });
    }

    public static async handlePackedForgeLibrary(url: string, dest: string) {
        url += ".pack.xz";
        let xzipped = join(EnvironmentManager.tempDir, basename(dest) + ".pack.xz");

        Logger.debugImpl("Packed Forge Lib Handler", "Downloading " + url + "...");
        await Utils.downloadFile(url, xzipped);
        Logger.debugImpl("Packed Forge Lib Handler", "Downloaded pack.xz file. Reversing LZMA...");

        await Utils.extractArchive(xzipped, EnvironmentManager.tempDir);
        Logger.debugImpl("Packed Forge Lib Handler", "LZMA reversed. Stripping checksums...");

        let packFile = join(EnvironmentManager.tempDir, basename(dest) + ".pack");
        let packFileContent = fs.readFileSync(packFile);
        unlinkSync(packFile); //Remove existing one; we're stripping the checksums

        const checkString = Buffer.from(packFileContent.subarray(packFileContent.length - 4)).toString("ascii");
        if (checkString !== "SIGN")
            throw new Error("Invalid check string at end of packed file.");

        const length = packFileContent.length;
        const checksumLength = packFileContent[length - 8] & 255 | (packFileContent[length - 7] & 255) << 8 |
            (packFileContent[length - 6] & 255) << 16 |
            (packFileContent[length - 5] & 255) << 24;

        let realEnd = length - checksumLength - 8;
        Logger.debugImpl("Packed Forge Lib Handler", `File is ${length} bytes. Checksums are ${checksumLength} bytes of that, and the header is a further 8, leaving the real EOF at offset ${realEnd}`);

        const realPackContent = packFileContent.subarray(0, realEnd);
        fs.writeFileSync(packFile, realPackContent);

        Logger.debugImpl("Packed Forge Lib Handler", "Wrote real pack file. Cleaning up LZMA file...");
        unlinkSync(xzipped);

        Logger.debugImpl("Packed Forge Lib Handler", "Calling unpack200...");

        let result = spawnSync("unpack200", [packFile, dest]);

        if (result.error || result.status !== 0)
            throw new Error(`Failed to invoke unpack200 on ${packFile}. Error: ${result.error} | exit code ${result.status}`);

        Logger.debugImpl("Packed Forge Lib Handler", `${dest} created successfully.`);
    }

    public static handleOSBasedRule(rules: any[]) {
        let ourOs = os.platform() === "darwin" ? "osx" : os.platform() === "win32" ? "windows" : "linux";

        let mustAllow = false;
        let allow = true;

        for (let rule of rules) {
            if (rule.action === "allow") {
                if (!mustAllow)
                    allow = false; //Set this.

                mustAllow = true; //If there's at least one allow rule we assume the default is not to do so.

                if (!rule.os || ((!rule.os.name || rule.os.name === ourOs) && (!rule.os.version || new RegExp(rule.os.version).test(os.release())))) {
                    allow = true;
                }
            } else {
                //Deny
                if ((!rule.os.name || rule.os.name === ourOs) && (!rule.os.version || new RegExp(rule.os.version).test(os.release()))) {
                    allow = false;
                    break;
                }
            }
        }

        return allow;
    }

    public static sleepMs(ms: number) {
        return new Promise(ff => {
            setTimeout(ff, ms);
        });
    }
}
