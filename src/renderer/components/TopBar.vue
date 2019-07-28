<template>
    <div id="top-bar">
        <h3 @click="page = Page.MAIN_MENU">SamboyLauncher 2.0 (PRE-RELEASE)</h3>

        <div id="window-controls">
            <i @click="showLogin()" class="material-icons" id="profile-button">account_circle</i>
            <i @click="page = Page.SETTINGS" class="material-icons" id="settings-button">settings</i>
            <i class="material-icons" @click="doMinimize()">minimize</i>
            <i class="material-icons" @click="doMaximize()">crop_din</i>
            <i class="material-icons" @click="doClose()">close</i>
        </div>
    </div>
</template>

<script lang="ts">
    import {ipcRenderer} from "electron";
    import {Component, Vue} from "vue-property-decorator";
    import Page from "../model/Page";

    @Component({
        components: {},
    })
    export default class TopBar extends Vue {
        public Page = Page;

        public doMinimize() {
            ipcRenderer.send("minimize");
        }

        public doMaximize() {
            ipcRenderer.send("maximize");
        }

        public doClose() {
            window.close();
        }

        public showLogin() {
            if (!this.$store.state.username)
                (this.$parent as any).showLogin = true;
        }

        get page() {
            return this.$store.state.currentPage as Page;
        }

        set page(value: Page) {
            this.$store.commit("setCurrentPage", value);
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

        h3 {
            color: #aaa;
            transition: color 0.5s;
            -webkit-app-region: none;

            &:hover {
                color: #fff;
            }
        }

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
                font-size: 32px;
                //margin-right: 3rem;
            }

            #settings-button {
                font-size: 32px;
                margin-right: 3rem;
            }
        }
    }
</style>
