<template>
    <div id="downloads-tab" class="flex flex-vertical">
        <DownloadListEntry v-for="record in data" :record="record"></DownloadListEntry>
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
    public data: DownloadRecord[] = [
        {
            packName: "Pack that's downloading",
            statusLabel: "Downloading Files",
            downloadedMib: 84,
            totalMib: 368,
            speedMib: 18,
            threadCount: 8
        },
        {
            packName: "Pack that's pulling",
            statusLabel: "Pulling Manifests",
            downloadedMib: 6,
            totalMib: null,
            speedMib: 1,
            threadCount: 1,
        }
    ]
}
</script>

<style scoped lang="scss">
    #downloads-tab {
        overflow-x: hidden;
        overflow-y: auto;
        height: 100%;
    }
</style>
