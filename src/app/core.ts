import {messages} from '../constants/messages';
import {client} from '../helpers/client/client';
import {errorLog, generateErrorBody, generatePromiseObjects, isSafari, isValidTransferSpec, randomUUID, throwError} from '../helpers/helpers';
import { httpDownload, httpUpload } from '../http-gateway';
import {handleHttpGatewayDrop, httpGatewaySelectFileFolderDialog, httpGetAllTransfers, httpGetTransfer, httpRemoveTransfer, sendTransferUpdate} from '../http-gateway/core';
import {HttpGatewayInfo} from '../http-gateway/models';
import {asperaSdk} from '../index';
import {AsperaSdkInfo, AsperaSdkClientInfo, TransferResponse} from '../models/aspera-sdk.model';
import {CustomBrandingOptions, DataTransferResponse, AsperaSdkSpec, BrowserStyleFile, AsperaSdkTransfer, FileDialogOptions, FolderDialogOptions, InitOptions, ModifyTransferOptions, ResumeTransferOptions, SafariExtensionEvent, TransferSpec, WebsocketEvent, ReadChunkAsArrayBufferResponse, ReadAsArrayBufferResponse} from '../models/models';
import {registerActivityCallback as oldHttpRegisterActivityCallback} from '@ibm-aspera/http-gateway-sdk-js';
import {Connect, ConnectInstaller} from '@ibm-aspera/connect-sdk-js';
import {initConnect} from '../connect/core';
import * as ConnectTypes from '@ibm-aspera/connect-sdk-js/dist/esm/core/types';

/**
 * Check if IBM Aspera for Desktop connection works. This function is called by init
 * when initializing the SDK. This function can be used at any point for checking.
 *
 * @returns a promise that resolves if server can connect or rejects if not
 */
export const testConnection = (): Promise<any> => {
  if (asperaSdk.useHttpGateway || asperaSdk.useConnect) {
    return Promise.resolve(asperaSdk.globals.sdkResponseData);
  }

  return client.request('get_info')
    .then((data: AsperaSdkClientInfo) => {
      asperaSdk.globals.asperaSdkInfo = data;
      asperaSdk.globals.asperaAppVerified = true;
      return asperaSdk.globals.sdkResponseData;
    });
};

/**
 * Initialize drag and drop. HTTP Gateway and Connect does not need to init.
 * Ignore if only HTTP Gateway
 * @param initCall - Indicate if called via init flow and should not reject
 *
 * @returns a promise that resolves if the initialization was successful or not
 */
export const initDragDrop = (initCall?: boolean): Promise<boolean> => {
  if (asperaSdk.useHttpGateway || asperaSdk.useConnect) {
    return Promise.resolve(true);
  } else if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  client.request('init_drag_drop')
    .then((data: boolean) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.dragDropInitFailed, error);

      if (initCall) {
        promiseInfo.resolver(false);
        errorLog(messages.dragDropInitFailedInit, error);
      } else {
        promiseInfo.rejecter(generateErrorBody(messages.dragDropInitFailed, error));
      }
    });

  return promiseInfo.promise;
};

/**
 * Initialize IBM Aspera client. If client cannot (reject/catch), then
 * client should attempt fixing server URL or trying again. If still fails disable UI elements.
 *
 * @param options initialization options:
 *
 * - `appId` the unique ID for the website. Transfers initiated during this session
 * will be associated with this ID. It is recommended to use a unique ID to keep transfer
 * information private from other websites.
 *
 * - `supportMultipleUsers` when enabled (defaults to false), the SDK will iterate over a port
 * range and generate a session id to determine the running instance of the desktop app for the
 * current user. This is needed when multiple users may be logged into the same machine
 * simultaneously, for example on a Windows Server.
 *
 * @returns a promise that resolves if IBM Aspera Desktop is running properly or
 * rejects if unable to connect
 */
export const init = (options?: InitOptions): Promise<any> => {
  const appId = options?.appId ?? randomUUID();

  asperaSdk.globals.appId = appId;

  // Watch for old HTTP Gateway transfers in case used.
  oldHttpRegisterActivityCallback(oldHttpTransfers => {
    oldHttpTransfers.transfers.forEach(oldHttpTransfer => {
      sendTransferUpdate(oldHttpTransfer as unknown as AsperaSdkTransfer);
    });
  });

  // For now ignore multi user support in Safari
  if (options?.supportMultipleUsers && !isSafari()) {
    asperaSdk.globals.supportMultipleUsers = true;
    asperaSdk.globals.sessionId = randomUUID();
  }

  const handleErrors = (error: unknown) => {
    errorLog(messages.serverError, error);
    asperaSdk.globals.asperaAppVerified = false;
    throw generateErrorBody(messages.serverError, error);
  };

  const getConnectStartCalls = (): Promise<unknown> => {
    asperaSdk.globals.connect = new Connect({
      minVersion: options.connectSettings.minVersion || '3.10.1',
      dragDropEnabled: options.connectSettings.dragDropEnabled,
      connectMethod: options.connectSettings.method,
    });
    asperaSdk.globals.connectInstaller = new ConnectInstaller({
      sdkLocation: options.connectSettings.sdkLocation,
      correlationId: options.connectSettings.correlationId,
      style: 'carbon',
    });

    asperaSdk.globals.connectAW4 = {
      Connect,
      ConnectInstaller,
    };

    return initConnect(!options.connectSettings.hideIncludedInstaller);
  };

  const getDesktopStartCalls = (): Promise<unknown> => {
    return asperaSdk.activityTracking.setup()
      .then(() => testConnection())
      .then(() => initDragDrop(true))
      .then(() => asperaSdk.globals.sdkResponseData)
      .catch(handleErrors);
  };

  if (options?.httpGatewaySettings?.url && !asperaSdk.globals.httpGatewayVerified) {
    let finalHttpGatewayUrl = options.httpGatewaySettings.url.trim();

    if (finalHttpGatewayUrl.indexOf('http') !== 0) {
      finalHttpGatewayUrl = `https://${finalHttpGatewayUrl}`;
    }

    if (finalHttpGatewayUrl.endsWith('/')) {
      finalHttpGatewayUrl = finalHttpGatewayUrl.slice(0, -1);
    }

    asperaSdk.globals.httpGatewayUrl = finalHttpGatewayUrl;

    return fetch(`${asperaSdk.globals.httpGatewayUrl}/info`, {method: 'GET'}).then(response => {
      return response.json().then(responseData => {
        if (response.status >= 400) {
          throw Error(responseData);
        }

        return responseData;
      });
    }).then((response: HttpGatewayInfo) => {
      asperaSdk.globals.httpGatewayInfo = response;
      asperaSdk.globals.httpGatewayVerified = true;

      const iframeContainer = document.createElement('div');
      iframeContainer.id = 'aspera-http-gateway-iframes';
      iframeContainer.style = 'display: none;';
      document.body.appendChild(iframeContainer);

      asperaSdk.globals.httpGatewayIframeContainer = iframeContainer;

      if (options?.httpGatewaySettings?.forceGateway) {
        return Promise.resolve(asperaSdk.globals.sdkResponseData);
      } else {
        return options?.connectSettings?.useConnect ? getConnectStartCalls() : getDesktopStartCalls();
      }
    }).catch(error => {
      // If HTTP Gateway fails log and move on to desktop
      errorLog(messages.httpInitFail, error);

      return options?.connectSettings?.useConnect ? getConnectStartCalls() : getDesktopStartCalls();
    });
  }

  return options?.connectSettings?.useConnect ? getConnectStartCalls() : getDesktopStartCalls();
};

/**
 * Start a transfer
 *
 * @param transferSpec standard transferSpec for transfer
 * @param asperaSdkSpec IBM Aspera settings when starting a transfer.
 *
 * @returns a promise that resolves if transfer initiation is successful and rejects if transfer cannot be started
 */
export const startTransfer = (transferSpec: TransferSpec, asperaSdkSpec: AsperaSdkSpec): Promise<AsperaSdkTransfer> => {
  if (!isValidTransferSpec(transferSpec)) {
    return throwError(messages.notValidTransferSpec, {transferSpec});
  }

  if (asperaSdk.useHttpGateway) {
    return transferSpec.direction === 'receive' ? httpDownload(transferSpec, asperaSdkSpec) : httpUpload(transferSpec, asperaSdkSpec);
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.startTransferPromise(transferSpec as unknown as ConnectTypes.TransferSpec, asperaSdkSpec).then(response => {
      return response.transfer_specs[0] as unknown as AsperaSdkTransfer;
    });
  } else if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_spec: transferSpec,
    desktop_spec: asperaSdkSpec,
    app_id: asperaSdk.globals.appId,
  };

  client.request('start_transfer', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.transferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.transferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Register a callback event for getting transfer updates
 *
 * @param callback callback function to receive transfers
 *
 * @returns ID representing the callback for deregistration purposes
 */
export const registerActivityCallback = (callback: (transfers: TransferResponse) => void): string => {
  return asperaSdk.activityTracking.setCallback(callback);
};

/**
 * Remove a callback from the transfer callback
 *
 * @param id the ID returned by `registerActivityCallback`
 */
export const deregisterActivityCallback = (id: string): void => {
  asperaSdk.activityTracking.removeCallback(id);
};

/**
 * Register a callback for getting updates about the connection status of IBM Aspera SDK.
 *
 * For example, to be notified of when the SDK loses connection with the application or connection
 * is re-established. This can be useful if you want to handle the case where the user quits IBM Aspera
 * after `init` has already been called, and want to prompt the user to relaunch the application.
 *
 * @param callback callback function to receive events
 *
 * @returns ID representing the callback for deregistration purposes
 */
export const registerStatusCallback = (callback: (status: WebsocketEvent) => void): string => {
  return asperaSdk.activityTracking.setWebSocketEventCallback(callback);
};

/**
 * Remove a callback from getting connection status events.
 *
 * @param id the ID returned by `registerStatusCallback`
 */
export const deregisterStatusCallback = (id: string): void => {
  asperaSdk.activityTracking.removeWebSocketEventCallback(id);
};

/**
 * Remove a transfer. This will stop the transfer if it is in progress.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves if transfer is removed and rejects if transfer cannot be removed
 */
export const removeTransfer = (id: string): Promise<any> => {
  if (asperaSdk.useHttpGateway) {
    return httpRemoveTransfer(id);
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.removeTransfer(id);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
  };

  client.request('remove_transfer', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.removeTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.removeTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Stop a transfer.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves if transfer is stopped and rejects if transfer cannot be stopped
 */
export const stopTransfer = (id: string): Promise<any> => {
  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.stopTransfer(id);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
  };

  client.request('stop_transfer', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.stopTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.stopTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Resume a paused or failed transfer.
 *
 * @param id transfer uuid
 * @param options resume transfer options
 *
 * @returns a promise that resolves with the new transfer object if transfer is resumed
 */
export const resumeTransfer = (id: string, options?: ResumeTransferOptions): Promise<AsperaSdkTransfer> => {
  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.resumeTransfer(id, options).then(response => {
      return response.transfer_spec as unknown as AsperaSdkTransfer;
    });
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
    transfer_spec: options,
  };

  client.request('resume_transfer', payload)
    .then((data: AsperaSdkTransfer) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.resumeTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.resumeTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Displays a file browser dialog for the user to select files.
 *
 * @param options file dialog options
 *
 * @returns a promise that resolves with the selected file(s) and rejects if user cancels dialog
 */
export const showSelectFileDialog = (options?: FileDialogOptions): Promise<DataTransferResponse> => {
  if (asperaSdk.useHttpGateway) {
    return httpGatewaySelectFileFolderDialog(options, false);
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showSelectFileDialogPromise(options).then(response => {
      return response as unknown as DataTransferResponse;
    });
  } else if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    options: options || {},
    app_id: asperaSdk.globals.appId,
  };

  client.request('show_file_dialog', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showSelectFileDialogFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showSelectFileDialogFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Displays a folder browser dialog for the user to select folders.
 *
 * @param options folder dialog options
 *
 * @returns a promise that resolves with the selected folder(s) and rejects if user cancels dialog
 */
export const showSelectFolderDialog = (options?: FolderDialogOptions): Promise<DataTransferResponse> => {
  if (asperaSdk.useHttpGateway) {
    return httpGatewaySelectFileFolderDialog(options, true);
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showSelectFolderDialogPromise(options).then(response => {
      return response as unknown as DataTransferResponse;
    });
  } else if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    options: options || {},
    app_id: asperaSdk.globals.appId,
  };

  client.request('show_folder_dialog', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showSelectFolderDialogFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showSelectFolderDialogFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Opens the IBM Aspera preferences page.
 *
 * @returns a promise that resolves when the preferences page is opened.
 */
export const showPreferences = (): Promise<any> => {
  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showPreferences();
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  client.request('open_preferences')
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showPreferencesFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showPreferencesFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Get all transfers associated with the current application.
 *
 * @returns a promise that resolves with an array of transfers.
 */
export const getAllTransfers = (): Promise<AsperaSdkTransfer[]> => {
  const promiseInfo = generatePromiseObjects();

  if (asperaSdk.useHttpGateway) {
    return Promise.resolve(httpGetAllTransfers());
  } else if (asperaSdk.useConnect) {
    asperaSdk.globals.connect.getAllTransfers({
      success: data => {
        promiseInfo.resolver(data.transfers);
      }, error: error => {
        promiseInfo.rejecter(error);
      },
    });

    return promiseInfo.promise;
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const payload = {
    app_id: asperaSdk.globals.appId,
  };

  client.request('get_all_transfers', payload)
    .then((data: AsperaSdkTransfer[]) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.getAllTransfersFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.getAllTransfersFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Get a specific transfer by ID.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves with the transfer.
 */
export const getTransfer = (id: string): Promise<AsperaSdkTransfer> => {
  if (asperaSdk.useHttpGateway) {
    const transfer = httpGetTransfer(id);

    if (transfer) {
      return Promise.resolve(transfer);
    } else {
      return Promise.reject(generateErrorBody(messages.getTransferFailed, {reason: 'Not found'}));
    }
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.getTransfer(id).then(response => {
      return response.transfer_info as unknown as AsperaSdkTransfer;
    });
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
  };

  client.request('get_transfer', payload)
    .then((data: AsperaSdkTransfer) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.getTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.getTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Opens and highlights the downloaded file in Finder or Windows Explorer. If multiple files,
 * then only the first file will be selected.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves if the file can be shown and rejects if not
 */
export const showDirectory = (id: string): Promise<any> => {
  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showDirectory(id);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
  };

  client.request('show_directory', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showDirectoryFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showDirectoryFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Modify the speed of a running transfer.
 *
 * @param id transfer uuid
 * @param options transfer rate options
 *
 * @returns a promise that resolves if the transfer rate can be modified and rejects if not
 */
export const modifyTransfer = (id: string, options: ModifyTransferOptions): Promise<AsperaSdkTransfer> => {
  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.modifyTransfer(id, options).then(response => {
      return response as unknown as AsperaSdkTransfer;
    });
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
    transfer_spec: options,
  };

  client.request('modify_transfer', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.modifyTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.modifyTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Set the custom branding template to be used by IBM Aspera. If the app is already
 * configured to use a different branding, then the branding template you specify will be
 * stored by the app, allowing the end user to switch at any point.
 *
 * @param id custom branding template id. This should be consistent across page loads.
 * @param options custom branding options
 *
 * @returns a promise that resolves if the branding was properly set.
 */
export const setBranding = (id: string, options: CustomBrandingOptions): Promise<any> => {
  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const branding = {
    id,
    name: options.name,
    theme: options.theme,
  };

  const payload = {
    branding,
  };

  client.request('update_branding', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.setBrandingFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.setBrandingFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Create a dropzone for the given element selector.
 *
 * @param callback the function to call once the files are dropped
 * @param elementSelector the selector of the element on the page that should watch for drop events
 * @param connectOptions options for connect
 */
export const createDropzone = (
  callback: (data: {event: DragEvent; files: DataTransferResponse}) => void,
  elementSelector: string,
  connectOptions?: ConnectTypes.DragDropOptions,
): void => {
  if (asperaSdk.useConnect) {
    asperaSdk.globals.connect.setDragDropTargets(elementSelector, connectOptions, result => {
      callback({
        event: result.event,
        files: result.files as unknown as DataTransferResponse,
      });
    });

    return;
  }

  const elements = document.querySelectorAll(elementSelector);
  if (!elements || !elements.length) {
    errorLog(messages.unableToFindElementOnPage);
    return;
  }

  const dragEvent = (event: DragEvent) => {
    event.preventDefault();
  };

  const dropEvent = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length && event.dataTransfer.files[0]) {
      const files: BrowserStyleFile[] = [];

      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const file = event.dataTransfer.files[i];
        files.push({
          lastModified: file.lastModified,
          name: file.name,
          size: file.size,
          type: file.type
        });
      }

      const payload = {
        files,
        app_id: asperaSdk.globals.appId,
      };

      if (asperaSdk.isReady) {
        client.request('dropped_files', payload)
          .then((data: any) => callback({event, files: data}))
          .catch(error => {
            errorLog(messages.unableToReadDropped, error);
          });
      } else if (asperaSdk.httpGatewayIsReady) {
        handleHttpGatewayDrop(event.dataTransfer.items, callback, event);
      }
    }
  };

  elements.forEach(element => {
    element.addEventListener('dragover', dragEvent);
    element.addEventListener('drop', dropEvent);
    asperaSdk.globals.dropZonesCreated.set(elementSelector, [{event: 'dragover', callback: dragEvent}, {event: 'drop', callback: dropEvent}]);
  });
};

/**
 * Remove dropzone.
 *
 * @param elementSelector the selector of the element on the page that should remove
 */
export const removeDropzone = (elementSelector: string): void => {
  const foundDropzone = asperaSdk.globals.dropZonesCreated.get(elementSelector);

  if (foundDropzone) {
    foundDropzone.forEach(data => {
      const elements = document.querySelectorAll(elementSelector);

      if (elements && elements.length) {
        elements.forEach(element => {
          element.removeEventListener(data.event, data.callback);
        });
      }
    });
  }
};

/**
 * Get metadata about the IBM Aspera installation.
 *
 * @returns a promise that returns information about the user's IBM Aspera installation.
 */
export const getInfo = (): Promise<AsperaSdkInfo> => {
  if (asperaSdk.useHttpGateway || asperaSdk.useConnect) {
    return Promise.resolve(asperaSdk.globals.sdkResponseData);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  return new Promise((resolve, _) => {
    resolve(asperaSdk.globals.sdkResponseData);
  });
};

/**
 * Read an entire file as an array buffer (base64-encoded).
 *
 * Note: The maximum file size allowed is 50 MiB.
 *
 * @param path absolute path to the file to read
 *
 * @returns a promise that resolves with the file data as a base64-encoded string and mime type
 */
export const readAsArrayBuffer = (path: string): Promise<ReadAsArrayBufferResponse> => {
  // Note: We should look into allowing clients to pass in a File object which would allow us to construct a FileReader and get the same data. This
  // would require showSelectFileDialog caching the File object, which this function would then lookup via the given path here.
  if (asperaSdk.useHttpGateway) {
    return throwError('readAsArrayBuffer not supported for HTTP Gateway');
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.readAsArrayBuffer({path});
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    request: {
      path,
    },
    app_id: asperaSdk.globals.appId,
  };

  client.request('read_as_array_buffer', payload)
    .then((data: ReadAsArrayBufferResponse) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.readAsArrayBufferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.readAsArrayBufferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Read a chunk of a file as an array buffer (base64-encoded).
 *
 * Note: The maximum chunk size allowed is 50 MiB.
 *
 * @param path absolute path to the file to read
 * @param offset offset to start reading the file, in bytes
 * @param chunkSize the size of the chunk to read, in bytes
 *
 * @returns a promise that resolves with the file chunk data as a base64-encoded string and mime type
 */
export const readChunkAsArrayBuffer = (path: string, offset: number, chunkSize: number): Promise<ReadChunkAsArrayBufferResponse> => {
  // Note: We should look into allowing clients to pass in a File object which would allow us to construct a FileReader and get the same data. This
  // would require showSelectFileDialog caching the File object, which this function would then lookup via the given path here.
  if (asperaSdk.useHttpGateway) {
    return throwError('readChunkAsArrayBuffer not supported for HTTP Gateway');
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.readChunkAsArrayBuffer({path, offset, chunkSize});
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    request: {
      path,
      offset,
      chunkSize,
    },
    app_id: asperaSdk.globals.appId,
  };

  client.request('read_chunk_as_array_buffer', payload)
    .then((data: ReadChunkAsArrayBufferResponse) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.readChunkAsArrayBufferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.readChunkAsArrayBufferFailed, error));
    });

  return promiseInfo.promise;
};
