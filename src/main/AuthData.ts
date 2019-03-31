import * as fs from "fs";
import * as jsonfile from "jsonfile";
import * as path from "path";
import Env from "./Env";
import Utils from "./util/Utils";

export default class AuthData {
    public static accessToken: string;
    public static clientToken: string;
    public static username: string;
    public static password: string;
    public static uuid: string;
    public static email: string;

    public static load() {
        if (fs.existsSync(path.join(Env.launcherDir, "authdata"))) {
            try {
                const content: any = jsonfile.readFileSync(path.join(Env.launcherDir, "authdata"));

                if (content.accessToken) {
                    AuthData.accessToken = content.accessToken;
                }

                if (content.clientToken) {
                    AuthData.clientToken = content.clientToken;
                }

                if (content.hash) {
                    AuthData.password = Utils.fromBase64(content.hash);
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
            } catch (e) {
                jsonfile.writeFileSync(path.join(Env.launcherDir, "authdata"), {});
            }
        } else {
            jsonfile.writeFileSync(path.join(Env.launcherDir, "authdata"), {});
        }
    }

    public static save() {
        const content: any = {};

        if (AuthData.accessToken) {
            content.accessToken = AuthData.accessToken;
        }

        if (AuthData.clientToken) {
            content.clientToken = AuthData.clientToken;
        }

        if (AuthData.password) {
            content.hash = Utils.toBase64(AuthData.password);
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

        jsonfile.writeFileSync(path.join(Env.launcherDir, "authdata"), content);
    }
}
