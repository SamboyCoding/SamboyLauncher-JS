<template>
    <div id="top-bar">
        <h3>SamboyLauncher 2.0</h3>

        <div id="window-controls">
            <i class="material-icons" id="profile-button" @click="showProfile()">account_circle</i>
            <i class="material-icons" @click="doMinimize()">minimize</i>
            <i class="material-icons" @click="doMaximize()">crop_din</i>
            <i class="material-icons" @click="doClose()">close</i>
        </div>
    </div>
</template>

<script lang="ts">
    import {ipcRenderer} from "electron";
    import {Component, Vue} from "vue-property-decorator";

    @Component({
        components: {},
    })
    export default class TopBar extends Vue {
        public doMinimize() {
            ipcRenderer.send("minimize");
        }

        public doMaximize() {
            ipcRenderer.send("maximize");
        }

        public doClose() {
            window.close();
        }

        public showProfile() {

        }
    }
</script>

<style scoped lang="scss">
    #top-bar {
        -webkit-app-region: drag;
        padding: 2rem 0 1.5rem;
        margin: 0 2rem;
        border-bottom: 1px solid #222;
        display: flex;
        align-items: center;
        //position: absolute;
        width: calc(100% - 4rem);


        #window-controls {
            margin-left: auto;
            -webkit-app-region: none;
            display: flex;
            align-items: center;
            font-size: 24px;

            i {
                color: #aaa;
                transition: color 0.5s;
                margin-left: 0.5rem;

                &:hover {
                    color: #fff;
                }
            }

            #profile-button {
                font-size: 36px;
                margin-right: 5rem;
            }
        }
    }
</style>
