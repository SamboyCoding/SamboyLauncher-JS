import {existsSync} from "fs";
import {readFileSync, writeFileSync} from "jsonfile";
import fetch from "node-fetch";
import {join} from "path";
import Logger from "../logger";
import Utils from "../util/Utils";
import EnvironmentManager from "./EnvironmentManager";

export default class AuthenticationManager {
    public static accessToken: string;
    public static clientToken: string;
    public static username: string;
    public static password: string;
    public static uuid: string;
    public static email: string;

    private static authDataPath: string;

    public static LoadFromDisk() {
        this.authDataPath = join(EnvironmentManager.launcherDir, "authdata");

        if (existsSync(this.authDataPath)) {
            try {
                Logger.debugImpl("Authentication Manager", "Try load auth data.");
                const content: any = readFileSync(this.authDataPath);

                if (content.accessToken) this.accessToken = content.accessToken;
                if (content.clientToken) this.clientToken = content.clientToken;
                if (content.hash) this.password = Utils.fromBase64(content.hash);
                if (content.username) this.username = content.username;
                if (content.uuid) this.uuid = content.uuid;
                if (content.email) this.email = content.email;

                Logger.infoImpl("Authentication Manager", "Read auth data.");
            } catch (e) {
                Logger.warnImpl("Authentication Manager", "Corrupt auth data! Overwriting...");
                writeFileSync(this.authDataPath, {});
            }
        } else {
            Logger.warnImpl("Authentication Manager", "Auth data missing, creating default");
            writeFileSync(this.authDataPath, {});
        }
    }

    public static save() {
        const content: any = {};

        if (this.accessToken) {
            content.accessToken = this.accessToken;
        }

        if (this.clientToken) {
            content.clientToken = this.clientToken;
        }

        if (this.password) {
            //It's not encryption, but it'll at least stop anyone who casually opens the file
            content.hash = Utils.toBase64(this.password);
        }

        if (this.username) {
            content.username = this.username;
        }

        if (this.uuid) {
            content.uuid = this.uuid;
        }

        if (this.email) {
            content.email = this.email;
        }

        Logger.debugImpl("Authentication Manager", "Saving auth data.");
        writeFileSync(this.authDataPath, content);
    }

    public static async Login(email: string, password: string) {
        Logger.infoImpl("Authentication Manager", `Logging in with email ${email}...`);

        let resp = await fetch("https://authserver.mojang.com/authenticate", {
            body: JSON.stringify({
                agent: {
                    name: "Minecraft",
                    version: 1,
                },
                clientToken: this.clientToken ? this.clientToken : undefined,
                password,
                requestUser: true,
                username: email,
            }),
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST",
        });

        let json = await resp.json();

        if (json.error) {
            Logger.warnImpl("Authentication Manager", `Login failed: ${json.error}/${json.errorMessage}`);
            throw json.errorMessage;
        } else {
            const at: string = json.accessToken;
            const ct: string = json.clientToken;
            const uid: string = json.selectedProfile.id;
            const un: string = json.selectedProfile.name;

            this.accessToken = at;
            this.clientToken = ct;
            this.uuid = uid;
            this.username = un;
            this.email = email;
            this.password = password;

            this.save();
        }
    }

    public static Logout() {
        this.accessToken = undefined;
        this.uuid = undefined;
        this.username = undefined;
        this.email = undefined;
        this.password = undefined;

        this.save();
    }
}
