import Client from './client';
import {randomUUID} from '../helpers';
import {asperaSdk} from '../../index';

/**
 * Enum defining different types of Safari extension events.
 */
enum SafariExtensionEventType {
  Monitor = 'Monitor',
  Ping = 'Ping',
  Request = 'Request'
}

/**
 * Interface representing a JSON-RPC request object.
 */
interface JSONRPCRequest {
  id: string;
  jsonrpc: string;
  method: string;
  params: any;
}

/**
 * Interface representing a JSON-RPC response object.
 */
interface JSONRPCResponse {
  id: string;
  jsonrpc: string;
  result?: any;
  error?: any;
}

/**
 * Interface representing a promise executor used in a promise.
 */
export interface PromiseExecutor {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

/**
 * Global keep alive timeout to prevent recursion.
 */
let keepAliveTimeout: ReturnType<typeof setTimeout>;

/**
 * Handles communication with the Safari extension using JSON-RPC over custom events.
 */
export class SafariClient implements Client {
  private keepAliveInterval = 1000;
  private promiseExecutors: Map<string, PromiseExecutor>;

  private lastPing: number|null = null;
  private lastPong: number|null = null;
  private safariExtensionEnabled = false;
  private subscribedTransferActivity = false;

  /**
   * Initializes the SafariExtensionHandler instance.
   * Sets up the promise executor map and starts listening to extension events.
   */
  constructor() {
    this.promiseExecutors = new Map();
    this.listenResponseEvents();
    this.listenTransferActivityEvents();
    this.listenStatusEvents();
    this.listenPongEvents();

    if (keepAliveTimeout) {
      clearTimeout(keepAliveTimeout);
    }

    this.keepAlive();
  }

  /**
   * Sends a JSON-RPC request to the Safari extension.
   * @param method The method name to invoke on the extension.
   * @param payload Optional payload for the request.
   * @returns A Promise that resolves with the response from the extension.
   */
  request = (method: string, payload: any = {}): Promise<any> => {
    return this.dispatchPromiseEvent(
      SafariExtensionEventType.Request,
      method,
      payload
    );
  };

  /**
   * Monitors transfer activity.
   * @returns A Promise that resolves with the response from the extension.
   */
  public monitorTransferActivity(): Promise<unknown> {
    const dispatchMonitorEvent = (): Promise<unknown> => {
      const promise =  this.dispatchPromiseEvent(
        SafariExtensionEventType.Monitor,
        'subscribe_transfer_activity',
        [asperaSdk.globals.appId]
      );

      return promise.then(() => {
        this.subscribedTransferActivity = true;
      });
    };

    if (this.safariExtensionEnabled) {
      return dispatchMonitorEvent();
    }

    return new Promise((resolve, reject) => {
      const extensionInterval = setInterval(() => {
        if (!this.safariExtensionEnabled) {
          return;
        }

        dispatchMonitorEvent()
          .then(resolve)
          .catch(reject);

        clearInterval(extensionInterval);
      }, 1000);
    });
  }

  /**
   * Builds a JSON-RPC request object with a unique identifier.
   * @param method The method name to invoke on the extension.
   * @param payload Optional parameters for the method.
   * @returns The constructed JSON-RPC request object.
   */
  private buildRPCRequest(method: string, payload?: unknown): JSONRPCRequest {
    return {
      jsonrpc: '2.0',
      method,
      params: payload,
      id: randomUUID()
    };
  }

  /**
   * Dispatches a custom event to the document to communicate with the Safari extension.
   * @param type The type of Safari extension event to dispatch.
   * @param request Optional JSON-RPC request payload to send with the event.
   */
  private dispatchEvent(type: SafariExtensionEventType, request?: JSONRPCRequest) {
    const payload = {
      detail: request ?? {}
    };

    document.dispatchEvent(new CustomEvent(`AsperaDesktop.${type}`, payload));
  }

  /**
   * Dispatches a custom event to the document to communicate with the Safari extension.
   * @param type The type of Safari extension event to dispatch.
   * @param method The method name to invoke on the extension.
   * @param payload Optional parameters for the method.
   */
  private dispatchPromiseEvent(type: SafariExtensionEventType, method: string, payload?: unknown): Promise<any> {
    const request = this.buildRPCRequest(method, payload);

    return new Promise<any>((resolve, reject) => {
      if (this.safariExtensionEnabled) {
        this.promiseExecutors.set(request.id, {resolve, reject});

        this.dispatchEvent(type, request);
      } else {
        console.warn('The Safari extension is disabled or unresponsive (dispatch event)');
        console.warn(`Failed event: ${JSON.stringify(request)}`);

        reject('The Safari extension is disabled or unresponsive (dispatch event)');
      }
    });
  }

  /**
   * Handles incoming JSON-RPC responses from the Safari extension.
   * Resolves or rejects promises based on the response.
   * @param response The JSON-RPC response object received from the extension.
   */
  private handleResponse(response: JSONRPCResponse) {
    const requestId = response.id;
    const executor = this.promiseExecutors.get(requestId);

    if (!executor) {
      console.warn(`Unable to find a promise executor for ${requestId}`);
      console.warn(`Response: ${response}`);
      return;
    }

    this.promiseExecutors.delete(requestId);

    if (response.error) {
      executor.reject(response.error);
      return;
    }

    executor.resolve(response.result);
  }

  /**
   * Listens for 'AsperaDesktop.Response' events.
   */
  private listenResponseEvents() {
    document.addEventListener('AsperaDesktop.Response', (event: CustomEvent<JSONRPCResponse>) => {
      this.handleResponse(event.detail);
    });
  }

  /**
   * Listens for 'AsperaDesktop.TransferActivity' events.
   */
  private listenTransferActivityEvents() {
    document.addEventListener('AsperaDesktop.TransferActivity', (event: any) => {
      asperaSdk.activityTracking.handleTransferActivity(event.detail);
    });
  }

  /**
   * Listens for 'AsperaDesktop.Status' events.
   */
  private listenStatusEvents() {
    document.addEventListener('AsperaDesktop.Status', (event: any) => {
      asperaSdk.activityTracking.handleWebSocketEvents(event.detail);
    });
  }

  /**
   * Listens for 'AsperaDesktop.Pong' events.
   */
  private listenPongEvents() {
    document.addEventListener('AsperaDesktop.Pong', () => {
      this.lastPong = Date.now();
      this.safariExtensionStatusChanged(true);
    });
  }

  /**
   * Sends a keep alive ping according to the defined interval.
   */
  private keepAlive() {
    this.lastPing = Date.now();
    this.dispatchEvent(SafariExtensionEventType.Ping);

    keepAliveTimeout = setTimeout(() => {
      this.keepAlive();
    }, this.keepAliveInterval);
  }

  /**
   * Listens for Safari extension status changes.
   * If the extension was disabled and enabled again after initializing the SDK, it
   * will call 'monitorTransferActivity' to resume transfer activities.
   */
  private safariExtensionStatusChanged(isEnabled: boolean) {
    if (isEnabled === this.safariExtensionEnabled) {
      return;
    }

    this.safariExtensionEnabled = isEnabled;

    if (isEnabled) {
      if (this.subscribedTransferActivity) {
        const resumeTransferActivity = () => {
          this.monitorTransferActivity()
            .catch(() => {
              console.error('Failed to resume transfer activity, will try again in 1s');

              setTimeout(() => {
                resumeTransferActivity();
              }, 1000);
            });
        };

        resumeTransferActivity();
      }
    } else {
      asperaSdk.activityTracking.handleWebSocketEvents('CLOSED');

      this.promiseExecutors.forEach((promiseExecutor) => {
        promiseExecutor.reject('The Safari extension is disabled or unresponsive (extension status)');
      });

      this.promiseExecutors.clear();
    }

    asperaSdk.activityTracking.handleSafariExtensionEvents(this.safariExtensionEnabled ? 'ENABLED' : 'DISABLED');
  }

  /**
   * Checks if the last pong received was longer than the max interval.
   */
  private checkSafariExtensionStatus() {
    const pingPongDiff = this.lastPong - this.lastPing;

    if (this.lastPong == null || pingPongDiff < 0 || pingPongDiff > 500) {
      this.safariExtensionStatusChanged(false);
    }
  }
}

export const safariClient = new SafariClient();

export default {
  safariClient
};
