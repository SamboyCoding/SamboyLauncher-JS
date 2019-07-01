<template>
    <div id="app">
        <top-bar></top-bar>

        <div id="subnav">
            <main-menu v-if="page === Page.MAIN_MENU"></main-menu>
            <div id="play" v-else-if="page === Page.PLAY">
                <div id="packs">
                    <div class="pack" v-for="i in 32">
                        <div class="pack-icon" style="background-image: url(./resources/default_pack_icon.png);"></div>
                        <div class="pack-shade"></div>
                        <div class="pack-title">Pack {{i}}</div>
                    </div>
                </div>
            </div>
            <div id="discover" v-else-if="page === Page.DISCOVER">

            </div>
            <create-menu  v-else-if="page === Page.CREATE"></create-menu>
        </div>
    </div>
</template>

<script lang='ts'>
    import {ipcRenderer} from "electron";
    import {Component, Vue} from "vue-property-decorator";
    import CreateMenu from "./components/CreateMenu.vue";
    import MainMenu from "./components/MainMenu.vue";
    import TopBar from "./components/TopBar.vue";
    import Page from "./model/Page";

    @Component({
        components: {
            TopBar,
            MainMenu,
            CreateMenu
        },
    })
    export default class App extends Vue {
        public Page = Page; //Expose to the view

        public mounted() {
            ipcRenderer.on("installed packs", (event, packs: string[]) => {
                this.$store.commit("setInstalledPacks", packs);
            });

            ipcRenderer.on("created packs", (event, packs: string[]) => {
                this.$store.commit("setCreatedPacks", packs);
            });

            ipcRenderer.send("get installed packs");
        }

        get page() {
            return this.$store.state.currentPage as Page;
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

            &:hover {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(6px);
            }

            &:hover .pack-title {
                opacity: 1;
            }
        }
    }
</style>
