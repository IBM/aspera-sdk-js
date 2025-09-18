import {AsperaSdkSpec, AsperaSdkTransfer, TransferSpec} from '../models/models';
import {asperaSdk} from '../index';
import {generatePromiseObjects, safeJsonString, throwError} from '../helpers/helpers';
import {messages} from '../constants/messages';
import {getMessageFromError, getSdkTransfer, sendTransferUpdate} from './core';
import {upload as oldHttpUpload} from '@ibm-aspera/http-gateway-sdk-js';

/**
 * HTTP Gateway Upload Logic
 *
 * @param transferSpec - TransferSpec for the upload
 * @param asperaSdkSpec IBM Aspera settings when starting a transfer.
 *
 * @returns Promise that resolves on success invoke or rejects if unable to start
 *
 * @remarks
 * Most logic is called directly by Desktop SDK functions
 * You may not need to import anything from this file.
 */
export const httpUpload = (transferSpec: TransferSpec, asperaSdkSpec?: AsperaSdkSpec): Promise<AsperaSdkTransfer> => {
  if (!asperaSdk.httpGatewayIsReady) {
    return throwError(messages.serverNotVerified, {type: 'upload'});
  }

  if (asperaSdk.useOldHttpGateway) {
    return oldHttpUpload(transferSpec, asperaSdkSpec?.http_gateway_v2_transfer_id || '');
  }

  const promiseInfo = generatePromiseObjects();
  const request = new XMLHttpRequest();
  const body = new FormData();
  body.append('x-aspera-spec', safeJsonString(transferSpec));
  const hasBadFile: string[] = [];

  transferSpec.paths.forEach(path => {
    const foundFile = asperaSdk.httpGatewaySelectedFiles.get(path.source);

    if (foundFile) {
      body.append('Content-Length', String(foundFile.size));
      body.append('file', foundFile);
    } else {
      hasBadFile.push(path.source);
    }
  });

  if (hasBadFile.length) {
    return throwError(messages.fileNotAllowed, {type: 'upload', invalidFiles: hasBadFile, transferSpec});
  }

  const transferObject = getSdkTransfer(transferSpec);

  if (asperaSdkSpec?.http_gateway_authentication) {
    request.setRequestHeader('Authorization', `Bearer ${asperaSdkSpec.http_gateway_authentication.token}`);
    request.setRequestHeader('X-Aspera-AccessKey', asperaSdkSpec.http_gateway_authentication.access_key);
  }

  request.open('POST', `${asperaSdkSpec?.http_gateway_override_server_url || asperaSdk.globals.httpGatewayUrl}/upload`, true);

  const triggerUpdate = (): void => {
    sendTransferUpdate(transferObject);
  };

  const triggerFailed = (): void => {
    const errorData = getMessageFromError(request.response);
    transferObject.httpRequestId = request.getResponseHeader('X-Request-Id');
    transferObject.status = 'failed';
    transferObject.error_code = errorData.code;
    transferObject.error_desc = errorData.message;
    triggerUpdate();
  };

  request.upload.addEventListener('progress', event => {
    if (transferObject.status === 'failed') {
      return;
    }
    transferObject.status = 'running';
    transferObject.elapsed_usec = (new Date().getTime() - new Date(transferObject.add_time).getTime()) * 1000;

    if (event.lengthComputable) {
      transferObject.bytes_expected = event.total;
      transferObject.bytes_written = event.loaded;
      transferObject.percentage = (event.loaded / event.total);
    }

    triggerUpdate();
  });

  request.addEventListener('load', () => {
    transferObject.httpRequestId = request.getResponseHeader('X-Request-Id');
  });

  request.upload.addEventListener('load', event => {
    if (transferObject.status === 'failed') {
      return;
    }

    transferObject.status = 'completed';
    transferObject.elapsed_usec = (new Date().getTime() - new Date(transferObject.add_time).getTime()) * 1000;

    if (event.lengthComputable) {
      transferObject.bytes_expected = event.total;
      transferObject.bytes_written = event.loaded;
      transferObject.percentage = (event.loaded / event.total);
    }

    triggerUpdate();
  });

  request.upload.addEventListener('loadstart', () => {
    if (transferObject.status === 'failed') {
      return;
    }

    transferObject.status = 'running';
    promiseInfo.resolver(transferObject);
    triggerUpdate();
  });

  request.addEventListener('readystatechange', () => {
    if (request.status >= 400) {
      triggerFailed();
    }
  });

  request.upload.addEventListener('error', event => {
    triggerFailed();
    promiseInfo.rejecter(event);
  });

  request.upload.addEventListener('abort', event => {
    triggerFailed();
    promiseInfo.rejecter(event);
  });

  request.addEventListener('error', event => {
    triggerFailed();
    promiseInfo.rejecter(event);
  });

  request.addEventListener('abort', event => {
    triggerFailed();
    promiseInfo.rejecter(event);
  });

  request.send(body);

  return promiseInfo.promise;
};
