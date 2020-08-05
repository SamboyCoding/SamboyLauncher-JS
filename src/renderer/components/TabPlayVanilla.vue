<template>
    <div id="tab-play-vanilla" class="flex">
        <div class="vanilla-column flex-grow">
            <div class="vanilla-column-title flex flex-vertical flex-center-content">
                Release Versions
            </div>
            <div class="vanilla-version is-release flex flex-align-center" v-for="version in mcVersions.release">
                <span class="vanilla-version-name">{{version}}</span>
                <sbl-button class="vanilla-install-button" label="Install" @click.native="install(version)"></sbl-button>
            </div>
        </div>
        <div class="vanilla-column flex-grow">
            <div class="vanilla-column-title flex flex-vertical flex-center-content">
                Snapshots &amp; Pre-Releases
            </div>
            <div class="vanilla-version is-release flex flex-align-center" v-for="version in mcVersions.snapshot">
                <span class="vanilla-version-name">{{version}}</span>
                <sbl-button class="vanilla-install-button" label="Install" @click.native="install(version)"></sbl-button>
            </div>
        </div>
        <div class="vanilla-column flex-grow">
            <div class="vanilla-column-title flex flex-vertical flex-center-content">
                Old Beta
            </div>
            <div class="vanilla-version is-release flex flex-align-center" v-for="version in mcVersions.oldBeta">
                <span class="vanilla-version-name">{{version}}</span>
                <sbl-button class="vanilla-install-button" label="Install" @click.native="install(version)"></sbl-button>
            </div>
        </div>
        <div class="vanilla-column flex-grow">
            <div class="vanilla-column-title flex flex-vertical flex-center-content">
                Old Alpha
            </div>
            <div class="vanilla-version is-release flex flex-align-center" v-for="version in mcVersions.oldAlpha">
                <span class="vanilla-version-name">{{version}}</span>
                <sbl-button class="vanilla-install-button" label="Install" @click.native="install(version)"></sbl-button>
            </div>
        </div>
    </div>
</template>

<script lang='ts'>
import {Component, Vue, Watch} from "vue-property-decorator";
import MCVersion from "../../main/model/MCVersion";
import RendererBoundVersionListing from "../../main/model/RendererBoundVersionListing";
import App from "../App.vue";
import MainProcessActions from "../MainProcessActions";
import SblButton from "./SblButton.vue";

@Component({
    components: {SblButton},
})
export default class TabPlayVanilla extends Vue {
    public mounted() {
        this.updateBG();
    }

    public get mcVersions(): RendererBoundVersionListing {
        let result = this.$store.state.vanillaMCVersions;
        console.log(result);
        return result;
    }

    @Watch("$store.state.darkMode")
    private updateBG() {
        App.instance.setBackground(this.$store.state.darkMode ? "dark_vanilla" : "light_vanilla");
    }

    public install(version: string) {
        MainProcessActions.requestInstall({
            packName: null,
            gameVersionId: version,
            forgeVersionId: null,
            mods: [],
        })
    }
}
</script>

<style scoped lang="scss">
    @import "../scss/GlobalStyles";

    #tab-play-vanilla {
        height: calc(100% - #{$top-bar-height} - #{$bottom-bar-height});
    }

    .vanilla-column {
        .vanilla-column-title {
            width: 100%;
            text-align: center;
            height: 50px;
        }
        margin-right: 8px;
        outline: none;
        flex-basis: 20%;
        overflow-y: scroll;
    }

    ::-webkit-scrollbar {
        width: 12px;
    }

    ::-webkit-scrollbar-track {
        background-color: transparent;
    }

    ::-webkit-scrollbar-thumb {
        background-color: var(--highlight-color);

        &:hover {
            background-color: var(--transparant-highlight);
        }
    }

    .vanilla-version {
        height: 64px;
        padding: 8px;

        &:not(:last-of-type) {
            //border-bottom: 1px solid var(--highlight-color);
        }

        .vanilla-version-name {
            margin-left: 8px;
        }

        .vanilla-install-button {
            margin-left: auto;
            margin-right: 12px;
        }
    }
</style>
