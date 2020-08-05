import {existsSync} from "fs";
import mkdirp from "mkdirp";
import {join} from "path";
import Logger from "../logger";
import DownloadQueueEntry from "../model/DownloadQueueEntry";
import DownloadRecord from "../model/DownloadRecord";
import DownloadWrapper from "../model/DownloadWrapper";
import MainProcessBoundDownloadRequest from "../model/MainProcessBoundDownloadRequest";
import ElectronManager from "./ElectronManager";
import EnvironmentManager from "./EnvironmentManager";
import MinecraftVersionManager from "./MinecraftVersionManager";
import axios from "axios";

export default class DownloadManager {
    public static downloadQueue: DownloadQueueEntry[] = [];

    /**
     * Download a file from the given url, wrap it in a DownloadWrapper which provides information on the file size and time taken to download, and returns it.
     * The result is parsed as JSON unless `binary` is passed as true
     * @param url The URL to download the file from
     * @param binary True to return the `content` as an IncomingMessage, false to return it as some form of JSON object.
     */
    public static async DownloadFile<T>(url: string, binary?: boolean): Promise<DownloadWrapper<T> | null> {
        try {
            let startTime = Date.now();

            const axiosResponse = await axios.get(url, {responseType: binary ? "stream" : "json"});
            const content: T = axiosResponse.data;

            let timeTakenMs = Date.now() - startTime;

            let downloadedBytes = Number(axiosResponse.headers["content-length"]);

            return {
                content,
                downloadedBytes,
                timeTakenMs,
                downloadRate: (downloadedBytes * 1000 / timeTakenMs)
            };
        } catch (e) {
            Logger.errorImpl("DownloadManager", "Failed to download file! " + e.message);
            return null;
        }
    }

    public static SendFullQueueUpdate() {
        //Remove downloaded files to decrease packet size, and send to renderer.
        ElectronManager.SendIPCToMain("download queue", this.downloadQueue.map(entry => ({
            downloadStats: DownloadRecord.CopyWithoutFilesDownloaded(entry.downloadStats),
            destinationRoot: entry.destinationRoot,
            log: entry.log,
            initialRequest: entry.initialRequest
        } as DownloadQueueEntry)));
    }

    public static BytesToMiB(bytes: number) {
        return Math.round((bytes / 1024 / 1024) * 10) / 10;
    }

    private static RemoveNonKosherCharactersInPath(path: string) {
        return path.toLowerCase().replace(/[^a-z0-9\-]/g, "-");
    }

    public static async HandleRequest(request: MainProcessBoundDownloadRequest) {
        //Set up download record
        Logger.infoImpl("Download Manager", `Request received to start an install. Pack name is ${request.packName}, game version is ${request.gameVersionId}, forge version is ${request.forgeVersionId}, and there are ${request.mods.length} mods to install.`);

        const downloadRecord = new DownloadRecord();
        downloadRecord.statusLabel = "Pulling Manifests";
        downloadRecord.packName = request.packName;

        //And queue entry
        const queueEntry = new DownloadQueueEntry();
        queueEntry.downloadStats = downloadRecord;
        queueEntry.initialRequest = request;
        queueEntry.log = `Checking that requested game version '${request.gameVersionId}' exists...`;
        if(request.packName)
            queueEntry.destinationRoot = join(EnvironmentManager.packsDir, this.RemoveNonKosherCharactersInPath(request.packName));

        if (queueEntry.destinationRoot && !existsSync(queueEntry.destinationRoot))
            await mkdirp(queueEntry.destinationRoot);

        if(!request.packName)
            request.packName = `Vanilla ${request.gameVersionId}`;

        //Add to the queue
        let index = this.downloadQueue.push(queueEntry) - 1;

        //Update queue on renderer side
        this.SendFullQueueUpdate();

        //Download manifest
        const downloaded = await MinecraftVersionManager.FetchVersionListing();
        const manifest = downloaded.content;

        //Update download stats
        this.downloadQueue[index].downloadStats.PushCompletedFile(downloaded);

        //Find our version
        const versionSpecification = manifest.versions.find(v => v.id === request.gameVersionId);

        if (!versionSpecification) {
            //Check failed, bail out.
            queueEntry.log += "\nMinecraft version does not exist! Aborting download!";
            queueEntry.downloadStats.statusLabel = "Failed";
            this.SendFullQueueUpdate();
        }

        Logger.infoImpl("Download Manager", "Requesting that the MCVM get us a file list.");
        const fileList = await MinecraftVersionManager.GetFileListForGameVersion(this.downloadQueue[index], versionSpecification);
        Logger.infoImpl("Download Manager", `MCVM has returned a list of files containing ${fileList.length} entries`);

        queueEntry.log += `\nNeed to download a total of ${fileList.length} files for vanilla game client.`;
        this.SendFullQueueUpdate(); //Update log on client.
    }
}
