import {SdkStatus} from '../models/models';
import {randomUUID} from '../helpers/helpers';

type StatusCallback = (status: SdkStatus) => void;

class StatusService {
  private currentStatus: SdkStatus | undefined = undefined;
  private callbacks = new Map<string, StatusCallback>();
  private pollTimerId: ReturnType<typeof setInterval> | null = null;
  private failTimeoutId: ReturnType<typeof setTimeout> | null = null;

  getStatus(): SdkStatus | undefined {
    return this.currentStatus;
  }

  setStatus(status: SdkStatus): void {
    if (this.currentStatus === status) {
      return;
    }

    this.currentStatus = status;
    this.callbacks.forEach(cb => cb(status));
  }

  registerCallback(cb: StatusCallback): string {
    const id = `status-${randomUUID()}`;
    this.callbacks.set(id, cb);
    if (this.currentStatus !== undefined) {
      cb(this.currentStatus);
    }
    return id;
  }

  deregisterCallback(id: string): void {
    this.callbacks.delete(id);
  }

  /**
   * Start Desktop detection polling loop.
   *
   * @param detectFn async function that resolves if Desktop is found, rejects if not
   * @param interval ms between attempts
   * @param failTimeout ms before transitioning to FAILED
   */
  startPolling(detectFn: () => Promise<void>, interval: number, failTimeout: number): void {
    this.stopPolling();
    this.setStatus('INITIALIZING');

    this.failTimeoutId = setTimeout(() => {
      if (this.currentStatus !== 'RUNNING') {
        this.setStatus('FAILED');
      }
    }, failTimeout);

    const attempt = (): void => {
      detectFn()
        .then(() => {
          this.stopPolling();
          this.setStatus('RUNNING');
        })
        .catch(() => {
          // Stay in current status (INITIALIZING or FAILED), poll continues
        });
    };

    attempt();
    this.pollTimerId = setInterval(attempt, interval);
  }

  stopPolling(): void {
    if (this.pollTimerId) {
      clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }
    if (this.failTimeoutId) {
      clearTimeout(this.failTimeoutId);
      this.failTimeoutId = null;
    }
  }

  reset(): void {
    this.stopPolling();
    this.currentStatus = undefined;
    this.callbacks.clear();
  }
}

export const statusService = new StatusService();
