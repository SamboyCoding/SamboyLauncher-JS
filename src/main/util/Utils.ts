import * as download from "download";
import * as path from "path";
import * as mkdirp from "mkdirp";

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

    public static async mkdirpPromise(location: string): Promise<any> {
        return new Promise((ff, rj) => {
            mkdirp(location, (err, made) => {
                if (err) {
                    return rj(err);
                }

                ff();
            });
        });
    }
}
