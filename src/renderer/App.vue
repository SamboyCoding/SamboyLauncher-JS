<template>
    <div id="app">
        <top-bar></top-bar>
        <div class="flex fill-height">
            <!--Main content wrapper-->
            <pack-select class="flex-grow"></pack-select>
            <launch-controls class="flex-double-weight"></launch-controls>
        </div>
    </div>
</template>

<script lang='ts'>
    import {Component, Vue} from "vue-property-decorator";
    import LaunchControls from "./components/LaunchControls.vue";
    import PackSelect from "./components/PackSelect.vue";
    import TopBar from "./components/TopBar.vue";
    import Config from "./Config";

    @Component({
        components: {
            LaunchControls,
            PackSelect,
            TopBar
        },
    })
    export default class App extends Vue {
        public mounted() {
            console.info("[App] SBL Renderer: Main App Mounted");
            console.info(`[App] Using API URL ${Config.API_URL}`);
        }
    }
</script>

<style lang="scss">
    @import "scss/GlobalStyles";

    html, body, #app {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
    }

    h1, h2, h3, h4, h5 {
        margin: 0;
    }

    * {
        box-sizing: border-box;
    }

    #app {
        font-family: Roboto, Arial, sans-serif;
        width: 100%;
        height: 100%;
        position: absolute;
        user-select: none;
    }
</style>
