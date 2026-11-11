import {asperaSdk, currentTransferClient, getStatus, initSession, registerStatusCallback} from '../../src/index';
import {client} from '../../src/helpers/client/client';
import {detectConnectExtension} from '../../src/helpers/connect-extension';
import {SdkStatus} from '../../src/models/models';
import {resetSdk} from '../test-helpers';
import {websocketService} from '../../src/helpers/ws';

jest.mock('../../src/helpers/connect-extension', () => ({
  detectConnectExtension: jest.fn(),
}));

/** Every Connect instance the SDK constructs, so tests can drive its status events. */
const connectInstances: MockConnect[] = [];

interface MockConnect {
  emitStatus: (status: string) => void;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  stop: jest.Mock;
  initSession: jest.Mock;
}

jest.mock('@ibm-aspera/connect-sdk-js', () => {
  const EVENT = {STATUS: 'connect_status', TRANSFER: 'transfer'};

  class Connect {
    static EVENT = EVENT;
    private listeners: {type: string; cb: Function}[] = [];
    addEventListener = jest.fn((type: string, cb: Function) => this.listeners.push({type, cb}));
    removeEventListener = jest.fn(() => {
      this.listeners = [];
    });
    stop = jest.fn();
    initSession = jest.fn();
    emitStatus = (status: string): void => {
      this.listeners.filter(l => l.type === EVENT.STATUS).forEach(l => l.cb(EVENT.STATUS, status));
    };

    constructor() {
      connectInstances.push(this as unknown as MockConnect);
    }
  }

  class ConnectInstaller {}

  return {Connect, ConnectInstaller};
});

const RETRY_INTERVAL = 2000;
const RETRY_TIMEOUT = 5000;

describe('Connect fallback with background Desktop detection', () => {
  let desktopRunning: boolean;
  let statuses: SdkStatus[];

  /** Advance past the Desktop detection timeout so the SDK falls back to Connect. */
  const fallBackToConnect = async (): Promise<MockConnect> => {
    await jest.advanceTimersByTimeAsync(RETRY_TIMEOUT);
    expect(connectInstances).toHaveLength(1);
    return connectInstances[0];
  };

  beforeEach(() => {
    jest.useFakeTimers();
    connectInstances.length = 0;
    desktopRunning = false;
    statuses = [];

    (detectConnectExtension as jest.Mock).mockResolvedValue(true);
    jest.spyOn(asperaSdk.activityTracking, 'setup').mockResolvedValue(undefined);
    jest.spyOn(client, 'request').mockImplementation((method: String) => {
      if (!desktopRunning) {
        return Promise.reject(new Error('Desktop not running'));
      }

      switch (method) {
      case 'get_info':
        return Promise.resolve({version: '1.0.0'});
      case 'rpc.discover':
        return Promise.resolve({methods: [{name: 'start_transfer'}]});
      default:
        return Promise.resolve(true);
      }
    });

    registerStatusCallback(status => statuses.push(status));
    initSession({
      appId: 'app',
      retryInterval: RETRY_INTERVAL,
      retryTimeout: RETRY_TIMEOUT,
      connectSettings: {useConnect: false, fallback: true},
    });
  });

  afterEach(() => {
    resetSdk();
    asperaSdk.globals.rpcMethods = [];
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('switches from Connect to Desktop when Desktop is detected later', async () => {
    const connect = await fallBackToConnect();
    connect.emitStatus('RUNNING');

    expect(getStatus()).toBe('RUNNING');
    expect(currentTransferClient()).toBe('connect');

    desktopRunning = true;
    await jest.advanceTimersByTimeAsync(RETRY_INTERVAL);

    expect(statuses).toEqual(['INITIALIZING', 'RUNNING', 'RUNNING']);
    expect(currentTransferClient()).toBe('desktop');
    expect(connect.removeEventListener).toHaveBeenCalled();
    expect(connect.stop).toHaveBeenCalledTimes(1);
  });

  it('reports the new client from inside the RUNNING callback', async () => {
    const clientsSeen: string[] = [];
    registerStatusCallback(status => {
      if (status === 'RUNNING') {
        clientsSeen.push(currentTransferClient());
      }
    });

    const connect = await fallBackToConnect();
    connect.emitStatus('RUNNING');
    desktopRunning = true;
    await jest.advanceTimersByTimeAsync(RETRY_INTERVAL);

    expect(clientsSeen).toEqual(['connect', 'desktop']);
  });

  it('keeps using Connect, without duplicate RUNNING, while Desktop stays unavailable', async () => {
    const connect = await fallBackToConnect();
    connect.emitStatus('RUNNING');

    await jest.advanceTimersByTimeAsync(RETRY_INTERVAL * 5);

    expect(statuses).toEqual(['INITIALIZING', 'RUNNING']);
    expect(currentTransferClient()).toBe('connect');
    expect(connect.stop).not.toHaveBeenCalled();
    // Desktop is actually being probed in the background, not short-circuited because Connect is active
    expect((client.request as jest.Mock).mock.calls.filter(([m]) => m === 'get_info').length).toBeGreaterThan(1);
  });

  it('stops polling once Desktop takes over', async () => {
    const connect = await fallBackToConnect();
    connect.emitStatus('RUNNING');
    desktopRunning = true;
    await jest.advanceTimersByTimeAsync(RETRY_INTERVAL);

    const requestCount = (client.request as jest.Mock).mock.calls.length;
    await jest.advanceTimersByTimeAsync(RETRY_INTERVAL * 5);

    expect((client.request as jest.Mock).mock.calls.length).toBe(requestCount);
  });

  it('switches to Desktop if detected before Connect finishes starting', async () => {
    const connect = await fallBackToConnect();
    connect.emitStatus('INITIALIZING');

    desktopRunning = true;
    await jest.advanceTimersByTimeAsync(RETRY_INTERVAL);

    expect(statuses).toEqual(['INITIALIZING', 'RUNNING']);
    expect(currentTransferClient()).toBe('desktop');
    expect(connect.stop).toHaveBeenCalledTimes(1);

    // A late Connect status cannot reach the SDK since its listeners were removed
    connect.emitStatus('RUNNING');
    expect(currentTransferClient()).toBe('desktop');
  });

  it('recovers to Desktop after Connect fails to start', async () => {
    const connect = await fallBackToConnect();
    connect.emitStatus('FAILED');

    expect(getStatus()).toBe('FAILED');
    expect(connect.stop).toHaveBeenCalledTimes(1);

    desktopRunning = true;
    await jest.advanceTimersByTimeAsync(RETRY_INTERVAL);

    expect(getStatus()).toBe('RUNNING');
    expect(currentTransferClient()).toBe('desktop');
    // stopConnect is idempotent
    expect(connect.stop).toHaveBeenCalledTimes(1);
  });

  it('ignores Desktop websocket events while Connect is the active client', async () => {
    const connect = await fallBackToConnect();
    connect.emitStatus('RUNNING');

    asperaSdk.activityTracking.handleWebSocketEvents('CLOSED');
    asperaSdk.activityTracking.handleClientEvents(false);

    expect(getStatus()).toBe('RUNNING');
    expect(currentTransferClient()).toBe('connect');
  });
});

describe('Connect fallback background Desktop detection over a long session', () => {
  const realWebSocket = global.WebSocket;
  let desktopRunning: boolean;

  /** Minimal WebSocket that connects only while Desktop is running and acks the subscription. */
  class FakeWebSocket {
    url = 'ws://127.0.0.1:33024';
    onopen: () => void;
    onerror: () => void;
    onclose: () => void;
    onmessage: (message: {data: string}) => void;

    constructor() {
      setTimeout(() => (desktopRunning ? this.onopen?.() : this.onerror?.()), 10);
    }

    send(): void {
      setTimeout(() => this.onmessage?.({data: JSON.stringify({id: 1})}), 0);
    }

    close(): void {}
  }

  beforeEach(() => {
    jest.useFakeTimers();
    connectInstances.length = 0;
    desktopRunning = false;
    (global as any).WebSocket = FakeWebSocket;

    (detectConnectExtension as jest.Mock).mockResolvedValue(true);
    jest.spyOn(client, 'request').mockImplementation((method: String) => {
      return Promise.resolve(method === 'rpc.discover' ? {methods: [{name: 'start_transfer'}]} : {});
    });
  });

  afterEach(() => {
    websocketService.disconnect();
    (global as any).WebSocket = realWebSocket;
    resetSdk();
    asperaSdk.globals.rpcMethods = [];
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('does not accumulate detection attempts that burst into Desktop when it appears', async () => {
    initSession({
      appId: 'app',
      retryInterval: RETRY_INTERVAL,
      retryTimeout: RETRY_TIMEOUT,
      connectSettings: {useConnect: false, fallback: true},
    });
    await jest.advanceTimersByTimeAsync(RETRY_TIMEOUT);
    connectInstances[0].emitStatus('RUNNING');

    // Two minutes on Connect: ~60 poll ticks while Desktop is unreachable
    for (let i = 0; i < 120; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }

    desktopRunning = true;
    for (let i = 0; i < 5; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }

    const getInfoCalls = (client.request as jest.Mock).mock.calls.filter(([m]) => m === 'get_info');
    expect(getInfoCalls).toHaveLength(1);
    expect(currentTransferClient()).toBe('desktop');
  }, 30000);
});
