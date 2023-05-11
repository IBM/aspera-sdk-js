import {TransferResponse} from '../models/aspera-desktop.model';
import {WebsocketMessage, WebsocketTopics} from '../models/models';
import {messages} from '../constants/messages';
import {errorLog, generatePromiseObjects} from './helpers';

export class WebsocketService {
  /** The main websocket connection to Aspera Desktop */
  private globalSocket: WebSocket;
  /** A map of requested subscription names and the callback for them */
  private sockets: Map<WebsocketTopics, Function> = new Map();
  /** The websocket URL to use */
  private websocketUrl: string;
  /** Indicator if restart in process to avoid multiples */
  private restartingWebsocket = false;
  /** Global promise object that resolves when init copmletes */
  private initPromise = generatePromiseObjects();

  /** Log call for not being ready */
  private handleNotReady(): void {
    errorLog(messages.websocketNotReady);
  }

  /**
   * This function handles when a connection is opened
   */
  private handleOpen = (): void => {
    this.restartingWebsocket = false;
    this.joinChannel();
  };

  /**
   * This function handles completed subscription
   */
  private handleClosed = (): void => {
    this.restartingWebsocket = false;
    this.handleDisconnect();
  };

  /**
   * This function handles errors received from the websocket
   */
  private handleError = (): void => {
    errorLog(messages.websocketClosedError);
    this.restartingWebsocket = false;
  };

  /**
   * This function attempts to reconnect on error
   */
  private handleDisconnect(): void {
    if (!this.globalSocket) {
      this.handleNotReady();

      return;
    }

    if (!this.restartingWebsocket) {
      this.restartingWebsocket = true;

      setTimeout(() => {
        this.globalSocket.close();
        this.init(this.websocketUrl);
      }, 3000);
    }
  }

  /**
   * This function handles messages received from the websocket
   */
  private handleMessage = (message: MessageEvent<string>): void => {
    this.restartingWebsocket = false;

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
  private joinChannel(): void {
    if (!this.globalSocket) {
      this.handleNotReady();

      return;
    }

    this.globalSocket.send(JSON.stringify({jsonrpc: '2.0', method: 'subscribe_transfer_activity', params: {}, id: 1}));
  }

  /**
   * This function registers clients to listen to a certain message name. Returns any to allow functions to declare proper type
   *
   * @param messageName - the name of messages to listen to (one message name per subscription)
   */
  registerMessage(messageName: WebsocketTopics, callback: Function): void {
    if (!this.sockets.get(messageName)) {
      this.sockets.set(messageName, (data: {result: TransferResponse}) => {
        callback(data.result);
      });
    }
  }

  /**
   * This function starts the websocket subscription with the websocket provider
   *
   * @param socketUrl - the websocket URL to use
   *
   * @returns a promise that resolves when the websocket connection is established
   */
  init(socketUrl: string): Promise<any> {
    this.websocketUrl = socketUrl;

    this.globalSocket = new WebSocket(this.websocketUrl);

    this.globalSocket.onerror = this.handleError;
    this.globalSocket.onclose = this.handleClosed;
    this.globalSocket.onopen = this.handleOpen;
    this.globalSocket.onmessage = this.handleMessage;

    return this.initPromise.promise;
  }
}

export const websocketService = new WebsocketService();

export default WebsocketService;
