import {release} from "os";
import {OsBasedRestriction} from "../model/MinecraftVersionManifest";

export default class RuleHelper {
    public static GetOurArchWithoutX() {
        return process.arch.substr(1); //Remove the x
    }

    public static GetOurOsName(): "windows" | "osx" | "linux" | undefined {
        switch(process.platform) {
            case "win32":
                return "windows";
            case "darwin":
                return "osx";
            case "linux":
                return "linux";
            default:
                return undefined;
        }
    }

    public static ProcessOSRules(rules: OsBasedRestriction[]): boolean {
        //Default is disallow.
        let allow = false;
        for(let rule of rules) {
            if(!rule.os) {
                allow = rule.action == "allow";
                continue;
            }

            if(rule.os.name && rule.os.name !== this.GetOurOsName())
                continue;

            if(rule.os.arch && rule.os.arch !== process.arch)
                continue;

            if(rule.os.version && !new RegExp(rule.os.version).test(release()))
                continue;

            allow = rule.action == "allow";
        }

        return allow;
    }
}
