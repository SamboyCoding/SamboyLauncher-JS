<template>
    <div id="bottom-navigation-bar" class="flex">
        <bottom-navigation-button @click.native="selectedTab = key" v-for="(label, key) in tabs" :label="label" :selection-key="key" :selected="selectedTab === key"></bottom-navigation-button>
    </div>
</template>

<script lang='ts'>
    import {Component, Vue} from "vue-property-decorator";
    import BottomNavigationButton from "./BottomNavigationButton.vue";

    @Component({
        components: {BottomNavigationButton},
    })
    export default class BottomNavigationBar extends Vue {
        private tabs = {
            "play-modded": "Play Modpacks",
            "play-vanilla": "Play Vanilla",
            "build-modpacks": "Creator Tools",
            "settings": "Settings",
        };

        get selectedTab() {
            return this.$store.state.selectedTab;
        }

        set selectedTab(value) {
            this.$store.commit("setSelectedTab", value);
        }
    }
</script>

<style scoped lang="scss">
    #bottom-navigation-bar {
        height: 64px;
        width: 100%;
    }
</style>
