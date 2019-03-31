"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const download = require("download");
const path = require("path");
const mkdirp = require("mkdirp");
class Utils {
    static toBase64(str) {
        return Buffer.from(str, "binary").toString("base64");
    }
    static fromBase64(str) {
        return Buffer.from(str, "base64").toString("binary");
    }
    static async downloadFile(url, localPath) {
        return download(url, path.dirname(localPath), { filename: path.basename(localPath) });
    }
    static async mkdirpPromise(location) {
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
exports.default = Utils;
//# sourceMappingURL=Utils.js.map