import {DesktopSpec, DesktopTransfer, ModifyTransferOptions, InstallerOptions, FileDialogOptions, FolderDialogOptions, TransferSpec, InstallerInfoResponse, DataTransferResponse, ResumeTransferOptions, WebsocketEvents, CustomBrandingOptions} from './models';
import {hiddenStyleList, protocol} from '../constants/constants';
import {messages} from '../constants/messages';
import {safariClient} from '../helpers/client/safari-client';
import {errorLog, getWebsocketUrl, isSafari} from '../helpers/helpers';
import {websocketService} from '../helpers/ws';
import {asperaDesktop} from '../index';

class DesktopGlobals {
  /** The URL of the IBM Aspera Desktop HTTP server to use with the SDK */
  desktopUrl = 'http://127.0.0.1:33024';
  /** The default URL to check for latest Aspera Desktop installers */
  installerUrl = 'https://d3gcli72yxqn2z.cloudfront.net/downloads/desktop/latest/stable';
  /** Desktop info */
  desktopInfo: DesktopInfo;
  /** Indication that the server has been verified as working */
  desktopVerified = false;
  /** The unique ID for the website */
  appId: string;
  /** Map of dropzones created by querySelector */
  dropzonesCreated: Map<string, {event: string; callback: (event: any) => void}[]> = new Map();

  backupLaunchMethod(url: string): void {
    window.alert(messages.loadingProtocol);
    window.location.href = url;
  }

  /**
   * Launch the IBM Aspera Desktop via protocol url. By default a hidden IFRAME attempts to
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
  /** The version of IBM Aspera Desktop */
  version: string;
  /** The public key corresponding to the SSH private key generated by IBM Aspera Desktop */
  client_pubkey?: string;
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
  /** Map of callbacks that receive connection events */
  private event_callbacks: Map<string, Function> = new Map();

  /** Keep track of the last notified event to prevent duplication **/
  private lastNotifiedEvent: WebsocketEvents;

  /**
   * Notify all consumers when a message is received from the websocket
   *
   * @param message the message received from the websocket
   */
  handleTransferActivity(message: ActivityMessage): void {
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
    }
  }

  /**
   * Notify all consumers when a connection event occurs. For example, when the SDK
   * websocket connection to IBM Aspera Desktop is closed or reconnected.
   *
   * @param event the event type.
   */
  handleWebSocketEvents(event: WebsocketEvents): void {
    if (this.lastNotifiedEvent === event) {
      return;
    }

    this.event_callbacks.forEach(callback => {
      if (typeof callback === 'function') {
        callback(event);
      }
    });

    this.lastNotifiedEvent = event;
  }

  /**
   * Set up the activity tracking with IBM Aspera Desktop.
   *
   * @param appId - the App ID
   *
   * @returns a promise that resolves when the websocket connection is established.
   * Currently, this promise does not reject.
   */
  setup(appId: string): Promise<unknown> {
    if (isSafari()) {
      return safariClient.monitorTransferActivity();
    }

    const url = getWebsocketUrl(asperaDesktop.globals.desktopUrl);

    return websocketService.init(url, appId)
      .then(() => {
        websocketService.registerMessage('transfer_activity', (data: ActivityMessage) => this.handleTransferActivity(data));
        websocketService.registerEvent((status: 'CLOSED'|'RECONNECT') => this.handleWebSocketEvents(status));
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

  /**
   * Register a callback for getting websocket events back to the consumer
   *
   * @param callback the function to call with the websocket event
   *
   * @returns the ID of the callback index
   */
  setWebSocketEventCallback(callback: (status: WebsocketEvents) => void): string {
    if (typeof callback !== 'function') {
      errorLog(messages.callbackIsNotFunction);
      return;
    }
    const id = `callback-${this.event_callbacks.size + 1}`;
    this.event_callbacks.set(id, callback);
    return id;
  }

  /**
   * Remove the callback (deregister) from the list of callbacks
   *
   * @param id the string of the callback to remove
   */
  removeWebSocketEventCallback(id: string): void {
    this.event_callbacks.delete(id);
  }
}

export class Desktop {
  /** Global information about IBM Aspera Desktop */
  globals: DesktopGlobals = new DesktopGlobals();
  /** Activity tracking for watching transfers */
  activityTracking: ActivityTracking = new ActivityTracking();
  /** Function to initialize IBM Aspera Desktop */
  initDesktop: (appId: string) => Promise<any>;
  /** Function to test the IBM Aspera Desktop status */
  testDesktopConnection: () => Promise<any>;
  /** Function to initiate a transfer */
  startTransfer: (transferSpec: TransferSpec, desktopSpec: DesktopSpec) => Promise<DesktopTransfer>;
  /** Function to launch IBM Aspera Desktop */
  launch: () => void;
  /** Register callback for the transfer activity monitor */
  registerActivityCallback: (callback: (transfers: TransferResponse) => void) => string;
  /** Deregister callback to remove it from the callbacks getting transfer data */
  deregisterActivityCallback: (id: string) => void;
  /** Register callback for removed transfers from the app */
  registerRemovedCallback: (callback: (transfer: DesktopTransfer) => void) => string;
  /** Deregister callback to remove it from the callbacks getting removed transfer data */
  deregisterRemovedCallback: (id: string) => void;
  /** Register callback for connection status events from the app */
  registerStatusCallback: (callback: (status: 'CLOSED'|'RECONNECT') => void) => string;
  /** Deregister callback to remove it from the callbacks getting connection events */
  deregisterStatusCallback: (id: string) => void;
  /** Function to remove a transfer */
  removeTransfer: (transferId: string) => Promise<any>;
  /** Function to show the transfer's download directory in Finder or Windows Explorer */
  showDirectory: (transferId: string) => Promise<any>;
  /** Function to stop a transfer */
  stopTransfer: (transferId: string) => Promise<any>;
  /** Function to resume a transfer */
  resumeTransfer: (transferId: string, options?: ResumeTransferOptions) => Promise<DesktopTransfer>;
  /** Function to get a list of all transfers */
  getAllTransfers: () => Promise<DesktopTransfer[]>;
  /** Function to get information for a specific transfer */
  getTransfer: (transferId: string) => Promise<DesktopTransfer>;
  /** Function to display a file dialog for the user to select files. */
  showSelectFileDialog: (options?: FileDialogOptions) => Promise<DataTransferResponse>;
  /** Function to display a folder dialog for the user to select folders. */
  showSelectFolderDialog: (options?: FolderDialogOptions) => Promise<DataTransferResponse>;
  /** Function to display the IBM Aspera Desktop preferences page */
  showPreferences: () => Promise<any>;
  /** Function to modify a running transfer */
  modifyTransfer: (transferId: string, options: ModifyTransferOptions) => Promise<DesktopTransfer>;
  /** Function to set custom branding for IBM Aspera Desktop */
  setBranding: (id: string, options: CustomBrandingOptions) => Promise<any>;
  /** Create dropzone for drop events of files */
  createDropzone: (callback: (data: {event: any; files: DataTransferResponse}) => void, elementSelector: string) => void;
  /** Remove dropzone for drop events of files */
  removeDropzone: (elementSelector: string) => void;
  /** Function to get latest installer information */
  getInstallerInfo: (options: InstallerOptions) => Promise<InstallerInfoResponse>;
  /** Initialize drag and drop */
  initDragDrop: () => Promise<any>;
  /** Function to get information about the IBM Aspera Desktop instance */
  getInfo: () => Promise<DesktopInfo>;

  /**
   * Check if IBM Aspera Desktop is ready to be used and has been verified.
   *
   * @returns a boolean indicating if SDK can be used for requests
   */
  get isReady(): boolean {
    return this.globals.desktopVerified && this.globals.appId !== '';
  }
}
