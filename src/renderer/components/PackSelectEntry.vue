<template>
    <div :class="{'pack-select-entry': true, 'selected': selected}">
        {{packName}}
    </div>
</template>

<script lang='ts'>
    import {Component, Prop, Vue} from "vue-property-decorator";

    @Component({
        components: {},
    })
    export default class PackSelectEntry extends Vue {
        @Prop({
            type: String
        })
        public packName: string;

        @Prop({
            type: Boolean
        })
        public selected: boolean;
    }
</script>

<style scoped lang="scss">
    .pack-select-entry {
        //cursor: pointer;
        padding: 6px;

        &.selected {
            background: var(--transparant-highlight);
            /*color: white;*/
        }
    }
</style>
