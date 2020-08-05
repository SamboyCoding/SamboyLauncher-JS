import DownloadRecord from "./DownloadRecord";
import MainProcessBoundDownloadRequest from "./MainProcessBoundDownloadRequest";

export default class DownloadQueueEntry {
    public downloadStats: DownloadRecord;
    public destinationRoot: string;
    public initialRequest: MainProcessBoundDownloadRequest;
    public log: string;
}
