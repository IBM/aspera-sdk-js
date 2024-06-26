import { v4 as uuidv4 } from 'uuid';

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
 * Handles communication with the Safari extension using JSON-RPC over custom events.
 */
export class SafariExtensionHandler {
  private safariExtensionExecutors: Map<string, PromiseExecutor>;

  /**
   * Initializes the SafariExtensionHandler instance.
   * Sets up the promise executor map and starts listening to extension events.
   */
  constructor() {
    this.safariExtensionExecutors = new Map();
    this.listenSafariExtensionEvents();
  }

  /**
   * Sends a JSON-RPC request to the Safari extension.
   * @param method The method name to invoke on the extension.
   * @param params Optional parameters for the method.
   * @returns A Promise that resolves with the response from the extension.
   */
  public sendRPCRequest(method: string, params?: any): Promise<any> {
    const request = this.buildRPCRequest(method, params);
    const promise = new Promise<any>((resolve, reject) => {
      this.safariExtensionExecutors.set(request.id, { resolve, reject });
    });

    this.dispatchSafariExtensionEvent(SafariExtensionEventType.Request, request);

    return promise;
  }

  /**
   * Builds a JSON-RPC request object with a unique identifier.
   * @param method The method name to invoke on the extension.
   * @param params Optional parameters for the method.
   * @returns The constructed JSON-RPC request object.
   */
  private buildRPCRequest(method: string, params?: any): JSONRPCRequest {
    return {
      jsonrpc: '2.0',
      method,
      params,
      id: uuidv4()
    };
  }

  /**
   * Dispatches a custom event to the document to communicate with the Safari extension.
   * @param type The type of Safari extension event to dispatch.
   * @param request Optional JSON-RPC request payload to send with the event.
   */
  private dispatchSafariExtensionEvent(type: SafariExtensionEventType, request?: JSONRPCRequest) {
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
  private handleSafariExtensionEvent(response: JSONRPCResponse) {
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
   * and delegates handling to the handleSafariExtensionEvent method.
   */
  private listenSafariExtensionEvents() {
    document.addEventListener('AsperaDesktop.Response', (event: CustomEvent<JSONRPCResponse>) => {
      this.handleSafariExtensionEvent(event.detail);
    });
  }
}

export default SafariExtensionHandler;
