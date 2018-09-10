const {
    ipcRenderer
} = require("electron");

const app = new Vue({
    el: "#app",
    data: {
        ui: {
            login: {
                show: true,
                processing: false,
                backgroundImg: "../resources/backgrounds/1.jpg",
                email: "",
                password: "",
                remember: false
            },
            packView: {
                packs: [],
                show: false,
                selectedPackIndex: -1
            },
            profile: {
                name: "",
                image: "",
                uuid: ""
            },
            settings: {
                show: false,
            },
            packBrowse: {
                show: false,
                packs: [],
                selectedPackIndex: -1,
            },
            packInstall: {
                show: false,
                gameVersion: "1.12.2",
                log: [],
                vanillaProgress: {
                    label: "Starting installation...",
                    progress: -1
                },
                moddedProgress: {
                    label: "Starting installation...",
                    progress: -1
                }
            }
        }
    },
    methods: {
        login: function (evt) {
            ipcRenderer.send("login", app.ui.login.email, app.ui.login.password, app.ui.login.remember);
            app.ui.login.processing = true;
        },
        close: function (evt) {
            window.close();
        },
        switchToInstalled: function (evt) {
            app.ui.packView.show = true;
            app.ui.settings.show = false;
            app.ui.packBrowse.show = false;
        },
        switchToBrowse: function (evt) {
            app.ui.packView.show = false;
            app.ui.settings.show = false;
            app.ui.packBrowse.show = true;
        },
        switchToSettings: function (evt) {
            app.ui.packView.show = false;
            app.ui.settings.show = true;
            app.ui.packBrowse.show = false;
        },
        installPack: function () {
            if (app.ui.packBrowse.selectedPackIndex === -1) return;

            ipcRenderer.send("install pack", app.ui.packBrowse.packs[app.ui.packBrowse.selectedPackIndex]);
            app.ui.packInstall.gameVersion = app.ui.packBrowse.packs[app.ui.packBrowse.selectedPackIndex].gameVersion;
            app.ui.packInstall.show = true;
        }
    }
});

function hideCover() {
    document.querySelector("#cover").classList.add("gone");
    setTimeout(() => {
        document.querySelector("#cover").style.display = "none";
    }, 1000);
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
    console.error(errorMessage);
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
});

ipcRenderer.on("no profile", (event) => {
    app.ui.login.show = true;
    ipcRenderer.send("get backgrounds");
});

ipcRenderer.on("top packs", (event, packs) => {
    app.ui.packBrowse.packs = packs;

    packs.forEach((p) => {
        p.mods.sort((a, b) => a.resolvedName.localeCompare(b.resolvedName));
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