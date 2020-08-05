import DownloadManager from "../managers/DownloadManager";
import DownloadWrapper from "./DownloadWrapper";

export default class DownloadRecord {
    public packName: string;
    public statusLabel: string;
    public downloadedBytes: number = 0;
    public totalBytes: number | null;
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
            downloadedBytes: other.downloadedBytes,
            totalBytes: other.totalBytes,
            speedMib: other.speedMib,
            downloadingTimeMs: other.downloadedBytes,
            threadCount: other.threadCount,
            filesDownloaded: []
        });
    }

    public PushCompletedFile(record: DownloadWrapper<any>) {
        this.filesDownloaded.push(record);

        this.downloadedBytes += record.downloadedBytes;
        this.downloadingTimeMs += record.timeTakenMs;

        let downloadedMib = DownloadManager.BytesToMiB(this.downloadedBytes);
        //Recalculate speed
        this.speedMib = Math.round(100 * downloadedMib * 1000 / this.downloadingTimeMs) / 100;

        DownloadManager.SendFullQueueUpdate();
    }
}
