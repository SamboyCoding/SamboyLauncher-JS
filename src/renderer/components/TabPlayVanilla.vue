<template>
    <div id="tab-play-vanilla">
        Games involving icecream or something idk i didn't read the book
    </div>
</template>

<script lang='ts'>
import {Component, Vue, Watch} from "vue-property-decorator";
import App from "../App.vue";

@Component({
    components: {},
})
export default class TabPlayVanilla extends Vue {
    public mounted() {
        this.updateBG();
    }

    @Watch("$store.state.darkMode")
    private updateBG() {
        App.instance.setBackground(this.$store.state.darkMode ? "dark_vanilla" : "light_vanilla");
    }
}
</script>

<style scoped lang="scss">

</style>
