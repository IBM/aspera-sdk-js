import Client from './client';
import {randomUUID} from '../helpers';
import {asperaDesktop} from '../../index';

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
 * Global Safari extension timeout to prevent recursion.
 */
let safariExtensionStatusTimeout: ReturnType<typeof setTimeout>;

/**
 * Handles communication with the Safari extension using JSON-RPC over custom events.
 */
export class SafariClient implements Client {
  private keepAliveInterval = 2000;
  private promiseExecutors: Map<string, PromiseExecutor>;

  private lastReceivedPong: number = null;
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

    if (safariExtensionStatusTimeout) {
      clearTimeout(safariExtensionStatusTimeout);
    }

    this.keepAlive();
    this.checkSafariExtensionStatus();
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
    const promise = this.dispatchPromiseEvent(
      SafariExtensionEventType.Monitor,
      'subscribe_transfer_activity',
      [asperaDesktop.globals.appId]
    );

    return promise
      .then(() => {
        this.subscribedTransferActivity = true;

        console.log('Subscribed to transfer activity');
      });
  }

  /**
   * Builds a JSON-RPC request object with a unique identifier.
   * @param method The method name to invoke on the extension.
   * @param payload Optional parameters for the method.
   * @returns The constructed JSON-RPC request object.
   */
  private buildRPCRequest(method: string, payload?: any): JSONRPCRequest {
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
  private dispatchPromiseEvent(type: SafariExtensionEventType, method: string, payload?: any): Promise<any> {
    const request = this.buildRPCRequest(method, payload);
    const promise = new Promise<any>((resolve, reject) => {
      this.promiseExecutors.set(request.id, { resolve, reject });
    });

    this.dispatchEvent(type, request);

    return promise;
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
      console.error(`Unable to find a promise executor for ${requestId}`);
      console.error(response);
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
      asperaDesktop.activityTracking.handleTransferActivity(event.detail);
    });
  }

  /**
   * Listens for 'AsperaDesktop.Status' events.
   */
  private listenStatusEvents() {
    document.addEventListener('AsperaDesktop.Status', (_: any) => {
      // TODO: Aspera Desktop transfer activity status
    });
  }

  /**
   * Listens for 'AsperaDesktop.Pong' events.
   */
  private listenPongEvents() {
    document.addEventListener('AsperaDesktop.Pong', (_: any) => {
      this.lastReceivedPong = Date.now();
      this.safariExtensionStatusChanged(true);
    });
  }

  /**
   * Sends a keep alive ping according to the defined interval.
   */
  private keepAlive() {
    this.dispatchEvent(SafariExtensionEventType.Ping);

    keepAliveTimeout = setTimeout(() => {
      this.keepAlive();
    }, this.keepAliveInterval);
  }

  /**
   * Listens for Safari extension status changes.
   * If the extension was disabled and enabled again after initializing the SDK, it
   * will call 'monitorTransferActivity' indefinably to resume transfer activities.
   */
  private safariExtensionStatusChanged(isEnabled: boolean) {
    // Return if the status is the same
    if (isEnabled === this.safariExtensionEnabled) {
      return;
    }

    if (isEnabled) {
      if (this.subscribedTransferActivity) {
        const resumeTransferActivity = () => {
          console.log('Trying to resume transfer activity');

          this.monitorTransferActivity()
            .catch(() => resumeTransferActivity());
        };

        resumeTransferActivity();
      }
    } else {
      this.promiseExecutors.forEach((promiseExecutor) => {
        promiseExecutor.reject(new Error('The Safari extension is disabled or it\'s not responding'));
      });

      this.promiseExecutors.clear();
    }

    this.safariExtensionEnabled = !this.safariExtensionEnabled;

    console.log(`Safari extension status changed: ${this.safariExtensionEnabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Checks every second if the last pong received was longer than the expected interval.
   */
  private checkSafariExtensionStatus() {
    if (this.lastReceivedPong !== null && Date.now() - this.lastReceivedPong > this.keepAliveInterval + 1000) {
      this.safariExtensionStatusChanged(false);
    }

    safariExtensionStatusTimeout = setTimeout(() => {
      this.checkSafariExtensionStatus();
    }, 1000);
  }
}

export const safariClient = new SafariClient();

export default {
  safariClient
};
