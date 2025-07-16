import {httpDownload} from './download';
import {httpUpload} from './upload';
import {getApiCall, handleHttpGatewayDrop, httpGatewaySelectFileFolderDialog, createHtmlInputElement} from './core';

/**
 * HTTP Gateway Exports
 *
 * @remarks
 * Most logic is called directly by Desktop SDK functions
 * You may not need to import anything from this file.
 */

export {
  httpUpload,
  httpDownload,
  getApiCall,
  handleHttpGatewayDrop,
  httpGatewaySelectFileFolderDialog,
  createHtmlInputElement,
};
