<template>
    <div id="tab-settings" class="flex-vertical">
        Set Tings, you know?
        <br><br>
        <sbl-button label="Test Install Forge 1.6.4 build 1345 (very legacy)" @click.native="test164()"></sbl-button>
        <br>
        <sbl-button label="Test Install Forge 1.12.2 build 2847 (legacy)" @click.native="test112Legacy()"></sbl-button>
        <br>
        <sbl-button label="Test Install Forge 1.12.2 build 2854 (modern)" @click.native="test112Modern()"></sbl-button>
        <br>
        <sbl-button label="Test Install Forge 1.13.2 build 219" @click.native="test113()"></sbl-button>
        <br>
        <sbl-button label="Test Install Forge 1.16.1 build 106" @click.native="test116()"></sbl-button>
    </div>
</template>

<script lang='ts'>
    import {Component, Vue} from "vue-property-decorator";
    import MainProcessActions from "../MainProcessActions";
    import SblButton from "./SblButton.vue";

    @Component({
        components: {SblButton},
    })
    export default class TabSettings extends Vue {
        public test164() {
            MainProcessActions.requestInstall({
                forgeVersionId: "1.6.4-9.11.1.1345",
                gameVersionId: "1.6.4",
                packName: null,
                mods: []
            });
        }

        public test112Legacy() {
            MainProcessActions.requestInstall({
                forgeVersionId: "1.12.2-14.23.5.2847",
                gameVersionId: "1.12.2",
                packName: null,
                mods: []
            });
        }

        public test112Modern() {
            MainProcessActions.requestInstall({
                forgeVersionId: "1.12.2-14.23.5.2854",
                gameVersionId: "1.12.2",
                packName: null,
                mods: []
            });
        }

        public test113() {
            MainProcessActions.requestInstall({
                forgeVersionId: "1.13.2-25.0.219",
                gameVersionId: "1.13.2",
                packName: null,
                mods: []
            });
        }

        public test116() {
            MainProcessActions.requestInstall({
                forgeVersionId: "1.16.1-32.0.106",
                gameVersionId: "1.16.1",
                packName: null,
                mods: []
            });
        }
    }
</script>

<style scoped lang="scss">
    #tab-settings {
        padding: 1rem;
    }

    .sbl-button {
        width: fit-content;
    }
</style>
