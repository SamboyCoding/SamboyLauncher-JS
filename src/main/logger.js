"use strict";
exports.__esModule = true;
var chalk_1 = require("chalk");
var Logger = (function () {
    function Logger() {
    }
    Logger.debug = function (msg) {
        Logger.log(msg, chalk_1["default"].white, "Debug");
    };
    Logger.info = function (msg) {
        Logger.log(msg, chalk_1["default"].blue, "Info");
    };
    Logger.warn = function (msg) {
        Logger.log(msg, chalk_1["default"].yellow, "Warning");
    };
    Logger.error = function (msg) {
        Logger.log(msg, chalk_1["default"].red, "Error");
    };
    Logger.log = function (msg, colour, type) {
        console.log(colour("[" + type + "] " + msg));
    };
    return Logger;
}());
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map