import { asperaHttpGateway } from '../index';
import { generatePromiseObjects, errorLog, generateErrorBody, isValidUrl } from '../helpers/helpers';
import { messages } from '../constants/messages';
import { apiGet } from '../helpers/http';
import { ServerInfo, TransferResponse } from '../models/http-gateway-global.model';
import { HttpTransfer } from '../models/models';

/**
 * Check if HTTP Gateway server connection works. This function is called by init
 * when initializing the SDK.  This function can be used at any point for sanity checking.
 *
 * @returns promise that resolves if server can connect or rejects if server unable to connect
 */
export const testHttpGatewayConnection = (): Promise<any> => {
  if (!asperaHttpGateway.globals.serverUrl && !asperaHttpGateway.globals.supportMultipleServers) {
    errorLog(messages.serverUrlNotSet);
    return new Promise((resolve, reject) => {
      reject(generateErrorBody(messages.serverUrlNotSet));
    });
  }

  const promiseInfo = generatePromiseObjects();

  const backupServerData: ServerInfo = {
    endpoints: [
      '/aspera/http-gwy/v1/info',
      '/aspera/http-gwy/v1/upload',
      '/aspera/http-gwy/v2/upload',
      '/aspera/http-gwy/v1/download'
    ],
    name: 'IBM Aspera HTTP Gateway',
    version: '2.3.0',
    sdkVerificationFailed: true,
  };

  apiGet(`${asperaHttpGateway.globals.serverUrl || ''}/v1/info`).then(response => {
    response.json().then((data: ServerInfo) => {
      asperaHttpGateway.globals.serverInfo = data;
      asperaHttpGateway.globals.serverVerified = true;

      if (Number(asperaHttpGateway.globals.serverInfo.version.split('.')[0] || 0) >= 3) {
        promiseInfo.rejecter(generateErrorBody(messages.versionNotsupported, data));

        return;
      }

      console.warn(messages.deprecationWarning);
      promiseInfo.resolver(data);
    });
  }).catch(error => {
    errorLog(messages.serverError, error);

    if (asperaHttpGateway.globals.supportMultipleServers) {
      asperaHttpGateway.globals.serverInfo = backupServerData;
      asperaHttpGateway.globals.serverVerified = true;
      promiseInfo.resolver(backupServerData);
    } else {
      asperaHttpGateway.globals.serverVerified = false;
      promiseInfo.rejecter(generateErrorBody(messages.serverError, error));
    }
  });

  return promiseInfo.promise;
};

export const cleanupServerUrl = (serverUrl: string): string => {
  if (typeof serverUrl !== 'string') {
    return '';
  }

  if (serverUrl[serverUrl.length - 1] === '/') {
    serverUrl = serverUrl.slice(0, -1);
  }

  return serverUrl.replace('/v1', '/').replace(/\/$/, '').replace(/\/$/, '');
};

/**
 * Initialize HTTP gateway client. If client cannot (reject/catch)
 * client should attempt fixing server URL or trying again. If still fails disable UI elements.
 * If supportMultipleServers is used the failure of the first test will not lock out the SDK.
 *
 * @param serverUrl URL indicating location of the HTTP server
 * @param softwareMode indicate if the SDK should run in software mode instead of DOM mode
 * @param supportMultipleServers indicates if the SDK should support multiple servers (not restricting to setup server)
 *
 * @returns a promise that resolves if HTTP Gateway is running properly or rejects if unable to load
 */
export const initHttpGateway = (serverUrl: string, softwareMode?: boolean, supportMultipleServers?: boolean): Promise<any> => {
  if (!isValidUrl(serverUrl)) {
    return new Promise((resolve, reject) => {
      reject(generateErrorBody(messages.invalidServerUrl));
    });
  }
  asperaHttpGateway.globals.setUpServer(cleanupServerUrl(serverUrl), softwareMode, supportMultipleServers);
  return testHttpGatewayConnection();
};

/**
 * Register a callback event for getting transfer data
 *
 * @param callback callback function to receive transfers
 *
 * @returns ID representing the callback for deregistration purposes
 */
export const registerActivityCallback = (callback: (transfers: TransferResponse) => void): string => {
  return asperaHttpGateway.activityTracking.setCallback(callback);
};

/**
 * Remove a callback from the transfer callback
 * @param id the ID returned by `registerActivityCallback`
 */
export const deregisterActivityCallback = (id: string): void => {
  asperaHttpGateway.activityTracking.removeCallback(id);
};

/**
 * Returns the transfer requested based on the uuid of the transfer.
 * NOTE: transferId from Node is not accepted as an ID.  It must be the ID used by the HTTP Gateway.
 *
 * @param id gateway based ID of the HTTP part of the transfer
 *
 * @returns an object containing the transfer (or undefined if not found) located at key `transfer_info`
 */
export const getTransferById = (id: string): {transfer_info: HttpTransfer} => {
  return { transfer_info: asperaHttpGateway.activityTracking.getTransferById(id) };
};

/**
 * Get transfer response object including all transfers
 *
 * @returns transfer data object with transfers array
 */
export const getAllTransfers = (): TransferResponse => {
  return asperaHttpGateway.activityTracking.getAllTransfersResponse();
};

/**
 * Remove all transfers that are not active
 */
export const clearNonActiveTransfers = (): void => {
  asperaHttpGateway.activityTracking.clearNonActiveTransfers();
};

/**
 * Removes a transfer from the transfers list in HTTP Gateway
 * If an active transfer is removed it will continue to be uploaded/downloaded but progress will not be tracked
 *
 * @param id HTTP Gateway transfer uuid
 */
export const removeTransfer = (id: string): void => {
  asperaHttpGateway.activityTracking.removeTransfer(id);
};

/**
 * Cancel a transfer from the transfers list in HTTP Gateway
 *
 * @param id HTTP Gateway transfer uuid
 */
export const cancelTransfer = (id: string): void => {
  const transfer = asperaHttpGateway.activityTracking.getTransferById(id);
  if (transfer) {
    transfer.status = 'canceled';
  }
};

export default {
  initHttpGateway,
  testHttpGatewayConnection,
  registerActivityCallback,
  cleanupServerUrl,
  deregisterActivityCallback,
  getTransferById,
  getAllTransfers,
  clearNonActiveTransfers,
  removeTransfer,
  cancelTransfer
};
