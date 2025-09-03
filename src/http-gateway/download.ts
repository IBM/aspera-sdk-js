import {AsperaSdkTransfer, TransferSpec} from '../models/models';
import {asperaSdk} from '../index';
import {safeJsonString, throwError} from '../helpers/helpers';
import {messages} from '../constants/messages';
import { base64Encoding, getMessageFromError, getSdkTransfer, sendTransferUpdate } from './core';

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
 *
 * @todo Handle large files
 */
export const httpDownload = (transferSpec: TransferSpec, overrideServerUrl?: string): Promise<AsperaSdkTransfer> => {
  if (!asperaSdk.httpGatewayIsReady) {
    return throwError(messages.serverNotVerified, {type: 'download'});
  }

  // create a transfer sdk object
  const transferObject = getSdkTransfer(transferSpec);

  const triggerFailed = (error: any): void => {
    const errorData = getMessageFromError(error.response || error);

    transferObject.status = 'failed';
    transferObject.error_code = errorData.code;
    transferObject.error_desc = errorData.message;
    sendTransferUpdate(transferObject);
  };

  sendTransferUpdate(transferObject);

  fetch(`${overrideServerUrl || asperaSdk.globals.httpGatewayUrl}/download`, {method: 'GET', headers: {'X-Aspera-Spec': base64Encoding(safeJsonString(transferSpec))}}).then(data => {
    const headers = data.headers;
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    const reader = data.body.getReader();
    transferObject.status = 'running';
    sendTransferUpdate(transferObject);

    transferObject.bytes_expected = Number(headers.get('Content-Length') || 0);

    const readBytes = () => {
      reader.read().then(content => {
        if (content.done){
          if (data.status >= 400 || !transferObject.bytes_written) {
            triggerFailed(data.body);

            return;
          }

          transferObject.status = 'completed';
          sendTransferUpdate(transferObject);
          const blobData = new Blob(chunks, {type: headers.get('Content-Type')});
          const objectURL = URL.createObjectURL(blobData);
          const a = document.createElement('a');
          a.href = objectURL;
          a.setAttribute('style', 'display: none;');
          a.download = (headers.get('Content-Disposition') || 'download').replace('attachment; filename="', '').replace('"', '');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objectURL);
        }else{
          chunks.push(content.value);
          transferObject.status = 'running';
          transferObject.bytes_written += content.value?.length || 0;
          transferObject.percentage = (transferObject.bytes_written /transferObject.bytes_expected);
          sendTransferUpdate(transferObject);
          readBytes();
        }
      }).catch(error => {
        triggerFailed(error);
      });
    };

    readBytes();
  }).catch(error => {
    triggerFailed(error);
  });

  return Promise.resolve(transferObject);
};
