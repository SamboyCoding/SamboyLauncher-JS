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
        padding: 1.5rem 10px;
        transition: background-color 0.25s;

        &:not(:last-of-type) {
            /*border-bottom: 1px solid var(--muted-highlight)*/
        }

        &:hover, &.selected {
            background-color: var(--transparant-highlight);
            /*color: white;*/
        }
    }
</style>
