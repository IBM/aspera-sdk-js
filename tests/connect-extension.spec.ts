import {detectConnectExtension} from '../src/helpers/connect-extension';
import * as helpers from '../src/helpers/helpers';

describe('detectConnectExtension', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('resolves false when timeout expires with no response', async () => {
    const promise = detectConnectExtension(3000);

    jest.advanceTimersByTime(3000);

    await expect(promise).resolves.toBe(false);
  });

  test('dispatches AsperaConnectCheck event immediately', () => {
    const dispatchSpy = jest.spyOn(document, 'dispatchEvent');

    detectConnectExtension(3000);

    const checkEvents = dispatchSpy.mock.calls.filter(
      ([evt]) => (evt as CustomEvent).type === 'AsperaConnectCheck'
    );
    expect(checkEvents.length).toBeGreaterThanOrEqual(1);
  });

  test('dispatches AsperaConnectCheck events on 200ms interval', () => {
    const dispatchSpy = jest.spyOn(document, 'dispatchEvent');

    detectConnectExtension(3000);

    const countBefore = dispatchSpy.mock.calls.filter(
      ([evt]) => (evt as CustomEvent).type === 'AsperaConnectCheck'
    ).length;

    jest.advanceTimersByTime(600);

    const countAfter = dispatchSpy.mock.calls.filter(
      ([evt]) => (evt as CustomEvent).type === 'AsperaConnectCheck'
    ).length;

    // Should have dispatched ~3 more times (at 200ms, 400ms, 600ms)
    expect(countAfter - countBefore).toBeGreaterThanOrEqual(3);
  });

  describe('non-Safari (NMH)', () => {
    beforeEach(() => {
      jest.spyOn(helpers, 'isSafari').mockReturnValue(false);
    });

    test('resolves true when window message with AsperaConnectCheckResponse received', async () => {
      const promise = detectConnectExtension(3000);

      // Simulate extension response
      window.postMessage({type: 'AsperaConnectCheckResponse'}, '*');

      // Flush microtasks + message event
      await jest.advanceTimersByTimeAsync(0);

      await expect(promise).resolves.toBe(true);
    });

    test('ignores unrelated window messages', async () => {
      const promise = detectConnectExtension(1000);

      window.postMessage({type: 'SomethingElse'}, '*');
      window.postMessage('not-an-object', '*');

      jest.advanceTimersByTime(1000);

      await expect(promise).resolves.toBe(false);
    });
  });

  describe('Safari', () => {
    beforeEach(() => {
      jest.spyOn(helpers, 'isSafari').mockReturnValue(true);
    });

    test('resolves true when document AsperaConnectCheckResponse event received', async () => {
      const promise = detectConnectExtension(3000);

      document.dispatchEvent(new Event('AsperaConnectCheckResponse'));

      await expect(promise).resolves.toBe(true);
    });

    test('resolves false on timeout when no response', async () => {
      const promise = detectConnectExtension(1000);

      jest.advanceTimersByTime(1000);

      await expect(promise).resolves.toBe(false);
    });
  });

  test('stops polling after detection', async () => {
    jest.spyOn(helpers, 'isSafari').mockReturnValue(false);
    const dispatchSpy = jest.spyOn(document, 'dispatchEvent');

    const promise = detectConnectExtension(3000);

    // Trigger detection
    window.postMessage({type: 'AsperaConnectCheckResponse'}, '*');
    await jest.advanceTimersByTimeAsync(0);
    await promise;

    const countAtDetection = dispatchSpy.mock.calls.filter(
      ([evt]) => (evt as CustomEvent).type === 'AsperaConnectCheck'
    ).length;

    // Advance time — no more dispatches should happen
    jest.advanceTimersByTime(1000);

    const countAfter = dispatchSpy.mock.calls.filter(
      ([evt]) => (evt as CustomEvent).type === 'AsperaConnectCheck'
    ).length;

    expect(countAfter).toBe(countAtDetection);
  });
});
