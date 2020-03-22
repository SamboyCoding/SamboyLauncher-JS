<template>
    <div id="launch-controls" class="no-left no-right full-border">
        <div class="flex">
            <h2 class="flex-grow">{{selectedPack}}</h2>
            <sbl-button label="Launch"></sbl-button>
        </div>
        <p>
            Lorem ipsum dolor who gives a fuck.<br>
            Consequiter I definitely speak latin yes.<br>
            Mhm I can just write this fake text all day.<br>
            I'm drunk and writing placeholder text this is bad.<br>
            It's snowing on mt fuji.
        </p>
    </div>
</template>

<script lang='ts'>
    import {Component, Prop, Vue} from "vue-property-decorator";
    import SblButton from "./SblButton.vue";

    @Component({
        components: {SblButton},
    })
    export default class LaunchControls extends Vue {
        @Prop({
            type: Array
        })
        public packs;

        private get selectedPack() {
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
