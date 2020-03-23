<template>
    <div class="mod-with-image">
        <img :src="mod.addonThumbnail" :alt="`Thumbnail for ` + mod.addonName">
        <h3>{{mod.addonName}}</h3>
    </div>
</template>

<script lang='ts'>
    import {Component, Prop, Vue} from "vue-property-decorator";
    import ModJar from "../../main/model/ModJar";

    @Component({
        components: {},
    })
    export default class ModWithThumbnail extends Vue {
        @Prop({
            type: Object
        })
        public mod: ModJar;
    }
</script>

<style scoped lang="scss">

</style>
