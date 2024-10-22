import {errorLog, generatePromiseObjects, getWebsocketUrl} from './helpers';
import {messages} from '../constants/messages';
import {asperaDesktop} from '../index';
import {TransferResponse} from '../models/aspera-desktop.model';
import {WebsocketEvents, WebsocketMessage, WebsocketTopics} from '../models/models';

export class WebsocketService {
  /** The main websocket connection to Aspera Desktop */
  private globalSocket: WebSocket;
  /** The app ID of transfers we want to receive notifications for */
  private appId: string;
  /** A map of requested subscription names and the callback for them */
  private sockets: Map<WebsocketTopics, Function> = new Map();
  /** The callback for websocket events */
  private eventListener: Function;
  /** Indicator if the websocket is already connected */
  private isConnected = false;
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
    const data: WebsocketMessage = JSON.parse(message.data);

    // Message we get on subscription
    if (data.id === 1) {
      this.initPromise.resolver(data);

      return;
    }

    const socket = this.sockets.get(data.method);

    if (socket && data.params) {
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

    this.globalSocket.send(JSON.stringify({jsonrpc: '2.0', method: 'subscribe_transfer_activity', params: [this.appId], id: 1}));

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
    this.connect();

    return this.initPromise.promise;
  }

  private connect() {
    this.getWebSocketConnection(33024, 33029)
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

  private reconnect() {
    if (this.globalSocket) {
      this.globalSocket.close();
    }

    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  private getWebSocketConnection(startPort: number, endPort: number): Promise<WebSocket> {
    const webSocketUrl = getWebsocketUrl(asperaDesktop.globals.desktopUrl);

    const checkPort = (port: number): Promise<WebSocket> => {
      return new Promise((resolve, reject) => {
        const webSocket = new WebSocket(`${webSocketUrl}:${port}`);

        webSocket.onopen = () => {
          resolve(webSocket);
        };

        webSocket.onerror = () => {
          reject(`Connection failed on port ${port}`);
        };
      });
    };

    return new Promise((resolve, reject) => {
      const connectPort = (port: number) => {
        if (port > endPort) {
          return reject('No available WebSocket connection found');
        }

        checkPort(port)
          .then(ws => resolve(ws))
          .catch((error) => {
            connectPort(port + 1);
          });
      };

      connectPort(startPort);
    });
  }

  private notifyEvent(event: WebsocketEvents) {
    if (typeof this.eventListener === 'function') {
      this.eventListener(event);
    }
  }

  private updateRpcPort() {
    if (!this.globalSocket) {
      return;
    }

    const url = new URL(this.globalSocket.url);

    asperaDesktop.globals.rpcPort = Number(url.port);
  }
}

export const websocketService = new WebsocketService();

export default WebsocketService;
