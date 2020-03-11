"use strict";
// tslint:disable only-arrow-functions
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
var assert = require("assert");
var errors_1 = require("../../lib/errors");
var OutputTest_1 = require("../../lib/OutputTest");
var MockAudioContext_1 = require("../mocks/MockAudioContext");
var MockAudioElement_1 = require("../mocks/MockAudioElement");
var mockEnumerateDevices_1 = require("../mocks/mockEnumerateDevices");
var defaultDuration = 100;
var defaultPollIntervalMs = 1;
describe('testOutputDevice', function () {
    var audioElementFactory = MockAudioElement_1.mockAudioElementFactory({
        supportSetSinkId: true,
    });
    var volumeValues = 100;
    describe("with volume values of " + volumeValues, function () {
        var report;
        before(function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, new Promise(function (resolve) {
                                OutputTest_1.testOutputDevice({
                                    audioContextFactory: MockAudioContext_1.mockAudioContextFactory({
                                        analyserNodeOptions: { volumeValues: volumeValues },
                                    }),
                                    audioElementFactory: audioElementFactory,
                                    duration: defaultDuration,
                                    enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                                        devices: [{ deviceId: 'default', kind: 'audiooutput' }],
                                    }),
                                    pollIntervalMs: defaultPollIntervalMs,
                                }).on(OutputTest_1.OutputTest.Events.End, function (_p, r) { return resolve(r); });
                            })];
                        case 1:
                            report = _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should pass', function () {
            assert(report.didPass);
        });
        // it('both start and end timestamps should be set', function() {
        //   assert(report.startTime);
        //   assert(report.endTime);
        // });
        it("all volume values should be " + volumeValues, function () {
            assert(report.values.every(function (v) { return v === volumeValues; }));
        });
    });
    describe('with volume values of 0', function () {
        var report;
        before(function () {
            return __awaiter(this, void 0, void 0, function () {
                var audioContextFactory;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            audioContextFactory = MockAudioContext_1.mockAudioContextFactory({
                                analyserNodeOptions: { volumeValues: 0 },
                            });
                            return [4 /*yield*/, new Promise(function (resolve) {
                                    OutputTest_1.testOutputDevice({
                                        audioContextFactory: audioContextFactory,
                                        audioElementFactory: audioElementFactory,
                                        duration: defaultDuration,
                                        enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                                            devices: [{ deviceId: 'default', kind: 'audiooutput' }],
                                        }),
                                        pollIntervalMs: defaultPollIntervalMs,
                                    }).on(OutputTest_1.OutputTest.Events.End, function (_p, r) { return resolve(r); });
                                })];
                        case 1:
                            report = _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should not pass', function () {
            assert(!report.didPass);
        });
        // it('both start and end timestamps should be set', function() {
        //   assert(report.startTime);
        //   assert(report.endTime);
        // });
        it('all volume values should be 0', function () {
            assert(report.values.every(function (v) { return v === 0; }));
        });
    });
    it('should report a failure if allowed to timeout and `passOnTimeout === false`', function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = {};
                        return [4 /*yield*/, new Promise(function (resolve) {
                                var test = OutputTest_1.testOutputDevice({
                                    audioContextFactory: MockAudioContext_1.mockAudioContextFactory(),
                                    audioElementFactory: audioElementFactory,
                                    duration: defaultDuration,
                                    enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                                        devices: [{ deviceId: 'default', kind: 'audiooutput' }],
                                    }),
                                    passOnTimeout: false,
                                    pollIntervalMs: defaultPollIntervalMs,
                                });
                                test.on(OutputTest_1.OutputTest.Events.Error, function (err) {
                                    result['error'] = err;
                                    if (result.error && result.report) {
                                        resolve(result);
                                    }
                                });
                                test.on(OutputTest_1.OutputTest.Events.End, function (_, r) {
                                    result['report'] = r;
                                    if (result.error && result.report) {
                                        resolve(result);
                                    }
                                });
                            })];
                    case 1:
                        _a.sent();
                        assert(result.report);
                        assert(result.error);
                        assert.equal(result.error.message, 'Test timed out.');
                        assert.equal(result.report.didPass, false);
                        assert.equal(result.report.errors.length, 1);
                        assert.equal(result.error, result.report.errors[0]);
                        return [2 /*return*/];
                }
            });
        });
    });
    describe('should immediately end and report an error', function () {
        // not providing the mock object here results in the test resorting to the
        // global
        // because these are unit tests, and node does not have these globals,
        // they are null and are essentially "not supported"
        it('when AudioContext is not supported', function () {
            return __awaiter(this, void 0, void 0, function () {
                var report, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, new Promise(function (resolve) {
                                var test = OutputTest_1.testOutputDevice({
                                    audioElementFactory: audioElementFactory,
                                    enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                                        devices: [{ deviceId: 'default', kind: 'audiooutput' }],
                                    }),
                                });
                                test.on(OutputTest_1.OutputTest.Events.Error, function () {
                                    // do nothing, prevent rejection
                                });
                                test.on(OutputTest_1.OutputTest.Events.End, function (_, r) { return resolve(r); });
                            })];
                        case 1:
                            report = _a.sent();
                            assert(report);
                            assert.equal(report.didPass, false);
                            assert.equal(report.errors.length, 1);
                            error = report.errors[0];
                            assert(error instanceof errors_1.DiagnosticError);
                            assert.equal(error.name, 'UnsupportedError');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('when Audio is not supported', function () {
            return __awaiter(this, void 0, void 0, function () {
                var report, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, new Promise(function (resolve) {
                                var test = OutputTest_1.testOutputDevice({
                                    audioContextFactory: MockAudioContext_1.mockAudioContextFactory(),
                                    enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                                        devices: [{ deviceId: 'default', kind: 'audiooutput' }],
                                    }),
                                });
                                test.on(OutputTest_1.OutputTest.Events.Error, function () {
                                    // do nothing, prevent rejection
                                });
                                test.on(OutputTest_1.OutputTest.Events.End, function (_, r) { return resolve(r); });
                            })];
                        case 1:
                            report = _a.sent();
                            assert(report);
                            assert.equal(report.didPass, false);
                            assert.equal(report.errors.length, 1);
                            error = report.errors[0];
                            assert(error instanceof errors_1.DiagnosticError);
                            assert.equal(error.name, 'UnsupportedError');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('when neither AudioContext or Audio is supported', function () {
            return __awaiter(this, void 0, void 0, function () {
                var report, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, new Promise(function (resolve) {
                                var test = OutputTest_1.testOutputDevice({
                                    enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                                        devices: [{ deviceId: 'default', kind: 'audiooutput' }],
                                    }),
                                });
                                test.on(OutputTest_1.OutputTest.Events.Error, function () {
                                    // do nothing, prevent rejection
                                });
                                test.on(OutputTest_1.OutputTest.Events.End, function (_, r) { return resolve(r); });
                            })];
                        case 1:
                            report = _a.sent();
                            assert(report);
                            assert.equal(report.didPass, false);
                            assert.equal(report.errors.length, 1);
                            error = report.errors[0];
                            assert(error instanceof errors_1.DiagnosticError);
                            assert.equal(error.name, 'UnsupportedError');
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    it('should throw if stopped twice', function () {
        var test = OutputTest_1.testOutputDevice({
            audioContextFactory: MockAudioContext_1.mockAudioContextFactory({
                analyserNodeOptions: { volumeValues: 100 },
            }),
            audioElementFactory: audioElementFactory,
            debug: false,
            enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                devices: [{ deviceId: 'default', kind: 'audiooutput' }],
            }),
        });
        var report = test.stop(false);
        assert(report);
        var shouldBeUndefined = test.stop(false);
        assert.equal(shouldBeUndefined, undefined);
    });
    it('should report an error if the audio context throws', function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, assert.rejects(function () { return new Promise(function (_, reject) {
                            var test = OutputTest_1.testOutputDevice({
                                audioContextFactory: MockAudioContext_1.mockAudioContextFactory({
                                    analyserNodeOptions: { volumeValues: 100 },
                                    doThrow: { createAnalyser: true },
                                }),
                                audioElementFactory: audioElementFactory,
                                duration: defaultDuration,
                                enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                                    devices: [{ deviceId: 'default', kind: 'audiooutput' }],
                                }),
                                pollIntervalMs: defaultPollIntervalMs,
                            });
                            test.on(OutputTest_1.OutputTest.Events.Error, function (err) { return reject(err); });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it('should allow `deviceId` if `setSinkId` is supported', function () {
        return __awaiter(this, void 0, void 0, function () {
            var report;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve) {
                            var test = OutputTest_1.testOutputDevice({
                                audioContextFactory: MockAudioContext_1.mockAudioContextFactory({
                                    analyserNodeOptions: { volumeValues: 100 },
                                }),
                                audioElementFactory: audioElementFactory,
                                deviceId: 'foobar',
                                duration: defaultDuration,
                                enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                                    devices: [{ deviceId: 'foobar', kind: 'audiooutput' }],
                                }),
                                pollIntervalMs: defaultPollIntervalMs,
                            });
                            test.on(OutputTest_1.OutputTest.Events.End, function (_, r) { return resolve(r); });
                            test.stop(true);
                        })];
                    case 1:
                        report = _a.sent();
                        assert(report);
                        return [2 /*return*/];
                }
            });
        });
    });
    it('should not allow `deviceId` if `setSinkId` is unsupported', function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, assert.rejects(function () { return new Promise(function (_, reject) {
                            var test = OutputTest_1.testOutputDevice({
                                audioContextFactory: MockAudioContext_1.mockAudioContextFactory(),
                                audioElementFactory: MockAudioElement_1.mockAudioElementFactory({ supportSetSinkId: false }),
                                deviceId: 'foobar',
                                enumerateDevices: mockEnumerateDevices_1.mockEnumerateDevicesFactory({
                                    devices: [{ deviceId: 'foobar', kind: 'audiooutput' }],
                                }),
                            });
                            test.on(OutputTest_1.OutputTest.Events.Error, function (err) { return reject(err); });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
//# sourceMappingURL=OutputTest.js.map