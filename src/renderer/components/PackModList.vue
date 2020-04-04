<template>
    <div id="pack-mod-list" class="fill-height">
        <h2 v-if="modJars.length">Mods (Most Popular First)</h2>
        <h2 v-else>Mods (loading...)</h2>
        <br>
        <div class="flex flex-vertical" id="pack-mods" v-if="modJars.length">
            <div class="flex mod-row">
                <!--Top Row-->
                <ModWithThumbnail class="flex-grow" v-for="(mod, idx) in modJars.slice(0, 3)" :mod="mod" v-if="modJars.length > idx"></ModWithThumbnail>
            </div>

            <div class="flex flex-wrap">
                <h3 class="flex-grow align-center mod-list-label" v-for="modJar in modJars.slice(3)">
                    {{modJar.addonName}}
                </h3>
            </div>
        </div>

    </div>
</template>

<script lang='ts'>
    import axios from "axios";
    import {Component, Prop, Vue, Watch} from "vue-property-decorator";
    import InstalledModRecord from "../../main/model/InstalledModRecord";
    import ModJar from "../../main/model/ModJar";
    import Config from "../Config";
    import ModWithThumbnail from "./ModWithThumbnail.vue";

    @Component({
        components: {ModWithThumbnail},
    })
    export default class PackModList extends Vue {
        @Prop({
            type: Array
        })
        public mods: InstalledModRecord[];

        private modJars: ModJar[] = [];

        public mounted() {
            this.onModsChange(this.mods);
        }

        @Watch("mods")
        public async onModsChange(newMods: InstalledModRecord[]) {
            this.modJars = [];

            let promises = newMods.map(newMod => this.getModJar(newMod.addonId, newMod.fileId));

            this.modJars = (await Promise.all(promises)).filter(jar => !!jar).sort((a, b) => b.addonPopularityScore - a.addonPopularityScore);
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
        padding: 0 2rem;
    }

    .mod-row {
        margin-bottom: 1rem;
        position: relative;
    }

    .mod-list-label {
        max-width: 33%;
    }
</style>
