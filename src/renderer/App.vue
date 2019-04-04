<template>
    <div id="app">
        <div id="top-bar">
            <h3>SamboyLauncher</h3>

            <div id="window-controls">
                <i class="material-icons" @click="doMinimize()">minimize</i>
                <i class="material-icons" @click="doMaximize()">crop_din</i>
                <i class="material-icons" @click="doClose()">close</i>
            </div>
        </div>
    </div>
</template>

<script lang='ts'>
    import {Component, Vue} from "vue-property-decorator";
    import {ipcRenderer} from "electron";

    // noinspection JSUnusedGlobalSymbols
    @Component({
        components: {},
    })
    export default class App extends Vue {
        public background: string = "";

        public mounted() {
            ipcRenderer.on("backgrounds", (event, files) => {
                let file = files[Math.floor(Math.random() * files.length)];
                this.background = "./resources/backgrounds/" + file;
            });

            ipcRenderer.send("get backgrounds");
        }

        public doMinimize() {
            ipcRenderer.send("minimize");
        }

        public doMaximize() {
            ipcRenderer.send("maximize");
        }

        public doClose() {
            window.close();
        }
    }
</script>

<style lang="scss">
    @import url('https://fonts.googleapis.com/css?family=Roboto:400,700');
    @import url('https://fonts.googleapis.com/css?family=Material+Icons');

    html, body, #app {
        width: 100%;
        height: 100%;
        margin: 0;
    }

    h1,h2,h3,h4,h5 {
        margin: 0;
    }

    * {
        box-sizing: border-box;
    }

    html {
        background: url(./resources/backgrounds/4.jpg);
        background-size: cover;
    }

    #app {
        font-family: Roboto, Arial, sans-serif;
        background: radial-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.9) 90%);
        color: white;
        width: 100%;
        height: 100%;
        position: absolute;
        user-select: none;
    }

    #top-bar {
        -webkit-app-region: drag;
        padding: 2rem 0 1.5rem;
        margin: 0 2rem;
        border-bottom: 1px solid #222;
        display: flex;

        #window-controls {
            margin-left: auto;
            -webkit-app-region: none;

            i {
                color: #aaa;
                transition: color 0.5s;

                &:hover {
                    color: #fff;
                }
            }
        }
    }
</style>
