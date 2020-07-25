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
        padding: 0.5rem 1.88rem;
        //height: 100%;
        transition: background-color 0.25s;

        &:hover {
            background-color: var(--transparant-highlight);
        }
    }
</style>
