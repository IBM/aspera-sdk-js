import { apiPost } from '../helpers/http';
import { asperaHttpGateway } from '../index';
import { errorLog, generatePromiseObjects, generateErrorBody, isValidTransferSpec } from '../helpers/helpers';
import { messages } from '../constants/messages';
import { DownloadOptions, TransferSpec } from '../models/models';
import { cleanupServerUrl } from './core';

/**
 * Start a HTTP Gateway download. Progress is not provided on downloads, browser handles download directly
 * When in software mode the promise will return transfer_spec_id and the URL. The URL has not been used
 * therefore a client can open it and start the download using software specific methods (like file reader).
 *
 * @param transferSpec standard Connect transferSpec for downloading
 *
 * @returns a promise that resolves if download is started successfully or rejects if error occurs
 */
export const download = (transferSpec: TransferSpec, options: DownloadOptions = {}): Promise<any> => {
  if (!asperaHttpGateway.isReady) {
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

  if (typeof options.zipRequire === 'boolean') {
    transferSpec.zip_required = options.zipRequire;
  }

  const payload = {
    transfer_spec: transferSpec
  };

  const finalServerUrl = options.serverUrlOverride ? cleanupServerUrl(options.serverUrlOverride) : asperaHttpGateway.globals.serverUrl;

  apiPost(`${finalServerUrl}/v1/download`, payload).then(response => {
    response.json().then((data: {transfer_spec_id: string}) => {
      if (data.transfer_spec_id) {
        const downloadUrl = `${finalServerUrl}/v1/download/${data.transfer_spec_id}`;
        if (asperaHttpGateway.globals.softwareMode || options?.disableAutoDownload) {
          promiseInfo.resolver({
            transfer_spec_id: data.transfer_spec_id,
            url: downloadUrl,
          });
          return;
        }
        asperaHttpGateway.globals.triggerDownloadFromUrl(downloadUrl);
        promiseInfo.resolver();
      } else {
        errorLog(messages.failedToGetDownloadUrl, {response: data});
        promiseInfo.rejecter(generateErrorBody(messages.failedToGetDownloadUrl, {response: data}));
      }
    });
  }).catch(error => {
    errorLog(messages.downloadFailed, error);
    promiseInfo.rejecter(generateErrorBody(messages.downloadFailed, error));
  });

  return promiseInfo.promise;
};

export default {
  download
};
