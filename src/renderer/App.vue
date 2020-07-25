<template>
    <div id="root" :class="{'dark-theme': this.$store.state.darkMode}">

        <div id="bg-1" :style="{'background-image': `url(${bg1Url})`}" :class="{shown: showBg1}"></div>
        <div id="bg-2"  :style="{'background-image': `url(${bg2Url})`}" :class="{shown: showBg2}"></div>
        <div id="app" class="flex flex-vertical">
            <top-bar></top-bar>
            <component class="flex flex-grow" :is="tabName"></component>
            <bottom-navigation-bar></bottom-navigation-bar>
        </div>
    </div>
</template>

<script lang='ts'>
    import {Component, Vue, Watch} from "vue-property-decorator";
    import InstalledPackJSON from "../main/model/InstalledPackJSON";
    import RendererBoundVersionListing from "../main/model/RendererBoundVersionListing";
    import BottomNavigationBar from "./components/BottomNavigationBar.vue";
    import LaunchControls from "./components/LaunchControls.vue";
    import PackSelect from "./components/PackSelect.vue";
    import TabBuildModpacks from "./components/TabBuildModpacks.vue";
    import TabDownloads from "./components/TabDownloads.vue";
    import TabPlayModded from "./components/TabPlayModded.vue";
    import TabPlayVanilla from "./components/TabPlayVanilla.vue";
    import TabSettings from "./components/TabSettings.vue";
    import TopBar from "./components/TopBar.vue";
    import Config from "./Config";
    import MainProcessActions from "./MainProcessActions";

    @Component({
        components: {
            BottomNavigationBar,
            LaunchControls,
            PackSelect,
            TopBar,
            TabPlayModded,
            TabPlayVanilla,
            TabBuildModpacks,
            TabDownloads,
            TabSettings,
        },
    })
    export default class App extends Vue {
        public static instance: App;

        private testPacks: InstalledPackJSON[] = [
            {
                packName: "1.15Test",
                gameVersion: "1.15.2",
                forgeVersion: "1.15.2-31.1.27",
                installedMods: [
                    {"fileId": 2866141, "addonId": 238222},
                    {"fileId": 2894436, "addonId": 32274},
                    {"fileId": 2849221, "addonId": 60089},
                    {"fileId": 2887674, "addonId": 223852}
                ],
                installedVersion: "1.0",
                description: "[Enter Pack Description]",
                id: "",
                author: {"uuid": "", "name": "Me"},
            }
        ];

        public bg1Url: string = "";
        public bg2Url: string = "";

        public showBg1: boolean = true;
        public showBg2: boolean = false;

        public setBackground(target: string) {
            if(!this.$store.state.backgroundUrls.hasOwnProperty(target)) return;

            if(this.showBg1) {
                this.bg2Url = this.$store.state.backgroundUrls[target];
                this.showBg2 = true;
                this.showBg1 = false;
            } else {
                this.bg1Url = this.$store.state.backgroundUrls[target];
                this.showBg1 = true;
                this.showBg2 = false;
            }
        }

        constructor() {
            super();
            App.instance = this;
        }

        public async mounted() {
            MainProcessActions.logMessage("[App.vue] Mounted.");
            MainProcessActions.notifyLoaded();

            this.$store.commit("setPackNames", this.testPacks);

            MainProcessActions.onPackList = (packs: InstalledPackJSON[]) => {
                MainProcessActions.logMessage("[App.vue] Received pack list over ipc.");
                //TODO Re-enable
                // this.$store.commit("setPackNames", packs);
            };

            MainProcessActions.onMcVersionList = (versions: RendererBoundVersionListing) => {
                MainProcessActions.logMessage(`[App.vue] Received installable mc versions.`);
                this.$store.commit("setMCVersions", versions);
            };

            console.info("[App] SBL Renderer: Main App Mounted.");
            console.info(`[App] Using API URL ${Config.API_URL}`);
        }

        @Watch("$store.state.backgroundUrls")
        public onBGUrlsLoad() {
            this.bg1Url = this.$store.state.backgroundUrls[this.$store.state.darkMode ? "dark_modded" : "light_modded"];
        }

        @Watch("$store.state.darkMode")
        public saveDarkMode(value: boolean) {
            localStorage.setItem("darkMode", value ? "1" : "0");
        }

        public get tabName() {
            return "tab-" + this.$store.state.selectedTab;
        }
    }
</script>

<style lang="scss">
    @import "scss/GlobalStyles";


    html, body, #app, #root {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background-size: cover !important;
    }

    #bg-1, #bg-2 {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        z-index: -10;
        background: transparent no-repeat fixed;
        transition: opacity 0.5s;
        opacity: 0;
        background-size: cover;

        &.shown {
            opacity: 1;
        }
    }

    //Dark theme
    #root.dark-theme {
        background: transparent;
        --highlight-color: #3e3e3e;
        --muted-highlight: #1e1e1e;
        --transparant-highlight: rgba(50, 50, 50, 0.75);
        --install-highlight: rgba(75, 75, 75, 0.75);

        #app {
            background: radial-gradient(rgba(0, 0, 0, 0.89), rgba(0, 0, 0, 0.99) 90%) no-repeat fixed;
            color: white;
        }
    }

    //Light theme
    #root:not(.dark-theme) {
        /*background: url("resources/backgrounds/bg_light_mode_play.jpg") no-repeat fixed;*/
        background: transparent;
        --highlight-color: #ddd;
        --muted-highlight: #cacaca;
        --transparant-highlight: rgba(220, 220, 220, 0.4);
        --install-highlight: rgba(150, 150, 150, 0.4);

        #app {
            background: radial-gradient(rgba(200, 200, 200, 0.75), rgba(200, 200, 200, 0.85) 90%) no-repeat fixed;
        }
    }

    h1, h2, h3, h4, h5 {
        margin: 0;
    }

    * {
        box-sizing: border-box;
    }

    #app {
        font-family: Roboto, Arial, sans-serif;
        width: 100%;
        height: 100%;
        position: absolute;
        user-select: none;
        transition: background-color 1s;
    }
</style>
