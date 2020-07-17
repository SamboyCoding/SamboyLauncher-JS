<template>
    <div id="pack-mod-list" class="fill-height">
        <h2 v-if="modJars.length">Mods ({{sortTypeName}})</h2>
        <h2 v-else>Mods (loading...)</h2>
        <br>
        <div class="flex flex-vertical" id="pack-mods" v-if="modJars.length">
            <ModWithThumbnail class="flex-grow" v-for="(mod) in modJars" :mod="mod"></ModWithThumbnail>
        </div>

    </div>
</template>

<script lang='ts'>
    import axios from "axios";
    import {Component, Prop, Vue, Watch} from "vue-property-decorator";
    import InstalledModRecord from "../../main/model/InstalledModRecord";
    import ModJar from "../../main/model/ModJar";
    import Config from "../Config";
    import ModJarSorts from "../ModJarSorts";
    import ModListRow from "./ModWithThumbnail.vue";

    @Component({
        components: {ModWithThumbnail: ModListRow},
    })
    export default class PackModList extends Vue {
        @Prop({
            type: Array
        })
        public mods: InstalledModRecord[];

        private modJars: ModJar[] = [];

        public sortTypeName: string = "A-Z";

        public mounted() {
            this.onModsChange(this.mods);
        }

        @Watch("mods")
        public async onModsChange(newMods: InstalledModRecord[]) {
            this.modJars = [];

            let promises = newMods.map(newMod => this.getModJar(newMod.addonId, newMod.fileId));

            this.modJars = (await Promise.all(promises)).filter(jar => !!jar).sort(ModJarSorts.byName);
        }

        private async getModJar(addonId: number, fileId: number): Promise<ModJar | null> {
            try {
                const response = await axios.get(`${Config.API_URL}/mod/by-id/${addonId}/${fileId}`);

                if (response.status !== 200) return null;

                return response.data;
            } catch (e) {
                return null;
            }
        }
    }
</script>

<style scoped lang="scss">
    #pack-mods {
        padding: 0 0rem;
    }

    .mod-row {
        margin-bottom: 1rem;
        position: relative;
    }

    .mod-list-label {
        max-width: 33%;
    }
</style>
