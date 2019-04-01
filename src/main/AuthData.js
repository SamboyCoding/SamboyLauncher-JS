"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const jsonfile = require("jsonfile");
const path = require("path");
const Env_1 = require("./Env");
const Utils_1 = require("./util/Utils");
class AuthData {
    static load() {
        if (fs.existsSync(path.join(Env_1.default.launcherDir, "authdata"))) {
            try {
                const content = jsonfile.readFileSync(path.join(Env_1.default.launcherDir, "authdata"));
                if (content.accessToken) {
                    AuthData.accessToken = content.accessToken;
                }
                if (content.clientToken) {
                    AuthData.clientToken = content.clientToken;
                }
                if (content.hash) {
                    AuthData.password = Utils_1.default.fromBase64(content.hash);
                }
                if (content.username) {
                    AuthData.username = content.username;
                }
                if (content.uuid) {
                    AuthData.uuid = content.uuid;
                }
                if (content.email) {
                    AuthData.email = content.email;
                }
            }
            catch (e) {
                jsonfile.writeFileSync(path.join(Env_1.default.launcherDir, "authdata"), {});
            }
        }
        else {
            jsonfile.writeFileSync(path.join(Env_1.default.launcherDir, "authdata"), {});
        }
    }
    static save() {
        const content = {};
        if (AuthData.accessToken) {
            content.accessToken = AuthData.accessToken;
        }
        if (AuthData.clientToken) {
            content.clientToken = AuthData.clientToken;
        }
        if (AuthData.password) {
            content.hash = Utils_1.default.toBase64(AuthData.password);
        }
        if (AuthData.username) {
            content.username = AuthData.username;
        }
        if (AuthData.uuid) {
            content.uuid = AuthData.uuid;
        }
        if (AuthData.email) {
            content.email = AuthData.email;
        }
        jsonfile.writeFileSync(path.join(Env_1.default.launcherDir, "authdata"), content);
    }
}
exports.default = AuthData;
//# sourceMappingURL=AuthData.js.map