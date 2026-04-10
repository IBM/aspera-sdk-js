import { HttpTransfer, FileSelected, TransferSpec, DataTransferResponse, ConnectStyleFile, VideoPlayerOptions, FolderData } from './models';
import { hiddenStyleList } from '../constants/constants';
import { messages } from '../constants/messages';
import { errorLog, iterableToArray } from '../helpers/helpers';

class HttpGatewayGlobals {
  /** The URL of the server to use with the SDK */
  serverUrl: string;
  /** Server information */
  serverInfo: ServerInfo;
  /** Chunk size to use for uploads in bytes */
  chunkSize = 64000;
  /** Indication that the server has been verified as working */
  serverVerified: boolean;
  /** The ID to use for HTTP Gateway needed DOM items */
  mainContainerId = 'aspera-httpgateway';
  /** The Element that is added to document for containing all items */
  mainContainer: HTMLElement;
  /** The ID to use for the form container for forms */
  formContainerId = 'aspera-httpgateway-form-container';
  /** The form container Element that is added to document */
  formContainer: HTMLElement;
  /** The ID to use for the download container */
  downloadsContainerId = 'aspera-httpgateway-downloads-container';
  /** The download container Element that is added to document to store download IFRAMEs */
  downloadsContainer: HTMLElement;
  /** Map of all forms currently in the container */
  formsAvailable: Map<string, HTMLFormElement> = new Map();
  /** Map of form with files from drop events */
  formsFilesFromDrop: Map<string, File[]> = new Map();
  /** Map of folders with files from drop events */
  folderFiles: Map<string, Map<string, FolderData>> = new Map();
  /** Indicates if running in software mode (no DOM) */
  softwareMode = false;
  /** Indicates if multiple server support should be used (will not lock out if gateway server is not working) */
  supportMultipleServers = false;
  /** Number of concurrent uploads to support */
  concurrentUploads = 3;
  /** Map of dropzones created by querySelector */
  dropzonesCreated: Map<string, {event: string; callback: (event: any) => void}[]> = new Map();

  /**
   * Add a form item to the form container for transferring if form already exists the existing one is returned
   *
   * @param id ID to use for the form reference
   */
  createOrUseForm(id: string): HTMLFormElement {
    if (this.formsAvailable.get(id)) {
      return this.formsAvailable.get(id);
    }
    const form = document.createElement('form');
    form.id = id;
    this.formsAvailable.set(id, form);
    this.formContainer.appendChild(form);
    return this.formsAvailable.get(id);
  }

  /**
   * Delete a form from the container by the ID
   *
   * @param id the form to delete
   */
  deleteFormFromContainer(id: string): void {
    const foundForm = this.formsAvailable.get(id);
    this.formsFilesFromDrop.delete(id);
    if (foundForm) {
      this.formContainer.removeChild(foundForm);
      this.formsAvailable.delete(id);
    }
  }

  /**
   * Removes all forms from the Parent container
   */
  removeAllFormsFromContainer(): void {
    while (this.formContainer.firstChild) {
      this.formContainer.removeChild(this.formContainer.firstChild);
    }
  }

  /**
   * Get or create an array of Files to store drop events in
   *
   * @param id the form to associate the files with
   */
  getOrCreateFormFileListFromDrop(id: string): File[] {
    if (!this.formsFilesFromDrop.get(id)) {
      this.formsFilesFromDrop.set(id, []);
    }

    return this.formsFilesFromDrop.get(id);
  }

  /**
   * Get or create an array of Folder data to store folder entries
   *
   * @param id the form to associate the folders with
   */
  getOrCreateFolderDataList(id: string): Map<string, FolderData> {
    if (!this.folderFiles.get(id)) {
      this.folderFiles.set(id, new Map());
    }

    return this.folderFiles.get(id);
  }

  /**
   * Setup HTTP Gateway SDK server and formContainer
   *
   * @param serverUrl URL to use for the server
   * @param softwareMode indicate if software mode is in use
   * @param supportMultipleServers indicate if multiple servers are supported
   */
  setUpServer(serverUrl: string, softwareMode?: boolean, supportMultipleServers?: boolean): void {
    if (typeof serverUrl === 'string') {
      this.serverUrl = serverUrl;
    }

    this.softwareMode = !!softwareMode;
    this.supportMultipleServers = !!supportMultipleServers;

    if (!this.softwareMode) {
      if (!this.mainContainer) {
        this.mainContainer = document.createElement('div');
        this.mainContainer.id = this.mainContainerId;
        this.mainContainer.setAttribute('style', hiddenStyleList);
        document.querySelector('body').appendChild(this.mainContainer);
      }
      if (!this.formContainer) {
        this.formsAvailable.clear();
        this.formContainer = document.createElement('div');
        this.formContainer.id = this.formContainerId;
        document.querySelector(`#${this.mainContainerId}`).appendChild(this.formContainer);
      }
      if (!this.downloadsContainer) {
        this.downloadsContainer = document.createElement('div');
        this.downloadsContainer.id = this.downloadsContainerId;
        document.querySelector(`#${this.mainContainerId}`).appendChild(this.downloadsContainer);
      }
    }
  }

  backupDownloadMethod(url: string): void {
    window.alert(messages.loadingDownload);
    window.location.href = url;
  }

  /**
   * Download a file based on a URL. By default a hidden IFRAME attempts to download
   * the file but if that fails a fallback of opening a new window happens.
   *
   * @param url the URL of the file to download
   */
  triggerDownloadFromUrl(url: string): void {
    try {
      const element = document.createElement('iframe');
      element.src = url;
      element.onerror = error => {
        errorLog(messages.failedToGenerateIframe, error);
        this.backupDownloadMethod(url);
      };
      document.querySelector(`#${this.downloadsContainerId}`).appendChild(element);
    } catch (error) {
      errorLog(messages.failedToGenerateIframe, error);
      this.backupDownloadMethod(url);
    }
  }
}

export class ServerInfo {
  /** The version of the HTTP Gateway Server */
  version: string;
  /** The name of the HTTP Gateway Server */
  name: string;
  /** List of endpoints supported on this HTTP Gateway Server */
  endpoints: string[];
  /** UI Item indicating that the SDK failed to verify this gateway setup */
  sdkVerificationFailed?: boolean;
}

export class TransferResponse {
  iteration_token: string;
  result_count: number;
  transfers: HttpTransfer[];
}

export class ActivityTracking {
  /** Map of transfers by ID */
  private transfers: Map<string, HttpTransfer> = new Map();
  /** Map of callbacks that receive transfers */
  private callbacks: Map<string, Function> = new Map();
  /** Indicate if a callback should happen */
  private needCallback = false;
  /** Queued uploads */
  queuedUploads: {id: string; transferSpec: TransferSpec; files: File[]}[] = [];

  constructor() {
    this.pollCallbacks();
  }

  /**
   * Get transfer response object including all transfers
   *
   * @returns transfer data object with transfers array
   */
  getAllTransfersResponse(): TransferResponse {
    const transfers: any = this.getAllTransfers();
    return {
      iteration_token: '',
      result_count: transfers.length,
      transfers
    };
  }

  /**
   * Remove all transfers that are not active
   */
  clearNonActiveTransfers(): void {
    const transferIdsToRemove: string[] = this.getAllTransfers().filter((transfer: HttpTransfer) => {
      return transfer.status === 'completed' || transfer.status === 'failed';
    }).map((transfer: HttpTransfer) => transfer.uuid);

    transferIdsToRemove.forEach((id: string) => {
      this.removeTransfer(id);
    });
  }

  /**
   * Poll transfer callbacks
   */
  pollCallbacks(): void {
    setTimeout(() => {
      if (this.needCallback) {
        this.callbacks.forEach(value => {
          if (typeof value === 'function') {
            value(this.getAllTransfersResponse());
          }
        });
      }

      this.needCallback = false;
      this.pollCallbacks();
    }, 2000);
  }

  /**
   * Trigger activity callback on activity events
   */
  triggerActivityCallbacks(): void {
    this.needCallback = true;
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
    const id =  `callback-${this.callbacks.size + 1}`;
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

  /**
   * Set the transfer in the transfers map
   *
   * @param id transfer id for tracking transfers
   * @param transfer transfer object
   */
  setTransfer(id: string, transfer: HttpTransfer): void {
    this.transfers.set(id, transfer);
    this.triggerActivityCallbacks();
  }

  /**
   * Get the status of a specific transfer by ID (only returns for items during the session)
   *
   * @param id the ID of the transfer to retrieve that has been started during the session
   *
   * @returns an HttpTransfer object that includes the transfer info and status
   */
  getTransferById(id: string): HttpTransfer {
    return this.transfers.get(id);
  }

  /**
   * Get all active transfers (transfers that are not completed or failed)
   */
  getActiveTransfers(): HttpTransfer[] {
    return (iterableToArray(this.transfers.values()) as HttpTransfer[]).filter(transfer => {
      return transfer.status !== 'completed' && transfer.status !== 'failed';
    });
  }

  /**
   * Remove a transfer from the transfer list
   *
   * @param id the ID of the transfer to remove
   */
  removeTransfer(id: string): void {
    this.transfers.delete(id);
    this.triggerActivityCallbacks();
  }

  /**
   * Get the list of transfers started during the session for checking status
   *
   * @param returnMap boolean to indicate if the raw Map should be returned instead of an array
   *
   * @returns an Array of transfers or a Map of transfers (with the ID as key). Array is default
   */
  getAllTransfers(returnMap?: boolean): any {
    const transferList: HttpTransfer[] = [];
    const transferMap: Map<string, HttpTransfer> = new Map();
    this.transfers.forEach((value, key) => {
      transferList.push(value);
      transferMap.set(key, value);
    });
    return returnMap ? transferMap : transferList;
  }
}

export class HttpGateway {
  /** Global information about the HTTP Gateway */
  globals: HttpGatewayGlobals = new HttpGatewayGlobals();
  /** Activity tracking for watching transfers */
  activityTracking: ActivityTracking = new ActivityTracking();
  /** Function to init the HTTP Gateway */
  initHttpGateway: (serverUrl: string, softwareMode?: boolean) => Promise<any>;
  /** Function to test the HTTP Gateway status */
  testHttpGatewayConnection: () => Promise<any>;
  /** Function to download from the HTTP Gateway */
  download: (transferSpec: TransferSpec) => Promise<any>;
  /** Function to upload to the HTTP Gateway */
  upload: (transferSpec: TransferSpec, id: string, overrideFiles?: File[]) => Promise<any>;
  /** Request file picker to get files for uploading */
  getFilesForUpload: (callback: (data: DataTransferResponse) => void, id: string) => void;
  /** Request file picker to get files for uploading using Promises */
  getFilesForUploadPromise: (id: string) => Promise<DataTransferResponse>;
  /** Request folder picker to get folder for uploading */
  getFoldersForUpload: (callback: (data: DataTransferResponse) => void, id: string) => void;
  /** Request folder picker to get folder for uploading using Promises */
  getFoldersForUploadPromise: (id: string) => Promise<DataTransferResponse>;
  /** Create dropzone for drop events of files */
  createDropzone: (callback: (data: {event: any; files: {dataTransfer: {files: ConnectStyleFile[]}}}) => void, elementSelector: string, formId: string) => void;
  /** Remove dropzone for drop events of files */
  removeDropzone: (elementSelector: string, formId: string) => void;
  /** Register callback for the transfer activity monitor */
  registerActivityCallback: (callback: (transfers: TransferResponse) => void) => string;
  /** Deregister callback to remove it from the callbacks getting transfer data */
  deregisterActivityCallback: (id: string) => void;
  /** Get HTTP Gateway transfer by ID */
  getTransferById: (id: string) => {transfer_info: HttpTransfer};
  /** Get all HTTP Gateway transfers */
  getAllTransfers: () => TransferResponse;
  /** Clear all transfers that are not active */
  clearNonActiveTransfers: () => void;
  /** Remove transfer by uuid */
  removeTransfer: (id: string) => void;
  /** Cancel transfer by uuid */
  cancelTransfer: (id: string) => void;

  /**
   * Check if the HTTP Server is ready to be used and has been verified
   *
   * @returns a boolean indicating if SDK can be used for transfers
   */
  get isReady(): boolean {
    return this.globals.serverVerified || this.globals.supportMultipleServers;
  }

  /**
   * If the user attempts to leave the page warn that by leaving they will have their transfer abort
   * NOTE: Only IE will show custom text.  No way to indicate why they are being blocked.
   */
  checkForPageLeave = (event: BeforeUnloadEvent): string => {
    if (this.activityTracking.getActiveTransfers().length) {
      event.preventDefault();
      event.returnValue = messages.leavingWhileUploading;
      return messages.leavingWhileUploading;
    } else {
      delete event['returnValue'];
    }

  };

  /**
   * Overwrite default chunk size for chunking transfer data.
   * This is an optional function, a default recommended size is set on start.
   *
   * @param size the size to use
   */
  overwriteDefaultChunkSize(size: number): void {
    if (size && size > 0) {
      this.globals.chunkSize = size;
    } else {
      errorLog(messages.invalidChunkSize, {requestedSize: size});
    }
  }

  /**
   * Overwrite default concurrent transfer number for parallel transfers
   * This is an optional function, a default recommended number is set on start.
   *
   * @param transfers the number of concurrent uploads to use
   */
  overwriteDefaultConcurrentUploads(transfers: number): void {
    if (transfers && transfers > 0) {
      this.globals.concurrentUploads = transfers;
    } else {
      errorLog(messages.invalidConcurrentUploads, {requestedSize: transfers});
    }
  }
}
