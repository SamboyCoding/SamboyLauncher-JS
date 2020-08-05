import {IncomingMessage} from "electron";
import {constants, existsSync, promises as fsPromises} from "fs";
import hasha from "hasha";
import mkdirp from "mkdirp";
import {dirname, join} from "path";
import toArray from "stream-to-array";
import Logger from "../logger";
import DownloadQueueEntry from "../model/DownloadQueueEntry";
import DownloadRecord from "../model/DownloadRecord";
import DownloadWrapper from "../model/DownloadWrapper";
import MainProcessBoundDownloadRequest from "../model/MainProcessBoundDownloadRequest";
import ElectronManager from "./ElectronManager";
import EnvironmentManager from "./EnvironmentManager";
import MinecraftVersionManager from "./MinecraftVersionManager";
import axios from "axios";
import ReadableStream = NodeJS.ReadableStream;

const {writeFile, unlink, access} = fsPromises;

export default class DownloadManager {
    public static downloadQueue: DownloadQueueEntry[] = [];
    private static queueWasProcessing: boolean = false;

    /**
     * Download a file from the given url, wrap it in a DownloadWrapper which provides information on the file size and time taken to download, and returns it.
     * The result is parsed as JSON unless `binary` is passed as true
     * @param url The URL to download the file from
     * @param binary True to return the `content` as a Buffer, false to return it as some form of JSON object.
     */
    public static async DownloadFile<T>(url: string, binary?: boolean): Promise<DownloadWrapper<T> | null> {
        try {
            let startTime = Date.now();

            const axiosResponse = await axios.get(url, {responseType: binary ? "stream" : "json"});
            const content: T = axiosResponse.data;

            let timeTakenMs = Date.now() - startTime;

            let downloadedBytes = Number(axiosResponse.headers["content-length"]);

            if(binary) {
                const array = await toArray(<ReadableStream> axiosResponse.data);
                return {
                    content: <any> Buffer.concat(array),
                    downloadedBytes,
                    timeTakenMs,
                    downloadRate: (downloadedBytes * 1000 / timeTakenMs)
                }
            }
            return {
                content: content,
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
        return Math.round((bytes / 1024 / 1024) * 100) / 100;
    }

    private static RemoveNonKosherCharactersInPath(path: string) {
        return path.toLowerCase().replace(/[^a-z0-9\-]/g, "-");
    }

    private static async ProcessQueue() {
        this.queueWasProcessing = true;
        let queueEntry = this.downloadQueue[0];

        //Download manifest
        queueEntry.downloadStats.statusLabel = "Pulling manifests...";
        const downloaded = await MinecraftVersionManager.FetchVersionListing();
        const manifest = downloaded.content;

        //Update download stats
        queueEntry.downloadStats.PushCompletedFile(downloaded);

        //Find our version
        const versionSpecification = manifest.versions.find(v => v.id === queueEntry.initialRequest.gameVersionId);

        if (!versionSpecification) {
            //Check failed, bail out.
            queueEntry.log += "\nMinecraft version does not exist! Aborting download!";
            queueEntry.downloadStats.statusLabel = "Failed";
            this.SendFullQueueUpdate();
        }

        Logger.infoImpl("Download Manager", "Requesting that the MCVM get us a file list.");
        let fileList = await MinecraftVersionManager.GetFileListForGameVersion(queueEntry, versionSpecification);
        Logger.infoImpl("Download Manager", `MCVM has returned a list of files containing ${fileList.length} entries`);

        let totalSizeBytes = fileList.map(f => f.sizeBytes).reduce((previousValue, currentValue) => previousValue + currentValue, 0);
        queueEntry.log += `\nNeed to download a total of ${fileList.length} files for vanilla game client, totalling ${totalSizeBytes} bytes (${this.BytesToMiB(totalSizeBytes)}MiB)`;
        this.SendFullQueueUpdate(); //Update log on client.

        if (queueEntry.initialRequest.forgeVersionId) {
            //TODO Get forge file list.
        }

        //Update total size to include forge download

        this.SendFullQueueUpdate(); //Update log to include forge stuff.

        if (queueEntry.initialRequest.mods.length > 0) {
            //TODO: Process mods into a download queue.
        }

        //Update total size to include mods download

        queueEntry.downloadStats.totalBytes = totalSizeBytes + queueEntry.downloadStats.downloadedBytes;
        queueEntry.downloadStats.statusLabel = "Downloading files...";
        queueEntry.log += `\nNow downloading ${fileList.length} files...`

        this.SendFullQueueUpdate(); //Update log to include mod resolve info & total size

        // Actual download loop begins here
        while (fileList.length > 0) {
            const target = fileList.shift();
            try {
                //Ensure dest dir exists
                let parentDir = dirname(target.destPath);

                //Mkdir if missing
                try {
                    await access(parentDir);
                } catch(e) {
                    await mkdirp(parentDir);
                }

                const response = await this.DownloadFile<Buffer>(target.sourceUrl, true);

                //Write to file
                await writeFile(target.destPath, response.content);

                //Check hash
                if (target.sha1) {
                    const actualHash = await hasha.fromFile(target.destPath, {algorithm: "sha1"});
                    if (actualHash !== target.sha1) {
                        //Fail.
                        Logger.warnImpl("Download Manager", `SHA1 Mismatch expect ${target.sha1} got ${actualHash}`);
                        queueEntry.log += `\nWARNING: Failed to download ${target.sourceUrl} due to a SHA1 mismatch - expected ${target.sha1}, but got ${actualHash}. Retrying...`;
                        // await unlink(target.destPath);
                        fileList.unshift(target);
                        continue;
                    }
                }
                if(target.md5) {
                    const actualHash = await hasha.fromFile(target.destPath, {algorithm: "md5"});
                    if (actualHash !== target.md5) {
                        //Fail.
                        Logger.warnImpl("Download Manager", `MD5 Mismatch expect ${target.sha1} got ${actualHash}`);
                        queueEntry.log += `\nWARNING: Failed to download ${target.sourceUrl} due to an MD5 mismatch - expected ${target.md5}, but got ${actualHash}. Retrying...`;
                        await unlink(target.destPath);
                        fileList.unshift(target);
                        continue;
                    }
                }

                queueEntry.downloadStats.PushCompletedFile(response);
                this.SendFullQueueUpdate();
            } catch(e) {
                Logger.errorImpl("Download Manager", e.message);
                queueEntry.log += `\nWARNING: Network error downloading ${target.sourceUrl}. Retrying...`;
                fileList.unshift(target);
            }
        }

        queueEntry.log += "\nFinished downloading files.";

        //TODO: Forge transformers.

        queueEntry.downloadStats.statusLabel = "Finalizing...";
        this.SendFullQueueUpdate();

        this.downloadQueue.shift();
        if(this.downloadQueue.length > 0)
            this.ProcessQueue();
        else {
            this.queueWasProcessing = false;
            this.SendFullQueueUpdate();
        }
    }

    public static async HandleRequest(request: MainProcessBoundDownloadRequest) {
        //Set up download record
        Logger.infoImpl("Download Manager", `Request received to start an install. Pack name is ${request.packName}, game version is ${request.gameVersionId}, forge version is ${request.forgeVersionId}, and there are ${request.mods.length} mods to install.`);

        const downloadRecord = new DownloadRecord();
        downloadRecord.statusLabel = "Queued...";
        downloadRecord.packName = request.packName;

        //And queue entry
        const queueEntry = new DownloadQueueEntry();
        queueEntry.downloadStats = downloadRecord;
        queueEntry.initialRequest = request;
        queueEntry.log = `Checking that requested game version '${request.gameVersionId}' exists...`;
        if (request.packName)
            queueEntry.destinationRoot = join(EnvironmentManager.packsDir, this.RemoveNonKosherCharactersInPath(request.packName));

        if (queueEntry.destinationRoot && !existsSync(queueEntry.destinationRoot))
            await mkdirp(queueEntry.destinationRoot);

        if (!request.packName)
            request.packName = `Vanilla ${request.gameVersionId}`;

        //Add to the queue
        this.downloadQueue.push(queueEntry);

        //Update queue on renderer side
        this.SendFullQueueUpdate();

        if(!this.queueWasProcessing)
            this.ProcessQueue();
    }
}
