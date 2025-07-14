import {asperaSdk} from '../index';
import {HttpGatewayDownload, HttpGatewayDownloadLegacy, HttpGatewayInfo, HttpGatewayPresign, HttpGatewayUpload} from './models';

/**
 * HTTP Gateway Core Logic
 * - File/Folder picking
 * - Starting and testing
 *
 * @remarks
 * Most logic is called directly by Desktop SDK functions
 * You may not need to import anything from this file.
 */

/**
 * Get an API call for HTTP Gateway calls
 *
 * @param type - The type of API call to make
 *
 * @returns
 */
export const getApiCall = (type: 'INFO'|'DOWNLOAD'|'UPLOAD'|'PRESIGN', body?: BodyInit, customHeaders?: HeadersInit): Promise<HttpGatewayInfo|HttpGatewayDownloadLegacy|HttpGatewayDownload|HttpGatewayUpload|HttpGatewayPresign> => {
  const headers: HeadersInit = {
    ...(customHeaders || {})
  };

  let baseCall = fetch(`${asperaSdk.globals.httpGatewayUrl}/info`, {method: 'GET', headers: headers});

  switch (type) {
  case 'DOWNLOAD':
    baseCall = fetch(`${asperaSdk.globals.httpGatewayUrl}/download`, {method: 'GET', headers: headers});
    break;
  case 'UPLOAD':
    baseCall = fetch(`${asperaSdk.globals.httpGatewayUrl}/upload`, {method: 'GET', headers: headers});
    break;
  case 'PRESIGN':
    baseCall = fetch(`${asperaSdk.globals.httpGatewayUrl}/presign`, {method: 'POST', body: body, headers: headers});
    break;
  }

  return baseCall.then(response => {
    if (response.headers.get('Content-Type') === 'application/json') {
      return response.json();
    }

    return response.body;
  });
};
