<template>
    <div id="pack-select">
        <div class="full-border no-left fill-height">
            <pack-select-entry v-for="(pack, idx) in packs" :pack-name="pack" :selected="selectedPack === idx" @click.native="selectPack(idx)"></pack-select-entry>
        </div>
    </div>
</template>

<script lang='ts'>
    import {Component, Prop, Vue} from "vue-property-decorator";
    import PackSelectEntry from "./PackSelectEntry.vue";

    @Component({
        components: {PackSelectEntry},
    })
    export default class PackSelect extends Vue {

        @Prop({
            type: Array
        })
        public packs;

        public selectPack(idx: number) {
            this.$store.commit("setSelectedPack", idx);
        }

        get selectedPack() {
            return this.$store.state.selectedPack;
        }
    }
</script>

<style scoped lang="scss">
    #pack-select {
        //border-right: 1px solid #ccc;
    }
</style>
