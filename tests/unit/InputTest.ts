// tslint:disable only-arrow-functions

import * as assert from 'assert';
import * as sinon from 'sinon';
import { DiagnosticError } from '../../lib/errors';
import {
  InputTest,
  testInputDevice,
} from '../../lib/InputTest';
import { mockAudioContextFactory } from '../mocks/MockAudioContext';
import { mockBlobFactory } from '../mocks/MockBlob';
import { mockEnumerateDevicesFactory } from '../mocks/mockEnumerateDevices';
import { mockGetUserMediaFactory } from '../mocks/mockGetUserMedia';
import { mockMediaRecorderFactory } from '../mocks/MockMediaRecorder';
import { MockMediaStream } from '../mocks/MockMediaStream';
import { MockTrack } from '../mocks/MockTrack';

function createTestOptions(
  overrides: Partial<InputTest.Options> = {},
): InputTest.Options {
  return {
    audioContextFactory: mockAudioContextFactory() as any,
    blobFactory: mockBlobFactory() as any,
    createObjectURL: sinon.stub().returns('foo'),
    duration: 1000,
    enumerateDevices: mockEnumerateDevicesFactory({
      devices: [{ deviceId: 'default', kind: 'audioinput' } as any],
    }),
    getUserMedia: mockGetUserMediaFactory({
      mediaStream: new MockMediaStream({
        tracks: [new MockTrack()],
      }),
    }) as any,
    mediaRecorderFactory: mockMediaRecorderFactory() as any,
    volumeEventIntervalMs: 100,
    ...overrides,
  };
}

describe('testInputDevice', function() {
  let clock: sinon.SinonFakeTimers;

  before(function() {
    clock = sinon.useFakeTimers();
  });

  after(function() {
    sinon.restore();
  });

  async function runBasicTest(
    testOptions: InputTest.Options,
  ) {
    const errorHandler: sinon.SinonStub = sinon.stub();
    const volumeHandler: sinon.SinonStub = sinon.stub();
    const endHandler: sinon.SinonStub = sinon.stub();

    const inputTest = testInputDevice(testOptions);
    inputTest.on(InputTest.Events.Error, errorHandler);
    inputTest.on(InputTest.Events.Volume, volumeHandler);
    inputTest.on(InputTest.Events.End, endHandler);

    await clock.runAllAsync();

    return {
      endHandler,
      errorHandler,
      inputTest,
      volumeHandler,
    };
  }

  describe('in a supported environment', function() {
    describe('when all volume values are all 0', function() {
      let errorHandler: sinon.SinonStub;
      let volumeHandler: sinon.SinonStub;
      let endHandler: sinon.SinonStub;

      before(async function() {
        const options = createTestOptions({
          audioContextFactory: mockAudioContextFactory({
            analyserNodeOptions: { volumeValues: 0 },
          }) as any,
        });
        const handlers = await runBasicTest(options);
        endHandler = handlers.endHandler;
        errorHandler = handlers.errorHandler;
        volumeHandler = handlers.volumeHandler;
      });

      it('should not have emitted any error event', function() {
        assert(errorHandler.notCalled);
      });

      it('should have emitted at least one volume event', function() {
        assert(volumeHandler.called);
      });

      it('should generate a valid report', function() {
        assert(endHandler.calledOnce);
        const report: InputTest.Report = endHandler.args[0][0];
        assert(report);
        assert(!report.didPass);
        assert.equal(report.values.length, volumeHandler.callCount);
        assert(report.values.every(v => v === 0));
      });
    });

    describe('when all volume values are all 100', function() {
      let errorHandler: sinon.SinonStub;
      let volumeHandler: sinon.SinonStub;
      let endHandler: sinon.SinonStub;

      before(async function() {
        const options = createTestOptions({
          audioContextFactory: mockAudioContextFactory({
            analyserNodeOptions: { volumeValues: 100 },
          }) as any,
        });
        const handlers = await runBasicTest(options);
        endHandler = handlers.endHandler;
        errorHandler = handlers.errorHandler;
        volumeHandler = handlers.volumeHandler;
      });

      it('should not have emitted any error event', function() {
        assert(errorHandler.notCalled);
      });

      it('should have emitted at least one volume event', function() {
        assert(volumeHandler.called);
      });

      it('should generate a valid report', function() {
        assert(endHandler.calledOnce);
        const report: InputTest.Report = endHandler.args[0][0];
        assert(report);
        assert(report.didPass);
        assert.equal(report.values.length, volumeHandler.callCount);
        assert(report.values.every(v => v === 100));
      });
    });

    describe('when recording audio', function() {
      let errorHandler: sinon.SinonStub;
      let volumeHandler: sinon.SinonStub;
      let endHandler: sinon.SinonStub;
      let inputTest: InputTest;

      before(async function() {
        const options = createTestOptions({
          recordAudio: true,
        });
        const test = await runBasicTest(options);
        endHandler = test.endHandler;
        errorHandler = test.errorHandler;
        volumeHandler = test.volumeHandler;
        inputTest = test.inputTest;
      });

      it('should have captured audio blobs', function() {
        assert(inputTest['_audioBlobs']?.length);
      });
    });
  });

  describe('in an unsupported environment', function() {
    describe('it should immediately end and report an error', function() {
      ([ [
        'AudioContext', createTestOptions({ audioContextFactory: undefined }),
      ], [
        'getUserMedia', createTestOptions({ getUserMedia: undefined }),
      ], [
        'createObjectURL', createTestOptions({ createObjectURL: undefined, recordAudio: true }),
      ], [
        'enumerateDevices', createTestOptions({ enumerateDevices: undefined }),
      ], [
        'mediaRecorder', createTestOptions({ mediaRecorderFactory: undefined, recordAudio: true }),
      ], [
        'Blob', createTestOptions({ blobFactory: undefined, recordAudio: true }),
      ] ] as const).forEach(([title, options]) => {
        it(`when ${title} is not supported`, async function() {
          const handlers = await runBasicTest(options);
          const endHandler = handlers.endHandler;
          const errorHandler = handlers.errorHandler;
          const volumeHandler = handlers.volumeHandler;

          assert(endHandler.calledOnce);
          const report: InputTest.Report = endHandler.args[0][0];
          assert(report);
          assert(!report.didPass);
          assert(errorHandler.calledOnce);
          assert(errorHandler.calledBefore(endHandler));
          assert(volumeHandler.notCalled);
        });
      });
    });
  });

  it('should throw if passed invalid options', async function() {
    const invalidOptions = [{
      deviceId: 0,
    }, {
      deviceId: {},
    }, {
      duration: -10,
    }, {
      duration: {},
    }, {
      volumeEventIntervalMs: -10,
    }, {
      volumeEventIntervalMs: {},
    }, {
      recordAudio: {},
    }] as any;

    for (const overrides of invalidOptions) {
      const options = createTestOptions(overrides);
      const {
        endHandler,
        errorHandler,
        volumeHandler,
      } = await runBasicTest(options);
      assert(endHandler.calledOnce);
      assert(errorHandler.calledOnce);
      assert(endHandler.calledAfter(errorHandler));
      assert(volumeHandler.notCalled);
    }
  });

  it('should warn if stopped multiple times', async function() {
    const consoleStub = sinon.stub(console, 'warn');
    try {
      const options = createTestOptions({ debug: true });
      const test = testInputDevice(options);
      const report = test.stop();
      assert(report);
      const shouldBeUndefined = test.stop();
      assert.equal(shouldBeUndefined, undefined);
      assert(consoleStub.calledOnce);
    } finally {
      await clock.runAllAsync();
      consoleStub.restore();
    }
  });

  describe('should handle when an error is thrown during the test', function() {
    ([ [
      'AudioContext', createTestOptions({
        audioContextFactory: mockAudioContextFactory({
          throw: { construction: new DiagnosticError() },
        }) as any,
      }),
    ], [
      'getUserMedia', createTestOptions({
        getUserMedia: mockGetUserMediaFactory({
          throw: new DiagnosticError(),
        }) as any,
      }),
    ], [
      'enumerateDevices', createTestOptions({
        enumerateDevices: mockEnumerateDevicesFactory({
          devices: [],
          throw: new DiagnosticError(),
        }) as any,
      }),
    ], [
      'MediaRecorder', createTestOptions({
        mediaRecorderFactory: mockMediaRecorderFactory({
          throw: { construction: new DiagnosticError() },
        }) as any,
        recordAudio: true,
      }),
    ] ] as const).forEach(([title, options]) => {
      it(`by ${title}`, async function() {
        const {
          endHandler,
          errorHandler,
          volumeHandler,
        } = await runBasicTest(options);
        assert(endHandler.calledOnce);
        const report: InputTest.Report = endHandler.args[0][0];
        assert(report);
        assert(!report.didPass);
        assert(errorHandler.calledOnce);
        assert(errorHandler.calledBefore(endHandler));
        assert(volumeHandler.notCalled);
      });
    });

    ([ [
      'DiagnosticError', new DiagnosticError(),
    ], [
      'DOMException', new (global as any).DOMException(),
    ], [
      'DOMError', new (global as any).DOMError(),
    ], [
      'unknown error', new Error(),
    ] ] as const).forEach(([title, error]) => {
      it(`of type ${title}`, async function() {
        const options = createTestOptions({
          audioContextFactory: mockAudioContextFactory({
            throw: { construction: error },
          }) as any,
        });
        const {
          endHandler,
          errorHandler,
          volumeHandler,
        } = await runBasicTest(options);
        assert(endHandler.calledOnce);
        assert(errorHandler.calledOnce);
        assert(endHandler.calledAfter(errorHandler));
        assert(volumeHandler.notCalled);

        const handledError = errorHandler.args[0][0];
        const report: InputTest.Report = endHandler.args[0][0];
        assert(!report.didPass);
        assert.equal(report.errors.length, 1);
        assert.equal(handledError, report.errors[0]);
      });
    });
  });
});
