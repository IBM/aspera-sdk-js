import {AsperaSdkSpec, AsperaSdkTransfer, TransferSpec} from '../models/models';
import {asperaSdk} from '../index';
import {safeJsonString, throwError} from '../helpers/helpers';
import {messages} from '../constants/messages';
import { base64Encoding, getMessageFromError, getSdkTransfer, sendTransferUpdate } from './core';
import {download as oldHttpDownload} from '@ibm-aspera/http-gateway-sdk-js';
import { HttpGatewayPresign } from './models';

/**
 * HTTP Gateway Download Logic for presigned flow
 * Presigned flow is when used files are too large or unknown file size
 *
 * @param transferSpec - TransferSpec for the download
 * @param asperaSdkSpec IBM Aspera settings when starting a transfer.
 *
 * @returns Promise that resolves on success invoke or rejects if unable to start
 *
 * @remarks
 * This function is used internally and not exported.
 */
const httpDownloadPresigned = (transferSpec: TransferSpec, asperaSdkSpec?: AsperaSdkSpec): Promise<AsperaSdkTransfer> => {
  // create a transfer sdk object
  const transferObject = getSdkTransfer(transferSpec);
  transferObject.httpDownloadExternalHandle = true;
  sendTransferUpdate(transferObject);

  const triggerFailed = (error: any): void => {
    const errorData = getMessageFromError(error.response || error);

    transferObject.status = 'failed';
    transferObject.error_code = errorData.code;
    transferObject.error_desc = errorData.message;
    sendTransferUpdate(transferObject);
  };

  const url = new URL(asperaSdkSpec?.http_gateway_override_server_url || asperaSdk.globals.httpGatewayUrl);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    accept: 'application/json',
  };

  if (asperaSdkSpec?.http_gateway_authentication) {
    headers['Authorization'] = `Bearer ${asperaSdkSpec.http_gateway_authentication.token}`;
    headers['X-Aspera-AccessKey'] = asperaSdkSpec.http_gateway_authentication.access_key;
  }

  const protocol = url.protocol === 'https:' ? 'https' : 'http';

  return fetch(
    `${url.toString()}/presign`,
    {
      method: 'POST',
      headers,
      body: safeJsonString({
        transfer_spec: transferSpec,
        method: 'GET',
        protocol,
        headers: {
          host: url.host,
        },
      }),
    },
  ).then(response => {
    return response.json().then(data => {
      return {
        headers: response.headers,
        body: data as HttpGatewayPresign,
        status: response.status,
      };
    });
  }).then(response => {
    if (response.status >= 400) {
      triggerFailed(response.body);

      return transferObject;
    }

    transferObject.httpRequestId = response.headers.get('X-Request-Id');
    transferObject.status = 'running';
    sendTransferUpdate(transferObject);

    const iframe = document.createElement('iframe');
    iframe.src = response.body.signed_url;
    iframe.width = '1px';
    iframe.height = '1px';

    asperaSdk.globals.httpGatewayIframeContainer.appendChild(iframe);

    return transferObject;
  }).catch(error => {
    triggerFailed(error);

    return transferObject;
  });
};

/**
 * HTTP Gateway Download Logic for in browser download with progress
 * This is used when the transfer size is known and under the threshold
 *
 * @param transferSpec - TransferSpec for the download
 * @param asperaSdkSpec IBM Aspera settings when starting a transfer.
 *
 * @returns Promise that resolves on success invoke or rejects if unable to start
 *
 * @remarks
 * This function is used internally and not exported.
 */
const httpDownloadInBrowser = (transferSpec: TransferSpec, asperaSdkSpec?: AsperaSdkSpec): Promise<AsperaSdkTransfer> => {
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

  const headers: HeadersInit = {
    'X-Aspera-Spec': base64Encoding(safeJsonString(transferSpec)),
  };

  if (asperaSdkSpec?.http_gateway_authentication) {
    headers['Authorization'] = `Bearer ${asperaSdkSpec.http_gateway_authentication.token}`;
    headers['X-Aspera-AccessKey'] = asperaSdkSpec.http_gateway_authentication.access_key;
  }

  fetch(`${asperaSdkSpec?.http_gateway_override_server_url || asperaSdk.globals.httpGatewayUrl}/download`, {method: 'GET', headers}).then(data => {
    const responseHeaders = data.headers;
    transferObject.httpRequestId = responseHeaders.get('X-Request-Id');
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    const reader = data.body.getReader();
    transferObject.status = 'running';
    sendTransferUpdate(transferObject);

    transferObject.bytes_expected = Number(responseHeaders.get('Content-Length') || 0);

    const readBytes = () => {
      reader.read().then(content => {
        if (content.done){
          if (data.status >= 400 || !transferObject.bytes_written) {
            triggerFailed(data.body);

            return;
          }

          transferObject.status = 'completed';
          sendTransferUpdate(transferObject);
          const blobData = new Blob(chunks, {type: responseHeaders.get('Content-Type')});
          const objectURL = URL.createObjectURL(blobData);
          const a = document.createElement('a');
          a.href = objectURL;
          a.setAttribute('style', 'display: none;');
          a.download = (responseHeaders.get('Content-Disposition') || 'download').replace('attachment; filename="', '').replace('"', '');
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

/**
 * HTTP Gateway Download Logic
 *
 * @param transferSpec - TransferSpec for the download
 * @param asperaSdkSpec IBM Aspera settings when starting a transfer.
 *
 * @returns Promise that resolves on success invoke or rejects if unable to start
 *
 * @remarks
 * Most logic is called directly by Desktop SDK functions
 * You may not need to import anything from this file.
 */
export const httpDownload = (transferSpec: TransferSpec, asperaSdkSpec?: AsperaSdkSpec): Promise<AsperaSdkTransfer> => {
  if (!asperaSdk.httpGatewayIsReady) {
    return throwError(messages.serverNotVerified, {type: 'download'});
  }

  if (asperaSdk.useOldHttpGateway) {
    return oldHttpDownload(transferSpec);
  }

  if (
    transferSpec.tags &&
    transferSpec.tags.aspera &&
    transferSpec.tags.aspera['http-gateway'] &&
    transferSpec.tags.aspera['http-gateway'].expected_size <= asperaSdk.httpGatewayInBrowserDownloadThreshold
  ) {
    return httpDownloadInBrowser(transferSpec, asperaSdkSpec);
  } else {
    return httpDownloadPresigned(transferSpec, asperaSdkSpec);
  }
};
