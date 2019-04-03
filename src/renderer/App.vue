<template>
    <div id="app">

    </div>
</template>

<script lang='ts'>
    import {Component, Vue} from 'vue-property-decorator';

    // noinspection JSUnusedGlobalSymbols
    @Component({
        components: {
        },
    })
    export default class App extends Vue {

    }
</script>

<style lang="scss">
    @import url('https://fonts.googleapis.com/css?family=Roboto:400,700');

    html, body, #app {
        width: 100%;
        height: 100%;
        margin: 0;
    }

    * {
        box-sizing: border-box;
    }

    #app {
        font-family: Roboto, Arial, sans-serif;
        background: radial-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.5) 90%);
    }
</style>
