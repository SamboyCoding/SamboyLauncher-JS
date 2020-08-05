<template>
    <div :class="{'download-list-entry': true, 'flex': true, 'flex-vertical': true, expanded: showLog}">
        <div class="download-list-entry-fields flex" @click="showLog = !showLog">
            <span class="download-list-entry-name">{{record.initialRequest.packName}}</span>
            <span class="download-list-entry-status">{{record.downloadStats.statusLabel}}</span>
            <span class="download-list-entry-downloaded">{{clampTo2Dp(downloadedMib)}}MiB / {{ totalMib ? clampTo2Dp(totalMib) : '__' }}MiB</span>
            <span class="download-list-entry-speed">{{clampTo2Dp(record.downloadStats.speedMib)}}MiB/sec</span>
            <span class="download-list-entry-threads">{{record.downloadStats.threadCount}} thread{{record.downloadStats.threadCount === 1 ? '' : 's'}} downloading</span>
            <i class="download-list-entry-expand-icon fa fa-2x fa-angle-right"></i>
        </div>
        <div class="downloads-list-entry-log-wrapper">
            <textarea readonly class="downloads-list-entry-log" v-text="record.log"></textarea>
        </div>
    </div>
</template>

<script lang='ts'>
import {Component, Prop, Vue} from "vue-property-decorator";
import DownloadQueueEntry from "../../main/model/DownloadQueueEntry";
import DownloadRecord from "../../main/model/DownloadRecord";

@Component({
    components: {},
})
export default class DownloadListEntry extends Vue {
    public showLog: boolean = false;

    @Prop({
        required: true,
        type: Object
    })
    public record: DownloadQueueEntry;

    get downloadedMib() {
        return this.record.downloadStats.downloadedBytes / 1024 / 1024;
    }

    get totalMib() {
        return this.record.downloadStats.totalBytes == null ? null : this.record.downloadStats.totalBytes / 1024 / 1024;
    }

    public clampTo2Dp(value: number): string {
        return value.toFixed(2);
    }
}
</script>

<style scoped lang="scss">
.download-list-entry {
    border-bottom: 1px solid var(--highlight-color);

    &.expanded {
        .downloads-list-entry-log-wrapper {
            height: 228px;
        }

        .download-list-entry-expand-icon {
            transform: rotate(90deg);
        }
    }
}

.download-list-entry-fields {
    height: 68px;
    width: 100%;
    padding-left: 3rem;
    align-items: center;

    * {
        flex-grow: 1;
        flex-basis: 16.66%
    }

    .download-list-entry-expand-icon {
        transition: transform 0.25s;
    }
}

.downloads-list-entry-log-wrapper {
    width: 100%;
    height: 0;
    transition: height 0.25s;
    overflow: hidden;

    .downloads-list-entry-log {
        width: 100%;
        height: 228px;
        background: transparent;
        color: inherit;
        border: none;
        outline: none;
        resize: none;
    }
}
</style>
