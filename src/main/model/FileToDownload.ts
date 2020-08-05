export default class FileToDownload {
    public sourceUrl: string;
    public destPath: string;
    public sizeBytes: number;
    public sha1?: string;
    public md5?: string;
}
