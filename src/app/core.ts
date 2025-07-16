import {messages} from '../constants/messages';
import {client} from '../helpers/client/client';
import {errorLog, generateErrorBody, generatePromiseObjects, isValidTransferSpec, randomUUID, throwError} from '../helpers/helpers';
import {getApiCall, handleHttpGatewayDrop, httpGatewaySelectFileFolderDialog} from '../http-gateway/core';
import {HttpGatewayInfo} from '../http-gateway/models';
import {asperaSdk} from '../index';
import {AsperaSdkInfo, AsperaSdkClientInfo, TransferResponse} from '../models/aspera-sdk.model';
import {CustomBrandingOptions, DataTransferResponse, AsperaSdkSpec, BrowserStyleFile, AsperaSdkTransfer, FileDialogOptions, FolderDialogOptions, InitOptions, ModifyTransferOptions, ResumeTransferOptions, SafariExtensionEvent, TransferSpec, WebsocketEvent} from '../models/models';

/**
 * Check if IBM Aspera for Desktop connection works. This function is called by init
 * when initializing the SDK. This function can be used at any point for checking.
 *
 * @returns a promise that resolves if server can connect or rejects if not
 */
export const testConnection = (): Promise<any> => {
  return client.request('get_info')
    .then((data: AsperaSdkClientInfo) => {
      asperaSdk.globals.asperaSdkInfo = data;
      asperaSdk.globals.asperaAppVerified = true;
      return asperaSdk.globals.sdkResponseData;
    });
};

/**
 * Initialize drag and drop. HTTP Gateway does not need to init.
 * Ignore if only HTTP Gateway
 * @param initCall - Indicate if called via init flow and should not reject
 *
 * @returns a promise that resolves if the initialization was successful or not
 */
export const initDragDrop = (initCall?: boolean): Promise<boolean> => {
  if (asperaSdk.useHttpGateway) {
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
  const supportMultipleUsers = options?.supportMultipleUsers ?? false;

  asperaSdk.globals.appId = appId;

  if (supportMultipleUsers) {
    asperaSdk.globals.supportMultipleUsers = true;
    asperaSdk.globals.sessionId = randomUUID();
  }

  const handleErrors = (error: unknown) => {
    errorLog(messages.serverError, error);
    asperaSdk.globals.asperaAppVerified = false;
    throw generateErrorBody(messages.serverError, error);
  };

  const getDesktopStartCalls = (): Promise<unknown> => {
    return asperaSdk.activityTracking.setup()
      .then(() => testConnection())
      .then(() => initDragDrop(true))
      .then(() => asperaSdk.globals.sdkResponseData)
      .catch(handleErrors);
  };

  if (options.httpGatewayUrl && !asperaSdk.globals.httpGatewayVerified) {
    let finalHttpGatewayUrl = options.httpGatewayUrl.trim();

    if (finalHttpGatewayUrl.indexOf('http') !== 0) {
      finalHttpGatewayUrl = `https://${finalHttpGatewayUrl}`;
    }

    if (finalHttpGatewayUrl.endsWith('/')) {
      finalHttpGatewayUrl = finalHttpGatewayUrl.slice(0, -1);
    }

    asperaSdk.globals.httpGatewayUrl = finalHttpGatewayUrl;

    return getApiCall('INFO').then((response: HttpGatewayInfo) => {
      asperaSdk.globals.httpGatewayInfo = response;
      asperaSdk.globals.httpGatewayVerified = true;

      if (options.forceHttpGateway) {
        return Promise.resolve(asperaSdk.globals.sdkResponseData);
      } else {
        return getDesktopStartCalls();
      }
    }).catch(error => {
      // If HTTP Gateway fails log and move on to desktop
      errorLog(messages.httpInitFail, error);

      return getDesktopStartCalls();
    });
  }

  return getDesktopStartCalls();
};

/**
 * Start a transfer
 *
 * @param transferSpec standard transferSpec for transfer
 * @param asperaSdkSpec IBM Aspera settings when starting a transfer
 *
 * @returns a promise that resolves if transfer initiation is successful and rejects if transfer cannot be started
 */
export const startTransfer = (transferSpec: TransferSpec, asperaSdkSpec: AsperaSdkSpec): Promise<AsperaSdkTransfer> => {
  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  if (!isValidTransferSpec(transferSpec)) {
    return throwError(messages.notValidTransferSpec, {transferSpec});
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
 * Register a callback event for when a user removes or cancels a transfer
 * directly from IBM Aspera. This may also be called if IBM Aspera
 * is configured to automatically remove completed transfers.
 *
 * @param callback callback function to receive transfers
 *
 * @returns ID representing the callback for deregistration purposes
 */
export const registerRemovedCallback = (callback: (transfer: AsperaSdkTransfer) => void): string => {
  return asperaSdk.activityTracking.setRemovedCallback(callback);
};

/**
 * Remove a callback from the removed transfer callback
 *
 * @param id the ID returned by `registerRemovedCallback`
 */
export const deregisterRemovedCallback = (id: string): void => {
  asperaSdk.activityTracking.removeRemovedCallback(id);
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
 * Register a callback for getting updates about the Safari extension status.
 *
 * This can be useful if you want to handle the case where the user enable or disable the Safari extension.
 *
 * @param callback callback function to receive events
 *
 * @returns ID representing the callback for deregistration purposes
 */
export const registerSafariExtensionStatusCallback = (callback: (status: SafariExtensionEvent) => void): string => {
  return asperaSdk.activityTracking.setSafariExtensionEventCallback(callback);
};

/**
 * Remove a callback from getting Safari extension status events.
 *
 * @param id the ID returned by `registerStatusCallback`
 */
export const deregisterSafariExtensionStatusCallback = (id: string): void => {
  asperaSdk.activityTracking.removeSafariExtensionEventCallback(id);
};

/**
 * Remove a transfer. This will stop the transfer if it is in progress.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves if transfer is removed and rejects if transfer cannot be removed
 */
export const removeTransfer = (id: string): Promise<any> => {
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
  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

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
 */
export const createDropzone = (
  callback: (data: {event: DragEvent; files: DataTransferResponse}) => void,
  elementSelector: string,
): void => {
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
  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  return new Promise((resolve, _) => {
    resolve(asperaSdk.globals.sdkResponseData);
  });
};
