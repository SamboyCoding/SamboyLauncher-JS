import {ipcRenderer, IpcRendererEvent} from "electron";
import InstalledPackJSON from "../main/model/InstalledPackJSON";

ipcRenderer.on("pack list", (event, packs: InstalledPackJSON[]) => {
    if(MainProcessActions.onPackList)
        MainProcessActions.onPackList(packs);
});

ipcRenderer.on("mc versions", (event, versions: string[]) => {
    if(MainProcessActions.onMcVersionList)
        MainProcessActions.onMcVersionList(versions);
});

export default class MainProcessActions {
    public static dataUrlQueue: Map<String, Promise<String>> = new Map<String, Promise<String>>();
    public static onPackList: (packs: InstalledPackJSON[]) => void = null;
    public static onMcVersionList: (mcVersions: string[]) => void = null;

    public static minimizeWindow() {
        ipcRenderer.send("minimize");
    }

    public static toggleMaximize() {
        ipcRenderer.send("maximize");
    }

    public static logMessage(message: string) {
        console.log(message);
        ipcRenderer.send("renderer log", message);
    }

    public static pathToDataUrl(key: string): Promise<String> {
        return new Promise<String>((ff, rj) => {
            const cb = (event: IpcRendererEvent, resultKey: string, url: string) => {
                if(resultKey == key) {
                    ipcRenderer.off("data url generated", cb);
                    if(url !== null)
                        ff(url);
                    else
                        rj("File not found in pathToDataUrl");
                }
            };
            ipcRenderer.on("data url generated", cb);

            MainProcessActions.logMessage("[PTDU] Requesting " + key);
            ipcRenderer.send("generate data url", key);
        });
    }
}
