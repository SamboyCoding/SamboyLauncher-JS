import * as fs from "fs";
import * as jsonfile from "jsonfile";
import * as path from "path";
import Utils from "../util/Utils";
import EnvironmentManager from "./EnvironmentManager";

export default class AuthenticationManager {
    public static accessToken: string;
    public static clientToken: string;
    public static username: string;
    public static password: string;
    public static uuid: string;
    public static email: string;

    public static LoadFromDisk() {
        if (fs.existsSync(path.join(EnvironmentManager.launcherDir, "authdata"))) {
            try {
                const content: any = jsonfile.readFileSync(path.join(EnvironmentManager.launcherDir, "authdata"));

                if (content.accessToken) {
                    AuthenticationManager.accessToken = content.accessToken;
                }

                if (content.clientToken) {
                    AuthenticationManager.clientToken = content.clientToken;
                }

                if (content.hash) {
                    AuthenticationManager.password = Utils.fromBase64(content.hash);
                }

                if (content.username) {
                    AuthenticationManager.username = content.username;
                }

                if (content.uuid) {
                    AuthenticationManager.uuid = content.uuid;
                }

                if (content.email) {
                    AuthenticationManager.email = content.email;
                }
            } catch (e) {
                jsonfile.writeFileSync(path.join(EnvironmentManager.launcherDir, "authdata"), {});
            }
        } else {
            jsonfile.writeFileSync(path.join(EnvironmentManager.launcherDir, "authdata"), {});
        }
    }

    public static save() {
        const content: any = {};

        if (AuthenticationManager.accessToken) {
            content.accessToken = AuthenticationManager.accessToken;
        }

        if (AuthenticationManager.clientToken) {
            content.clientToken = AuthenticationManager.clientToken;
        }

        if (AuthenticationManager.password) {
            content.hash = Utils.toBase64(AuthenticationManager.password);
        }

        if (AuthenticationManager.username) {
            content.username = AuthenticationManager.username;
        }

        if (AuthenticationManager.uuid) {
            content.uuid = AuthenticationManager.uuid;
        }

        if (AuthenticationManager.email) {
            content.email = AuthenticationManager.email;
        }

        jsonfile.writeFileSync(path.join(EnvironmentManager.launcherDir, "authdata"), content);
    }
}
