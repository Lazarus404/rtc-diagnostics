import { EventEmitter } from 'events';
import { INCOMING_SOUND_URL } from './constants';
import {
  AlreadyStoppedError,
  DiagnosticError,
  UnsupportedError,
} from './errors';
import {
  Audio,
  AudioContext,
  AudioContextUnsupportedError,
  AudioUnsupportedError,
} from './polyfills';
import { AudioElement } from './types';

export declare interface OutputTest {
  emit(event: OutputTest.Events.End, didPass: boolean, report: OutputTest.Report): boolean;
  emit(event: OutputTest.Events.Error, error: DiagnosticError): boolean;
  emit(event: OutputTest.Events.Volume, value: number): boolean;

  on(event: OutputTest.Events.End, listener: (didPass: boolean, report: OutputTest.Report) => any): this;
  on(event: OutputTest.Events.Error, listener: (error: DiagnosticError) => any): this;
  on(event: OutputTest.Events.Volume, listener: (value: number) => any): this;
}

/**
 * Supervises an output device test by playing a sound clip that is either the
 * ringing tone for the Client SDK, or defined by the member `testURI` in the
 * `options` parameter.
 *
 * If the data at `testURI` is unable to be loaded, meaning the error event is
 * fired on the audio element, then the test ends immediately with an error in
 * the report.
 *
 * If `doLoop` is set to `false`, then the test will run for either the option
 * `duration`, or the full duration of the audio file, which ever is shorter.
 * If `doLoop` is set to `true`, it will only run as long as the `duration`
 * option.
 * If the test times out (as defined by the `duration` in the `options`
 * paramater), then the test is considered passing or not by the `passOnTimeout`
 * option and ends.
 */
export class OutputTest extends EventEmitter {
  static defaultOptions: OutputTest.Options = {
    audioContextFactory: AudioContext,
    audioElementFactory: Audio,
    debug: false,
    doLoop: true,
    duration: Infinity,
    passOnTimeout: true,
    pollIntervalMs: 100,
    testURI: INCOMING_SOUND_URL,
  };
  static testName = 'output-volume' as const;

  private _audioContext: AudioContext | null = null;
  private _audioElement: AudioElement | null = null;
  private _endTime: number | null = null;
  private readonly _errors: DiagnosticError[] = [];
  private _options: OutputTest.Options;
  private _playPromise: Promise<void> | null = null;
  private _startTime: number;
  private readonly _values: number[] = [];
  private _volumeTimeout: NodeJS.Timeout | null = null;

  /**
   * Sets up several things for the `OutputTest` to run later in the
   * `_startTest` function.
   * An `AudioContext` is created if none is passed in the `options` parameter
   * and the `_startTime` is immediately set.
   * @param options
   */
  constructor(options: Partial<OutputTest.Options> = {}) {
    super();

    this._options = { ...OutputTest.defaultOptions, ...options };

    this._startTime = Date.now();

    // We need to use a `setTimeout` here to prevent a race condition.
    // This allows event listeners to bind before the test starts.
    setTimeout(() => this._startTest());
  }

  /**
   * Stops the test. The call can be given a pass parameter for cases where the
   * user is able to hear and not.
   * @param pass
   */
  stop(pass: boolean = false) {
    if (this._endTime) {
      this._onWarning(new AlreadyStoppedError());
      return;
    }

    // Clean up the test.
    this._cleanup();

    this._endTime = Date.now();
    const report: OutputTest.Report = {
      deviceId: this._options.deviceId,
      didPass: pass,
      endTime: this._endTime,
      errors: this._errors,
      startTime: this._startTime,
      testName: OutputTest.testName,
      testURI: this._options.testURI,
      values: this._values,
    };
    this.emit(OutputTest.Events.End, report.didPass, report);

    return report;
  }

  /**
   * Cleanup the test.
   */
  private _cleanup() {
    if (this._volumeTimeout) {
      clearTimeout(this._volumeTimeout);
    }
    if (this._audioContext) {
      this._audioContext.close();
    }
    if (this._playPromise) {
      this._playPromise.then(() => {
        // we need to try to wait for the call to play to finish before we can
        // pause the audio
        if (this._audioElement) {
          this._audioElement.pause();
        }
      }).catch(() => {
        // this means play errored out so we do nothing
      });
    }
  }

  /**
   * Error event handler. Adds the error to the internal list of errors that is
   * forwarded in the report.
   * @param error
   */
  private _onError(error: DiagnosticError) {
    this._errors.push(error);
    this.emit(OutputTest.Events.Error, error);
  }

  /**
   * Volume event handler, adds the value to the list `_values` and emits it
   * under the event `volume`.
   * @param volume
   */
  private _onVolume(volume: number) {
    this._values.push(volume);
    this.emit(OutputTest.Events.Volume, volume);
  }

  /**
   * Warning event handler.
   * @param warning
   */
  private _onWarning(error: DiagnosticError) {
    if (this._options.debug) {
      // tslint:disable-next-line no-console
      console.warn(error);
    }
  }

  /**
   * Entry point of the test, called after setup in the constructor.
   * Emits the volume levels of the audio.
   * @event `OutputTest.Events.Volume`
   */
  private async _startTest() {
    try {
      if (!this._options.audioContextFactory) {
        throw AudioContextUnsupportedError;
      }
      this._audioContext = new this._options.audioContextFactory();

      if (!this._options.audioElementFactory) {
        throw AudioUnsupportedError;
      }
      this._audioElement = new this._options.audioElementFactory(this._options.testURI);
      this._audioElement.setAttribute('crossorigin', 'anonymous');
      this._audioElement.loop = this._options.doLoop;

      if (this._options.deviceId) {
        if (this._audioElement.setSinkId) {
          await this._audioElement.setSinkId(this._options.deviceId);
        } else {
          // Non-fatal error
          this._onError(new UnsupportedError(
            'A `deviceId` was passed to the `OutputTest` but `setSinkId` is ' +
            'not supported in this browser.',
          ));
        }
      }

      const source: MediaElementAudioSourceNode =
        this._audioContext.createMediaElementSource(this._audioElement);
      source.connect(this._audioContext.destination);

      const analyser: AnalyserNode = this._audioContext.createAnalyser();
      analyser.smoothingTimeConstant = 0.4;
      analyser.fftSize = 64;
      source.connect(analyser);

      const frequencyDataBytes: Uint8Array = new Uint8Array(analyser.frequencyBinCount);
      const volumeEvent = () => {
        if (this._endTime) {
          return;
        }

        analyser.getByteFrequencyData(frequencyDataBytes);
        const volume: number =
          frequencyDataBytes.reduce((sum, val) => sum + val, 0) /
          frequencyDataBytes.length;
        this._onVolume(volume);

        // Check stop conditions
        const isTimedOut = Date.now() - this._startTime > this._options.duration;
        const stop = this._options.doLoop
          ? isTimedOut
          : (this._audioElement && this._audioElement.ended) || isTimedOut;

        if (stop) {
          if (this._options.passOnTimeout === false) {
            this._onError(new DiagnosticError(
              undefined,
              'Test timed out.',
            ));
          }
          this.stop(this._options.passOnTimeout);
        } else {
          this._volumeTimeout = setTimeout(
            volumeEvent,
            this._options.pollIntervalMs,
          );
        }
      };

      this._playPromise = this._audioElement.play();
      await this._playPromise;
      this._volumeTimeout = setTimeout(
        volumeEvent,
        this._options.pollIntervalMs,
      );
    } catch (error) {
      if (error instanceof DiagnosticError) {
        this._onError(error);
      } else if (
        typeof DOMException !== 'undefined' && error instanceof DOMException
      ) {
        this._onError(new DiagnosticError(
          error,
          'A DOMException has occurred.',
        ));
      } else if (
        typeof DOMError !== 'undefined' && error instanceof DOMError
      ) {
        this._onError(new DiagnosticError(
          error,
          'A DOMError has occurred.',
        ));
      } else {
        this._onError(new DiagnosticError(
          undefined,
          'Unknown error occurred.',
        ));
        this._onWarning(error);
      }
      this.stop(false);
    }
  }
}

export namespace OutputTest {
  /**
   * Events that the OutputTest will emit as it runs.
   * Please see [[OutputTest.emit]] and [[OutputTest.on]].
   * @event
   */
  export enum Events {
    /**
     * Emitted when the test ends. The stop condition depends on if the option
     * to loop was set to true or false. If false, then the test ends either
     * when the audio file is finished playing, or when a time has elapsed
     * greater than [[OutputTest.Options.duration]].
     * @event
     */
    End = 'end',
    /**
     * Emitted when the test has run into an error, fatal or not.
     * @event
     */
    Error = 'error',
    /**
     * Emitted every [[OutputTest.Options.pollIntervalMs]], will have a `number`
     * parameter representing the current volume of the audio file.
     * @event
     */
    Volume = 'volume',
  }

  /**
   * Possible options for the [[OutputTest]]. Both the helper function and the
   * constructor accepts a `Partial` of this.
   */
  export interface Options {
    /**
     * An `AudioContext` to be used by the test. This will _not_ be closed
     * by the test if passed in. If it is not passed in, an `AudioContext` will
     * be made that will be closed.
     */
    audioContextFactory?: typeof window.AudioContext;
    /**
     * A constuctor that is used to create an [[AudioElement]], useful for
     * mocks.
     * @private
     */
    audioElementFactory?: new (...args: any[]) => AudioElement;
    /**
     * Whether or not to log debug statements to the console.
     */
    debug: boolean;
    /**
     * The `deviceId` of the audio device to attempt to play audio out of.
     * This option is directly passed to [[AudioElement.setSinkId]].
     */
    deviceId?: string;
    /**
     * Whether or not to loop the audio.
     * See [[OutputTest]] for details on the behavior of "timing out".
     */
    doLoop: boolean;
    /**
     * Duration to run the test for. If this amount of time elapses, the test
     * is considered "timed out".
     * See [[OutputTest]] for details on the behavior of "timing out".
     */
    duration: number;
    /**
     * Set [[OutputTest.Report.didPass]] to true or not upon test timeout.
     * See [[OutputTest]] for details on the behavior of "timing out".
     */
    passOnTimeout: boolean;
    /**
     * The polling rate and how often the test emits a volume event.
     */
    pollIntervalMs: number;
    /**
     * The URI of the audio file.
     */
    testURI: string;
  }

  /**
   * The test summary that is emitted when the OutputTest ends with event
   * `[[OutputTest.Events.End]]`.
   */
  export interface Report {
    /**
     * The `deviceId` of the audio device. Can be any audio device listed by
     * `navigator.mediaDevices.enumerateAudioDevices` with the `type` of
     * `output`.
     */
    deviceId: string | undefined;
    /**
     * Whether or not the [[OutputTest]] should be considered passing.
     */
    didPass: boolean;
    /**
     * The end timestamp when the test completed and emitted a report.
     */
    endTime: number;
    /**
     * Any errors that occurred during the run-time of the [[OutputTest]].
     */
    errors: DiagnosticError[];
    /**
     * The start timestamp when the test was constructed.
     */
    startTime: number;
    /**
     * Name of the test, set to [[OutputTest.testName]].
     */
    testName: typeof OutputTest.testName;
    /**
     * The URI of the audio file.
     */
    testURI: string;
    /**
     * The volume values emitted by the test during its run-time.
     */
    values: number[];
  }
}

/**
 * Helper function that creates an OutputTest object.
 * @param deviceId
 * @param options
 */
export function testOutputDevice(): OutputTest;

export function testOutputDevice(
  deviceId: string | undefined,
  options?: Partial<OutputTest.Options>,
): OutputTest;

export function testOutputDevice(
  deviceId?: string,
  options: Partial<OutputTest.Options> = {},
) {
  return new OutputTest({ ...options, deviceId });
}
