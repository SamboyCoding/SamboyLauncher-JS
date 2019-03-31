"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const moment = require("moment");
class Logger {
    static debugImpl(source, msg) {
        Logger.log(source, msg, chalk_1.default.white, "Debug");
    }
    static infoImpl(source, msg) {
        Logger.log(source, msg, chalk_1.default.blue, "Info");
    }
    static warnImpl(source, msg) {
        Logger.log(source, msg, chalk_1.default.yellow, "Warning");
    }
    static errorImpl(source, msg) {
        Logger.log(source, msg, chalk_1.default.red, "Error");
    }
    static debug(msg) {
        Logger.log("Updater", msg, chalk_1.default.white, "Debug");
    }
    static info(msg) {
        Logger.log("Updater", msg, chalk_1.default.blue, "Info");
    }
    static warn(msg) {
        Logger.log("Updater", msg, chalk_1.default.yellow, "Warning");
    }
    static error(msg) {
        Logger.log("Updater", msg, chalk_1.default.red, "Error");
    }
    static log(source, msg, color, type) {
        console.log(color(`[${moment().format("HH:mm:ss")}] [${type}] [${source}] ${msg}`));
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map