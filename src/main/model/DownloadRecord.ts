import DownloadManager from "../managers/DownloadManager";
import DownloadWrapper from "./DownloadWrapper";

export default class DownloadRecord {
    public packName: string;
    public statusLabel: string;
    public downloadedMib: number = 0;
    public totalMib: number | null;
    public speedMib: number = 0;
    public downloadingTimeMs: number = 0;
    public threadCount: number = 1;
    public filesDownloaded: DownloadWrapper<any>[] = [];

    constructor(props?) {
        if(props)
            Object.assign(this, props);
    }

    /**
     * Creates an instance from another, without the files list, for sending across processes.
     * @param other The other instance to create this instance from
     * @constructor
     */
    public static CopyWithoutFilesDownloaded(other: DownloadRecord): DownloadRecord {
        return new DownloadRecord({
            packName: other.packName,
            statusLabel: other.statusLabel,
            downloadedMib: other.downloadedMib,
            totalMib: other.totalMib,
            speedMib: other.speedMib,
            downloadingTimeMs: other.downloadedMib,
            threadCount: other.threadCount,
            filesDownloaded: []
        });
    }

    public PushCompletedFile(record: DownloadWrapper<any>) {
        this.filesDownloaded.push(record);

        this.downloadedMib += DownloadManager.BytesToMiB(record.downloadedBytes);
        this.downloadingTimeMs += record.timeTakenMs;

        //Recalculate speed
        this.speedMib = Math.round(10 * this.downloadedMib * 1000 / this.downloadingTimeMs) / 10;

        DownloadManager.SendFullQueueUpdate();
    }
}
