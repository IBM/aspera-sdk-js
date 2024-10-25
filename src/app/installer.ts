import {asperaSdk} from '../index';
import {errorLog, generateErrorBody, generatePromiseObjects, getCurrentPlatform, isValidURL, throwError} from '../helpers/helpers';
import {apiGet} from '../helpers/http';
import {messages} from '../constants/messages';
import {InstallerInfoResponse, InstallerOptions} from '../models/models';

/**
 * Get the latest Aspera installer information such as download URL and version.
 *
 * @param options Installer info options
 *
 * @returns a promise that resolves with the installer info and rejects if there is an error
 */
export const getInstallerInfo = (options: InstallerOptions = {}): Promise<InstallerInfoResponse> => {
  let url = options.endpoint || asperaSdk.globals.installerUrl;

  if (url.endsWith('/latest.json')) {
    url = url.replace('/latest.json', '');
  }

  if (!isValidURL(url)) {
    return throwError(messages.invalidEndpoint, {url});
  }

  const promiseInfo = generatePromiseObjects();

  apiGet(`${url}/latest.json`).then(response => {
    response.json().then((data: InstallerInfoResponse) => {
      if (options.endpoint) {
        for (const entry of data.entries) {
          if (!isValidURL(entry.url)) {
            entry.url = `${options.endpoint}/${entry.url}`;
          }
        }
      }

      if (options.all) {
        promiseInfo.resolver(data);
      } else {
        const platform = getCurrentPlatform();
        data.entries = data.entries.filter(entry => entry.platform === platform);

        promiseInfo.resolver(data);
      }
    });
  }).catch(error => {
    errorLog(messages.getInstallerError, error);

    promiseInfo.rejecter(generateErrorBody(messages.getInstallerError, error));
  });

  return promiseInfo.promise;
};
