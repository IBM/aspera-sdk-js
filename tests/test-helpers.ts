/**
 * Consolidated test helpers for integration tests.
 */

import {asperaSdk, TransferSpec} from '../src/index';

// ============================================================================
// Fetch Mock
// ============================================================================

export interface FetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
}

let fetchCalls: FetchCall[] = [];
let mockResponseFn: (url: string, body: any) => {status: number; body: any};

/**
 * Sets up fetch mock. Call in beforeEach.
 */
export function mockFetch(responseFn: (url: string, body: any) => {status: number; body: any}) {
  fetchCalls = [];
  mockResponseFn = responseFn;

  global.fetch = jest.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const call: FetchCall = {
      url,
      method: options?.method || 'GET',
      headers: {},
      body: undefined,
    };

    if (options?.headers) {
      const h = options.headers;
      if (h instanceof Headers) {
        h.forEach((v, k) => call.headers[k] = v);
      } else if (Array.isArray(h)) {
        h.forEach(([k, v]) => call.headers[k] = v);
      } else {
        call.headers = {...h as Record<string, string>};
      }
    }

    if (options?.body) {
      try {
        call.body = JSON.parse(options.body as string);
      } catch {
        call.body = options.body;
      }
    }

    fetchCalls.push(call);

    const response = mockResponseFn(url, call.body);
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      headers: {
        get: (name: string) => {
          if (name === 'X-Request-Id') return 'test-request-id';
          if (name === 'Content-Type') return 'application/json';
          return null;
        },
      },
      json: async () => response.body,
      body: null, // Not needed for presign/RPC flows
    };
  });
}

/**
 * Returns all captured fetch calls.
 */
export function getFetchCalls(): FetchCall[] {
  return fetchCalls;
}

/**
 * Returns the last fetch call.
 */
export function lastFetchCall(): FetchCall {
  if (fetchCalls.length === 0) throw new Error('No fetch calls');
  return fetchCalls[fetchCalls.length - 1];
}

// ============================================================================
// SDK Setup
// ============================================================================

type SdkMode = 'http-gateway' | 'desktop-app' | 'connect';

export interface SetupOptions {
  mode: SdkMode;
  gatewayUrl?: string;
  appId?: string;
  rpcPort?: number;
}

/**
 * Sets up SDK for a specific mode. Call in beforeEach.
 */
export function setupSdk(options: SetupOptions) {
  const {mode} = options;

  // Reset all state first
  asperaSdk.globals.httpGatewayVerified = false;
  asperaSdk.globals.httpGatewayUrl = undefined;
  asperaSdk.globals.asperaAppVerified = false;
  asperaSdk.globals.appId = '';
  asperaSdk.globals.connectStatus = 'WAITING';
  asperaSdk.globals.connect = undefined;

  if (mode === 'http-gateway') {
    const url = options.gatewayUrl || 'https://gateway.example.com/aspera/http-gwy';
    asperaSdk.globals.httpGatewayVerified = true;
    asperaSdk.globals.httpGatewayUrl = url;
    asperaSdk.globals.httpGatewayInfo = {
      version: '3.0.0',
      name: 'HTTP Gateway',
      upload_endpoint: [],
      download_endpoint: [],
      endpoints: [],
    };
    // Create iframe container for presign flow
    if (typeof document !== 'undefined') {
      let container = document.getElementById('http-gateway-iframe-container') as HTMLDivElement;
      if (!container) {
        container = document.createElement('div');
        container.id = 'http-gateway-iframe-container';
        document.body.appendChild(container);
      }
      asperaSdk.globals.httpGatewayIframeContainer = container;
    }
  } else if (mode === 'desktop-app') {
    asperaSdk.globals.asperaAppVerified = true;
    asperaSdk.globals.appId = options.appId || 'test-app-id';
    asperaSdk.globals.rpcPort = options.rpcPort || 33024;
    asperaSdk.globals.asperaAppUrl = 'http://127.0.0.1';
  } else if (mode === 'connect') {
    asperaSdk.globals.connectStatus = 'RUNNING';
    asperaSdk.globals.connect = createConnectMock();
  }
}

/**
 * Resets SDK state. Call in afterEach.
 */
export function resetSdk() {
  // Clean up DOM
  if (typeof document !== 'undefined') {
    const container = document.getElementById('http-gateway-iframe-container');
    if (container) container.remove();
  }

  // Reset state
  asperaSdk.globals.httpGatewayVerified = false;
  asperaSdk.globals.httpGatewayUrl = undefined;
  asperaSdk.globals.httpGatewayInfo = undefined;
  asperaSdk.globals.httpGatewayIframeContainer = undefined;
  asperaSdk.httpGatewaySelectedFiles.clear();
  asperaSdk.httpGatewayTransferStore.clear();
  asperaSdk.globals.asperaAppVerified = false;
  asperaSdk.globals.appId = '';
  asperaSdk.globals.rpcPort = 33024;
  asperaSdk.globals.connectStatus = 'WAITING';
  asperaSdk.globals.connect = undefined;
  connectCalls = [];
}

// ============================================================================
// Connect Mock
// ============================================================================

export interface ConnectCall {
  method: string;
  args: any[];
}

let connectCalls: ConnectCall[] = [];

function createConnectMock(): any {
  const capture = (method: string) => (...args: any[]) => {
    connectCalls.push({method, args});
  };

  return {
    // Promise-based methods
    startTransferPromise: jest.fn().mockImplementation((...args) => {
      capture('startTransferPromise')(...args);
      return Promise.resolve({transfer_specs: [{uuid: 'mock-transfer-id'}]});
    }),
    removeTransfer: jest.fn().mockImplementation((...args) => {
      capture('removeTransfer')(...args);
      return Promise.resolve({});
    }),
    stopTransfer: jest.fn().mockImplementation((...args) => {
      capture('stopTransfer')(...args);
      return Promise.resolve({});
    }),
    resumeTransfer: jest.fn().mockImplementation((...args) => {
      capture('resumeTransfer')(...args);
      return Promise.resolve({transfer_spec: {uuid: 'mock-transfer-id'}});
    }),
    showSelectFileDialogPromise: jest.fn().mockImplementation((...args) => {
      capture('showSelectFileDialogPromise')(...args);
      return Promise.resolve({dataTransfer: {files: []}});
    }),
    showSelectFolderDialogPromise: jest.fn().mockImplementation((...args) => {
      capture('showSelectFolderDialogPromise')(...args);
      return Promise.resolve({dataTransfer: {files: []}});
    }),
    showPreferences: jest.fn().mockImplementation((...args) => {
      capture('showPreferences')(...args);
      return Promise.resolve({});
    }),
    getTransfer: jest.fn().mockImplementation((...args) => {
      capture('getTransfer')(...args);
      return Promise.resolve({transfer_info: {uuid: args[0]}});
    }),
    showDirectory: jest.fn().mockImplementation((...args) => {
      capture('showDirectory')(...args);
      return Promise.resolve({});
    }),
    modifyTransfer: jest.fn().mockImplementation((...args) => {
      capture('modifyTransfer')(...args);
      return Promise.resolve({uuid: args[0]});
    }),
    readAsArrayBuffer: jest.fn().mockImplementation((...args) => {
      capture('readAsArrayBuffer')(...args);
      return Promise.resolve({data: '', type: 'application/octet-stream'});
    }),
    readChunkAsArrayBuffer: jest.fn().mockImplementation((...args) => {
      capture('readChunkAsArrayBuffer')(...args);
      return Promise.resolve({data: '', type: 'application/octet-stream'});
    }),
    // Callback-based methods
    getAllTransfers: jest.fn().mockImplementation((callbacks) => {
      capture('getAllTransfers')([callbacks]);
      callbacks.success({transfers: []});
    }),
  };
}

/**
 * Returns all captured Connect SDK calls.
 */
export function getConnectCalls(): ConnectCall[] {
  return connectCalls;
}

/**
 * Returns the last Connect SDK call.
 */
export function lastConnectCall(): ConnectCall {
  if (connectCalls.length === 0) throw new Error('No Connect calls');
  return connectCalls[connectCalls.length - 1];
}

/**
 * Returns the Connect mock instance for direct assertions.
 */
export function getConnectMock(): any {
  return asperaSdk.globals.connect;
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Creates a presign success response.
 */
export function presignOk(signedUrl = 'https://example.com/signed') {
  return {status: 200, body: {signed_url: signedUrl}};
}

/**
 * Creates a presign error response.
 */
export function presignError(code: number, message: string) {
  return {status: code, body: {code, message}};
}

/**
 * Creates a JSON-RPC success response.
 */
export function rpcOk(result: any, id: number) {
  return {status: 200, body: {jsonrpc: '2.0', result, id}};
}

/**
 * Creates a JSON-RPC error response.
 */
export function rpcError(code: number, message: string, id: number) {
  return {status: 200, body: {jsonrpc: '2.0', error: {code, message}, id}};
}

// ============================================================================
// Transfer Spec Helpers
// ============================================================================

export function downloadSpec(overrides: Partial<TransferSpec> = {}): TransferSpec {
  return {
    direction: 'receive',
    remote_host: 'files.example.com',
    paths: [{source: '/remote/file.txt'}],
    ...overrides,
  };
}

export function uploadSpec(overrides: Partial<TransferSpec> = {}): TransferSpec {
  return {
    direction: 'send',
    remote_host: 'files.example.com',
    paths: [{source: '/local/file.txt'}],
    ...overrides,
  };
}
