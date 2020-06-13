import * as sinon from 'sinon';
import { MockMediaStream } from './MockMediaStream';

export function mockGetUserMediaFactory(opts: MockGetUserMediaOptions = {}) {
  const options = {
    mediaStream: new MockMediaStream(),
    ...opts,
  };
  return options.throw
    ? sinon.stub().throws(options.throw)
    : sinon.stub().returns(Promise.resolve(options.mediaStream));
}

export interface MockGetUserMediaOptions {
  mediaStream?: MockMediaStream;
  throw?: any;
}
