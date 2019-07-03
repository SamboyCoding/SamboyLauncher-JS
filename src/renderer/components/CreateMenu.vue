<template>
    <div id="create">
        <div :class="{show: !$store.state.editMods}" id="created-packs">
            <div>
                <div @click="createPack()" class="pack" id="create-pack">
                    <div class="pack-icon">
                        +
                    </div>
                    <div class="pack-shade"></div>
                    <div class="pack-title">Create a Pack</div>
                </div>
                <div class="pack installing" v-for="(percent, name) in installingPacks">
                    <div class="pack-icon">
                        {{name}}
                    </div>
                    <div class="pack-shade"></div>
                    <div :style="{height: ((1 - percent) * 225) + 'px'}" class="pack-installation"></div>
                    <div class="pack-title">Creating "{{name}}" ({{percent * 100}}%)</div>
                </div>
                <div @click="doEditPack(packName)" class="pack installed" v-for="packName in $store.state.createdPacks">
                    <div class="pack-icon">
                        {{packName}}
                    </div>
                    <div class="pack-shade"></div>
                    <div class="pack-title">{{packName}}</div>
                </div>
            </div>
        </div>
        <div :class="{show: $store.state.showEditPack}" id="edit-pack">
            <div v-if="$store.state.showEditPack">
                <button @click="launchPack()" id="launch-pack-button" v-if="editingPack && editingPack.installedVersion">
                    Playtest
                </button>

                <input id="edit-pack-name" v-if="editingPack" v-model="editingPack.packName">
                <textarea id="edit-pack-desc" v-if="editingPack" v-model="editingPack.description"></textarea>

                <br>

                <label for="edit-pack-mc-ver" v-if="editingPack">Game Version:</label>
                <select @change="updateForgeVer()" id="edit-pack-mc-ver" v-if="editingPack" v-model="mcVers">
                    <option v-for="ver in mcVersions">{{ver}}</option>
                </select>

                <br><br>

                <label for="edit-pack-forge-ver" v-if="editingPack">Forge Version:</label>
                <select id="edit-pack-forge-ver" v-if="editingPack && editingPack.gameVersion" v-model="fmlVers">
                    <option v-for="ver in forgeVersions[editingPack.gameVersion]">{{ver}}</option>
                </select>

                <br><br>

                <h1>Mods</h1>
                <p v-if="editingPack && editingPack.installedVersion">Pack currently contains
                    {{editingPack.installedMods.length}} mod{{(editingPack.installedMods.length !== 1 ? "s" : "")}}.</p>
                <button @click="editMods()" id="pack-edit-mods" v-if="editingPack && editingPack.installedVersion">Edit
                    Mods
                </button>

                <button @click="editingPack = null; $store.commit('setShowEditPack', false);" id="cancel-edit-pack" v-if="editingPack">
                    Cancel
                </button>
                <button @click="savePack()" id="finish-edit-pack" v-if="editingPack">
                    <span v-if="!editingPack.installedVersion">Create & Install</span>
                    <span v-else>Save</span>
                </button>
            </div>
        </div>
        <div :class="{show: $store.state.editMods}" id="edit-mods">
            <div v-if="$store.state.editMods">
                <button @click="endEditMods()">Return to Edit Menu</button>
                <button @click="refreshModList()">Refresh Mods</button>

                <div id="mod-listing">
                    <span v-if="refreshingModList" id="mod-list-loading">Loading...</span>
                    <div class="mod" v-else v-for="mod in mods">
                        <img :src="mod.thumbnail" class="mod-thumbnail">
                        <div class="title-bit">
                            <h1 class="mod-name">{{mod.name}}</h1>
                            <br>
                            <span class="mod-author">{{mod.author}}</span>
                        </div>
                        <p class="mod-desc">{{mod.desc}}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import {IpcMessageEvent, ipcRenderer} from "electron";
    import {Component, Vue} from "vue-property-decorator";
    import InstalledPackJSON from "../../main/model/InstalledPackJSON";
    import Config from "../Config";
    import parser = require("fast-xml-parser");

    @Component({
        components: {},
    })
    export default class CreateMenu extends Vue {
        public mcVersions = ["Loading version listing..."];
        public forgeVersions = {};
        public mods: { slug: string, thumbnail: string, name: string, author: string, desc: string }[] = [];

        public refreshingModList: boolean = false;

        public newPack: InstalledPackJSON = {
            packName: "[Enter Pack Name]",
            description: "[Enter Pack Description]",
            gameVersion: "",
            forgeVersion: "",
            id: "",
            installedMods: [],
            installedVersion: "",
            author: {
                name: "Me",
                uuid: "",
            }
        };

        public async mounted() {
            let array = await (await fetch(Config.API_URL + "/pack/versions")).json();
            this.mcVersions = array;
            this.newPack.gameVersion = array[array.length - 1];

            let xml = await (await fetch("http://files.minecraftforge.net/maven/net/minecraftforge/forge/maven-metadata.xml")).text();
            let json = parser.parse(xml);

            let versions = json.metadata.versioning.versions.version;

            for (let version of this.mcVersions) {
                this.forgeVersions[version] = versions.filter(ver => ver.startsWith(version));
            }

            let forgeVersions = this.forgeVersions[this.newPack.gameVersion];
            this.newPack.forgeVersion = forgeVersions[forgeVersions.length - 1];
            if (this.editingPack) {
                this.editingPack.forgeVersion = forgeVersions[forgeVersions.length - 1];
                this.$forceUpdate();
            }

            ipcRenderer.removeAllListeners("install error")
                .removeAllListeners("install progress")
                .removeAllListeners("install complete")
                .removeAllListeners("pack created")
                .removeAllListeners("pack create failed");

            ipcRenderer.on("install error", (event, packName, error) => {
                alert(`Pack ${packName} cannot be installed due to an error: ${error}`);
                this.$store.commit("cancelInstall", packName);
            });

            ipcRenderer.on("install progress", (event, packName, progress) => {
                progress = Math.round(progress * 1000) / 1000;
                this.$store.commit("setInstallProgress", {name: packName, value: progress});
                this.$forceUpdate();
            });

            ipcRenderer.on("install complete", (event: IpcMessageEvent, packName: string, gameVersion: string, forgeVersion: string) => {
                this.$store.commit("setInstallProgress", {name: packName, value: 1});

                if (!this.editingPack.installedVersion)
                    event.sender.send("create pack", packName, this.editingPack.description, gameVersion, forgeVersion);
            });

            ipcRenderer.on("pack created", (event: IpcMessageEvent, pack: InstalledPackJSON) => {
                this.$store.commit("cancelInstall", pack.packName);
                this.$store.commit("addCreatedPack", pack.packName);
            });

            ipcRenderer.on("pack create failed", (event, name, error) => {
                alert("Successfully installed the game, but couldn't create the pack due to an error: " + error);
                this.$store.commit("cancelInstall", name);
                this.$forceUpdate();
            });
        }

        public doEditPack(name) {
            ipcRenderer.once("pack json", (event, pack: InstalledPackJSON) => {
                this.editingPack = pack;
                this.$store.commit("setShowEditPack", true);
            });

            ipcRenderer.send("get pack json", name);
        }

        public updateForgeVer() {
            let vers = this.forgeVersions[this.editingPack.gameVersion];
            this.fmlVers = vers[vers.length - 1];
        }

        get editingPack(): InstalledPackJSON {
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
            if (/[^\w\d\s]/g.test(this.editingPack.packName)) {
                alert("Pack name must be alphanumeric (spaces are allowed too)");
                return;
            }

            this.editingPack.packName = this.editingPack.packName.trim();

            if (this.$store.state.createdPacks.find(name => name.toLowerCase() === this.editingPack.packName.toLowerCase()) || this.installingPacks.hasOwnProperty(this.editingPack.packName)) {
                alert("Pack name is taken by one you already own.");
                return;
            }

            let pack = this.editingPack;

            this.$store.commit("removeCreatedPack", pack.packName);
            this.$store.commit("queuePackInstall", pack.packName);
            ipcRenderer.send("install pack client", pack.packName, pack.gameVersion, pack.forgeVersion);

            if (this.editingPack.installedVersion) {
                //TODO: Save/install mods.
            }

            this.$store.commit("setShowEditPack", false);
        }

        public createPack() {
            let pack = {};
            Object.assign(pack, this.newPack);

            this.editingPack = pack as InstalledPackJSON;
            this.$store.commit("setShowEditPack", true);
        }

        public launchPack() {
            ipcRenderer.send("launch pack", this.editingPack.packName);
        }

        public editMods() {
            this.$store.commit("setShowEditPack", false);
            this.$store.commit("setEditMods", true);
            this.refreshModList();
        }

        public endEditMods() {
            this.$store.commit("setEditMods", false);
        }

        public async refreshModList() {
            this.refreshingModList = true;
            this.mods = await (await fetch(`${Config.API_URL}/mod/popular/${this.editingPack.gameVersion}`)).json();
            this.refreshingModList = false;
        }
    }
</script>

<style scoped lang="scss">
    #create {
        display: flex;
        height: 100%;
        overflow: hidden;

        #created-packs {
            transition: flex-grow 0.5s;
            flex-basis: 0;
            flex-grow: 0;

            & > div {
                width: 0;
                display: flex;
                flex-flow: row wrap;
                justify-content: space-evenly;
                overflow: scroll;
                transition: width 0.5s;
            }

            &.show {
                flex-grow: 2;
                padding: 3rem 2rem;
                border-right: 1px solid #222;

                & > div {
                    width: 100%;
                }
            }
        }

        #edit-pack {
            flex-grow: 0;
            flex-basis: 0;
            transition: flex-grow 0.5s;
            overflow: hidden;
            height: 100%;
            position: relative;

            &.show {
                //                border-left:
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
                margin-top: 2rem;
                width: calc(100% - 2rem);
            }

            #edit-pack-desc {
                width: calc(100% - 2rem);
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

            #cancel-edit-pack, #finish-edit-pack, #launch-pack-button {
                position: absolute;
                bottom: 1rem;
                width: calc(50% - 1rem);
            }

            #pack-edit-mods {
                width: 100%;
            }

            #launch-pack-button {
                top: 1rem;
                bottom: auto;
                left: 1rem;
                width: calc(100% - 2rem);

                &:hover {
                    background: rgba(100, 255, 100, 0.1);
                }

                &:active {
                    background: rgba(0, 255, 0, 0.1);
                }
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

        #edit-mods {
            flex-grow: 0;
            flex-basis: 0;
            transition: flex-grow 0.5s;
            overflow: hidden;
            height: 100%;
            border-left: 1px solid #222;
            position: relative;
            max-height: 100%;

            & > div {
                max-height: 100%;
                overflow: scroll;
            }

            &.show {
                flex-grow: 1;
                padding: 3rem 2rem 0;
            }

            #mod-listing {
                display: flex;
                position: relative;
                flex-flow: row wrap;
                overflow-y: scroll;
                max-height: 100%;

                #mod-list-loading {
                    display: block;
                    width: 100%;
                    text-align: center;
                }

                .mod {
                    padding: 1rem;
                    flex-basis: 100%;
                    border: 1px solid #222;
                    border-radius: 8px;
                    margin: 1rem;
                    position: relative;

                    &:not(:last-of-type) {
                        border-bottom-left-radius: 0;
                        border-bottom-right-radius: 0;
                        border-bottom: none;
                        margin-bottom: 0;
                    }

                    &:not(:first-of-type) {
                        margin-top: 0;
                        border-top-left-radius: 0;
                        border-top-right-radius: 0;
                    }

                    .title-bit {
                        display: inline-block;
                        transform: translateY(-10px);
                        margin-left: 10px;

                        .mod-name {
                            margin: 0;
                            font-size: 2rem;
                            font-weight: bold;
                            left: 80px;
                            top: 1rem;
                            display: inline-block;
                        }
                    }

                    .mod-thumbnail {
                        width: 64px;
                        height: 64px;
                    }

                    &:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }

                    &:active {
                        background: rgba(200, 200, 200, 0.1);
                    }
                }
            }
        }

        button {
            padding: 1rem;
            background: none;
            color: white;
            font-family: inherit;
            border: 1px solid #222;
            font-size: 1rem;
            outline: none;

            &:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            &:active {
                background: rgba(200, 200, 200, 0.1);
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
