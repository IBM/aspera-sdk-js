import {asperaDesktop} from '../index';
import {client} from '../helpers/client';
import {errorLog, generateErrorBody, generatePromiseObjects, getWebsocketUrl, isValidTransferSpec, randomUUID, throwError} from '../helpers/helpers';
import {messages} from '../constants/messages';
import {DesktopInfo, TransferResponse} from '../models/aspera-desktop.model';
import {DesktopTransfer, FileDialogOptions, FolderDialogOptions, TransferSpec} from '../models/models';

/**
 * Check if Aspera Desktop connection works. This function is called by init
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
 * Initialize websocket connection to Aspera Desktop. This function only resolves
 * if the websocket connection is successful. It will attempt to reconnnect indefinitely.
 *
 * @returns a promise that resolves if the websocket connection is successful
 */
export const initWebSocketConnection = (): Promise<any> => {
  return asperaDesktop.activityTracking.setup(getWebsocketUrl(asperaDesktop.globals.desktopUrl), asperaDesktop.globals.appId)
    .then(() => testDesktopConnection());
};

/**
 * Initialize Aspera Desktop client. If client cannot (reject/catch), then
 * client should attempt fixing server URL or trying again. If still fails disable UI elements.
 *
 * @param appId the unique ID for the website. Transfers initiated during this session
 * will be associated with this ID. It is recommended to use a unique ID to keep transfer
 * information private from other websites.
 *
 * @returns a promise that resolves if Aspera Desktop is running properly or
 * rejects if unable to connect
 */
export const initDesktop = (appId?: string): Promise<any> => {
  asperaDesktop.globals.appId = appId ? appId : randomUUID();
  return initWebSocketConnection()
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
 *
 * @returns a promise that resolves if transfer initiation is successful and rejects if transfer cannot be started
 */
export const startTransfer = (transferSpec: TransferSpec): Promise<any> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  if (!isValidTransferSpec(transferSpec)) {
    return throwError(messages.notValidTransferSpec, {transferSpec});
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_spec: transferSpec,
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
 * directly from Aspera Desktop. This may also be called if Aspera Desktop
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
 * Displays a file browser dialog for the user to select files.
 *
 * @param options file dialog options
 *
 * @returns a promise that resolves with the selected file(s) and rejects if user cancels dialog
 */
export const showSelectFileDialog = (options?: FileDialogOptions): Promise<any> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    options: options || {},
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
export const showSelectFolderDialog = (options?: FolderDialogOptions): Promise<any> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    options: options || {},
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
 * Get transfers.
 *
 * @param ids[] array of transfer uuids. If an empty array is provided, then all transfers will be returned.
 *
 * @returns a promise that resolves with an array of transfers. If no matching transfers are found,
 * then an empty array is returned.
 */
export const getTransfers = (ids?: string[]): Promise<any> => {
  if (!asperaDesktop.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_ids: ids || [],
    app_id: asperaDesktop.globals.appId,
  };

  client.request('get_transfers', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.getTransfersFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.getTransfersFailed, error));
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
