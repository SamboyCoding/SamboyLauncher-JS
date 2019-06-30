import {path7za} from "7zip-bin";
import {spawnSync} from "child_process";
import download from "download";
import {existsSync, unlinkSync} from "fs";
import * as hasha from "hasha";
import mkdirp from "mkdirp";
import * as path from "path";
import * as rimraf from "rimraf";
import {Logger} from "../logger";

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

    public static async downloadWithSigCheck(url: string, localPath: string, sha1: string) {
        //First check if it already exists.
        if (existsSync(localPath)) {
            const hash = hasha.fromFileSync(localPath, {algorithm: "sha1"});
            if (hash !== sha1) {
                Logger.warnImpl("Download", "Existing file has mismatched SHA1 for " + localPath + ". Expecting: " + sha1 + "; got: " + hash);
                unlinkSync(localPath);
            } else {
                Logger.debugImpl("Download", `Using existing file for ${localPath} as its SHA1 matches.`);
                return;
            }
        }

        let sanity = 1;
        while (!existsSync(localPath)) {
            if (sanity > 5) throw new Error(`Failed to download ${localPath} with valid signature after 5 attempts.`);

            try {
                await this.downloadFile(url, localPath);
            } catch (e) {
                Logger.warnImpl("Download", `Attempt ${sanity}: Failed to download ${url} with error ${e}`);
                sanity++;
                continue;
            }

            let hash;
            try {
                hash = hasha.fromFileSync(localPath, {algorithm: "sha1"});
            } catch (e) {
                Logger.warnImpl("Download", `${localPath} apparently downloaded but missing. Retrying.`);
                sanity++;
                continue;
            }

            if (hash !== sha1) {
                Logger.warnImpl("Download", `Attempt ${sanity}: Mismatched SHA1 for ${localPath}. Expecting: ${sha1}; got: ${hash}`);
                rimraf.sync(localPath);
                sanity++;
                await this.sleepMs(1000); //Backoff because deleting isn't actually sync.
            } else {
                Logger.debugImpl("Download", `Downloaded ${localPath} and verified SHA1 on attempt ${sanity}`);
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

    public static sleepMs(ms: number) {
        return new Promise(ff => {
            setTimeout(ff, ms);
        });
    }
}
