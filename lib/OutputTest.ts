import { EventEmitter } from 'events';
import { INCOMING_SOUND_URL, TestName } from './constants';
import {
  AlreadyStoppedError,
  DiagnosticError,
  InvalidOptionsError,
  UnsupportedError,
} from './errors';
import {
  Audio,
  AudioContext,
  AudioContextUnsupportedError,
  AudioUnsupportedError,
  enumerateDevices,
  EnumerateDevicesUnsupportedError,
  getDefaultDevices,
} from './polyfills';
import {
  AudioElement,
  SubsetRequired,
  TimeMeasurement,
} from './types';
import {
  InvalidityRecord,
  validateDeviceId,
  validateOptions,
  validateTime,
} from './utils/optionValidation';

export declare interface OutputTest {
  /**
   * This event is emitted when the test ends.
   * @param event [[OutputTest.Events.End]]
   * @param report A summary of the test.
   * @private
   */
  emit(
    event: OutputTest.Events.End,
    report: OutputTest.Report,
  ): boolean;
  /**
   * This event is emitted when the test encounters an error, fatal or not.
   * @param event [[OutputTest.Events.Error]]
   * @param error An error that was encountered during the run time of the test.
   * @private
   */
  emit(
    event: OutputTest.Events.Error,
    error: DiagnosticError,
  ): boolean;
  /**
   * This event is emitted by the test after succesfully starting, and emits
   * the volume of the audio source every [[OutputTest.Options.volumeEventIntervalMs]]
   * milliseconds.
   * @param event [[OutputTest.Events.Volume]]
   * @param value The volume of the audio source.
   * @private
   */
  emit(
    event: OutputTest.Events.Volume,
    value: number,
  ): boolean;

  /**
   * Raised when the test ends. The stop condition depends on if the option
   * to loop was set to `true` or `false`. If `false`, then the test ends either
   * when the audio file is finished playing, or when a time has elapsed
   * greater than [[OutputTest.Options.duration]].
   * @event
   * @param event [[OutputTest.Events.End]]
   * @param listener A listener function that expects the following parameters
   * when the event is raised:
   * - A [[OutputTest.Report]] that summarizes the run time of the test.
   * @returns This [[OutputTest]] instance.
   */
  on(
    event: OutputTest.Events.End,
    listener: (report: OutputTest.Report) => any,
  ): this;
  /**
   * Raised when the test has run into an error, fatal or not.
   * @event
   * @param event [[OutputTest.Events.Error]]
   * @param listener A listener function that expects the following parameters
   * when the event is raised:
   * - The [[DiagnosticError]].
   * @returns This [[OutputTest]] instance.
   */
  on(
    event: OutputTest.Events.Error,
    listener: (error: DiagnosticError) => any,
  ): this;
  /**
   * Raised every [[OutputTest.Options.volumeEventIntervalMs]] after the test
   * starts successfully. Will have a `number` parameter representing the
   * current volume of the audio file.
   * @event
   * @param event [[OutputTest.Events.Volume]]
   * @param listener A listener function that expects the following parameters
   * when the event is raised:
   * - A number representing the volume of the audio source.
   * @returns This [[OutputTest]] instance.
   */
  on(
    event: OutputTest.Events.Volume,
    listener: (value: number) => any,
  ): this;
}

/**
 * [[OutputTest]] class that parses options and starts an audio output device
 * test.
 *
 * Please see [[testOutputDevice]] for details and recommended practices.
 */
export class OutputTest extends EventEmitter {
  /**
   * The name of the test.
   */
  static testName: TestName.OutputAudioDevice = TestName.OutputAudioDevice;
  /**
   * Default options for the [[OutputTest]]. Overwritten by any option passed
   * during the construction of the test.
   */
  private static defaultOptions: OutputTest.InternalOptions = {
    audioContextFactory: AudioContext,
    audioElementFactory: Audio,
    debug: false,
    doLoop: true,
    duration: Infinity,
    enumerateDevices,
    passOnTimeout: true,
    testURI: INCOMING_SOUND_URL,
    volumeEventIntervalMs: 100,
  };

  /**
   * Holds `AudioElement`s that are attached to the DOM to load and play audio.
   */
  private _audio: AudioElement[] = [];
  /**
   * An `AudioContext` that is used to process the audio source.
   */
  private _audioContext: AudioContext | null = null;
  /**
   * The default media devices when starting the test.
   */
  private _defaultDevices: Partial<Record<
    MediaDeviceKind,
    MediaDeviceInfo
  >> = {};
  /**
   * A timestamp of when the test ends.
   */
  private _endTime: number | null = null;
  /**
   * An array of errors encountered by the test during its run time.
   */
  private readonly _errors: DiagnosticError[] = [];
  /**
   * Options passed to and set in the constructor to be used during the run
   * time of the test.
   */
  private _options: OutputTest.InternalOptions;
  /**
   * A timestamp of when the test starts. This is set in the constructor and not
   * when the test succesfully starts.
   */
  private _startTime: number;
  /**
   * Volume values generated by the test over its run time.
   */
  private readonly _values: number[] = [];
  /**
   * Timeout created by `setTimeout`, used to loop the volume logic.
   */
  private _volumeTimeout: NodeJS.Timeout | null = null;

  /**
   * Sets up several things for the `OutputTest` to run later in the
   * `_startTest` function.
   * @param options Optional settings to pass to the test.
   */
  constructor(options?: OutputTest.Options) {
    super();

    this._options = { ...OutputTest.defaultOptions, ...options };

    this._startTime = Date.now();

    // We need to use a `setTimeout` here to prevent a race condition.
    // This allows event listeners to bind before the test starts.
    setTimeout(() => this._startTest());
  }

  /**
   * Stops the test.
   * @param pass whether or not the test should pass. If set to false, will
   * override the result from determining whether audio is silent from the collected volume values.
   */
  stop(pass: boolean = true): OutputTest.Report | undefined {
    if (this._endTime) {
      this._onWarning(new AlreadyStoppedError());
      return;
    }

    // Clean up the test.
    this._cleanup();

    this._endTime = Date.now();
    const report: OutputTest.Report = {
      deviceId: this._options.deviceId || (
        this._defaultDevices.audiooutput &&
        this._defaultDevices.audiooutput.deviceId
      ),
      didPass: pass,
      errors: this._errors,
      testName: OutputTest.testName,
      testTiming: {
        duration: this._endTime - this._startTime,
        end: this._endTime,
        start: this._startTime,
      },
      testURI: this._options.testURI,
      values: this._values,
    };
    this.emit(OutputTest.Events.End, report);

    return report;
  }

  /**
   * Cleanup the test.
   */
  private _cleanup(): void {
    if (this._volumeTimeout) {
      clearTimeout(this._volumeTimeout);
    }
    if (this._audioContext) {
      this._audioContext.close();
    }
    this._audio.forEach((audio: AudioElement) => {
      audio.pause();
    });
  }

  /**
   * Error event handler. Adds the error to the internal list of errors that is
   * forwarded in the report.
   * @param error
   */
  private _onError(error: DiagnosticError): void {
    this._errors.push(error);
    this.emit(OutputTest.Events.Error, error);
  }

  /**
   * Volume event handler, adds the value to the list `_values` and emits it
   * under the event `volume`.
   * @param volume
   */
  private _onVolume(volume: number): void {
    this._values.push(volume);
    this.emit(OutputTest.Events.Volume, volume);
  }

  /**
   * Warning event handler.
   * @param warning
   */
  private _onWarning(error: DiagnosticError): void {
    if (this._options.debug) {
      // tslint:disable-next-line no-console
      console.warn(error);
    }
  }

  /**
   * Entry point of the test, called after setup in the constructor.
   * Emits the volume levels of the audio.
   *
   * @event [[OutputTest.Events.Volume]]
   */
  private async _startTest(): Promise<void> {
    try {
      // Try to validate all of the inputs before starting the test.
      // We perform this check here so if the validation throws, it gets handled
      // properly as a fatal-error and we still emit a report with that error.
      const invalidReasons: InvalidityRecord<OutputTest.Options> | undefined =
        await validateOptions<OutputTest.Options>(this._options, {
          deviceId: validateDeviceId,
          duration: validateTime,
          volumeEventIntervalMs: validateTime,
        });
      if (invalidReasons) {
        throw new InvalidOptionsError(invalidReasons);
      }

      if (!this._options.audioElementFactory) {
        throw AudioUnsupportedError;
      }
      if (!this._options.audioContextFactory) {
        throw AudioContextUnsupportedError;
      }

      const setSinkIdSupported: boolean =
        typeof this._options.audioElementFactory.prototype.setSinkId === 'function';
      if (setSinkIdSupported) {
        if (!this._options.enumerateDevices) {
          throw EnumerateDevicesUnsupportedError;
        }

        const devices: MediaDeviceInfo[] = await this._options.enumerateDevices();

        const numberOutputDevices: number = devices.filter(
          (device: MediaDeviceInfo) => device.kind === 'audiooutput',
        ).length;
        if (numberOutputDevices === 0) {
          throw new DiagnosticError(undefined, 'No output devices found.');
        }

        this._defaultDevices = getDefaultDevices(devices);
      }

      this._audioContext = new this._options.audioContextFactory();

      const sourceAudio: AudioElement =
        new this._options.audioElementFactory(this._options.testURI);
      sourceAudio.setAttribute('crossorigin', 'anonymous');
      sourceAudio.loop = !!this._options.doLoop;

      const sourceNode: MediaElementAudioSourceNode =
        this._audioContext.createMediaElementSource(sourceAudio);

      const analyser: AnalyserNode = this._audioContext.createAnalyser();
      analyser.smoothingTimeConstant = 0.4;
      analyser.fftSize = 64;
      sourceNode.connect(analyser);

      const frequencyDataBytes: Uint8Array =
        new Uint8Array(analyser.frequencyBinCount);
      const volumeEvent: () => void = (): void => {
        if (this._endTime) {
          return;
        }

        analyser.getByteFrequencyData(frequencyDataBytes);
        const volume: number =
          frequencyDataBytes.reduce(
            (sum: number, val: number) => sum + val,
            0,
          ) / frequencyDataBytes.length;
        this._onVolume(volume);

        // Check stop conditions
        const isTimedOut: boolean =
          Date.now() - this._startTime > this._options.duration;
        const stop: boolean = this._options.doLoop
          ? isTimedOut
          : sourceAudio.ended || isTimedOut;

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
            this._options.volumeEventIntervalMs,
          );
        }
      };

      if (this._options.deviceId && setSinkIdSupported) {
        const destinationNode: MediaStreamAudioDestinationNode =
          this._audioContext.createMediaStreamDestination();
        analyser.connect(destinationNode);

        const destinationAudio: AudioElement =
          new this._options.audioElementFactory();
        destinationAudio.loop = !!this._options.doLoop;
        destinationAudio.srcObject = destinationNode.stream;

        await destinationAudio.setSinkId?.(this._options.deviceId);
        await destinationAudio.play();
        this._audio.push(destinationAudio);
      } else {
        if (this._options.deviceId && !setSinkIdSupported) {
          // Non-fatal error
          this._onError(new UnsupportedError(
            'A `deviceId` was passed to the `OutputTest` but `setSinkId` is ' +
            'not supported in this browser.',
          ));
        }
        analyser.connect(this._audioContext.destination);
      }

      await sourceAudio.play();
      this._audio.push(sourceAudio);

      this._volumeTimeout = setTimeout(
        volumeEvent,
        this._options.volumeEventIntervalMs,
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
   * Please see [[OutputTest.on]] for how to listen to these
   * events.
   */
  export enum Events {
    End = 'end',
    Error = 'error',
    Volume = 'volume',
  }

  /**
   * Options passed to [[OutputTest]] constructor.
   */
  export interface Options {
    /**
     * An `AudioContext` to be used by the test.
     * @private
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
     * @private
     */
    debug?: boolean;

    /**
     * The `deviceId` of the audio device to attempt to play audio out of.
     * This option is directly passed to [HTMLMediaElement.setSinkId](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId).
     */
    deviceId?: string;

    /**
     * Whether or not to loop the audio.
     * See [[OutputTest]] for details on the behavior of "timing out".
     * @default true
     */
    doLoop?: boolean;

    /**
     * Duration in milliseconds to run the test for. If this amount of time elapses, the test
     * is considered "timed out".
     * See [[OutputTest]] for details on the behavior of "timing out".
     * @default Infinity
     */
    duration?: number;

    /**
     * Used to mock the call to `enumerateDevices`.
     * @private
     */
    enumerateDevices?: typeof navigator.mediaDevices.enumerateDevices;

    /**
     * Set [[OutputTest.Report.didPass]] to true or not upon test timeout.
     * See [[OutputTest]] for details on the behavior of "timing out".
     * @default true
     */
    passOnTimeout?: boolean;

    /**
     * The URI of the audio file to use for the test.
     */
    testURI?: string;

    /**
     * The interval between emissions of volume events in milliseconds.
     * @default 100
     */
    volumeEventIntervalMs?: number;
  }

  /**
   * Represents the report generated from an [[OutputTest]].
   */
  export interface Report {
    /**
     * The `deviceId` of the audio device used to play audio out of.
     */
    deviceId: string | undefined;

    /**
     * Whether or not the test passed. See [[OutputTest]] for determining pass or fail.
     */
    didPass: boolean;

    /**
     * Any errors that occurred during the run-time of the [[OutputTest]].
     */
    errors: DiagnosticError[];

    /**
     * Name of the test, set to [[OutputTest.testName]].
     */
    testName: typeof OutputTest.testName;

    /**
     * Time measurements of test run time.
     */
    testTiming: TimeMeasurement;

    /**
     * The URI of the audio file used during the test.
     */
    testURI?: string;

    /**
     * The volume values emitted by the test during its run-time.
     */
    values: number[];
  }

  /**
   * Option typing after initialization, so we can have type guarantees.
   * @private
   */
  export type InternalOptions = SubsetRequired<Options,
    'doLoop' | 'duration' | 'passOnTimeout' | 'volumeEventIntervalMs' | 'testURI'>;
}

/**
 * [[OutputTest]] tests audio output capabilities. It serves to help diagnose
 * potential audio device issues that would prevent a user from being able to
 * hear audio.
 *
 * ---
 *
 * The [[OutputTest]] class is an `EventEmitter` (please see [[OutputTest.on]] for
 * events and their details) and helps to diagnose issues by playing a sound clip
 * (by default the sound clip is the ringing tone from the `twilio-client.js`
 * SDK) and emitting volume events of the sound clip as it plays.
 * ```ts
 * import { OutputTest, testOutputDevice } from '@twilio/rtc-diagnostics';
 * const options: OutputTest.Options = { ... };
 * // `options` may be left `undefined` to use default option values
 * const outputTest: OutputTest = testOutputDevice(options);
 * ```
 * The application can use the volume events to show in its UI that audio is
 * playing and that the end-user should be hearing something.
 * ```ts
 * outputTest.on(OutputTest.Events.Volume, (volume: number) => {
 *   ui.updateVolume(volume); // Update your UI with the volume value here.
 * });
 * ```
 *
 * The application should ask the end-user to confirm that the sound being played
 * can be heard. The application should call [[OutputTest.stop]] with `true` if
 * the end-user hears the sound, and `false` if not.
 * ```ts
 * // If the user was able to hear the audio, the UI should indicate they should
 * // click this button...
 * const passButton = ...;
 * passButton.on('click', () => {
 *   outputTest.stop(false);
 * });
 *
 * // ...conversely, if they were not able to hear the audio, they should click
 * // this one.
 * const failButton = ...;
 * failButton.on('click', () => {
 *   outputTest.stop(end);
 * });
 * ```
 * Caling [[OutputTest.stop]] will immediately end the test. The value of
 * [[OutputTest.Report.didPass]] will be the value passed to
 * [[OutputTest.stop]].
 *
 * ---
 *
 * The [[OutputTest]] object will always emit a [[OutputTest.Report]] with
 * the [[OutputTest.Events.End]] event, regardless of the occurence of errors
 * during the runtime of the test.
 *
 * Fatal errors will immediately end the test and emit a report such that
 * the value of [[OutputTest.Report.didPass]] will be `false` and the value of
 * [[OutputTest.Report.errors]] will contain the fatal error.
 *
 * Non-fatal errors will not end the test, but will be included in the value of
 * [[OutputTest.Report.errors]] upon completion of the test.
 *
 * If the data at `testURI` is unable to be loaded, meaning the error event is
 * raised on the audio element, a fatal error has occurred.
 *
 * If `doLoop` is set to `false`, then the test will run for either the option
 * `duration`, or the full duration of the audio file, which ever is shorter.
 * If `doLoop` is set to `true`, it will only run as long as the `duration`
 * option.
 * If the test times out (as defined by the `duration` in the `options`
 * parameter), then the test is considered passing or not by the `passOnTimeout`
 * option and ends.
 *
 * ---
 *
 * The function [[testOutputDevice]] serves as factory function that accepts
 * [[OutputTest.Options]] as its only parameter and will instantiate an
 * [[OutputTest]] object with those options.
 * ```ts
 * import { OutputTest, testOutputDevice } from '@twilio/rtc-diagnostics';
 * const options: OutputTest.Options = { ... };
 * const outputTest: OutputTest = testOutputDevice(options);
 * ```
 * @param options Options to pass to the [[OutputTest]] constructor.
 */
export function testOutputDevice(
  options?: OutputTest.Options,
): OutputTest {
  return new OutputTest(options);
}
