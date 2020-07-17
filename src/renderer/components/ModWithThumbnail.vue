<template>
    <div class="mod-with-image flex">
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
    export default class ModListRow extends Vue {
        @Prop({
            type: Object
        })
        public mod: ModJar;
    }
</script>

<style scoped lang="scss">
    .mod-with-image {
        height: 3rem;
        width: 100%;
        position: relative;
        margin-bottom: 1rem;

        img {
            display: block;
            height: 100%;
            width: 50px;
            object-fit: contain;
            margin-right: 1rem;
        }

        h3 {
            display: inline-block;
            margin: auto 0;
        }
    }
</style>
