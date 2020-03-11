"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var BitrateTest_1 = require("./BitrateTest");
var InputTest_1 = require("./InputTest");
var NetworkTest_1 = require("./NetworkTest");
var OutputTest_1 = require("./OutputTest");
/**
 * If the `Twilio` object does not exist, make it.
 * Then, add the `Diagnostics` object to it.
 * This makes `window.Twilio.Diagnostics` available after loading the bundle in
 * the browser.
 */
window.Twilio = window.Twilio || {};
window.Twilio.Diagnostics = __assign(__assign({}, window.Twilio.Diagnostics), { testBitrate: BitrateTest_1.testBitrate,
    testInputDevice: InputTest_1.testInputDevice,
    testNetwork: NetworkTest_1.testNetwork,
    testOutputDevice: OutputTest_1.testOutputDevice });
//# sourceMappingURL=diagnostics.js.map