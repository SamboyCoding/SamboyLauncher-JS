<template>
    <div class="sbl-button full-border">
        {{label}}
    </div>
</template>

<script lang='ts'>
    import {Component, Prop, Vue} from "vue-property-decorator";

    @Component({
        components: {},
    })
    export default class SblButton extends Vue {
        @Prop({
            type: String
        })
        public label: string;
    }
</script>

<style scoped lang="scss">
    .sbl-button {
        vertical-align: middle;
        padding: 4px 8px;
        height: 100%;

        &:hover {
            background: var(--highlight-color);
        }
    }
</style>
