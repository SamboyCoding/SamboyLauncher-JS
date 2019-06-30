<template>
    <div id="create">
        <div id="created-packs">
            <div @click="createPack()" class="pack" id="create-pack">
                <div class="pack-icon">
                    +
                </div>
                <div class="pack-shade"></div>
                <div class="pack-title">Create a Pack</div>
            </div>
            <div class="pack" v-for="(percent, name) in installingPacks">
                <div class="pack-icon">
                    {{name}}
                </div>
                <div class="pack-shade"></div>
                <div :style="{height: ((1 - percent) * 225) + 'px'}" class="pack-installation"></div>
                <div class="pack-title">Creating "{{name}}" ({{percent * 100}}%)</div>
            </div>
        </div>
        <div id="edit-pack" :class="{show: !!editingPack}">
            <input id="edit-pack-name" v-model="editingPack.name" v-if="editingPack">
            <textarea id="edit-pack-desc" v-model="editingPack.description" v-if="editingPack"></textarea>

            <br>

            <label for="edit-pack-mc-ver" v-if="editingPack">Game Version:</label>
            <select @change="updateForgeVer()" id="edit-pack-mc-ver" v-if="editingPack" v-model="mcVers">
                <option v-for="ver in mcVersions">{{ver}}</option>
            </select>

            <br><br>

            <label for="edit-pack-forge-ver" v-if="editingPack">Forge Version:</label>
            <select id="edit-pack-forge-ver" v-if="editingPack && editingPack.mcVersion" v-model="fmlVers">
                <option v-for="ver in forgeVersions[editingPack.mcVersion]">{{ver}}</option>
            </select>

            <button @click="editingPack = null" id="cancel-edit-pack" v-if="editingPack">Cancel</button>
            <button @click="savePack()" id="finish-edit-pack" v-if="editingPack">
                <span v-if="editingPack.needsInstall">Create & Install</span>
                <span v-else>Save</span>
            </button>
        </div>
    </div>
</template>

<script lang="ts">
    import {ipcRenderer} from "electron";
    import {Component, Vue} from "vue-property-decorator";
    import Config from "../Config";
    import parser = require("fast-xml-parser");

    @Component({
        components: {},
    })
    export default class CreateMenu extends Vue {
        public mcVersions = ["Loading version listing..."];
        public forgeVersions = {};

        public newPack = {
            uploaded: false,
            name: "[Enter Pack Name]",
            description: "[Enter Pack Description]",
            mcVersion: "",
            fmlVersion: "",
            needsInstall: true,
            amAuthor: true,
        };

        public async mounted() {
            let array = await (await fetch(Config.API_URL + "/pack/versions")).json();
            this.mcVersions = array;
            this.newPack.mcVersion = array[array.length - 1];

            let xml = await (await fetch("http://files.minecraftforge.net/maven/net/minecraftforge/forge/maven-metadata.xml")).text();
            let json = parser.parse(xml);

            let versions = json.metadata.versioning.versions.version;

            for (let version of this.mcVersions) {
                this.forgeVersions[version] = versions.filter(ver => ver.startsWith(version));
            }

            let vers = this.forgeVersions[this.newPack.mcVersion];
            this.newPack.fmlVersion = vers[vers.length - 1];
            console.log("Forge versions", this.forgeVersions);

            ipcRenderer.on("install error", (event, packName, error) => {
                alert(`Pack ${packName} cannot be installed due to an error: ${error}`);
                this.$store.commit("cancelInstall", packName);
            });

            ipcRenderer.on("install progress", (event, packName, progress) => {
                progress = Math.round(progress * 1000) / 1000;
                this.$store.commit("setInstallProgress", {name: packName, value: progress});
                this.$forceUpdate();
            });
        }

        public updateForgeVer() {
            let vers = this.forgeVersions[this.editingPack.mcVersion];
            this.fmlVers = vers[vers.length - 1];
        }

        get editingPack() {
            return this.$store.state.editingPack;
        }

        set editingPack(val) {
            this.$store.commit("setEditingPack", JSON.parse(JSON.stringify(val)));
        }

        get mcVers() {
            return this.$store.state.mcVersion;
        }

        set mcVers(val) {
            this.$store.commit("setMCVers", val);
        }

        get fmlVers() {
            console.log(this);
            return this.$store.state.fmlVersion;
        }

        set fmlVers(val) {
            this.$store.commit("setForgeVers", val);
        }

        get installingPacks() {
            return this.$store.state.installingPacks;
        }

        public savePack() {
            if (/[^\w\d\s]/g.test(this.editingPack.name)) {
                alert("Pack name must be alphanumeric (spaces are allowed too)");
                return;
            }

            let pack = this.editingPack;
            pack.installProgress = 0;

            this.$store.commit("queuePackInstall", pack.name);
            ipcRenderer.send("install pack client", pack.name, pack.mcVersion, pack.fmlVersion);
            this.editingPack = null;
        }

        public createPack() {
            let pack = {};
            Object.assign(pack, this.newPack);
            this.editingPack = pack;
        }
    }
</script>

<style scoped lang="scss">
    #create {
        display: flex;
        height: 100%;

        #created-packs {
            display: flex;
            flex-flow: row wrap;
            justify-content: space-evenly;
            padding: 3rem 2rem;
            flex-grow: 2;
            transition: flex-grow 0.5s;
        }

        #edit-pack {
            flex-grow: 0;
            flex-basis: 0;
            transition: flex-grow 0.5s;
            overflow: hidden;
            height: 100%;
            border-left: 1px solid #222;
            position: relative;

            &.show {
                flex-grow: 1;
                padding: 3rem 2rem;
            }

            input, textarea {
                background: none;
                border: none;
                outline: none;
                border-bottom: 1px solid #222;
                padding: 1rem 1rem .4rem 0;
                display: block;
                color: inherit;
                font-family: inherit;
                resize: none;
            }

            #edit-pack-name {
                font-size: 2rem;
                width: 500px;
            }

            #edit-pack-desc {
                width: 500px;
            }

            select {
                background: #222;
                color: #fff;
                border: none;
                outline: none;
            }

            option {
                border: none;
            }

            #cancel-edit-pack, #finish-edit-pack {
                position: absolute;
                bottom: 1rem;
                width: calc(50% - 1rem);
                padding: 1rem;
                background: none;
                color: white;
                font-family: inherit;
                border: 1px solid #222;
                font-size: 1rem;
                outline: none;
            }

            #cancel-edit-pack {
                left: 1rem;
                border-radius: 4px 0 0 4px;

                &:hover {
                    background: rgba(255, 100, 100, 0.1);
                }

                &:active {
                    background: rgba(255, 50, 50, 0.1);
                }
            }

            #finish-edit-pack {
                right: 1rem;
                border-radius: 0 4px 4px 0;
                border-left: none;

                &:hover {
                    background: rgba(100, 255, 100, 0.1);
                }

                &:active {
                    background: rgba(0, 255, 0, 0.1);
                }
            }
        }

        .pack-icon {
            text-align: center;
            font-size: 6rem;
            display: flex;
            flex-flow: column nowrap;
            justify-content: center;
        }
    }
</style>
