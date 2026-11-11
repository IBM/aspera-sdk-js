import {SdkStatus, TransferClient} from '../models/models';
import {randomUUID} from '../helpers/helpers';
import {asperaSdk} from '../index';

type StatusCallback = (status: SdkStatus) => void;

class StatusService {
  private currentStatus: SdkStatus | undefined = undefined;
  /** The transfer client that was active when RUNNING was last emitted. */
  private runningClient: TransferClient | undefined = undefined;
  private callbacks = new Map<string, StatusCallback>();
  private pollTimerId: ReturnType<typeof setInterval> | null = null;
  private failTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Identifies the current poll loop. Incremented by stopPolling() to invalidate in-flight attempts. */
  private pollSession = 0;

  getStatus(): SdkStatus | undefined {
    return this.currentStatus;
  }

  setStatus(status: SdkStatus): void {
    // When Desktop disconnects or transfer client fails, remap to DEGRADED if HTTP Gateway is available
    if ((status === 'DISCONNECTED' || status === 'FAILED') && asperaSdk.httpGatewayIsReady) {
      status = 'DEGRADED';
    }

    // RUNNING is re-emitted when the active transfer client changes (e.g. Connect -> Desktop
    // in the fallback flow) so consumers know to re-check currentTransferClient().
    const client = status === 'RUNNING' ? asperaSdk.currentTransferClient() : undefined;
    const clientChanged = status === 'RUNNING' && client !== this.runningClient;

    if (this.currentStatus === status && !clientChanged) {
      return;
    }

    // Manage Desktop verification state based on status transitions
    if (status === 'DISCONNECTED' || status === 'DEGRADED') {
      asperaSdk.globals.asperaAppVerified = false;
    } else if (status === 'RUNNING' && (this.currentStatus === 'DISCONNECTED' || this.currentStatus === 'DEGRADED')) {
      asperaSdk.globals.asperaAppVerified = true;
    }

    this.currentStatus = status;
    this.runningClient = client;
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

    this.runPollLoop(detectFn, interval);
  }

  /**
   * Resume IBM Aspera for desktop detection polling without resetting status or setting a fail timeout.
   * Used after a fallback decision (e.g. FAILED/DEGRADED) to continue detecting Desktop
   * in the background so a late launch can still transition to RUNNING.
   *
   * @param detectFn async function that resolves if Desktop is found, rejects if not
   * @param interval ms between attempts
   */
  resumePolling(detectFn: () => Promise<void>, interval: number): void {
    if (this.pollTimerId) {
      return;
    }

    this.runPollLoop(detectFn, interval);
  }

  /**
   * Run `detectFn` every `interval` ms until it resolves, then transition to RUNNING.
   *
   * At most one attempt is in flight at a time. While IBM Aspera for desktop is absent, an attempt
   * does not settle (it waits on the websocket/Safari extension), so starting a new attempt
   * every tick would pile up pending chains for as long as the page is open and then burst
   * RPC calls at Desktop once it appears. Waiting is safe because the pending attempt
   * resolves as soon as Desktop becomes reachable.
   *
   * Each loop is tied to a poll session. When the loop is stopped or replaced, any attempt
   * still in flight is ignored when it settles, so a stale attempt can neither block the new
   * loop nor report RUNNING on its behalf.
   */
  private runPollLoop(detectFn: () => Promise<void>, interval: number): void {
    const session = this.pollSession;
    let attemptInFlight = false;

    const attempt = (): void => {
      if (attemptInFlight) {
        return;
      }

      attemptInFlight = true;
      detectFn()
        .then(() => {
          attemptInFlight = false;
          if (session !== this.pollSession) {
            return;
          }

          this.stopPolling();
          this.setStatus('RUNNING');
        })
        .catch(() => {
          // Stay in current status, poll continues
          attemptInFlight = false;
        });
    };

    attempt();
    this.pollTimerId = setInterval(attempt, interval);
  }

  stopPolling(): void {
    // Invalidate any attempt still in flight from the loop being stopped
    this.pollSession++;

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
    this.runningClient = undefined;
    this.callbacks.clear();
  }
}

export const statusService = new StatusService();
