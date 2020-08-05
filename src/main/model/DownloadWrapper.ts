export default class DownloadWrapper<T> {
    public content: T;
    public timeTakenMs: number;
    public downloadedBytes: number;
    public downloadRate: number;
}
