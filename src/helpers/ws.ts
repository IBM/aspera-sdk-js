import {errorLog, generatePromiseObjects, getWebsocketUrl, safeJsonParse, safeJsonString} from './helpers';
import {messages} from '../constants/messages';
import {asperaSdk} from '../index';
import {TransferResponse} from '../models/aspera-sdk.model';
import {WebsocketEvent, WebsocketMessage, WebsocketTopics} from '../models/models';

export class WebsocketService {
  /** The main websocket connection to Aspera App*/
  private globalSocket: WebSocket;
  /** A map of requested subscription names and the callback for them */
  private sockets: Map<WebsocketTopics, Function> = new Map();
  /** The callback for websocket events */
  private eventListener: Function;
  /** Indicator if the websocket is already connected */
  private isConnected = false;
  /** When true, the reconnect loop is suppressed */
  private stopped = false;
  /** ID of the pending reconnect timer (so it can be cancelled) */
  private reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
  /** Global promise object that resolves when init completes */
  private initPromise = generatePromiseObjects();

  /** Log call for not being ready */
  private handleNotReady(): void {
    errorLog(messages.websocketNotReady);
  }

  /**
   * This function handles when a connection is opened
   */
  private handleOpen = (): void => {
    if (this.isConnected || !this.joinChannel()) {
      return;
    }

    this.isConnected = true;
    this.updateRpcPort();
    this.notifyEvent('RECONNECT');
  };

  /**
   * This function handles completed subscription
   */
  private handleClose = (): void => {
    if (this.isConnected) {
      this.isConnected = false;
      this.notifyEvent('CLOSED');
    }

    if (!this.globalSocket) {
      this.handleNotReady();
      return;
    }

    this.reconnect();
  };

  /**
   * This function handles errors received from the websocket
   */
  private handleError = (): void => {
    errorLog(messages.websocketClosedError);
  };

  /**
   * This function handles messages received from the websocket
   */
  private handleMessage = (message: MessageEvent<string>): void => {
    const data: WebsocketMessage|undefined = safeJsonParse(message.data);

    // Message we get on subscription
    if (data && data.id === 1) {
      this.initPromise.resolver(data);

      return;
    }

    const socket = this.sockets.get(data.method);

    if (typeof socket === 'function' && data.params) {
      socket(data.params);
    }
  };

  /**
   * This function joins the channel to be able to subscribe to events
   */
  private joinChannel(): boolean {
    if (!this.globalSocket) {
      this.handleNotReady();
      return false;
    }

    this.globalSocket.send(safeJsonString({jsonrpc: '2.0', method: 'subscribe_transfer_activity', params: [asperaSdk.globals.appId], id: 1}));

    return true;
  }

  /**
   * This function registers clients to listen to a certain message name. Returns any to allow functions to declare proper type
   *
   * @param messageName - the name of messages to listen to (one message name per subscription)
   * @param callback - the callback function
   */
  registerMessage(messageName: WebsocketTopics, callback: Function): void {
    if (!this.sockets.get(messageName)) {
      this.sockets.set(messageName, (data: {result: TransferResponse}) => {
        callback(data.result);
      });
    }
  }

  /**
   *
   * @param callback This function registers clients to a certain WebSocket event.
   *
   * @param callback - the callback function to call with the event name.
   */
  registerEvent(callback: Function): void {
    this.eventListener = callback;
    this.eventListener(this.isConnected ? 'RECONNECT': 'CLOSED');
  }

  /**
   * This function starts the websocket subscription with the websocket provider
   *
   * @returns a promise that resolves when the websocket connection is established
   */
  init(): Promise<unknown> {
    this.stopped = false;
    this.connect();

    return this.initPromise.promise;
  }

  /**
   * Stop the WebSocket connection and suppress the automatic reconnect loop.
   * Used when falling back to a different transfer client (e.g. Connect).
   */
  disconnect(): void {
    this.stopped = true;

    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }

    this.detachSocket();
    if (this.globalSocket) {
      this.globalSocket.close();
      this.globalSocket = null;
    }

    this.isConnected = false;
  }

  private connect() {
    this.detachSocket();

    this.getWebSocketConnection(asperaSdk.globals.rpcPort)
      .then((webSocket) => {
        this.globalSocket = webSocket;
        this.globalSocket.onerror = this.handleError;
        this.globalSocket.onclose = this.handleClose;
        this.globalSocket.onopen = this.handleOpen;
        this.globalSocket.onmessage = this.handleMessage;

        this.handleOpen();
      }).catch(() => {
        this.reconnect();
      });
  }

  /**
   * Detach event handlers from the current socket so it cannot fire
   * stale CLOSED/RECONNECT events after being replaced.
   */
  private detachSocket(): void {
    if (this.globalSocket) {
      this.globalSocket.onopen = null;
      this.globalSocket.onclose = null;
      this.globalSocket.onerror = null;
      this.globalSocket.onmessage = null;
    }
  }

  private reconnect() {
    if (this.stopped) {
      return;
    }

    this.detachSocket();
    if (this.globalSocket) {
      this.globalSocket.close();
    }

    this.reconnectTimerId = setTimeout(() => {
      this.reconnectTimerId = null;
      this.connect();
    }, 1000);
  }

  private getWebSocketConnection(port: number): Promise<WebSocket> {
    const webSocketUrl = getWebsocketUrl(asperaSdk.globals.asperaAppUrl);

    return new Promise((resolve, reject) => {
      const webSocket = new WebSocket(`${webSocketUrl}:${port}`);

      webSocket.onopen = () => {
        resolve(webSocket);
      };

      webSocket.onerror = () => {
        reject(`Connection failed on port ${port}`);
      };
    });
  }

  private notifyEvent(event: WebsocketEvent) {
    if (typeof this.eventListener === 'function') {
      this.eventListener(event);
    }
  }

  private updateRpcPort() {
    if (!this.globalSocket) {
      return;
    }

    const url = new URL(this.globalSocket.url);

    asperaSdk.globals.rpcPort = Number(url.port);
  }
}

export const websocketService = new WebsocketService();

export default WebsocketService;
