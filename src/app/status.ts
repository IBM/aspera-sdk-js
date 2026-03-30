import {SdkStatus} from '../models/models';
import {randomUUID} from '../helpers/helpers';
import {asperaSdk} from '../index';

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
    // When Desktop disconnects or transfer client fails, remap to DEGRADED if HTTP Gateway is available
    if ((status === 'DISCONNECTED' || status === 'FAILED') && asperaSdk.httpGatewayIsReady) {
      status = 'DEGRADED';
    }

    if (this.currentStatus === status) {
      return;
    }

    // Manage Desktop verification state based on status transitions
    if (status === 'DISCONNECTED' || status === 'DEGRADED') {
      asperaSdk.globals.asperaAppVerified = false;
    } else if (status === 'RUNNING' && (this.currentStatus === 'DISCONNECTED' || this.currentStatus === 'DEGRADED')) {
      asperaSdk.globals.asperaAppVerified = true;
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
   * @param failTimeout ms before transitioning to FAILED or DEGRADED
   * @param onFallback optional callback invoked on timeout instead of FAILED/DEGRADED (e.g. to start Connect)
   */
  startPolling(detectFn: () => Promise<void>, interval: number, failTimeout: number, onFallback?: () => void): void {
    this.stopPolling();
    this.setStatus('INITIALIZING');

    this.failTimeoutId = setTimeout(() => {
      if (this.currentStatus !== 'RUNNING') {
        if (onFallback) {
          this.stopPolling();
          onFallback();
        } else if (asperaSdk.httpGatewayIsReady) {
          this.setStatus('DEGRADED');
        } else {
          this.setStatus('FAILED');
        }
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
