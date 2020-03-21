import {spawnSync} from "child_process";
import {existsSync} from "fs";
import * as os from "os";
import {join} from "path";
import * as rimraf from "rimraf";
import Logger from "./logger";
import AuthenticationManager from "./managers/AuthenticationManager";
import ConfigurationManager from "./managers/ConfigurationManager";
import ElectronManager from "./managers/ElectronManager";
import EnvironmentManager from "./managers/EnvironmentManager";
import InstalledPackManager from "./managers/InstalledPackManager";
import MainIPCHandler from "./managers/MainIPCHandler";
import UpdateManager from "./managers/UpdateManager";
import MCVersion from "./model/MCVersion";

async function InitializeApp() {
    try {
        await EnvironmentManager.Init();

        //BUGFIX: Cleanup old launcher dir
        if (existsSync(join(EnvironmentManager.launcherDir, "config.json"))) {
            //Invalidate
            Logger.stream.close();
            Logger.stream = undefined;

            //Windows is DUMB
            if (os.platform() === "win32")
                spawnSync("cmd", ["/c", `rmdir /s /q ${EnvironmentManager.launcherDir}`]);
            else
                rimraf.sync(EnvironmentManager.launcherDir);
            await EnvironmentManager.Init(); //Re-make dirs

            Logger.errorImpl("Init", "Removed old incompat launcher dir!");
        }

        ConfigurationManager.LoadFromDisk();
        AuthenticationManager.LoadFromDisk();
        MCVersion.Get(); //Preload these.
        InstalledPackManager.LoadFromDisk();
        ElectronManager.SetupElectron();
        MainIPCHandler.Init();
        UpdateManager.Init();
    } catch(e) {
        try {
            Logger.errorImpl("Init", "Failed to initialize app: " + e);
        } catch(ignored) {
            console.error(e);
        }
    }
}


InitializeApp();
