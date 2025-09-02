import {AsperaSdkTransfer, TransferSpec} from '../models/models';
import {asperaSdk} from '../index';
import {throwError} from '../helpers/helpers';
import {messages} from '../constants/messages';

/**
 * HTTP Gateway Download Logic
 *
 * @param transferSpec - TransferSpec for the download
 * @param overrideServerUrl - Server URL to override for transfer
 *
 * @returns Promise that resolves on success invoke or rejects if unable to start
 *
 * @remarks
 * Most logic is called directly by Desktop SDK functions
 * You may not need to import anything from this file.
 */
export const httpDownload = (transferSpec: TransferSpec, overrideServerUrl?: string): Promise<AsperaSdkTransfer> => {
  if (!asperaSdk.httpGatewayIsReady) {
    return throwError(messages.serverNotVerified, {type: 'download'});
  }

  return Promise.reject('TODO: HTTP Download Not Ready');
};
