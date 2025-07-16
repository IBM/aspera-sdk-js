import {AsperaSdkTransfer, TransferSpec} from '../models/models';
import {asperaSdk} from '../index';
import {throwError} from '../helpers/helpers';
import {messages} from '../constants/messages';

/**
 * HTTP Gateway Upload Logic
 *
 * @param transferSpec - TransferSpec for the upload
 *
 * @returns Promise that resolves on success invoke or rejects if unable to start
 *
 * @remarks
 * Most logic is called directly by Desktop SDK functions
 * You may not need to import anything from this file.
 */
export const httpUpload = (transferSpec: TransferSpec): Promise<AsperaSdkTransfer> => {
  if (!asperaSdk.httpGatewayIsReady) {
    return throwError(messages.serverNotVerified, {type: 'upload'});
  }

  return Promise.reject('TODO: HTTP Upload Not Ready');
};
