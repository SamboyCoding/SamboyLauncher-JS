import {ipcRenderer} from "electron";

export default class MainProcessActions {
    public static minimizeWindow() {
        ipcRenderer.send("minimize");
    }

    public static toggleMaximize() {
        ipcRenderer.send("maximize");
    }
}
