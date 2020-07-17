<template>
    <div id="tab-play-modded">
        <!--Main content wrapper-->
        <pack-select class="flex-grow" :packs="packs"></pack-select>
        <launch-controls class="flex-double-weight" :packs="packs"></launch-controls>
    </div>
</template>

<script lang='ts'>
    import {Component, Vue} from "vue-property-decorator";
    import LaunchControls from "./LaunchControls.vue";
    import PackSelect from "./PackSelect.vue";

    @Component({
        components: {
            LaunchControls,
            PackSelect
        },
    })
    export default class TabPlayModded extends Vue {
        public get packs() {
            return this.$store.state.packJsons;
        }
    }
</script>

<style scoped lang="scss">

</style>
