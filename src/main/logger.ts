import chalk, {Chalk} from "chalk";
import moment from "moment";

export default class Logger {

    public static debugImpl(source: string, msg: string) {
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
        console.log(color(`[${moment().format("HH:mm:ss")}] [${type}] [${source}] ${msg}`));
    }
}
