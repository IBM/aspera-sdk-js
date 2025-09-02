import {JSONRPCClient, JSONRPCRequest} from 'json-rpc-2.0';
import Client from './client';
import {generatePromiseObjects, safeJsonString} from '../helpers';
import {asperaSdk} from '../../index';

export const getRpcServerUrl = (): string => {
  return `${asperaSdk.globals.asperaAppUrl}:${asperaSdk.globals.rpcPort}`;
};

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
class JSONRPCHttpClient {
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
      body: safeJsonString(request),
    };

    const rpcServerURL = getRpcServerUrl();

    return fetch(rpcServerURL, options).then(response => {
      if (response.ok) {
        return response.json().then(rpcResponse => this.client.receive(rpcResponse));
      } else if (request.id !== undefined) {
        throw Promise.reject(response.statusText);
      }
    });
  };

  request = (method: string, data: any): PromiseLike<any> => {
    return this.client.request(method, data);
  };
}

/**
 * Client used for making requests to Aspera.
 */
class HttpClient implements Client {
  /** HTTP client used to make requests */
  httpClient: JSONRPCHttpClient;

  constructor() {
    this.httpClient = new JSONRPCHttpClient();
  };

  request = (method: string, payload: any = {}): Promise<any> => {
    return handlePromiseLikeErrors(this.httpClient.request(method, payload));
  };
}

export const httpClient = new HttpClient();

export default {
  httpClient,
  handlePromiseLikeErrors,
};
