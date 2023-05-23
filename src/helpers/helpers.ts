import {ErrorResponse, PromiseObject, TransferSpec} from '../models/models';

/**
 * Generates promise object that can be resolved or rejected via functions
 *
 * @returns an object containing the promise, the resolver and rejecter
 */
export const generatePromiseObjects = (): PromiseObject => {
  let resolver: (response: any) => void;
  let rejecter: (response: any) => void;
  const promise = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });
  return {
    promise,
    resolver,
    rejecter
  };
};

/**
 * Log errors from Aspera Desktop SDK
 *
 * @param message the message indicating the error encountered
 * @param debugData the data with useful debugging information
 */
export const errorLog = (message: string, debugData?: any): void => {
  if (typeof (<any>window) === 'object') {
    if (!Array.isArray((<any>window).asperaDesktopLogs)) {
      (<any>window).asperaDesktopLogs = [];
    }
    (<any>window).asperaDesktopLogs.push({message, debugData});
  }
  console.warn(`Aspera Desktop SDK: ${message}`, debugData);
};

/**
 * Generate error object for rejecter responses
 *
 * @param message the message indicating the error encountered
 * @param debugData the data with useful debugging information
 *
 * @returns object containing standardized error response
 */
export const generateErrorBody = (message: string, debugData?: any): ErrorResponse => {
  const errorResponse: ErrorResponse = {
    error: true,
    message
  };
  if (debugData) {
    errorResponse.debugData = debugData;
  }

  return errorResponse;
};

/**
 * Validate if transferSpec is valid for server communication
 *
 * @param transferSpec the transferSpec to test
 *
 * @returns boolean indicating whether supplied transferSpec is valid
 */
export const isValidTransferSpec = (transferSpec: TransferSpec): boolean => {
  if (
    transferSpec &&
    typeof transferSpec === 'object' &&
    typeof transferSpec.direction === 'string' &&
    typeof transferSpec.remote_host === 'string' &&
    Array.isArray(transferSpec.paths)
  ) {
    return true;
  }

  return false;
};

/**
 * Returns a string indicating the websocket URL to use for talking to the server
 *
 * @returns a string of the full Websocket URL
 */
export const getWebsocketUrl = (serverUrl: string): string => {
  let wsProtocol;
  if (serverUrl.indexOf('http:') === 0) {
    wsProtocol = 'ws';
  } else if (serverUrl.indexOf('https:') === 0) {
    wsProtocol = 'wss';
  }
  const url = serverUrl.replace('http://', '//').replace('https://', '//');

  return `${wsProtocol}:${url}`;
};

/**
 * Function used to create a random UUID
 *
 * @returns string
 */
export const randomUUID = (): string => {
  const fallback = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = Number(((new Date().getTime() + 16) * Math.random()).toFixed()) % 16;
      if (c !== 'x') {
        // eslint-disable-next-line no-bitwise
        r = r & 0x3 | 0x8;
      }
      return r.toString(16);
    });
  };

  return window.crypto?.randomUUID ? window.crypto.randomUUID() : fallback();

};

export default {
  generatePromiseObjects,
  errorLog,
  generateErrorBody,
  isValidTransferSpec,
  getWebsocketUrl,
  randomUUID,
};
