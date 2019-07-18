import chalk, {Chalk} from "chalk";
import {createWriteStream, WriteStream} from "fs";
import moment from "moment";
import {join} from "path";
import EnvironmentManager from "./managers/EnvironmentManager";

export default class Logger {
    private static readonly LOG_DEBUG_MESSAGES = true;
    public static stream: WriteStream;
    private static readonly logFilePath = join(EnvironmentManager.launcherDir, "output.log");

    public static debugImpl(source: string, msg: string) {
        if (this.LOG_DEBUG_MESSAGES)
            Logger.log(source, msg, chalk.white, "Debug");
    }

    public static infoImpl(source: string, msg: string) {
        Logger.log(source, msg, chalk.blue, "Info");
    }

    public static warnImpl(source: string, msg: string) {
        Logger.log(source, msg, chalk.yellow, "Warning");
    }

    public static errorImpl(source: string, msg: string) {
        Logger.log(source, msg, chalk.red, "Error");
    }

    private static debug(msg: string) {
        if (this.LOG_DEBUG_MESSAGES)
            Logger.log("Updater", msg, chalk.white, "Debug");
    }

    private static info(msg: string) {
        Logger.log("Updater", msg, chalk.blue, "Info");
    }

    private static warn(msg: string) {
        Logger.log("Updater", msg, chalk.yellow, "Warning");
    }

    private static error(msg: string) {
        Logger.log("Updater", msg, chalk.red, "Error");
    }

    private static log(source: string, msg: string, color: Chalk, type: string) {
        if (!this.stream)
            this.stream = createWriteStream(Logger.logFilePath);

        let toLog = `[${moment().format("HH:mm:ss")}] [${type}] [${source}] ${msg}`;

        this.stream.write(toLog + "\n");

        console.log(color(toLog));
    }
}
