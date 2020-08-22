<template>
    <div id="tab-play-modded">
        <!--Main content wrapper-->
        <pack-select class="flex-grow" :packs="packs" commit-name="setSelectedPack"></pack-select>
        <launch-controls class="flex-double-weight" :packs="packs"></launch-controls>
    </div>
</template>

<script lang='ts'>
import {Component, Vue, Watch} from "vue-property-decorator";
    import App from "../App.vue";
    import LaunchControls from "./LaunchControls.vue";
    import PackSelect from "./PackSelect.vue";

    @Component({
        components: {
            LaunchControls,
            PackSelect
        },
    })
    export default class TabPlayModded extends Vue {
        public mounted() {
            this.updateBG();
        }

        @Watch("$store.state.darkMode")
        private updateBG() {
            App.instance.setBackground(this.$store.state.darkMode ? "dark_modded" : "light_modded");
        }

        public get packs() {
            return this.$store.state.packJsons;
        }
    }
</script>

<style scoped lang="scss">

</style>
