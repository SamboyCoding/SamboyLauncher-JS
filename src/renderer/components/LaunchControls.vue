<template>
    <div id="launch-controls" class="flex flex-vertical">
        <div v-if="selectedPack">
            <div class="flex">
                <h1 class="flex-grow">{{selectedPack.packName}}</h1>
                <sbl-button label="Launch"></sbl-button>
            </div>
            <p>
                Lorem ipsum dolor who gives a fuck.<br>
                Consequiter I definitely speak latin yes.<br>
                Mhm I can just write this fake text all day.<br>
                I'm drunk and writing placeholder text this is bad.<br>
                It's snowing on mt fuji.
            </p>
            <pack-mod-list :mods="selectedPack.installedMods"></pack-mod-list>
        </div>
    </div>
</template>

<script lang='ts'>
    import {Component, Prop, Vue} from "vue-property-decorator";
    import InstalledPack from "../../main/model/InstalledPack";
    import InstalledPackJSON from "../../main/model/InstalledPackJSON";
    import PackModList from "./PackModList.vue";
    import SblButton from "./SblButton.vue";

    @Component({
        components: {PackModList, SblButton},
    })
    export default class LaunchControls extends Vue {
        @Prop({
            type: Array
        })
        public packs: InstalledPackJSON[];

        private get selectedPack(): InstalledPackJSON {
            let idx = this.selectedPackIdx;
            return this.packs[idx];
        }

        get selectedPackIdx() {
            return this.$store.state.selectedPack;
        }
    }
</script>

<style scoped lang="scss">
    #launch-controls {
        padding: 1rem;
    }
</style>
