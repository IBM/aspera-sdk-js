import {messages} from '../constants/messages';
import {generateErrorBody, generatePromiseObjects, randomUUID, safeJsonParse} from '../helpers/helpers';
import {asperaSdk} from '../index';
import {removeTransfer as oldHttpRemoveTransfer, getAllTransfers as oldHttpGetAllTransfers, getTransferById as oldHttpGetTransfer, getFilesForUploadPromise as oldHttpGetFilesForUploadPromise, getFoldersForUploadPromise as oldHttpGetFoldersForUploadPromise} from '@ibm-aspera/http-gateway-sdk-js';
import {FileDialogOptions, DataTransferResponse, TransferSpec, AsperaSdkTransfer} from '../models/models';

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
    return (folder ? oldHttpGetFoldersForUploadPromise(options?.oldHttpGatewayTransferId || '') : oldHttpGetFilesForUploadPromise(options?.oldHttpGatewayTransferId || '')) as Promise<DataTransferResponse>;
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
      asperaSdk.httpGatewaySelectedFiles.set(file.name, file);
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
