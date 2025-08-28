import {baseInstallerUrl, installerUrl} from '../constants/constants';
import {ErrorResponse, InstallerUrlInfo, PromiseObject, TransferSpec} from '../models/models';

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
 * Log errors from Aspera SDK
 *
 * @param message the message indicating the error encountered
 * @param debugData the data with useful debugging information
 */
export const errorLog = (message: string, debugData?: any): void => {
  if (debugData && debugData.code && debugData.message) {
    debugData = {
      code: debugData.code,
      message: debugData.message,
      data: debugData.data
    };
  }

  if (typeof (<any>window) === 'object') {
    if (!Array.isArray((<any>window).asperaSdkLogs)) {
      (<any>window).asperaSdkLogs = [];
    }
    (<any>window).asperaSdkLogs.push({message, debugData});
  }

  console.warn(`Aspera SDK: ${message}`, debugData);
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

  if (debugData && debugData.code && debugData.message) {
    errorResponse.debugData = {
      code: debugData.code,
      message: debugData.message,
      data: debugData.data
    };
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
 * Simple function to get the current platform.
 *
 * @returns a string indicating the current platform
 */
export const getCurrentPlatform = (): 'macos'|'windows'|'linux'|'unknown' => {
  const ua = navigator.userAgent;

  if (/Mac/.test(ua)) {
    return 'macos';
  } else if (/Win/.test(ua)) {
    return 'windows';
  } else if (/Linux/.test(ua)) {
    return 'linux';
  } else {
    return 'unknown';
  }
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

/**
 * Return a rejected promise
 *
 * @param message the message indicating the error encountered
 * @param debugData the data with useful debugging information
 *
 * @returns a rejected promise
 */
export const throwError = (message: string, debugData?: any): Promise<any> => {
  errorLog(message, debugData);
  return new Promise((resolve, reject) => {
    reject(generateErrorBody(message, debugData));
  });
};

/**
 * Check if the given string is a valid URL
 *
 * @param url string to check if valid URL
 *
 * @returns boolean
 */
export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch(error) {
    return false;
  }
};

/**
 * Checks if the current browser is Safari.
 * @returns {boolean} Whether the browser is Safari.
 */
export const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && !(window as any).MSStream;
};

/**
 * Get the URLs for installer management.
 *
 * @returns Info on URLs where installers live
 */
export const getInstallerUrls = (): InstallerUrlInfo => {
  return {
    base: baseInstallerUrl,
    latest: installerUrl,
  };
};

/**
 * Try to stringify a JSON string and log failures
 *
 * @param json - Object to make into a string
 *
 * @returns string representing JSON or empty string on error
 */
export const safeJsonString = (json: unknown): string => {
  try {
    return JSON.stringify(json);
  } catch (error) {
    errorLog('safeJsonString: unable to stringify JSON', {error, json});

    return '';
  }
};

/**
 * Try to parse a JSON string and log failures
 *
 * @param json - String to make into an object
 *
 * @returns object or array from the JSON string. Or undefined
 */
export const safeJsonParse = (json: string): any|undefined => {
  try {
    return JSON.parse(json);
  } catch (error) {
    errorLog('safeJsonParse: unable to parse JSON', {error, json});

    return undefined;
  }
};

export default {
  errorLog,
  generateErrorBody,
  generatePromiseObjects,
  getCurrentPlatform,
  getWebsocketUrl,
  isSafari,
  isValidURL,
  isValidTransferSpec,
  randomUUID,
  throwError,
  getInstallerUrls,
  safeJsonString,
  safeJsonParse,
};
