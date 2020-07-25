<template>
    <div :class="{'download-list-entry': true, 'flex': true, 'flex-vertical': true, expanded: showLog}">
        <div class="download-list-entry-fields flex" @click="showLog = !showLog">
            <span class="download-list-entry-name">{{record.packName}}</span>
            <span class="download-list-entry-status">{{record.statusLabel}}</span>
            <span class="download-list-entry-downloaded">{{record.downloadedMib}}MiB / {{record.totalMib ? record.totalMib : '__'}}MiB</span>
            <span class="download-list-entry-speed">{{record.speedMib}}MiB/sec</span>
            <span class="download-list-entry-threads">{{record.threadCount}} thread{{record.threadCount === 1 ? '' : 's'}} downloading</span>
            <i class="download-list-entry-expand-icon fa fa-2x fa-angle-right"></i>
        </div>
        <div class="downloads-list-entry-log-wrapper">
            <textarea readonly class="downloads-list-entry-log" v-text="`Lorem ipsum dolor sit amet\nHello world\nHola mundo\nBonjour`"></textarea>
        </div>
    </div>
</template>

<script lang='ts'>
import {Component, Prop, Vue} from "vue-property-decorator";
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
    public record: DownloadRecord;
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
