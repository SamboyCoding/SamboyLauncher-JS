import {ipcRenderer} from "electron";

ipcRenderer.on("pack list", (event, packs: string[]) => {
    if(MainProcessActions.onPackList)
        MainProcessActions.onPackList(packs);
});

ipcRenderer.on("mc versions", (event, versions: string[]) => {
    if(MainProcessActions.onMcVersionList)
        MainProcessActions.onMcVersionList(versions);
});

export default class MainProcessActions {
    public static onPackList: (packs: string[]) => void = null;
    public static onMcVersionList: (mcVersions: string[]) => void = null;

    public static minimizeWindow() {
        ipcRenderer.send("minimize");
    }

    public static toggleMaximize() {
        ipcRenderer.send("maximize");
    }

    public static logMessage(message: string) {
        ipcRenderer.send("renderer log", message);
    }
}
