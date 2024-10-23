import {
  CustomBrandingOptions,
  DataTransferResponse,
  BrowserSpec,
  BrowserTransfer,
  FileDialogOptions,
  FolderDialogOptions,
  InstallerInfoResponse,
  InstallerOptions,
  ModifyTransferOptions,
  ResumeTransferOptions,
  SafariExtensionEvents,
  TransferSpec,
  WebsocketEvents
} from './models';
import {hiddenStyleList, installerUrl, protocol} from '../constants/constants';
import {messages} from '../constants/messages';
import {safariClient} from '../helpers/client/safari-client';
import {errorLog, getWebsocketUrl, isSafari} from '../helpers/helpers';
import {websocketService} from '../helpers/ws';
import {asperaBrowser} from '../index';

class BrowserGlobals {
  /** The URL of the IBM Aspera Browser HTTP server to use with the SDK */
  browserUrl = 'http://127.0.0.1:33024';
  /** The default URL to check for latest Aspera Browser installers */
  installerUrl = installerUrl;
  /** Browser info */
  DesktopInfo: DesktopInfo;
  /** Indication that the server has been verified as working */
  browserVerified = false;
  /** The unique ID for the website */
  appId: string;
  /** Map of dropzones created by querySelector */
  dropzonesCreated: Map<string, {event: string; callback: (event: any) => void}[]> = new Map();

  backupLaunchMethod(url: string): void {
    window.alert(messages.loadingProtocol);
    window.location.href = url;
  }

  /**
   * Launch the IBM Aspera Browser via protocol url. By default, a hidden IFRAME attempts to
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
  /** The version of IBM Aspera SDK */
  version: string;
  /** The public key corresponding to the SSH private key generated by IBM Aspera Browser */
  client_pubkey?: string;
}

export class TransferResponse {
  transfers: BrowserTransfer[];
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
  /** Map of callbacks that receive Safari extension events */
  private safari_extension_callbacks: Map<string, Function> = new Map();

  /** Keep track of the last WebSocket event **/
  private lastWebSocketEvent: WebsocketEvents = 'CLOSED';
  /** Keep track of the last Safari extension event **/
  private lastSafariExtensionEvent: SafariExtensionEvents = 'DISABLED';

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
   * Notify all consumers when a connection webSocketEvent occurs. For example, when the SDK
   * websocket connection to IBM Aspera Browser is closed or reconnected.
   *
   * @param webSocketEvent the event type.
   */
  handleWebSocketEvents(webSocketEvent: WebsocketEvents): void {
    if (this.lastWebSocketEvent === webSocketEvent) {
      return;
    }

    this.event_callbacks.forEach(callback => {
      if (typeof callback === 'function') {
        callback(webSocketEvent);
      }
    });

    this.lastWebSocketEvent = webSocketEvent;
  }

  /**
   * Notify all consumers when a Safari extension safariExtensionEvent occurs (enabled/disabled).
   *
   * @param safariExtensionEvent the event type.
   */
  handleSafariExtensionEvents(safariExtensionEvent: SafariExtensionEvents): void {
    if (this.lastSafariExtensionEvent === safariExtensionEvent) {
      return;
    }

    this.safari_extension_callbacks.forEach(callback => {
      if (typeof callback === 'function') {
        callback(safariExtensionEvent);
      }
    });

    this.lastSafariExtensionEvent = safariExtensionEvent;
  }

  /**
   * Set up the activity tracking with IBM Aspera Browser.
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

    const url = getWebsocketUrl(asperaBrowser.globals.browserUrl);

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
  setRemovedCallback(callback: (transfer: BrowserTransfer) => void): string {
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
    callback(this.lastWebSocketEvent);
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

  /**
   * Register a callback for getting Safari extension events back to the consumer
   *
   * @param callback the function to call with the websocket event
   *
   * @returns the ID of the callback index
   */
  setSafariExtensionEventCallback(callback: (status: SafariExtensionEvents) => void): string {
    if (typeof callback !== 'function') {
      errorLog(messages.callbackIsNotFunction);
      return;
    }
    const id = `callback-${this.safari_extension_callbacks.size + 1}`;
    this.safari_extension_callbacks.set(id, callback);
    callback(this.lastSafariExtensionEvent);
    return id;
  }

  /**
   * Remove the callback (deregister) from the list of callbacks
   *
   * @param id the string of the callback to remove
   */
  removeSafariExtensionEventCallback(id: string): void {
    this.safari_extension_callbacks.delete(id);
  }
}

export class Browser {
  /** Global information about IBM Aspera Browser */
  globals: BrowserGlobals = new BrowserGlobals();
  /** Activity tracking for watching transfers */
  activityTracking: ActivityTracking = new ActivityTracking();
  /** Function to initialize IBM Aspera Browser */
  initBrowser: (appId: string) => Promise<any>;
  /** Function to test the IBM Aspera Browser status */
  testBrowserConnection: () => Promise<any>;
  /** Function to initiate a transfer */
  startTransfer: (transferSpec: TransferSpec, browserSpec: BrowserSpec) => Promise<BrowserTransfer>;
  /** Function to launch IBM Aspera Browser */
  launch: () => void;
  /** Register callback for the transfer activity monitor */
  registerActivityCallback: (callback: (transfers: TransferResponse) => void) => string;
  /** Deregister callback to remove it from the callbacks getting transfer data */
  deregisterActivityCallback: (id: string) => void;
  /** Register callback for removed transfers from the app */
  registerRemovedCallback: (callback: (transfer: BrowserTransfer) => void) => string;
  /** Deregister callback to remove it from the callbacks getting removed transfer data */
  deregisterRemovedCallback: (id: string) => void;
  /** Register callback for connection status events from the app */
  registerStatusCallback: (callback: (status: WebsocketEvents) => void) => string;
  /** Deregister callback to remove it from the callbacks getting connection events */
  deregisterStatusCallback: (id: string) => void;
  /** Register callback for Safari extension status events */
  registerSafariExtensionStatusCallback: (callback: (status: SafariExtensionEvents) => void) => string;
  /** Deregister callback to remove it from the callbacks getting Safari extension events */
  deregisterSafariExtensionStatusCallback: (id: string) => void;
  /** Function to remove a transfer */
  removeTransfer: (transferId: string) => Promise<any>;
  /** Function to show the transfer's download directory in Finder or Windows Explorer */
  showDirectory: (transferId: string) => Promise<any>;
  /** Function to stop a transfer */
  stopTransfer: (transferId: string) => Promise<any>;
  /** Function to resume a transfer */
  resumeTransfer: (transferId: string, options?: ResumeTransferOptions) => Promise<BrowserTransfer>;
  /** Function to get a list of all transfers */
  getAllTransfers: () => Promise<BrowserTransfer[]>;
  /** Function to get information for a specific transfer */
  getTransfer: (transferId: string) => Promise<BrowserTransfer>;
  /** Function to display a file dialog for the user to select files. */
  showSelectFileDialog: (options?: FileDialogOptions) => Promise<DataTransferResponse>;
  /** Function to display a folder dialog for the user to select folders. */
  showSelectFolderDialog: (options?: FolderDialogOptions) => Promise<DataTransferResponse>;
  /** Function to display the IBM Aspera Browser preferences page */
  showPreferences: () => Promise<any>;
  /** Function to modify a running transfer */
  modifyTransfer: (transferId: string, options: ModifyTransferOptions) => Promise<BrowserTransfer>;
  /** Function to set custom branding for IBM Aspera Browser */
  setBranding: (id: string, options: CustomBrandingOptions) => Promise<any>;
  /** Create dropzone for drop events of files */
  createDropzone: (callback: (data: {event: any; files: DataTransferResponse}) => void, elementSelector: string) => void;
  /** Remove dropzone for drop events of files */
  removeDropzone: (elementSelector: string) => void;
  /** Function to get latest installer information */
  getInstallerInfo: (options: InstallerOptions) => Promise<InstallerInfoResponse>;
  /** Initialize drag and drop */
  initDragDrop: () => Promise<any>;
  /** Function to get information about the IBM Aspera Browser instance */
  getInfo: () => Promise<DesktopInfo>;
  /** Function to get whether IBM Aspera Browser is running on Safari */
  isSafari: () => boolean;

  /**
   * Check if IBM Aspera Browser is ready to be used and has been verified.
   *
   * @returns a boolean indicating if SDK can be used for requests
   */
  get isReady(): boolean {
    return this.globals.browserVerified && this.globals.appId !== '';
  }
}