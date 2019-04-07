<template>
    <div id="app">
        <top-bar/>
        <div id="subnav">
            <div id="packs">
                <div class="pack" v-for="i in 8">
                    <div class="pack-icon"></div>
                    <div class="pack-shade"></div>
                    <div class="pack-title">Pack {{i}}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang='ts'>
    import {Component, Vue} from "vue-property-decorator";
    import TopBar from "./components/TopBar.vue";

    @Component({
        components: {
            TopBar
        },
    })
    export default class App extends Vue {

    }
</script>

<style lang="scss">
    @import url('https://fonts.googleapis.com/css?family=Roboto:400,700');
    @import url('https://fonts.googleapis.com/css?family=Material+Icons');

    html, body, #app {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
    }

    h1, h2, h3, h4, h5 {
        margin: 0;
    }

    * {
        box-sizing: border-box;
    }

    html {
        background: url(./resources/backgrounds/4.jpg) no-repeat fixed;
        background-size: cover;
    }

    #app {
        font-family: Roboto, Arial, sans-serif;
        background: radial-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.9) 90%) no-repeat fixed;
        background-size: cover;
        color: white;
        width: 100%;
        height: 100%;
        position: absolute;
        user-select: none;
    }

    ::-webkit-scrollbar{
        background-color: transparent;
    }

    ::-webkit-scrollbar-thumb {
        background: rgba(150, 150, 150, 0.3);
    }

    ::-webkit-scrollbar-thumb:hover {
        background: rgba(200, 200, 200, 0.3);
    }

    #subnav {
        margin-top: 6rem;
        height: calc(100% - 6rem);
        overflow-y: scroll;

        #packs {
            padding: 3rem 2rem;
            display: flex;
            flex-flow: row wrap;
        }

        .pack {
            flex-basis: 360px;
            margin: 1rem 1.5%;
            height: 225px;
            cursor: pointer;
            background: transparent;
            position: relative;
            transition: background 0.5s;
            border-radius: 1rem;

            .pack-icon {
                width: 50%;
                height: 50%;
                position: absolute;
                left: 25%;
                top: 25%;
                background-image: url(./resources/default_pack_icon.png);
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }

            .pack-shade {
                width: 100%;
                height: 100%;
                background: transparent;
                transition: background 0.5s;
                position: absolute;
                top: 0;
                left: 0;
                border-radius: 1rem;
            }

            .pack-title {
                color: white;
                opacity: 0;
                transition: opacity 0.5s;
                position: absolute;
                left: 0;
                bottom: 0;
                width: 100%;
                text-align: left;
                font-size: 24px;
                padding: 0.4rem 1rem;
            }

            &:hover {
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(6px);
            }

            &:hover .pack-title {
                opacity: 1;
            }
        }
    }
</style>
