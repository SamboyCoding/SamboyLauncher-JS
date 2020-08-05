<template>
    <div id="downloads-tab" class="flex flex-vertical">
        <DownloadListEntry v-for="record in installs" :record="record"></DownloadListEntry>
        <span id="no-downloads" v-if="installs.length === 0">You have no installations in progress.</span>
    </div>
</template>

<script lang='ts'>
import {Component, Vue} from "vue-property-decorator";
import DownloadRecord from "../../main/model/DownloadRecord";
import DownloadListEntry from "./DownloadListEntry.vue";

@Component({
    components: {DownloadListEntry},
})
export default class TabDownloads extends Vue {
    public get installs(): DownloadRecord[] {
        return this.$store.state.installs;
    }
}
</script>

<style scoped lang="scss">
    #downloads-tab {
        overflow-x: hidden;
        overflow-y: auto;
        height: 100%;
    }

    #no-downloads {
        display: block;
        width: 100%;
        text-align: center;
        margin-top: 5%;
    }
</style>
