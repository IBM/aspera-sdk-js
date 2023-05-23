import {asperaDesktop} from '../index';
import {client} from '../helpers/client';
import {errorLog, generateErrorBody, generatePromiseObjects, getWebsocketUrl, isValidTransferSpec, randomUUID} from '../helpers/helpers';
import {messages} from '../constants/messages';
import {DesktopInfo, TransferResponse} from '../models/aspera-desktop.model';
import {TransferSpec} from '../models/models';

/**
 * Check if Aspera Desktop connection works. This function is called by init
 * when initializing the SDK. This function can be used at any point for checking.
 *
 * @returns a promise that resolves if server can connect or rejects if not
 */
export const testDesktopConnection = (): Promise<any> => {
  return client.request('get_info')
    .then((data: DesktopInfo) => {
      // TODO: Update desktop to send back object with version and other info
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
    errorLog(messages.serverNotVerified);
    return new Promise((resolve, reject) => {
      reject(generateErrorBody(messages.serverNotVerified));
    });
  }

  if (!isValidTransferSpec(transferSpec)) {
    errorLog(messages.notValidTransferSpec);
    return new Promise((resolve, reject) => {
      reject(generateErrorBody(messages.notValidTransferSpec, {transferSpec}));
    });
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
 * Register a callback event for getting transfer data
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
 * Remove a transfer. This will stop the transfer if it is in progress.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves if transfer is removed and rejects if transfer cannot be removed
 */
export const removeTransfer = (id: string): Promise<any> => {
  if (!asperaDesktop.isReady) {
    errorLog(messages.serverNotVerified);
    return new Promise((resolve, reject) => {
      reject(generateErrorBody(messages.serverNotVerified));
    });
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
