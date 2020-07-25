<template>
    <div id="top-bar" class="flex window-drag">
        <h3 class="flex-grow">SamboyLauncher v2.½</h3>

        <!--Window controls-->
        <div class="no-window-drag">
            <i @click="$store.commit('toggleDark')" class="material-icons hover-change margin-right-1rem">brightness_6</i>
            <i @click="MainProcessActions.minimizeWindow()" class="material-icons hover-change">minimize</i>
            <i @click="MainProcessActions.toggleMaximize()" class="material-icons hover-change">crop_din</i>
            <i @click="close" class="material-icons hover-change">close</i>
        </div>
    </div>
</template>

<script lang='ts'>
    import {Component, Vue} from "vue-property-decorator";
    import MainProcessActions from "../MainProcessActions";

    @Component({
        components: {},
    })
    export default class TopBar extends Vue {
        private MainProcessActions = MainProcessActions;

        private close() {window.close()}
    }
</script>

<style scoped lang="scss">
    @import "../scss/GlobalStyles";

    #top-bar {
        padding: 1rem;
        height: $top-bar-height;
        /*box-shadow: 0px 0px 5px 1px rgba(0,0,0,0.75);*/
    }
</style>
