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
 * Global keep alive interval to prevent recursion.
 */
let keepAliveInterval: NodeJS.Timeout;

/**
 * Handles communication with the Safari extension using JSON-RPC over custom events.
 */
export class SafariClient implements Client {
  private safariExtensionExecutors: Map<string, PromiseExecutor>;

  /**
   * Initializes the SafariExtensionHandler instance.
   * Sets up the promise executor map and starts listening to extension events.
   */
  constructor() {
    this.safariExtensionExecutors = new Map();
    this.listenResponseEvents();
    this.listenTransferActivityEvents();

    if (keepAliveInterval) {
      clearTimeout(keepAliveInterval);
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
    const request = this.buildRPCRequest(method, payload);
    const promise = new Promise<any>((resolve, reject) => {
      this.safariExtensionExecutors.set(request.id, { resolve, reject });
    });

    this.dispatchEvent(SafariExtensionEventType.Request, request);

    return promise;
  };

  /**
   * Monitors transfer activity.
   * @returns A Promise that resolves with the response from the extension.
   */
  public monitorTransferActivity(): Promise<unknown> {
    const request = this.buildRPCRequest('subscribe_transfer_activity', [asperaDesktop.globals.appId]);
    const promise = new Promise<unknown>((resolve, reject) => {
      this.safariExtensionExecutors.set(request.id, { resolve, reject });
    });

    this.dispatchEvent(SafariExtensionEventType.Monitor, request);

    return promise;
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
   * Handles incoming JSON-RPC responses from the Safari extension.
   * Resolves or rejects promises based on the response.
   * @param response The JSON-RPC response object received from the extension.
   */
  private handleResponse(response: JSONRPCResponse) {
    const requestId = response.id;
    const executor = this.safariExtensionExecutors.get(requestId);

    if (!executor) {
      console.error(`Unable to find a promise executor with id ${requestId}`);
      return;
    }

    this.safariExtensionExecutors.delete(requestId);

    if (response.error) {
      executor.reject(response.error);
      return;
    }

    executor.resolve(response.result);
  }

  /**
   * Listens for 'AsperaDesktop.Response' events from the document,
   * and delegates handling to the handleResponse method.
   */
  private listenResponseEvents() {
    document.addEventListener('AsperaDesktop.Response', (event: CustomEvent<JSONRPCResponse>) => {
      this.handleResponse(event.detail);
    });
  }

  /**
   * Listens for 'AsperaDesktop.TransferActivity' events from the document,
   * and delegates handling to the handleTransferActivity method.
   */
  private listenTransferActivityEvents() {
    document.addEventListener('AsperaDesktop.TransferActivity', (event: any) => {
      asperaDesktop.activityTracking.handleTransferActivity(event.detail);
    });
  }

  /**
   * Sends a keep alive ping every 3 seconds.
   */
  private keepAlive() {
    this.dispatchEvent(SafariExtensionEventType.Ping);

    keepAliveInterval = setTimeout(() => {
      this.keepAlive();
    }, 3000);
  }
}

export const safariClient = new SafariClient();

export default {
  safariClient
};
