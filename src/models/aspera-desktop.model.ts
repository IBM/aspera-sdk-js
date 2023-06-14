import {DesktopTransfer, FileDialogOptions, FolderDialogOptions, TransferSpec} from './models';
import {errorLog} from '../helpers/helpers';
import {websocketService} from '../helpers/ws';
import {hiddenStyleList, protocol} from '../constants/constants';
import {messages} from '../constants/messages';

class DesktopGlobals {
  /** The URL of the Aspera Desktop HTTP server to use with the SDK */
  desktopUrl = 'http://127.0.0.1:33024';
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

export type ActivityMessageTypes = 'transferUpdated'|'transferRemoved';

export class ActivityMessage {
  type: ActivityMessageTypes;
  data: unknown;
}

export class ActivityTracking {
  /** Map of callbacks that receive transfer update events */
  private activity_callbacks: Map<string, Function> = new Map();
  /** Map of callbacks that received removed transfer events */
  private removed_callbacks: Map<string, Function> = new Map();

  /**
   * Notify all consumers when a message is received from the websocket
   *
   * @param data the data received from the websocket
   */
  private handleTransferActivity(message: ActivityMessage): void {
    if (message.type === 'transferUpdated') {
      this.activity_callbacks.forEach(callback => {
        if (typeof callback === 'function') {
          callback(message.data);
        }
      });
    }

    if (message.type === 'transferRemoved') {
      this.removed_callbacks.forEach(callback => {
        if (typeof callback === 'function') {
          callback(message.data);
        }
      });
    };
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
        websocketService.registerMessage('transfer_activity', (data: ActivityMessage) => this.handleTransferActivity(data));

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
    const id = `callback-${this.activity_callbacks.size + 1}`;
    this.activity_callbacks.set(id, callback);
    return id;
  }

  /**
   * Remove the callback (deregister) from the list of callbacks
   *
   * @param id the string of the callback to remove
   */
  removeCallback(id: string): void {
    this.activity_callbacks.delete(id);
  }

  /**
   * Register a callback for getting transfers back to the consumer
   *
   * @param callback the function to call with the array of transfers
   *
   * @returns the ID of the callback index
   */
  setRemovedCallback(callback: (transfer: DesktopTransfer) => void): string {
    if (typeof callback !== 'function') {
      errorLog(messages.callbackIsNotFunction);
      return;
    }
    const id = `callback-${this.removed_callbacks.size + 1}`;
    this.removed_callbacks.set(id, callback);
    return id;
  }

  /**
     * Remove the callback (deregister) from the list of callbacks
     *
     * @param id the string of the callback to remove
     */
  removeRemovedCallback(id: string): void {
    this.removed_callbacks.delete(id);
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
  /** Register callback for removed transfers from the app */
  registerRemovedCallback: (callback: (transfer: DesktopTransfer) => void) => string;
  /** Deregister callback to remove it from the callbacks getting removed transfer data */
  deregisterRemovedCallback: (id: string) => void;
  /** Function to remove a transfer */
  removeTransfer: (transferId: string) => Promise<any>;
  /** Function to show the transfer's download directory in Finder or Windows Explorer */
  showDirectory: (transferId: string) => Promise<any>;
  /** Function to stop a transfer */
  stopTransfer: (transferId: string) => Promise<any>;
  /** Function to get a list of transfers */
  getTransfers: (transferIds: string[]) => Promise<any>;
  /** Function to display a file dialog for the user to select files. */
  showSelectFileDialog: (options?: FileDialogOptions) => Promise<any>;
  /** Function to display a folder dialog for the user to select folders. */
  showSelectFolderDialog: (options?: FolderDialogOptions) => Promise<any>;

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
