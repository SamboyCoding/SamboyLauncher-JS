<template>
    <div id="create">
        <div id="created-packs">
            <div class="pack" id="create-pack" @click="editingPack = newPack">
                <div class="pack-icon">
                    +
                </div>
                <div class="pack-shade"></div>
                <div class="pack-title">Create a Pack</div>
            </div>
        </div>
        <div id="edit-pack" :class="{show: !!editingPack}">
            <input id="edit-pack-name" v-model="editingPack.name" v-if="editingPack">
            <textarea id="edit-pack-desc" v-model="editingPack.description" v-if="editingPack"></textarea>

            <br>

            <label for="edit-pack-mc-ver">Game Version:</label>
            <select id="edit-pack-mc-ver" v-model="editingPack.mcVersion" v-if="editingPack">
                <option v-for="ver in mcVersions">{{ver}}</option>
            </select>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import Config from "../Config";

    @Component({
        components: {},
    })
    export default class CreateMenu extends Vue {
        public editingPack = null;
        public mcVersions = ["Loading version listing..."];

        public newPack = {
            uploaded: false,
            name: "[Enter Pack Name]",
            description: "[Enter Pack Description]",
            mcVersion: ""
        };

        public mounted() {
            fetch(Config.API_URL + "/pack/versions").then(res => {
                return res.json();
            }).then((array: string[]) => {
                this.mcVersions = array;
                this.newPack.mcVersion = array[array.length - 1];
            });
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
            flex-grow: 1;
            transition: flex-grow 0.5s;
        }

        #edit-pack {
            flex-grow: 0;
            flex-basis: 0;
            transition: flex-grow 0.5s;
            overflow: hidden;
            height: 100%;
            border-left: 1px solid #222;

            &.show {
                flex-grow: 2;
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
