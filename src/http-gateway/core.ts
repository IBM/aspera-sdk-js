import {messages} from '../constants/messages';
import {generatePromiseObjects, randomUUID, safeJsonParse} from '../helpers/helpers';
import {asperaSdk} from '../index';
import {FileDialogOptions, DataTransferResponse, TransferSpec, AsperaSdkTransfer} from '../models/models';
import {HttpGatewayDownload, HttpGatewayDownloadLegacy, HttpGatewayInfo, HttpGatewayPresign, HttpGatewayUpload} from './models';

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
 * Get an API call for HTTP Gateway calls. Upload needs to use XHR for monitoring status.
 *
 * @param type - The type of API call to make
 *
 * @returns
 */
export const getApiCall = (type: 'INFO'|'DOWNLOAD'|'PRESIGN', body?: BodyInit, customHeaders?: HeadersInit): Promise<HttpGatewayInfo|HttpGatewayDownloadLegacy|HttpGatewayDownload|HttpGatewayUpload|HttpGatewayPresign> => {
  const headers: HeadersInit = {
    ...(customHeaders || {})
  };

  let baseCall = fetch(`${asperaSdk.globals.httpGatewayUrl}/info`, {method: 'GET', headers: headers});

  switch (type) {
  case 'DOWNLOAD':
    baseCall = fetch(`${asperaSdk.globals.httpGatewayUrl}/download`, {method: 'GET', headers: headers});
    break;
  case 'PRESIGN':
    baseCall = fetch(`${asperaSdk.globals.httpGatewayUrl}/presign`, {method: 'POST', body: body, headers: headers});
    break;
  }

  return baseCall.then(response => {
    const jsonResponse = response.headers.get('Content-Type') === 'application/json';

    if (!response.ok) {
      if (jsonResponse) {
        return response.json().then(data => {
          return Promise.reject(data);
        });
      }

      return Promise.reject(response.body);
    }

    if (jsonResponse) {
      return response.json();
    }

    return response.body;
  });
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
