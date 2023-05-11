import {JSONRPCClient, JSONRPCRequest} from 'json-rpc-2.0';
import {asperaDesktop} from '../index';
import {generatePromiseObjects} from './helpers';

/**
 * Wraps a promise like object and returns a promise that supports catch.
 *
 * @param promise the HTTP promise like to wrap
 *
 * @returns promise for the HTTP connection with catch supporting error
 */
export const handlePromiseLikeErrors = (promise: PromiseLike<any>): Promise<any> => {
  const promiseInfo = generatePromiseObjects();

  promise.then(response => {
    promiseInfo.resolver(response);
  }, error => {
    promiseInfo.rejecter(error);
  });

  return promiseInfo.promise;
};

/**
 * JSON RPC client using HTTP (fetch) as transport.
 */
class HttpClient {
  /** JSON-RPC client used to make requests */
  client: JSONRPCClient;

  constructor() {
    this.client = new JSONRPCClient(this.handleRequest);
  }

  /**
   * Request handler for the JSON-RPC client. This function is called by the JSON-RPC library
   * after forming the RPC request.
   *
   * @param request JSON-RPC request to send to the server
   */
  private handleRequest = (request: JSONRPCRequest) => {
    const options = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(request),
    };

    return fetch(asperaDesktop.globals.desktopUrl, options).then(response => {
      if (response.ok) {
        return response.json().then(rpcResponse => this.client.receive(rpcResponse));
      } else if (request.id !== undefined) {
        throw Promise.reject(new Error(response.statusText));
      }
    });
  };

  request = (method: string, data: any): PromiseLike<any> => {
    return this.client.request(method, data);
  };
}

/**
 * Client used for making requests to Aspera Desktop.
 */
class Client {
  /** HTTP client used to make requests */
  httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient();
  };

  request = (method: string, data: any = {}): Promise<any> => {
    return handlePromiseLikeErrors(this.httpClient.request(method, data));
  };
}

export const client = new Client();

export default {
  client,
  handlePromiseLikeErrors,
};
