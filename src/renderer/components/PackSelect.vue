<template>
    <div id="pack-select">
        <div class="fill-height">
            <pack-select-entry v-for="(pack, idx) in packs" :pack-name="pack.packName" :selected="selectedPackIndex === idx" :install-progress="pack.installationProgress" @click.native="selectPack(idx)"></pack-select-entry>
        </div>
    </div>
</template>

<script lang='ts'>
    import {Component, Prop, Vue} from "vue-property-decorator";
    import InstalledPackJSON from "../../main/model/InstalledPackJSON";
    import PackSelectEntry from "./PackSelectEntry.vue";

    @Component({
        components: {PackSelectEntry},
    })
    export default class PackSelect extends Vue {

        @Prop({
            type: Array
        })
        public packs: InstalledPackJSON[];

        public selectPack(idx: number) {
            this.$store.commit("setSelectedPack", idx);
        }

        get selectedPackIndex() {
            return this.$store.state.selectedPack;
        }
    }
</script>

<style scoped lang="scss">
    #pack-select {
        //border-right: 1px solid #ccc;
    }
</style>
