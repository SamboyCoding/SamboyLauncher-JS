<template>
    <div id="create">
        <!--Pack list-->
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
        <!--Pack edit sidebar-->
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
        <!--Mod listing-->
        <div :class="{show: $store.state.editMods}" id="edit-mods">
            <div v-if="$store.state.editMods">
                <button @click="endEditMods()">Return to Edit Menu</button>
                <button @click="refreshModList()">Refresh Mods</button>

                <div id="mod-listing">
                    <span v-if="refreshingModList" id="mod-list-loading">Loading...</span>
                    <div class="mod" v-else v-for="(mod, idx) in mods">
                        <img :src="mod.thumbnail" class="mod-thumbnail">
                        <div class="title-bit">
                            <h1 class="mod-name">{{mod.name}}</h1>
                            <br>
                            <span class="mod-author">{{mod.author ? mod.author : mod.authorList[0].username}}</span>
                        </div>
                        <p class="mod-desc" v-if="mod.desc">{{mod.desc}}</p>
                        <button :disabled="mod.loading" @click="loadModData(idx)" class="install-mod" v-if="!mod.versions">
                            <span v-if="!mod.loading">Install</span>
                            <span v-else>Loading...</span>
                        </button>
                        <br v-else>
                        <button @click="installMod(mod, 'RELEASE')" class="install-mod-release" v-if="mod.versions && Object.values(mod.versions).find(ver => ver.type === 'RELEASE' && ver.gameVersion === editingPack.gameVersion)">
                            Latest Release
                        </button>
                        <button @click="installMod(mod, 'BETA')" class="install-mod-beta" v-if="mod.versions && Object.values(mod.versions).find(ver => ver.type === 'BETA' && ver.gameVersion === editingPack.gameVersion)">
                            Latest Beta
                        </button>
                        <button @click="installMod(mod, 'ALPHA')" class="install-mod-alpha" v-if="mod.versions && Object.values(mod.versions).find(ver => ver.type === 'ALPHA' && ver.gameVersion === editingPack.gameVersion)">
                            Latest Alpha
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <!--Modal-->
        <div class="modal-cover" v-if="showModal">
            <div class="modal">
                <div class="modal-top">
                    <h1 class="modal-title">{{modalTitle}}</h1>
                    <a @click="showModal = false" class="modal-dismiss"><i class="fas fa-times"></i></a>
                </div>
                <p>{{modalBody}}</p>
                <div id="mod-deps-list" v-if="modsToAdd.length">
                    <div id="mod-deps-names-column">
                        <span v-for="mod in modsToAdd">
                            <span v-if="mod.name">{{mod.name}}</span>
                            <span v-else>Loading... ({{mod.slug}})</span>
                        </span>
                    </div>
                    <div id="mod-deps-selects-column">
                        <select :disabled="!mod.name" @change="updateDepsFromSelected(mod)" v-for="mod in modsToAdd" v-model="mod.selected">
                            <option v-if="!mod.name" value="-1">Loading...</option>
                            <option v-else value="-1">Please select...</option>
                            <option :value="ver.id" v-for="ver in mod.versions">{{ver.name}}</option>
                        </select>
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
    import ModJar from "../../main/model/ModJar";
    import Config from "../Config";
    import ModDetails from "../model/ModDetails";
    import ModListItem from "../model/ModListItem";
    import parser = require("fast-xml-parser");

    @Component({
        components: {},
    })
    export default class CreateMenu extends Vue {
        public mcVersions = ["Loading version listing..."];
        public forgeVersions = {};
        public mods: (ModListItem | ModDetails)[] = [];

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

        public showModal = false;
        public modalTitle = "You shouldn't be seeing this";
        public modalBody = "No, really, you shouldn't be seeing this.";

        public modsToAdd: { slug: string, name: string, versions: { id: number, name: string, gv: string }[], selected: number }[] = [];

        public async mounted() {
            console.info("[Create] Fetching acceptable pack versions for pack creation...");
            let array = await (await fetch(Config.API_URL + "/pack/versions")).json();
            this.mcVersions = array;
            this.newPack.gameVersion = array[array.length - 1];

            console.info("[Create] Fetching forge release info...");
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

            console.info("[Create] Initializing IPC...");

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

            if (this.$store.state.editMods)
                this.refreshModList();
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
            console.info(`[Create] Loading popular mod list for version ${this.editingPack.gameVersion}`);
            this.refreshingModList = true;
            this.mods = await (await fetch(`${Config.API_URL}/mod/popular/${this.editingPack.gameVersion}`)).json();
            this.refreshingModList = false;
        }

        public async loadModData(idx: number) {
            let mod = this.mods[idx] as ModListItem;
            console.info(`[Create] Getting ModDetails from ModListItem for ${mod.name}`);
            mod.loading = true;
            this.mods.splice(idx, 1, mod);

            this.mods.splice(idx, 1, await (await fetch(`${Config.API_URL}/mod/${this.mods[idx].slug}`)).json());
        }

        public async installMod(mod: ModDetails, type: "RELEASE" | "BETA" | "ALPHA") {
            console.info(`[Create] Adding ${mod.name} to the pack at version ${type}`);
            //Reverse the list, as the first values are the oldest, and we want the newest.
            let version = Object.values(mod.versions).reverse().find(ver => ver.gameVersion === this.editingPack.gameVersion && ver.type === type);
            if (!version) return;

            let idx = Object.values(mod.versions).indexOf(version);

            let versionId = Number(Object.keys(mod.versions)[idx]);

            console.info(`[Create] Requested version id: ${versionId}. Loading details...`);

            let desiredVersion = <ModJar> await (await fetch(`${Config.API_URL}/mod/${mod.slug}/${versionId}`)).json();

            console.info(`[Create] Mod has ${desiredVersion.dependencies.length} dep/s`);

            let deps = desiredVersion.dependencies.filter(depSlug => !this.editingPack.installedMods.find(mod => mod.slug === depSlug));

            console.info(`[Create] Of which ${deps.length} aren't installed yet.`);

            this.modsToAdd = [];

            //Add the mod itself
            this.modsToAdd.push({
                slug: mod.slug,
                name: mod.name,
                versions: this.mapServerVersionsResponseToModalForm(mod.versions).filter(v => v.gv === this.editingPack.gameVersion),
                selected: versionId
            });

            if (deps.length) {
                this.modalBody = `The mod "${mod.name}" has dependencies that must be installed for it to work, and at least one of these you do not currently have. Please select versions to install:`;
                this.modalTitle = "Mod Dependencies";
                this.showModal = true;

                deps.forEach(async dep => {
                    let idx = this.modsToAdd.push({
                        selected: -1,
                        name: "",
                        versions: [],
                        slug: dep,
                    }) - 1;

                    let info: ModDetails = await (await fetch(`${Config.API_URL}/mod/${dep}`)).json();
                    let mod = this.modsToAdd[idx];
                    mod.versions = this.mapServerVersionsResponseToModalForm(info.versions).filter(v => v.gv === this.editingPack.gameVersion);
                    mod.name = info.name;
                    mod.selected = -1;

                    this.modsToAdd.splice(idx, 1, mod);
                });
            } else {
                //Install
            }
        }

        public updateDepsFromSelected(mod: { slug: string, name: string, versions: { id: number, name: string, gv: string }[], selected: number }) {
            let selected = mod.versions.find(ver => ver.id === mod.selected);
        }

        private mapServerVersionsResponseToModalForm(versions: { [id: number]: { name: string, gameVersion: string, type: string, } }) {
            let ret: { id: number, name: string, gv: string }[] = [];
            for (let id in versions) {
                ret.push({id: Number(id), name: versions[id].name, gv: versions[id].gameVersion});
            }

            return ret;
        }
    }
</script>

<style scoped lang="scss">
    #create {
        display: flex;
        height: 100%;
        overflow: hidden;
        position: relative;

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
                margin-top: 1rem;

                #mod-list-loading {
                    display: block;
                    width: 100%;
                    text-align: center;
                }

                .mod {
                    padding: 1rem;
                    display: inline-block;
                    flex-basis: 50%;
                    border: 1px solid #222;
                    border-radius: 8px;
                    //margin: 1rem;
                    background: rgba(0, 0, 0, 0.1);

                    position: relative;

                    &:not(:last-of-type):not(:nth-last-of-type(2)) {
                        border-bottom-left-radius: 0;
                        border-bottom-right-radius: 0;
                        border-bottom: none;
                        margin-bottom: 0;
                    }

                    &:nth-of-type(even) {
                        border-left: none;
                    }

                    &:last-of-type {
                        border-bottom-left-radius: 0;
                    }

                    &:nth-last-of-type(2) {
                        border-bottom-right-radius: 0;
                    }

                    &:not(:first-of-type) {
                        margin-top: 0;
                        border-top-left-radius: 0;
                        border-top-right-radius: 0;
                    }

                    &:first-of-type {
                        border-top-right-radius: 0;
                    }

                    &:nth-of-type(2) {
                        border-top-left-radius: 0;
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

                    .mod-desc {
                        margin-right: 3rem;
                    }

                    .install-mod {
                        position: absolute;
                        right: 1rem;
                        bottom: 1rem;

                        border-color: rgb(50, 60, 50);
                    }

                    .install-mod-release:not(:first-of-type), .install-mod-beta:not(:first-of-type) {
                        border-left: none;
                    }

                    .install-mod-release, .install-mod-beta, .install-mod-alpha {
                        float: right;
                    }

                    /*&:hover {*/
                    /*    background: rgba(255, 255, 255, 0.1);*/
                    /*}*/

                    /*&:active {*/
                    /*    background: rgba(200, 200, 200, 0.1);*/
                    /*}*/
                }
            }
        }

        #mod-deps-list {
            display: flex;
            flex-direction: row;

            #mod-deps-names-column, #mod-deps-selects-column {
                flex-grow: 1;
                display: flex;
                flex-flow: column nowrap;

                & > span, & > select {
                    margin: 8px;
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

            &:not([disabled]):hover {
                background: rgba(255, 255, 255, 0.1);
            }

            &:not([disabled]):active {
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
