<template>
    <div id="root" :class="{'dark-theme': $store.state.darkMode}">
        <div id="app">
            <top-bar></top-bar>
            <div class="flex fill-height">
                <!--Main content wrapper-->
                <pack-select class="flex-grow" :packs="packs"></pack-select>
                <launch-controls class="flex-double-weight" :packs="packs"></launch-controls>
            </div>
        </div>
    </div>
</template>

<script lang='ts'>
    import {Component, Vue, Watch} from "vue-property-decorator";
    import LaunchControls from "./components/LaunchControls.vue";
    import PackSelect from "./components/PackSelect.vue";
    import TopBar from "./components/TopBar.vue";
    import Config from "./Config";
    import MainProcessActions from "./MainProcessActions";

    @Component({
        components: {
            LaunchControls,
            PackSelect,
            TopBar
        },
    })
    export default class App extends Vue {
        public mounted() {
            MainProcessActions.logMessage("[App.vue] Mounted.");

            MainProcessActions.onPackList = (packs) => {
                MainProcessActions.logMessage("[App.vue] Received pack list over ipc.");
                this.$store.commit("setPackNames", packs);
            };

            MainProcessActions.onMcVersionList = (versions) => {
                MainProcessActions.logMessage(`[App.vue] Received ${versions.length} installable mc versions`);
            }

            console.info("[App] SBL Renderer: Main App Mounted.");
            console.info(`[App] Using API URL ${Config.API_URL}`);
        }

        public get packs() {
            return this.$store.state.packNames;
        }

        @Watch("$store.state.darkMode")
        public saveDarkMode(value: boolean) {
            localStorage.setItem("darkMode", value ? "1" : "0");
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

        #app {
            background: radial-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.9) 90%) no-repeat fixed;
            color: white;
        }
    }

    //Light theme
    #root:not(.dark-theme) {
        background: url("resources/backgrounds/bg_light_mode_play.jpg") no-repeat fixed;
        --highlight-color: #ddd;
        /*--highlight-color: transparent;*/
        --muted-highlight: #cacaca;
        /*--muted-highlight: transparent;*/
        --transparant-highlight: rgba(220, 220, 220, 0.4);

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
