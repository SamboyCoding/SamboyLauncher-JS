import ModDownloadRequestEntry from "./ModDownloadRequestEntry";

export default class MainProcessBoundDownloadRequest {
    public packName: string | null;
    public gameVersionId: string;
    public forgeVersionId: string | null;
    public mods: ModDownloadRequestEntry[];
}
