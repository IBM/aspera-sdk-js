import {messages} from '../constants/messages';
import {generateErrorBody, generatePromiseObjects, randomUUID, safeJsonParse, throwError} from '../helpers/helpers';
import {asperaSdk} from '../index';
import {removeTransfer as oldHttpRemoveTransfer, getAllTransfers as oldHttpGetAllTransfers, getTransferById as oldHttpGetTransfer, getFilesForUploadPromise as oldHttpGetFilesForUploadPromise, getFoldersForUploadPromise as oldHttpGetFoldersForUploadPromise, initHttpGateway as oldInitHttpGateway} from '@ibm-aspera/http-gateway-sdk-js';
import {FileDialogOptions, DataTransferResponse, TransferSpec, AsperaSdkTransfer, ReadAsArrayBufferResponse, ReadChunkAsArrayBufferResponse} from '../models/models';
import {HttpGatewayInfo} from './models';

// Maximum file size for generating image previews for files. 50MiB matches the limits in both Connect and IBM Aspera for desktop.
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * HTTP Gateway Core Logic
 * - File/Folder picking
 * - Starting and testing
 *
 * @remarks
 * Most logic is called directly by Desktop SDK functions
 * You may not need to import anything from this file.
 */

/**
 * Initialize the HTTP Gateway after the /info response has been received and verified.
 * For v2 gateways, delegates to the old HTTP Gateway SDK.
 * For v3 gateways, sets up the iframe container for downloads.
 *
 * @param response - The /info response from the HTTP Gateway server
 *
 * @returns a promise that resolves when the HTTP Gateway is initialized
 */
export const initHttpGateway = (response: HttpGatewayInfo): Promise<void> => {
  asperaSdk.globals.httpGatewayInfo = response;
  asperaSdk.globals.httpGatewayVerified = true;

  if (asperaSdk.useOldHttpGateway) {
    return oldInitHttpGateway(asperaSdk.globals.httpGatewayUrl).then(() => {});
  }

  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'aspera-http-gateway-iframes';
  iframeContainer.style = 'display: none;';
  document.body.appendChild(iframeContainer);
  asperaSdk.globals.httpGatewayIframeContainer = iframeContainer;

  return Promise.resolve();
};

/**
 * Remove a transfer from HTTP Gateway systems
 * @param id - ID of the transfer
 *
 * @returns Promise indicating success
 */
export const httpRemoveTransfer = (id: string): Promise<any> => {
  if (asperaSdk.useOldHttpGateway) {
    oldHttpRemoveTransfer(id);

    return Promise.resolve({removed: true});
  }

  const transfer = asperaSdk.httpGatewayTransferStore.get(id);

  if (transfer) {
    asperaSdk.httpGatewayTransferStore.delete(id);
    return Promise.resolve({removed: true});
  } else {
    return Promise.reject(generateErrorBody(messages.removeTransferFailed, {reason: 'Not found'}));
  }
};

/**
 * Get the list of http gateway transfers
 *
 * @returns list of HTTP Gateway
 */
export const httpGetAllTransfers = (): AsperaSdkTransfer[] => {
  if (asperaSdk.useOldHttpGateway) {
    return oldHttpGetAllTransfers().transfers as unknown as AsperaSdkTransfer[];
  }

  return Array.from(asperaSdk.httpGatewayTransferStore.values());
};

/**
 * Get a HTTP Gateway transfer by ID
 *
 * @returns a transfer or null
 */
export const httpGetTransfer = (id: string): AsperaSdkTransfer|null => {
  if (asperaSdk.useOldHttpGateway) {
    return oldHttpGetTransfer(id) as unknown as AsperaSdkTransfer|null;
  }

  return asperaSdk.httpGatewayTransferStore.get(id);
};

/**
 * Create HTML input element for file picking
 */
export const createHtmlInputElement = (): HTMLInputElement => {
  const element = window.document.createElement('input');
  element.type = 'file';
  element.style = 'display: none;';
  window.document.body.appendChild(element);
  return element;
};

/**
 * Handle drop events and store files for HTTP Gateway
 * This works on top of desktop.
 */
export const handleHttpGatewayDrop = (items: DataTransferItemList, callback: (data: {event: DragEvent; files: DataTransferResponse}) => void, event: DragEvent): void => {
  const files: File[] = [];
  let callbackCount = 0;
  let callbackFinishCount = 0;

  const finalCallback = (): void => {
    if (callbackFinishCount >= callbackCount) {
      const finalFiles = files.map(file => {
        asperaSdk.httpGatewaySelectedFiles.set(file.name, file);

        return {
          lastModified: file.lastModified,
          name: file.name,
          size: file.size,
          type: file.type
        };
      });
      callback({event, files: {dataTransfer: {files: finalFiles}}});
    }
  };

  const traverse = (item: FileSystemEntry) => {
    if (item.isFile) {
      (item as FileSystemFileEntry).file(file => {
        files.push(file);
        callbackFinishCount++;
        finalCallback();
      });

    } else if (item.isDirectory) {
      const dirReader = (item as FileSystemDirectoryEntry).createReader();

      dirReader.readEntries(entries => {
        for (let k = 0; k < entries.length; k++) {
          callbackCount++;
          traverse(entries[k]);
        }
      });

      callbackFinishCount++;
    } else {
      callbackFinishCount++;
      finalCallback();
    }

  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i].webkitGetAsEntry();

    if (item) {
      callbackCount++;
      traverse(item);
    }
  }
};

/**
 * Open native browser file or folder picker for files
 *
 * @param options - File picker options
 * @param folder - Indicate if choosing folders
 *
 * @returns Promise that resolves with info about the files picked
 */
export const httpGatewaySelectFileFolderDialog = (options?: FileDialogOptions, folder?: boolean): Promise<DataTransferResponse> => {
  if (asperaSdk.useOldHttpGateway) {
    return (folder ? oldHttpGetFoldersForUploadPromise(options?.http_gateway_v2_transfer_id || '') : oldHttpGetFilesForUploadPromise(options?.http_gateway_v2_transfer_id || '')) as Promise<DataTransferResponse>;
  }

  const {promise, rejecter, resolver} = generatePromiseObjects();
  const element = createHtmlInputElement();

  element.multiple = !!options?.multiple;

  if (folder) {
    element.webkitdirectory = true;
  }

  element.oncancel = () => {
    rejecter({debugData: {code: -32002, message: messages.filePickerCancel}});
  };

  element.onchange = () => {
    const returnFiles: File[] = [];

    for (let i = 0; i < element.files.length; i++) {
      const file = element.files[i];
      returnFiles.push(file);
      asperaSdk.httpGatewaySelectedFiles.set(file.webkitRelativePath || file.name, file);
    }

    resolver({
      dataTransfer: {
        files: returnFiles.map(file => {
          return {
            size: file.size,
            lastModified: file.lastModified,
            name: file.webkitRelativePath || file.name,
            type: file.type,
          };
        })
      }
    });
  };

  element.click();

  return promise;
};

/**
 * Get a generic transfer object for HTTP Gateway transfers.
 *
 * @param transferSpec - TransferSpec being provided for the HTTP Gateway transfer
 *
 * @returns a transfer object to track status and send to consumers
 */
export const getSdkTransfer = (transferSpec: TransferSpec): AsperaSdkTransfer => {
  return {
    uuid: randomUUID(),
    transfer_spec: transferSpec,
    current_file: '',
    add_time: new Date().toISOString(),
    file_counts: {
      attempted: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    },
    end_time: '',
    explorer_path: '',
    status: 'queued',
    bytes_written: 0,
    bytes_expected: 0,
    calculated_rate_kbps: 0,
    elapsed_usec: 0,
    percentage: 0,
    title: '',
    remaining_usec: 0,
    httpGatewayTransfer: true,
    httpDownloadExternalHandle: false,
  };
};

/**
 * Send a transfer update through the SDK
 *
 * @param transfer - Transsfer object to send to consumers
 */
export const sendTransferUpdate = (transfer: AsperaSdkTransfer): void => {
  asperaSdk.httpGatewayTransferStore.set(transfer.uuid, transfer);
  asperaSdk.activityTracking.handleTransferActivity({
    type: 'transferUpdated',
    data: {transfers: [transfer]},
  });
};

/**
 * Try to parse and get a useful string from API calls for HTTP Gateway
 *
 * @param error - Error from API call for Gateway
 *
 * @returns a string to use for errors
 */
export const getMessageFromError = (error: any): {message: string, code: number} => {
  const data = safeJsonParse(error);
  let message = messages.httpNetworkFail;
  let code = 500;

  if (data && typeof data === 'object') {
    message = data.message || data.description || messages.httpNetworkFail;
    code = data.code || 500;
  } else if (error && typeof error === 'object') {
    message = error.message || error.description || messages.httpNetworkFail;
    code = error.code || 500;
  } else if (typeof error === 'string') {
    message = error;
  }

  return {
    message,
    code,
  };
};

export const base64Encoding = (jsonString: string): string => {
  const bytes = new TextEncoder().encode(jsonString);
  const binString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte),
  ).join('');
  return btoa(binString);
};

/**
 * Attempt to read the specified `File` object contents as a base64-encoded string.
 *
 * @param file - File previously selected by the user
 *
 * @returns an object with base64 data and mime type
 */
const readFileAsBase64 = (file: File): Promise<{data: string; type: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const dataUrl = event.target?.result;

        if (typeof dataUrl !== 'string') {
          reject(generateErrorBody('FileReader did not return a data URL'));
          return;
        }

        // Remove `data:*/*;base64,` from the start of the data URL (https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL)
        const base64 = dataUrl.split(';base64,')[1];
        if (base64 === undefined) {
          reject(generateErrorBody('Invalid data URL format'));
          return;
        }

        resolve({
          data: base64,
          type: file.type || 'application/octet-stream'
        });
      } catch (err) {
        reject(generateErrorBody('Failed to process file data', err));
      }
    };

    reader.onerror = () => {
      reject(generateErrorBody('Failed to read file', reader.error));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Returns the specified file's contents as a base64-encoded string.
 *
 * Note: The maximum file size allowed is 50 MiB.
 *
 * @param path path to the file to read
 *
 * @returns a promise that resolves with the file data as a base64-encoded string and mime type
 */
export const httpGatewayReadAsArrayBuffer = (path: string): Promise<ReadAsArrayBufferResponse> => {
  // Pre-condition: Caller must have previously selected file via `showSelectFileDialog()`
  const file = asperaSdk.httpGatewaySelectedFiles.get(path);

  if (!file) {
    return throwError(messages.fileNotAllowed);
  }

  if (file.size > MAX_FILE_SIZE) {
    return throwError('File exceeds allowed maximum');
  }

  return readFileAsBase64(file);
};

/**
 * Attempt to read the specified `File` object contents as a base64-encoded string.
 *
 * @param file - File previously selected by the user
 * @param offset offset to start reading the file, in bytes
 * @param chunkSize the size of the chunk to read, in bytes
 *
 * @returns an object with base64 data and mime type
 */
const readFileChunkAsBase64 = (file: File, offset: number, chunkSize: number): Promise<{data: string; type: string}> => {
  return new Promise((resolve, reject) => {
    if (offset > file.size) {
      resolve({data: '', type: file.type || 'application/octet-stream'});
      return;
    }

    const chunk = file.slice(offset, offset + chunkSize);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const dataUrl = event.target?.result;

        if (typeof dataUrl !== 'string') {
          reject(generateErrorBody('FileReader did not return a data URL'));
          return;
        }

        // Remove `data:*/*;base64,` from the start of the data URL (https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL)
        const base64 = dataUrl.split(';base64,')[1];
        if (base64 === undefined) {
          reject(generateErrorBody('Invalid data URL format'));
          return;
        }

        resolve({
          data: base64,
          type: file.type || 'application/octet-stream'
        });
      } catch (err) {
        reject(generateErrorBody('Failed to process file data', err));
      }
    };

    reader.onerror = () => {
      reject(generateErrorBody('Failed to read file', reader.error));
    };

    reader.readAsDataURL(chunk);
  });
};

/**
 * Read a chunk of a file as a base64-encoded string.
 *
 * Note: The maximum chunk size allowed is 50 MiB.
 *
 * @param path path to the file to read. For pure JS this will just be the filename.
 * @param offset offset to start reading the file, in bytes
 * @param chunkSize the size of the chunk to read, in bytes
 *
 * @returns a promise that resolves with the file chunk data as a base64-encoded string and mime type
 */
export const httpGatewayReadChunkAsArrayBuffer = (path: string, offset: number, chunkSize: number): Promise<ReadChunkAsArrayBufferResponse> => {
  if (offset < 0 || chunkSize <= 0) {
    return throwError('Invalid offset or chunk size');
  }

  // Pre-condition: Caller must have previously selected file via `showSelectFileDialog()`
  const file = asperaSdk.httpGatewaySelectedFiles.get(path);

  if (!file) {
    return throwError(messages.fileNotAllowed);
  }

  if (chunkSize > MAX_FILE_SIZE) {
    return throwError('Chunk size exceeds allowed maximum');
  }

  return readFileChunkAsBase64(file, offset, chunkSize);
};
