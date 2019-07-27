<template>
    <div id="main-menu">
        <div @click="page = Page.PLAY" id="menu-item-play">
            <i class="material-icons">play_arrow</i>
            Play
        </div>
        <div @click="page = Page.DISCOVER" id="menu-item-discover">
            <i class="material-icons">search</i>
            Discover
        </div>
        <div @click="page = Page.CREATE" id="menu-item-create">
            <i class="material-icons">edit</i>
            Create
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import Page from "../model/Page";

    @Component
    export default class MainMenu extends Vue {
        public Page = Page;

        get page() {
            return this.$store.state.currentPage;
        }

        set page(value: Page) {
            this.$store.commit("setCurrentPage", value);
        }
    }
</script>

<style lang="scss" scoped>
    #main-menu {
        display: flex;
        flex-flow: row nowrap;
        height: 100%;
        overflow: hidden;
        width: 100%;

        & > div {
            flex-grow: 1;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            transition: background .15s, flex-grow .15s;
            font-size: 2rem;
            font-weight: 300;

            i {
                margin-bottom: 0.5rem;
            }

            &:hover {
                background: rgba(255, 255, 255, 0.02);
                //flex-grow: 2;
            }
        }
    }
</style>
