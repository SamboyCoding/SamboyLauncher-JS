<template>
    <div id="root" :class="{'dark-theme': $store.state.darkMode}">
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
    import BottomNavigationBar from "./components/BottomNavigationBar.vue";
    import LaunchControls from "./components/LaunchControls.vue";
    import PackSelect from "./components/PackSelect.vue";
    import TabBuildModpacks from "./components/TabBuildModpacks.vue";
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
            TabSettings,
        },
    })
    export default class App extends Vue {
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
            },
            {
                packName: "InstallationTest",
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
                installationProgress: 0.5,
            }
        ];
        public mounted() {
            MainProcessActions.logMessage("[App.vue] Mounted.");

            this.$store.commit("setPackNames", this.testPacks);

            MainProcessActions.onPackList = (packs) => {
                MainProcessActions.logMessage("[App.vue] Received pack list over ipc.");
                //TODO Re-enable
                // this.$store.commit("setPackNames", packs);
            };

            MainProcessActions.onMcVersionList = (versions) => {
                MainProcessActions.logMessage(`[App.vue] Received ${versions.length} installable mc versions`);
            };

            console.info("[App] SBL Renderer: Main App Mounted.");
            console.info(`[App] Using API URL ${Config.API_URL}`);
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

    //Dark theme
    #root.dark-theme {
        background: url("resources/backgrounds/bg_dark_mode_play.png") no-repeat fixed;
        --highlight-color: #3e3e3e;
        --muted-highlight: #1e1e1e;
        --transparant-highlight: rgba(50, 50, 50, 0.75);
        --install-highlight: rgba(75, 75, 75, 0.75);

        #app {
            background: radial-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.9) 90%) no-repeat fixed;
            color: white;
        }
    }

    //Light theme
    #root:not(.dark-theme) {
        background: url("resources/backgrounds/bg_light_mode_play.jpg") no-repeat fixed;
        --highlight-color: #ddd;
        --muted-highlight: #cacaca;
        --transparant-highlight: rgba(220, 220, 220, 0.4);
        --install-highlight: rgba(150, 150, 150, 0.4);

        #app {
            background: radial-gradient(rgba(200, 200, 200, 0.75), rgba(200, 200, 200, 0.9) 90%) no-repeat fixed;
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
