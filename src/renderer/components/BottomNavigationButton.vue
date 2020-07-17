<template>
    <div :class="{'bottom-nav-button': true, flex: true, 'flex-vertical': true, 'flex-grow': true, 'flex-center-content': true, selected: selected}">
        <span class="bottom-nav-button-label">{{label}}</span>
    </div>
</template>

<script lang='ts'>
    import {Component, Prop, Vue} from "vue-property-decorator";

    @Component({
        components: {},
    })
    export default class BottomNavigationButton extends Vue {
        @Prop({
            type: String,
            required: true
        })
        public label: string;

        @Prop({
            type: String,
            required: true
        })
        public selectionKey: string;

        @Prop({
            type: Boolean,
            default: () => false
        })
        public selected: boolean;
    }
</script>

<style scoped lang="scss">
    .bottom-nav-button {
        text-align: center;

        &:not(.selected):hover {
            background-color: var(--muted-highlight);
        }

        &.selected {
            background-color: var(--highlight-color);
        }
    }
</style>
