import {statusService} from '../src/app/status';
import {SdkStatus} from '../src/models/models';

describe('StatusService', () => {
  afterEach(() => {
    statusService.reset();
    jest.useRealTimers();
  });

  describe('getStatus', () => {
    test('returns undefined initially', () => {
      expect(statusService.getStatus()).toBeUndefined();
    });
  });

  describe('setStatus', () => {
    test('updates status and notifies callbacks', () => {
      const cb = jest.fn();
      statusService.registerCallback(cb);
      cb.mockClear(); // clear any immediate fire

      statusService.setStatus('RUNNING');

      expect(statusService.getStatus()).toBe('RUNNING');
      expect(cb).toHaveBeenCalledWith('RUNNING');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    test('deduplicates same status', () => {
      const cb = jest.fn();
      statusService.setStatus('RUNNING');
      statusService.registerCallback(cb);
      cb.mockClear();

      statusService.setStatus('RUNNING');

      expect(cb).not.toHaveBeenCalled();
    });

    test('notifies on different status', () => {
      const cb = jest.fn();
      statusService.setStatus('RUNNING');
      statusService.registerCallback(cb);
      cb.mockClear();

      statusService.setStatus('DISCONNECTED');

      expect(cb).toHaveBeenCalledWith('DISCONNECTED');
    });
  });

  describe('registerCallback', () => {
    test('fires immediately if status exists', () => {
      statusService.setStatus('INITIALIZING');

      const cb = jest.fn();
      statusService.registerCallback(cb);

      expect(cb).toHaveBeenCalledWith('INITIALIZING');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    test('does NOT fire immediately if status is undefined', () => {
      const cb = jest.fn();
      statusService.registerCallback(cb);

      expect(cb).not.toHaveBeenCalled();
    });

    test('returns a string ID', () => {
      const id = statusService.registerCallback(jest.fn());
      expect(typeof id).toBe('string');
      expect(id.startsWith('status-')).toBe(true);
    });
  });

  describe('deregisterCallback', () => {
    test('stops notifications', () => {
      const cb = jest.fn();
      const id = statusService.registerCallback(cb);
      cb.mockClear();

      statusService.deregisterCallback(id);
      statusService.setStatus('RUNNING');

      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('startPolling', () => {
    test('sets INITIALIZING immediately', () => {
      jest.useFakeTimers();

      const detectFn = jest.fn().mockRejectedValue(new Error('not found'));
      statusService.startPolling(detectFn, 2000, 5000);

      expect(statusService.getStatus()).toBe('INITIALIZING');
    });

    test('stays INITIALIZING while detectFn rejects', async () => {
      jest.useFakeTimers();

      const detectFn = jest.fn().mockRejectedValue(new Error('not found'));
      const cb = jest.fn();
      statusService.registerCallback(cb);

      statusService.startPolling(detectFn, 2000, 5000);

      // Flush the first attempt's microtask
      await Promise.resolve();

      expect(statusService.getStatus()).toBe('INITIALIZING');

      // Advance past the first poll interval
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      expect(statusService.getStatus()).toBe('INITIALIZING');
    });

    test('transitions to FAILED after timeout, continues polling', async () => {
      jest.useFakeTimers();

      const detectFn = jest.fn().mockRejectedValue(new Error('not found'));
      const statuses: SdkStatus[] = [];
      statusService.registerCallback((s) => statuses.push(s));

      statusService.startPolling(detectFn, 2000, 5000);
      await Promise.resolve();

      // Before timeout: still INITIALIZING
      jest.advanceTimersByTime(4999);
      await Promise.resolve();
      expect(statusService.getStatus()).toBe('INITIALIZING');

      // At timeout: transitions to FAILED
      jest.advanceTimersByTime(1);
      expect(statusService.getStatus()).toBe('FAILED');

      // Polling still runs (advance to next poll)
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      expect(detectFn.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    test('transitions to RUNNING when detectFn resolves, stops polling', async () => {
      jest.useFakeTimers();

      const detectFn = jest.fn().mockResolvedValue(undefined);
      statusService.startPolling(detectFn, 2000, 5000);

      // Flush the first attempt's microtask chain
      await Promise.resolve();
      await Promise.resolve();

      expect(statusService.getStatus()).toBe('RUNNING');
      expect(detectFn).toHaveBeenCalledTimes(1);

      // Verify polling stopped — advancing time should not trigger more calls
      jest.advanceTimersByTime(4000);
      await Promise.resolve();
      expect(detectFn).toHaveBeenCalledTimes(1);
    });

    test('transitions from FAILED to RUNNING when detectFn eventually resolves', async () => {
      jest.useFakeTimers();

      let callCount = 0;
      const detectFn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.reject(new Error('not found'));
        }
        return Promise.resolve();
      });

      const statuses: SdkStatus[] = [];
      statusService.registerCallback((s) => statuses.push(s));

      statusService.startPolling(detectFn, 2000, 5000);

      // First attempt fails
      await Promise.resolve();
      expect(statusService.getStatus()).toBe('INITIALIZING');

      // Advance past timeout
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(statusService.getStatus()).toBe('FAILED');

      // Next poll interval triggers attempt that succeeds
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();

      expect(statusService.getStatus()).toBe('RUNNING');
      expect(statuses).toContain('INITIALIZING');
      expect(statuses).toContain('FAILED');
      expect(statuses).toContain('RUNNING');
    });
  });

  describe('reset', () => {
    test('clears status, callbacks, and timers', () => {
      jest.useFakeTimers();

      const cb = jest.fn();
      statusService.setStatus('RUNNING');
      statusService.registerCallback(cb);
      cb.mockClear();

      statusService.reset();

      expect(statusService.getStatus()).toBeUndefined();

      // Callback should have been cleared — setStatus should not fire it
      statusService.setStatus('FAILED');
      expect(cb).not.toHaveBeenCalled();
    });

    test('stops polling timers', async () => {
      jest.useFakeTimers();

      const detectFn = jest.fn().mockRejectedValue(new Error('not found'));
      statusService.startPolling(detectFn, 2000, 5000);
      await Promise.resolve();

      const callsBefore = detectFn.mock.calls.length;
      statusService.reset();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();
      expect(detectFn.mock.calls.length).toBe(callsBefore);
    });
  });
});
