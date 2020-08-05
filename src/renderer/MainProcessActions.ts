import {ipcRenderer, IpcRendererEvent} from "electron";
import DownloadQueueEntry from "../main/model/DownloadQueueEntry";
import InstalledPackJSON from "../main/model/InstalledPackJSON";
import MainProcessBoundDownloadRequest from "../main/model/MainProcessBoundDownloadRequest";
import RendererBoundVersionListing from "../main/model/RendererBoundVersionListing";
import App from "./App.vue";

ipcRenderer.on("pack list", (event, packs: InstalledPackJSON[]) => {
    if(MainProcessActions.onPackList)
        MainProcessActions.onPackList(packs);
});

ipcRenderer.on("mc versions", (event, versions: RendererBoundVersionListing) => {
    if(MainProcessActions.onMcVersionList)
        MainProcessActions.onMcVersionList(versions);
});

ipcRenderer.on("download queue", (event, queue: DownloadQueueEntry[]) => {
    console.log("Got queue", queue);
    App.instance.$store.commit("setInstalls", queue);
});

export default class MainProcessActions {
    public static dataUrlQueue: Map<String, Promise<String>> = new Map<String, Promise<String>>();
    public static onPackList: (packs: InstalledPackJSON[]) => void = null;
    public static onMcVersionList: (mcVersions: RendererBoundVersionListing) => void = null;

    public static minimizeWindow() {
        ipcRenderer.send("minimize");
    }

    public static toggleMaximize() {
        ipcRenderer.send("maximize");
    }

    public static logMessage(message: string, ...args) {
        if(args.length)
            console.log(message, ...args);
        else
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

    public static notifyLoaded() {
        ipcRenderer.send("renderer ready");
    }

    static requestInstall(data: MainProcessBoundDownloadRequest) {
        ipcRenderer.send("process download request", data);
    }
}
