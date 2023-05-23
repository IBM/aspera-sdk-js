import {DesktopTransfer, TransferSpec} from './models';
import {errorLog} from '../helpers/helpers';
import {websocketService} from '../helpers/ws';
import {hiddenStyleList, protocol} from '../constants/constants';
import {messages} from '../constants/messages';

class DesktopGlobals {
  /** The URL of the Aspera Desktop HTTP server to use with the SDK */
  desktopUrl = 'http://127.0.0.1:3001';
  /** Desktop info */
  desktopInfo: DesktopInfo;
  /** Indication that the server has been verified as working */
  desktopVerified = false;
  /** The unique ID for the website */
  appId: string;

  backupLaunchMethod(url: string): void {
    window.alert(messages.loadingProtocol);
    window.location.href = url;
  }

  /**
   * Launch the Aspera Desktop via protocol url. By default a hidden IFRAME attempts to
   * open the app but if that fails a fallback of opening a new window happens.
   */
  launch(): void {
    try {
      const element = document.createElement('iframe');
      element.src = protocol;
      element.onerror = error => {
        errorLog(messages.failedToGenerateIframe, error);
        this.backupLaunchMethod(protocol);
      };
      element.setAttribute('style', hiddenStyleList);
      document.body.appendChild(element);
    } catch (error) {
      errorLog(messages.failedToGenerateIframe, error);
      this.backupLaunchMethod(protocol);
    }
  }
}

export class DesktopInfo {
  /** The version of Aspera Desktop */
  version: string;
}

export class TransferResponse {
  transfers: DesktopTransfer[];
}

export class ActivityTracking {
  /** Map of callbacks that receive transfers */
  private callbacks: Map<string, Function> = new Map();

  /**
   * Notify all consumers when a message is received from the websocket
   *
   * @param data the data received from the websocket
   */
  private handleTransferActivity(data: TransferResponse): void {
    this.callbacks.forEach(callback => {
      if (typeof callback === 'function') {
        callback(data);
      }
    });
  }

  /**
   * Set up the websocket connection to Aspera Desktop
   *
   * @param url websocket URL
   *
   * @returns a promise that resolves when the websocket connection is established.
   * Currently this promise does not reject.
   */
  setup(url: string, appId: string): Promise<any> {
    return websocketService.init(url, appId)
      .then((response) => {
        websocketService.registerMessage('transfer_activity', (data: TransferResponse) => this.handleTransferActivity(data));

        return response;
      });
  }

  /**
   * Register a callback for getting transfers back to the consumer
   *
   * @param callback the function to call with the array of transfers
   *
   * @returns the ID of the callback index
   */
  setCallback(callback: (transfers: TransferResponse) => void): string {
    if (typeof callback !== 'function') {
      errorLog(messages.callbackIsNotFunction);
      return;
    }
    const id = `callback-${this.callbacks.size + 1}`;
    this.callbacks.set(id, callback);
    return id;
  }

  /**
   * Remove the callback (deregister) from the list of callbacks
   *
   * @param id the string of the callback to remove
   */
  removeCallback(id: string): void {
    this.callbacks.delete(id);
  }
}

export class Desktop {
  /** Global information about Aspera Desktop */
  globals: DesktopGlobals = new DesktopGlobals();
  /** Activity tracking for watching transfers */
  activityTracking: ActivityTracking = new ActivityTracking();
  /** Function to initialize Aspera Desktop */
  initDesktop: (appId: string) => Promise<any>;
  /** Function to test the Aspera Desktop status */
  testDesktopConnection: () => Promise<any>;
  /** Function to initiate a transfer */
  startTransfer: (transferSpec: TransferSpec) => Promise<any>;
  /** Function to launch Aspera Desktop */
  launch: () => void;
  /** Register callback for the transfer activity monitor */
  registerActivityCallback: (callback: (transfers: TransferResponse) => void) => string;
  /** Deregister callback to remove it from the callbacks getting transfer data */
  deregisterActivityCallback: (id: string) => void;
  /** Function to remove a transfer */
  removeTransfer: (transferId: string) => Promise<any>;

  /**
   * Check if the Aspera Desktop HTTP server is ready to be used
   * and has been verified.
   *
   * @returns a boolean indicating if SDK can be used for requests
   */
  get isReady(): boolean {
    return this.globals.desktopVerified;
  }
};
