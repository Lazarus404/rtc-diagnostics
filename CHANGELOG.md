# 1.0.0-beta1

## New Features

### Audio Recordings

Added the ability to record audio during `InputTest`. This recording is processed _only_ locally and returned as an object URL within the report emitted by the `InputTest.Events.End` event.

#### Example

The following example shows playback of the recorded audio as soon as the test ends.

```ts
const options: InputTest.Options = { ... };
const inputTest: InputTest = testInputDevice(options);
inputTest.on(InputTest.Events.End, (report: InputTest.Report) => {
  const audioEl = new Audio();
  audioEl.src = report.recordingUrl;
  audioEl.play();
});
```

# 1.0.0-alpha1

Inital release and open source of project RTC Diagnostics SDK. This SDK provides developers with tools to diagnose potential problems before utilizing other Twilio SDKs such as Voice SDK.

The initial feature set revolves around the Voice SDK and includes the ability to test audio input and output devices, as well as measuring network bitrate capabilities for WebRTC `PeerConnection`s.
