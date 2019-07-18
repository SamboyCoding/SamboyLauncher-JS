const {
    ipcRenderer,
} = require("electron");

const package = require("../../../package");

const semver = require("semver");
const packageData = require("../../../package");

const app = new Vue({
    data: {
        ui: {
            dark: false,
            gameRun: {
                exitCode: undefined,
                log: [],
                running: false,
                show: false,
            },
            launcherUpdate: {
                available: false,
                checking: false,
                devmode: false,
                failed: false,
                ready: false,
                versionName: "",
            },
            login: {
                backgroundImg: "../resources/backgrounds/1.jpg",
                email: "",
                error: "",
                password: "",
                processing: false,
                remember: false,
                show: true,
            },
            packBrowse: {
                packs: [],
                selectedPackIndex: -1,
                show: false,
            },
            packInstall: {
                failed: false,
                gameVersion: "1.12.2",
                log: [],
                moddedProgress: {
                    label: "Starting installation...",
                    progress: -1,
                },
                show: false,
                vanillaProgress: {
                    label: "Starting installation...",
                    progress: -1,
                },
            },
            packUninstall: {
                show: false,
            },
            packUpdate: {
                data: null,
                failed: false,
                label: "Starting update...",
                preview: true,
                progress: -1,
                show: false,
            },
            packView: {
                packs: [],
                selectedPackIndex: -1,
                show: false,
            },
            profile: {
                image: "",
                name: "",
                uuid: "",
            },
            settings: {
                show: false,
                version: package.version,
            },
        },
    },
    el: "#app",
    methods: {
        close: function () {
            window.close();
        },
        dismissPackInstall: function () {
            app.ui.packInstall.show = false;
            ipcRenderer.send("get top packs");
            ipcRenderer.send("get installed packs");
        },
        doUpdatePack: function () {
            app.ui.packUpdate.progress = -1;
            app.ui.packUpdate.label = "Starting update...";
            app.ui.packUpdate.failed = false;
            app.ui.packUpdate.preview = false;

            ipcRenderer.send("update pack", app.ui.packView.packs[app.ui.packView.selectedPackIndex], app.ui.packUpdate.data);
        },
        getPackUpdateDetails: function () {
            ipcRenderer.send("get update actions", app.ui.packView.packs[app.ui.packView.selectedPackIndex]);
        },
        installPack: function () {
            if (app.ui.packBrowse.selectedPackIndex === -1) {
                return;
            }

            ipcRenderer.send("install pack", app.ui.packBrowse.packs[app.ui.packBrowse.selectedPackIndex]);

            app.ui.packInstall.failed = false;
            app.ui.packInstall.log = [];

            app.ui.packInstall.vanillaProgress.label = "Starting installation...";
            app.ui.packInstall.vanillaProgress.progress = -1;

            app.ui.packInstall.moddedProgress.label = "Starting installation...";
            app.ui.packInstall.moddedProgress.progress = -1;

            app.ui.packInstall.gameVersion = app.ui.packBrowse.packs[app.ui.packBrowse.selectedPackIndex].gameVersion;
            app.ui.packInstall.show = true;
        },
        installUpdate: function () {
            ipcRenderer.send("install update"); //Will close launcher
        },
        launchPack: function () {
            if (app.ui.packView.selectedPackIndex === -1) {
                return;
            }

            app.ui.gameRun.log = [];
            app.ui.gameRun.running = false;
            app.ui.gameRun.exitCode = undefined;
            app.ui.gameRun.show = true;
            ipcRenderer.send("launch pack", app.ui.packView.packs[app.ui.packView.selectedPackIndex]);
        },
        login: function () {
            ipcRenderer.send("login", app.ui.login.email, app.ui.login.password, app.ui.login.remember);
            app.ui.login.processing = true;
        },
        retryUpdate: function () {
            app.ui.launcherUpdate.checking = true;
            app.ui.launcherUpdate.available = false;
            app.ui.launcherUpdate.versionName = "";
            app.ui.launcherUpdate.devmode = false;
            app.ui.launcherUpdate.failed = false;
            app.ui.launcherUpdate.ready = false;

            ipcRenderer.send("check updates");
        },
        signOut: function () {
            ipcRenderer.send("logout");
        },
        switchToBrowse: function () {
            app.ui.packView.show = false;
            app.ui.settings.show = false;
            app.ui.packBrowse.show = true;
        },
        switchToInstalled: function () {
            app.ui.packView.show = true;
            app.ui.settings.show = false;
            app.ui.packBrowse.show = false;
        },
        switchToSettings: function () {
            app.ui.packView.show = false;
            app.ui.settings.show = true;
            app.ui.packBrowse.show = false;
        },
        uninstallPack: function () {
            if (app.ui.packView.selectedPackIndex === -1) {
                return;
            }

            ipcRenderer.send("uninstall pack", app.ui.packView.packs[app.ui.packView.selectedPackIndex]);
        },
        toggleDarkTheme: function () {
            ipcRenderer.send("set dark", document.querySelector("#darkThemeToggle").checked);
        },
    },
});

function hideCover() {
    document.querySelector("#cover").classList.add("gone");
    setTimeout(() => {
        document.querySelector("#cover").style.display = "none";
    }, 1000);
}

function adjustScroll(oldPos) {
    if (oldPos !== 0) {
        return;
    }

    let elem = document.querySelector("#game-running-modal .modal-content");
    elem.scrollTop = (elem.scrollHeight - elem.clientHeight);
}

document.body.onload = function () {
    ipcRenderer.send("get profile");
};

ipcRenderer.on("backgrounds", (event, files) => {
    let file = files[Math.floor(Math.random() * files.length)];
    app.ui.login.backgroundImg = "../resources/backgrounds/" + file;

    hideCover();
});

ipcRenderer.on("login error", (event, errorMessage) => {
    app.ui.login.error = errorMessage;
    app.ui.login.processing = false;
});

ipcRenderer.on("profile", (event, username, uuid) => {
    app.ui.profile.name = username;
    app.ui.profile.uuid = uuid;
    app.ui.login.show = false;
    app.ui.packView.show = true;

    hideCover();

    ipcRenderer.send("get top packs");
    ipcRenderer.send("get installed packs");
    app.ui.launcherUpdate.checking = true;
    ipcRenderer.send("check updates");
    ipcRenderer.send("validate session");
});

ipcRenderer.on("no profile", () => {
    app.ui.login.show = true;
    ipcRenderer.send("get backgrounds");
});

ipcRenderer.on("top packs", (event, packs) => {
    app.ui.packBrowse.packs = packs;

    packs.forEach((p) => {
        p.mods.sort((a, b) => a.resolvedName.localeCompare(b.resolvedName));
    });
});

ipcRenderer.on("installed packs", (event, packData) => {
    packData.forEach((pack) => {
        pack.latestVersion = "";
        pack.update = false;
        pack.latestMods = [];
        pack.desc = "";
        if (!pack.gameVersion) {
            pack.gameVersion = "";
        }
        if (!pack.forgeVersion) {
            pack.forgeVersion = "";
        }
        pack.updatedForgeVersion = "";
        pack.updatedRiftVersion = "";
    });

    app.ui.packView.packs = packData;

    app.ui.packView.packs.forEach(async (pack) => {
        let resp = await fetch("https://launcher.samboycoding.me/api/users/" + pack.author.id + "/packs/" + pack.id);
        let json = await resp.json();

        pack.latestVersion = json.version;
        pack.update = pack.installedVersion !== pack.latestVersion;
        pack.latestMods = json.mods;
        pack.desc = json.description;
        pack.gameVersion = json.gameVersion;
        if (!pack.forgeVersion) {
            pack.forgeVersion = json.forgeVersion;
        }
        pack.updatedForgeVersion = json.forgeVersion;
        pack.updatedRiftVersion = json.riftVersion;
        pack.mods = pack.installedMods;
    });
});

ipcRenderer.on("vanilla progress", (event, label, progress) => {
    app.ui.packInstall.vanillaProgress.label = label;
    app.ui.packInstall.vanillaProgress.progress = progress;

    app.ui.packInstall.log.push("[Vanilla] " + Math.round(progress * 100) + "%: " + label);
});

ipcRenderer.on("modded progress", (event, label, progress) => {
    app.ui.packInstall.moddedProgress.label = label;
    app.ui.packInstall.moddedProgress.progress = progress;

    app.ui.packInstall.log.push("[Modpack] " + (progress === -1 ? "0" : Math.round(progress * 100)) + "%: " + label);
});

ipcRenderer.on("install log", (event, text) => {
    app.ui.packInstall.log.push(text);
});

ipcRenderer.on("install failed", (event, reason) => {
    app.ui.packInstall.failed = true;

    if (app.ui.packInstall.vanillaProgress.progress > -1 && app.ui.packInstall.vanillaProgress.progress < 1) {
        app.ui.packInstall.vanillaProgress.label = reason;
    }

    if (app.ui.packInstall.moddedProgress.progress > -1 && app.ui.packInstall.moddedProgress.progress < 1) {
        app.ui.packInstall.moddedProgress.label = reason;
    }
});

ipcRenderer.on("game launched", () => {
    app.ui.gameRun.running = true;
});

ipcRenderer.on("game output", (event, input) => {
    let elem = document.querySelector("#game-running-modal .modal-content");
    let offset = (elem.scrollHeight - elem.clientHeight) - elem.scrollTop;

    let lines = input.replace("\r", "").split("\n");

    for (let index in lines) {
        let line = lines[index].trim().replace("\r", "").replace("\n", "").replace("\r\n", "");
        let match = /\s*\[(\d+:\d+:\d+)] \[([a-zA-Z0-9\s-#]+)\/([a-zA-Z]+)](.+)/g.exec(line);
        if (!match) {
            app.ui.gameRun.log.push({
                type: "info",
                content: line,
            });
        } else {
            app.ui.gameRun.log.push({
                content: line,
                time: match[1],
                thread: match[2],
                level: match[3].toLowerCase(),
                message: match[4],
            });
        }
    }

    setTimeout(function () {
        adjustScroll(offset);
    }, 100);
});

ipcRenderer.on("game error", (event, line) => {
    let elem = document.querySelector("#game-running-modal .modal-content");
    let offset = (elem.scrollHeight - elem.clientHeight) - elem.scrollTop;

    app.ui.gameRun.log.push({
        type: "error",
        content: line,
    });

    setTimeout(function () {
        adjustScroll(offset);
    }, 100);
});

ipcRenderer.on("game closed", (event, code) => {
    app.ui.gameRun.running = false;
    app.ui.gameRun.exitCode = code;
});

ipcRenderer.on("uninstalling pack", () => {
    app.ui.packUninstall.show = true;
});

ipcRenderer.on("uninstalled pack", () => {
    app.ui.packUninstall.show = false;
    ipcRenderer.send("get top packs");
    ipcRenderer.send("get installed packs");
});

ipcRenderer.on("update available", (event, name) => {
    app.ui.launcherUpdate.checking = false;
    app.ui.launcherUpdate.available = semver.gt(name, packageData.version);
    app.ui.launcherUpdate.versionName = name;
    app.ui.launcherUpdate.devmode = false;
    app.ui.launcherUpdate.failed = false;
    app.ui.launcherUpdate.ready = false;
});

ipcRenderer.on("no update", () => {
    app.ui.launcherUpdate.checking = false;
    app.ui.launcherUpdate.available = false;
    app.ui.launcherUpdate.failed = false;
    app.ui.launcherUpdate.devmode = false;
    app.ui.launcherUpdate.versionName = "";
    app.ui.launcherUpdate.ready = false;
});

ipcRenderer.on("update error", () => {
    app.ui.launcherUpdate.checking = false;
    app.ui.launcherUpdate.available = false;
    app.ui.launcherUpdate.failed = true;
    app.ui.launcherUpdate.devmode = false;
    app.ui.launcherUpdate.versionName = "";
    app.ui.launcherUpdate.ready = false;
});

ipcRenderer.on("update devmode", () => {
    app.ui.launcherUpdate.checking = false;
    app.ui.launcherUpdate.available = false;
    app.ui.launcherUpdate.failed = false;
    app.ui.launcherUpdate.devmode = true;
    app.ui.launcherUpdate.versionName = "";
    app.ui.launcherUpdate.ready = false;
});

ipcRenderer.on("update downloaded", () => {
    app.ui.launcherUpdate.checking = false;
    app.ui.launcherUpdate.failed = false;
    app.ui.launcherUpdate.devmode = false;
    app.ui.launcherUpdate.ready = true;
    app.ui.launcherUpdate.available = false;
});

ipcRenderer.on("logged out", () => {
    app.ui.login.processing = false;
    app.ui.login.email = "";
    app.ui.login.password = "";
    app.ui.login.error = "";

    app.ui.profile.name = "";
    app.ui.profile.uuid = "";
    app.ui.profile.image = "";

    app.ui.login.show = true;
    app.ui.packView.show = false;
    app.ui.packBrowse.show = false;
    app.ui.settings.show = false;
    app.ui.gameRun.show = false;
    app.ui.packInstall.show = false;
    app.ui.packUninstall.show = false;
});

ipcRenderer.on("session invalid", () => {
    app.ui.login.processing = false;
    app.ui.login.email = "";
    app.ui.login.password = "";
    app.ui.login.error = "Your session is invalid. Please sign in again. If you choose 'Remember my password' we can sign you back in if this happens again.";

    app.ui.profile.name = "";
    app.ui.profile.uuid = "";
    app.ui.profile.image = "";

    app.ui.login.show = true;
    app.ui.packView.show = false;
    app.ui.packBrowse.show = false;
    app.ui.settings.show = false;
    app.ui.gameRun.show = false;
    app.ui.packInstall.show = false;
    app.ui.packUninstall.show = false;
});

ipcRenderer.on("update actions", (event, actions) => {
    app.ui.packUpdate.data = actions;
    app.ui.packUpdate.show = true;
});

ipcRenderer.on("pack update progress", (event, progress, label) => {
    app.ui.packUpdate.progress = progress;
    app.ui.packUpdate.label = label;
});

ipcRenderer.on("pack update complete", () => {
    app.ui.packUpdate.show = false;
    ipcRenderer.send("get top packs");
    ipcRenderer.send("get installed packs");
});

ipcRenderer.on("dark theme", (event, enabled) => {
    app.ui.dark = enabled;
});