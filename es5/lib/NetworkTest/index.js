"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var errors_1 = require("../errors");
var NetworkInformation_1 = require("../polyfills/NetworkInformation");
var utils_1 = require("../utils");
var optionValidation_1 = require("../utils/optionValidation");
var TestCall_1 = require("./TestCall");
/**
 * Runs network connectivity tests while connected to Twilio.
 * This can be used to test connectivity to different regions using either UDP or TCP protocol.
 * Region and protocol can be specified using [[NetworkTest.Options.iceServers]] option.
 */
var NetworkTest = /** @class */ (function (_super) {
    __extends(NetworkTest, _super);
    /**
     * Initializes the test and starts it.
     * @param options Options to pass to the constructor.
     */
    function NetworkTest(options) {
        var _this = _super.call(this) || this;
        /**
         * When the test ends, generated by a call to `Date.now` as soon as
         * [[NetworkTest._stop]] is called internally.
         */
        _this._endTime = null;
        /**
         * Any errors that the [[NetworkTest]] encounters during its run time.
         */
        _this._errors = [];
        /**
         * Network event time measurements.
         */
        _this._networkTiming = {};
        /**
         * The [[TestCall]] used internally.
         */
        _this._testCall = null;
        _this._options = __assign(__assign({}, NetworkTest.defaultOptions), options);
        _this._startTime = Date.now();
        _this._peerConnectionConfig = {
            iceServers: _this._options.iceServers,
        };
        setTimeout(function () { return _this._startTest(); });
        return _this;
    }
    /**
     * Determine if the test has passed or not.
     */
    NetworkTest.prototype._determinePass = function () {
        return this._errors.length === 0;
    };
    /**
     * Adds the error to the internal list of errors that have occured, which will
     * be included in the final test report.
     * @param error
     */
    NetworkTest.prototype._onError = function (error) {
        this._errors.push(error);
        this.emit(NetworkTest.Events.Error, error);
    };
    /**
     * Starts the test by connecting the two [[RTCPeerConnection]] ends of the
     * [[TestCall]] and then attempting to send a message from one end to the
     * other. If this process takes
     */
    NetworkTest.prototype._startTest = function () {
        return __awaiter(this, void 0, void 0, function () {
            var waitReceivedMessage_1, error_1, error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, optionValidation_1.validateOptions(this._options, { timeoutMs: optionValidation_1.validateTime })];
                    case 1:
                        _a.sent();
                        this._testCall = new TestCall_1.TestCall({
                            peerConnectionConfig: this._peerConnectionConfig,
                            peerConnectionFactory: this._options.peerConnectionFactory,
                            timeoutDuration: this._options.timeoutMs,
                        });
                        waitReceivedMessage_1 = new Promise(function (resolve, reject) {
                            if (!_this._testCall) {
                                reject(new errors_1.InvalidStateError('TestCall is `null`.'));
                                return;
                            }
                            _this._testCall.on(TestCall_1.TestCall.Event.Message, function (message) {
                                if (message.data === NetworkTest.testMessage) {
                                    _this._networkTiming.firstPacket = Date.now();
                                    resolve();
                                }
                            });
                        });
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, utils_1.waitForPromise((function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!this._testCall) {
                                                throw new errors_1.InvalidStateError('TestCall is `null`.');
                                            }
                                            return [4 /*yield*/, this._testCall.establishConnection()];
                                        case 1:
                                            _a.sent();
                                            this._testCall.send(NetworkTest.testMessage);
                                            return [4 /*yield*/, waitReceivedMessage_1];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })(), this._options.timeoutMs)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        if (error_1 instanceof errors_1.PromiseTimedOutError) {
                            throw new errors_1.DiagnosticError(undefined, 'NetworkTest timeout, the PeerConnection did not receive the ' +
                                'message.');
                        }
                        else {
                            // Re-throw the error so the handler at the end of `_startTest`
                            // can handle it properly.
                            throw error_1;
                        }
                        return [3 /*break*/, 5];
                    case 5:
                        // If none of the Promises reject, then we successfully received the
                        // `testMessage`.
                        this._stop(true);
                        return [3 /*break*/, 7];
                    case 6:
                        error_2 = _a.sent();
                        if (error_2 instanceof errors_1.DiagnosticError) {
                            this._onError(error_2);
                        }
                        else if (typeof DOMException !== 'undefined' && error_2 instanceof DOMException) {
                            // Could be thrown by the PeerConnections during the call
                            // `testCall.establishConnection`.
                            this._onError(new errors_1.DiagnosticError(error_2, 'A `DOMException` occurred.'));
                        }
                        else if (typeof DOMError !== 'undefined' && error_2 instanceof DOMError) {
                            this._onError(new errors_1.DiagnosticError(error_2, 'A `DOMError` occurred.'));
                        }
                        else {
                            // An unknown error occurred.
                            this._onError(error_2);
                        }
                        this._stop(false);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stop the `NetworkTest`. This performs cleanup on the [[TestCall]] and
     * emits a report for the test.
     * @param didPass Override the check. Useful when encountering a fatal error.
     */
    NetworkTest.prototype._stop = function (didPass) {
        if (didPass === void 0) { didPass = true; }
        if (this._testCall) {
            this._testCall.close();
        }
        // Use the network information polyfill, if the info is `undefined` then
        // use an empty object so all members will be `undefined`.
        var info = this._options.networkInformation || {};
        this._endTime = Date.now();
        var testCallNetworkTiming = this._testCall
            ? this._testCall.getNetworkTiming()
            : {};
        // We are unable to use the spread operator here on `networkInformation`,
        // the values will always be `undefined`.
        var report = {
            didPass: didPass && this._determinePass(),
            downlink: info.downlink,
            downlinkMax: info.downlinkMax,
            effectiveType: info.effectiveType,
            errors: this._errors,
            networkTiming: __assign(__assign({}, this._networkTiming), testCallNetworkTiming),
            rtt: info.rtt,
            saveData: info.saveData,
            testName: NetworkTest.testName,
            testTiming: {
                duration: this._endTime - this._startTime,
                end: this._endTime,
                start: this._startTime,
            },
            type: info.type,
        };
        this.emit(NetworkTest.Events.End, report);
    };
    /**
     * The test message that is sent from one end of the [[TestCall]] to the
     * other to determine connectivity through WebRTC.
     * @private
     */
    NetworkTest.testMessage = 'Ahoy, world!';
    /**
     * The name of the test.
     */
    NetworkTest.testName = 'network-connectivity';
    /**
     * Default options for the [[NetworkTest]]. These will be overwritten by any
     * option passed in the [[NetworkTest.constructor]] `options` parameter.
     */
    NetworkTest.defaultOptions = {
        networkInformation: NetworkInformation_1.networkInformationPolyfill,
        timeoutMs: 5000,
    };
    return NetworkTest;
}(events_1.EventEmitter));
exports.NetworkTest = NetworkTest;
(function (NetworkTest) {
    /**
     * Possible events that an `NetworkTest` might emit. See [[NetworkTest.on]].
     */
    var Events;
    (function (Events) {
        Events["End"] = "end";
        Events["Error"] = "error";
    })(Events = NetworkTest.Events || (NetworkTest.Events = {}));
})(NetworkTest = exports.NetworkTest || (exports.NetworkTest = {}));
exports.NetworkTest = NetworkTest;
/**
 * Test network connectivity to Twilio
 * @param options
 */
function testNetwork(options) {
    return new NetworkTest(options);
}
exports.testNetwork = testNetwork;
//# sourceMappingURL=index.js.map