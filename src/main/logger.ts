import chalk, { Chalk } from "chalk";

export class Logger {

    public static debug(msg: string) {
        Logger.log(msg, chalk.white, "Debug");
    }

    public static info(msg: string) {
        Logger.log(msg, chalk.blue, "Info");
    }

    public static warn(msg: string) {
        Logger.log(msg, chalk.yellow, "Warning");
    }

    public static error(msg: string) {
        Logger.log(msg, chalk.red, "Error");
    }

    private static log(msg: string, color: Chalk, type: string) {
        console.log(color("[" + type + "] " + msg));
    }
}