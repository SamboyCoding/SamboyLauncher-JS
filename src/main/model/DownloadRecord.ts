export default class DownloadRecord {
    public packName: string;
    public statusLabel: string;
    public downloadedMib: number;
    public totalMib: number | null;
    public speedMib: number;
    public threadCount: number;
}
