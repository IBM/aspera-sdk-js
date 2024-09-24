import {messages} from '../constants/messages';
import {client} from '../helpers/client/client';
import {
  errorLog,
  generateErrorBody,
  generatePromiseObjects,
  isValidTransferSpec,
  randomUUID,
  throwError
} from '../helpers/helpers';
import {asperaDesktop} from '../index';
import {DesktopInfo, TransferResponse} from '../models/aspera-desktop.model';
import {
  CustomBrandingOptions,
  DataTransferResponse,
  DesktopSpec,
  DesktopStyleFile,
  DesktopTransfer,
  FileDialogOptions,
  FolderDialogOptions,
  ModifyTransferOptions,
  ResumeTransferOptions,
  TransferSpec
} from '../models/models';

/**
 * Check if IBM Aspera Desktop connection works. This function is called by init
 * when initializing the SDK. This function can be used at any point for checking.
 *
 * @returns a promise that resolves if server can connect or rejects if not
 */
export const testDesktopConnection = (): Promise<any> => {
  return client.request('get_info')
    .then((data: DesktopInfo) => {
      asperaDesktop.globals.desktopInfo = data;
      asperaDesktop.globals.desktopVerified = true;
      return data;
    });
};

/**
 * Initialize drag and drop.
 *
 * @returns a promise that resolves if the initialization was successful or not
 */
export const initDragDrop = (): Promise<boolean> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  client.request('init_drag_drop')
    .then((data: boolean) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.dragDropInitFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.dragDropInitFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Initialize IBM Aspera Desktop client. If client cannot (reject/catch), then
 * client should attempt fixing server URL or trying again. If still fails disable UI elements.
 *
 * @param appId the unique ID for the website. Transfers initiated during this session
 * will be associated with this ID. It is recommended to use a unique ID to keep transfer
 * information private from other websites.
 *
 * @returns a promise that resolves if IBM Aspera Desktop is running properly or
 * rejects if unable to connect
 */
export const initDesktop = (appId?: string): Promise<any> => {
  asperaDesktop.globals.appId = appId ? appId : randomUUID();

  return asperaDesktop.activityTracking.setup(asperaDesktop.globals.appId)
    .then(() => testDesktopConnection())
    .then(() => initDragDrop())
    .then(data => {
      asperaDesktop.activityTracking.handleWebSocketEvents('RECONNECT');

      return data;
    })
    .catch(error => {
      errorLog(messages.serverError, error);
      asperaDesktop.globals.desktopVerified = false;
      return generateErrorBody(messages.serverError, error);
    });
};

/**
 * Start a transfer
 *
 * @param transferSpec standard transferSpec for transfer
 * @param desktopSpec IBM Aspera Desktop settings when starting a transfer
 *
 * @returns a promise that resolves if transfer initiation is successful and rejects if transfer cannot be started
 */
export const startTransfer = (transferSpec: TransferSpec, desktopSpec: DesktopSpec): Promise<DesktopTransfer> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  if (!isValidTransferSpec(transferSpec)) {
    return throwError(messages.notValidTransferSpec, {transferSpec});
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_spec: transferSpec,
    desktop_spec: desktopSpec,
    app_id: asperaDesktop.globals.appId,
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
  return asperaDesktop.activityTracking.setCallback(callback);
};

/**
 * Remove a callback from the transfer callback
 *
 * @param id the ID returned by `registerActivityCallback`
 */
export const deregisterActivityCallback = (id: string): void => {
  asperaDesktop.activityTracking.removeCallback(id);
};

/**
 * Register a callback event for when a user removes or cancels a transfer
 * directly from IBM Aspera Desktop. This may also be called if IBM Aspera Desktop
 * is configured to automatically remove completed transfers.
 *
 * @param callback callback function to receive transfers
 *
 * @returns ID representing the callback for deregistration purposes
 */
export const registerRemovedCallback = (callback: (transfer: DesktopTransfer) => void): string => {
  return asperaDesktop.activityTracking.setRemovedCallback(callback);
};

/**
 * Remove a callback from the removed transfer callback
 *
 * @param id the ID returned by `registerRemovedCallback`
 */
export const deregisterRemovedCallback = (id: string): void => {
  asperaDesktop.activityTracking.removeRemovedCallback(id);
};

/**
 * Register a callback for getting updates about the connection status of IBM Aspera Desktop.
 *
 * For example, to be notified of when the SDK loses connection with the application or connection
 * is re-established. This can be useful if you want to handle the case where the user quits IBM Aspera Desktop
 * after `initDesktop` has already been called, and want to prompt the user to relaunch the application.
 *
 * @param callback callback function to receive events
 *
 * @returns ID representing the callback for deregistration purposes
 */
export const registerStatusCallback = (callback: (status: 'CLOSED'|'RECONNECT') => void): string => {
  return asperaDesktop.activityTracking.setWebSocketEventCallback(callback);
};

/**
 * Remove a callback from getting connection status events.
 *
 * @param id the ID returned by `registerStatusCallback`
 */
export const deregisterStatusCallback = (id: string): void => {
  asperaDesktop.activityTracking.removeWebSocketEventCallback(id);
};

/**
 * Remove a transfer. This will stop the transfer if it is in progress.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves if transfer is removed and rejects if transfer cannot be removed
 */
export const removeTransfer = (id: string): Promise<any> => {
  if (!asperaDesktop.isReady) {
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
  if (!asperaDesktop.isReady) {
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
export const resumeTransfer = (id: string, options?: ResumeTransferOptions): Promise<DesktopTransfer> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
    transfer_spec: options,
  };

  client.request('resume_transfer', payload)
    .then((data: DesktopTransfer) => promiseInfo.resolver(data))
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
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    options: options || {},
    app_id: asperaDesktop.globals.appId,
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
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    options: options || {},
    app_id: asperaDesktop.globals.appId,
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
 * Opens the IBM Aspera Desktop preferences page.
 *
 * @returns a promise that resolves when the preferences page is opened.
 */
export const showPreferences = (): Promise<any> => {
  if (!asperaDesktop.isReady) {
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
export const getAllTransfers = (): Promise<DesktopTransfer[]> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    app_id: asperaDesktop.globals.appId,
  };

  client.request('get_all_transfers', payload)
    .then((data: DesktopTransfer[]) => promiseInfo.resolver(data))
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
export const getTransfer = (id: string): Promise<DesktopTransfer> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
  };

  client.request('get_transfer', payload)
    .then((data: DesktopTransfer) => promiseInfo.resolver(data))
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
  if (!asperaDesktop.isReady) {
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
export const modifyTransfer = (id: string, options: ModifyTransferOptions): Promise<DesktopTransfer> => {
  if (!asperaDesktop.isReady) {
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
 * Set the custom branding template to be used by IBM Aspera Desktop. If the app is already
 * configured to use a different branding, then the branding template you specify will be
 * stored by the app, allowing the end user to switch at any point.
 *
 * @param id custom branding template id. This should be consistent across page loads.
 * @param options custom branding options
 *
 * @returns a promise that resolves if the branding was properly set.
 */
export const setBranding = (id: string, options: CustomBrandingOptions): Promise<any> => {
  if (!asperaDesktop.isReady) {
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
  callback: (data: {event: any; files: DataTransferResponse}) => void,
  elementSelector: string,
): void => {
  const elements = document.querySelectorAll(elementSelector);
  if (!elements || !elements.length) {
    errorLog(messages.unableToFindElementOnPage);
    return;
  }

  const dragEvent = (event: any) => {
    event.preventDefault();
  };

  const dropEvent = (event: any) => {
    event.preventDefault();
    const files: DesktopStyleFile[] = [];
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length && event.dataTransfer.files[0]) {
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
        app_id: asperaDesktop.globals.appId,
      };

      client.request('dropped_files', payload)
        .then((data: any) => callback({event, files: data}))
        .catch(error => {
          errorLog(messages.unableToReadDropped, error);
        });
    }
  };

  elements.forEach(element => {
    element.addEventListener('dragover', dragEvent);
    element.addEventListener('drop', dropEvent);
    asperaDesktop.globals.dropzonesCreated.set(elementSelector, [{event: 'dragover', callback: dragEvent}, {event: 'drop', callback: dropEvent}]);
  });
};

/**
 * Remove dropzone.
 *
 * @param elementSelector the selector of the element on the page that should remove
 */
export const removeDropzone = (elementSelector: string): void => {
  const foundDropzone = asperaDesktop.globals.dropzonesCreated.get(elementSelector);

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
 * Get metadata about the IBM Aspera Desktop installation.
 *
 * @returns a promise that returns information about the user's IBM Aspera Desktop installation.
 */
export const getInfo = (): Promise<DesktopInfo> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  return new Promise((resolve, _) => {
    resolve(asperaDesktop.globals.desktopInfo);
  });
};
