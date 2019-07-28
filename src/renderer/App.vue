<template>
    <div id="app">
        <top-bar></top-bar>

        <!--Login modal-->
        <div class="modal-cover" v-if="showLogin">
            <div class="modal">
                <div class="modal-top">
                    <h1 class="modal-title">Log In</h1>
                    <a @click="showLogin = false" class="modal-dismiss"><i class="fas fa-times"></i></a>
                </div>
                <p>Sign in to your Mojang account:</p>
                <input placeholder="Email" type="email" v-model="loginEmail">
                <input placeholder="Password" type="password" v-model="loginPassword">

                <button @click="signIn()" id="sign-in-button" style="float: right;">Sign In</button>
                <button @click="showLogin = false" id="sign-in-cancel" style="float: right; margin-right: 0.4rem">
                    Cancel
                </button>
            </div>
        </div>

        <div id="subnav">
            <main-menu v-if="page === Page.MAIN_MENU"></main-menu>
            <div id="play" v-else-if="page === Page.PLAY">
                <div id="packs">
                    <div class="pack installing" v-for="(percent, name) in installingPacks">
                        <div class="pack-icon">
                            {{name}}
                        </div>
                        <div class="pack-shade"></div>
                        <div :style="{height: ((1 - percent) * 225) + 'px'}" class="pack-installation"></div>
                        <div class="pack-title">Creating "{{name}}" ({{percent * 100}}%)</div>
                    </div>
                    <div :class="{pack: true, running: runningPacks.indexOf(packName) >= 0}" @click="launchPack(packName)" @click.right="onPackRightClick(packName, $event)" v-for="packName in $store.state.installedPacks">
                        <div class="pack-icon" style="background-image: url(./resources/default_pack_icon.png);"></div>
                        <div class="pack-shade"></div>
                        <div class="pack-title">{{packName}}</div>
                        <div class="pack-running-shade" v-if="runningPacks.indexOf(packName) >= 0">Pack Running</div>
                    </div>
                </div>
            </div>
            <div id="discover" v-else-if="page === Page.DISCOVER">
                <button @click="importPack()" style="margin: 4rem auto; display: block;">Import a Pack</button>
                <h1 style="display: block; width: 100%; text-align: center">Pack Browser Coming Soon!</h1>
                <small style="display: block; width: 100%; text-align: center">(For now, use the button above to install
                    a pack if someone's given you one)</small>
            </div>
            <create-menu v-else-if="page === Page.CREATE"></create-menu>
            <div id="settings" v-else-if="page === Page.SETTINGS">
                <h1>Settings</h1>

                <br>
                <h3>GC Mode:</h3>
                <br>
                <div class="button-wrapper">
                    <button :class="{active: gcMode === 'cms'}" @click="setGCMode('cms')" id="cms-gc">Concurrent Sweep
                        (Optimize memory usage, may affect FPS)
                    </button>
                    <button :class="{active: gcMode === 'g1'}" @click="setGCMode('g1')" id="g1-gc">Garbage-First (Higher
                        memory usage, may give better FPS)
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang='ts'>
    import {IpcMessageEvent, ipcRenderer, remote} from "electron";
    import {Component, Vue} from "vue-property-decorator";

    import CreateMenu from "./components/CreateMenu.vue";
    import MainMenu from "./components/MainMenu.vue";
    import TopBar from "./components/TopBar.vue";
    import Config from "./Config";
    import Page from "./model/Page";

    console.clear();

    @Component({
        components: {
            TopBar,
            MainMenu,
            CreateMenu
        },
    })
    export default class App extends Vue {
        public Page = Page; //Expose to the view

        public runningPacks: string[] = [];

        public showLogin = false;
        public loginEmail = "";
        public loginPassword = "";

        public packsBeingImported: Map<string, number> = new Map<string, number>();

        public gcMode = "";

        public mounted() {
            console.info("[App] SBL Renderer: Main App Mounted");
            console.info(`[App] Using API URL ${Config.API_URL}`);
            console.info("[App] Initializing IPC...");

            ipcRenderer.removeAllListeners("installed packs")
                .removeAllListeners("created packs")
                .removeAllListeners("username")
                .removeAllListeners("sign in error");

            ipcRenderer.on("installed packs", (event, packs: string[]) => {
                console.info("[App] Received installed pack data.");
                this.$store.commit("setInstalledPacks", packs);
            });

            ipcRenderer.on("created packs", (event, packs: string[]) => {
                console.info("[App] Received user-created pack data.");
                this.$store.commit("setCreatedPacks", packs);
            });

            ipcRenderer.on("username", (event: IpcMessageEvent, username: string) => {
                console.info("[App] Received username");
                this.$store.commit("setUsername", username);

                this.showLogin = false;
            });

            ipcRenderer.on("sign in error", (event: IpcMessageEvent, errorMessage: string) => {
                alert(errorMessage);
            });

            ipcRenderer.send("get installed packs");

            ipcRenderer.removeAllListeners("pack exit")
                .removeAllListeners("pack crash");

            ipcRenderer.on("pack exit", (event: IpcMessageEvent, packName: string) => {
                let idx = this.runningPacks.indexOf(packName);
                if (idx >= 0)
                    this.runningPacks.splice(idx, 1);
            });

            ipcRenderer.on("pack crash", (event: IpcMessageEvent, packName: string) => {
                let idx = this.runningPacks.indexOf(packName);
                if (idx >= 0)
                    this.runningPacks.splice(idx, 1);

                alert(`Uh oh! The pack ${packName} appears to have crashed!`);
            });

            ipcRenderer.removeAllListeners("import failed")
                .removeAllListeners("importing pack")
                .removeAllListeners("importing mods")
                .removeAllListeners("install progress")
                .removeAllListeners("pack imported");

            ipcRenderer.on("install failed", (event, packName, errorMessage) => {
                if (!this.packsBeingImported.has(packName)) return;

                alert(errorMessage);
                console.info(`[App] Pack ${packName} import failed.`);
                this.packsBeingImported.delete(packName);
                this.$store.commit("cancelInstall", packName);
            });

            ipcRenderer.on("import failed", (event, errorMessage) => {
                alert(errorMessage);
            });

            ipcRenderer.on("importing pack", (event, name) => {
                console.log(`[App] Beginning import tracking for pack ${name}`);
                this.$store.commit("queuePackInstall", name);
                this.packsBeingImported.set(name, 0);
            });

            ipcRenderer.on("importing mods", (event, name, count) => {
                console.log(`[App] Client install complete, pack ${name} is now having ${count} mods installed.`);
                this.packsBeingImported.set(name, count);
                this.$store.commit("setInstallProgress", {name: name, value: 0.5});
            });

            ipcRenderer.on("install progress", (event, packName, progress) => {
                if (!this.packsBeingImported.has(packName)) return;

                progress = Math.round(progress * 1000) / 1000;

                console.info(`[App] Client install for import of pack ${packName} is ${progress} complete.`);
                this.$store.commit("setInstallProgress", {name: packName, value: progress * 0.5});
                this.$forceUpdate();
            });

            ipcRenderer.on("mod installed", (event, name, jar) => {
                if (!this.packsBeingImported.has(name)) return;

                console.info(`[App] Pack ${name} has had mod ${jar.slug} imported.`);

                let pctPer = (1 / this.packsBeingImported.get(name)) * 0.5;

                this.$store.commit("setInstallProgress", {
                    name,
                    value: Math.round((this.installingPacks[name] + pctPer) * 1000) / 1000
                });

                this.$forceUpdate();
            });

            ipcRenderer.on("pack imported", (event, name) => {
                console.info(`[App] Pack ${name} import complete.`);
                this.packsBeingImported.delete(name);
                this.$store.commit("cancelInstall", name);
            });

            //Settings

            ipcRenderer.removeAllListeners("gc mode");

            ipcRenderer.on("gc mode", (event, mode: string) => {
                console.info(`[Settings] GC Mode is ${mode}`);
                this.gcMode = mode;
            });
        }

        get page() {
            return this.$store.state.currentPage as Page;
        }

        get installingPacks() {
            return this.$store.state.installingPacks;
        }

        public launchPack(packName: string) {
            if (this.runningPacks.indexOf(packName) >= 0) return; //Already running

            ipcRenderer.send("launch pack", packName);
            this.runningPacks.push(packName);
        }

        public signIn() {
            if (!this.loginEmail.trim() || !this.loginPassword.trim()) return;

            ipcRenderer.send("sign in", this.loginEmail, this.loginPassword);
        }

        public importPack() {
            ipcRenderer.send("import pack");
        }

        public onPackRightClick(name: string, event: MouseEvent) {
            console.info(`[Play] User right-clicked pack ${name}`);
            remote.Menu.buildFromTemplate([
                {
                    label: "Launch",
                    accelerator: "enter",
                    click: () => {
                        this.launchPack(name);
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Delete",
                    accelerator: "delete",
                    click: () => {
                        if (confirm(`Really delete ${name}?`)) //TODO: Modal or smth
                            ipcRenderer.send("delete pack", name);
                    }
                }
            ]).popup({
                x: event.x,
                y: event.y
            });
        }

        public setGCMode(value: string) {
            this.gcMode = value;
            ipcRenderer.send("set gc mode", value);
        }
    }
</script>

<style lang="scss">

    html, body, #app {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
    }

    h1, h2, h3, h4, h5 {
        margin: 0;
    }

    * {
        box-sizing: border-box;
    }

    html {
        background: url(./resources/backgrounds/4.jpg) no-repeat fixed;
        background-size: cover;
    }

    #app {
        font-family: Roboto, Arial, sans-serif;
        background: radial-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.9) 90%) no-repeat fixed;
        background-size: cover;
        color: white;
        width: 100%;
        height: 100%;
        position: absolute;
        user-select: none;
    }

    ::-webkit-scrollbar {
        background-color: transparent;
    }

    ::-webkit-scrollbar-thumb {
        background: rgba(150, 150, 150, 0.3);
        cursor: default;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: rgba(200, 200, 200, 0.3);
    }

    ::-webkit-scrollbar-button {
        display: none;
    }

    ::-webkit-scrollbar-corner {
        height: 0;
    }

    button {
        padding: 1rem;
        background: none;
        color: white;
        font-family: inherit;
        border: 1px solid #222;
        font-size: 1rem;
        outline: none;

        &:not([disabled]):hover, &.active {
            background: rgba(255, 255, 255, 0.1);
        }

        &:not([disabled]):active {
            background: rgba(200, 200, 200, 0.1);
        }
    }

    input, textarea {
        background: #222;
        border-radius: 2px;
        border: 1px solid #222;
        outline: none;
        padding: 0.5rem 1rem;
        display: block;
        color: white;
        font-family: inherit;
        margin: 1rem 0;
        resize: none;
        width: 100%;
        transition: background-color 0.2s, border-color 0.2s;

        &:focus {
            background-color: #333;
            border-color: #333;
        }
    }

    #subnav {
        //margin-top: 6rem;
        height: calc(100% - 6rem);
        overflow-y: auto;
        overflow-x: hidden;

        #packs {
            padding: 3rem 2rem;
            display: flex;
            flex-flow: row wrap;
            justify-content: space-evenly;
        }

        #settings {
            padding: 3rem 2rem;

            .button-wrapper {
                display: flex;
                flex-flow: row wrap;

                #g1-gc {
                    margin-left: 0;
                    border-left: 0;
                }

                #cms-gc {
                    margin-right: 0;
                    border-right: none;
                }
            }
        }

        .pack {
            flex-basis: 360px;
            margin: 1rem 1.5%;
            height: 225px;
            //cursor: pointer;
            background: transparent;
            position: relative;
            transition: background 0.25s;
            border-radius: 0.5rem;
            overflow: hidden;

            .pack-icon {
                width: 80%;
                height: 112px;
                position: absolute;
                left: 10%;
                top: 61px;
                overflow: hidden;
                white-space: nowrap;
                text-align: center;

                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }

            .pack-shade {
                width: 100%;
                height: 100%;
                background: transparent;
                transition: background 0.25s;
                position: absolute;
                top: 0;
                left: 0;
                border-radius: 1rem;
            }

            .pack-installation {
                background: rgba(0, 0, 0, 0.5);
                position: absolute;
                right: 0;
                top: 0;
                width: 100%;
                height: 40%;
                transition: height 0.25s;
                border-radius: 8px;
            }

            .pack-title {
                color: white;
                opacity: 0;
                transition: opacity 0.5s;
                position: absolute;
                left: 0;
                bottom: 0;
                width: 100%;
                text-align: left;
                font-size: 24px;
                padding: 0.4rem 1rem;
            }

            .pack-running-shade {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(6px);
                color: white;
                font-size: 2rem;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            &:not(.running) {
                &:hover {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(6px);
                }

                &:hover .pack-title {
                    opacity: 1;
                }
            }
        }
    }

    .modal-cover {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.66);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;

        .modal {
            padding: 3rem 3rem 2rem;
            width: 40%;
            background: #111;
            border-radius: 8px;
            position: relative;

            .modal-top {
                width: 100%;
                border-bottom: 1px solid #222;
                display: flex;

                .modal-title {
                    flex-grow: 1;
                    display: inline-block;
                }

                .modal-dismiss {
                    color: #888;
                    top: 1.33rem;
                    right: 1.5rem;
                    position: absolute;

                    &:hover {
                        color: #ccc;
                    }
                }
            }
        }
    }

    #sign-in-button {
        &:hover {
            background: rgba(100, 255, 100, 0.1);
        }

        &:active {
            background: rgba(0, 255, 0, 0.1);
        }
    }

    #sign-in-cancel {
        &:hover {
            background: rgba(255, 100, 100, 0.1);
        }

        &:active {
            background: rgba(255, 50, 50, 0.1);
        }
    }
</style>
