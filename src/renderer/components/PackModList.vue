<template>
    <div id="pack-mod-list" class="fill-height">
        <h2 v-if="modJars.length">Mods ({{modJars.length}})</h2>
        <h2 v-else>Mods (loading...)</h2>

        <div class="flex flex-vertical" v-if="modJars.length">
            <div class="flex">
                <!--Row-->
                <ModWithThumbnail class="flex-grow" v-for="(mod, idx) in modJars" :mod="mod" v-if="idx < 3"></ModWithThumbnail>
            </div>

            <div class="flex mod-row" v-for="rowNumber in (Math.ceil((modJars.length - 3) / 3))">
                <h3 v-for="columnNo in 3" v-if="modJars.length < rowNumber * 3 + columnNo">{{modJars[rowNumber * 3 + columnNo].addonName}}</h3>
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

            console.log("Looking up " + newMods.length + " mods:", newMods);

            let promises = newMods.map(newMod => this.getModJar(newMod.addonId, newMod.fileId));

            this.modJars = (await Promise.all(promises)).filter(jar => !!jar).sort((a, b) => a.addonPopularityScore - b.addonPopularityScore);


            console.log("Got " + this.modJars.length + " jars");
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

</style>
