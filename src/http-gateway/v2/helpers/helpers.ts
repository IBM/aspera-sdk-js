import { PromiseObject, ErrorResponse, TransferSpec, TransferSpecPath, FeatureFlags } from '../models/models';
import { asperaHttpGateway } from '../index';
import { dropContainerName } from '../constants/constants';
import { messages } from '../constants/messages';

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
 * Log errors from HTTP Gateway SDK
 *
 * @param message the message indicating the error encountered
 * @param debugData the data with useful debugging information
 */
export const errorLog = (message: string, debugData?: any): void => {
  if (typeof (<any>window) === 'object') {
    if (!Array.isArray((<any>window).httpGatewayLogs)) {
      (<any>window).httpGatewayLogs = [];
    }
    (<any>window).httpGatewayLogs.push({message, debugData});
  }
  console.warn(`Aspera HTTP Gateway SDK: ${message}`, debugData);
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
 * Validate if URL is valid URL
 *
 * @param serverUrl the url to test
 *
 * @returns boolean indicating whether supplied url is valid
 */
export const isValidUrl = (url: any): boolean => {
  if (
    url &&
    typeof url === 'string' &&
    url.indexOf('//') > -1
  ) {
    return true;
  }

  return false;
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
 * Get files from a form
 *
 * @param children form children list
 *
 * @returns an array of Files pulled from an HTML form
 */
export const checkChildrenForFiles = (children: NodeList): File[] => {
  const filesFromForm: File[] = [];
  children.forEach((child: HTMLInputElement) => {
    if (child.files) {
      for (let i = 0; i < child.files.length; i++) {
        filesFromForm.push(child.files[i]);
      }
    }
  });
  return filesFromForm;
};

/**
 * Validate if form has required items
 *
 * @param form HTML form element
 */
export const isValidForm = (form: HTMLFormElement): boolean => {
  if (
    form &&
    typeof form === 'object' &&
    form.nodeType &&
    form.tagName === 'FORM'
  ) {
    return true;
  }

  return false;
};

/**
 * Take a list of files and match them to a provided transferSpec to find only files to use
 *
 * @param files list of files in JavaScript memory
 * @param transferSpec the transferSpec to compare to for what files to use
 */
export const parseFilesFromSpec = (files: File[], transferSpec: TransferSpec): File[] => {
  const transferSpecFilesMap: Map<string, any> = new Map();
  const filesAddedList: Map<string, boolean> = new Map();
  transferSpec.paths.forEach(path => {
    transferSpecFilesMap.set(path.source, path);
  });
  return files.filter(file => {
    if (filesAddedList.get(file.name)) {
      return false;
    }
    const specPath = transferSpecFilesMap.get(file.name);
    if (specPath) {
      specPath.file_size = file.size;
      filesAddedList.set(file.name, true);
    }
    return !!specPath;
  });
};

/**
 * Take a transferSpec and find folders being used in the form and explode for uploading and explode transferSpec to know all files in folder
 *
 * @param formId the form item to use for parsing
 * @param transferSpec he transfer spec to test with for file list
 *
 * @returns object with files to add to upload and a new transferSpec Path array to use with exploded files
 */
export const folderTransferSpecExplode = (formId: string, transferSpec: TransferSpec): {files: File[]; newPath: TransferSpecPath[]} => {
  const folderList = asperaHttpGateway.globals.getOrCreateFolderDataList(formId);
  const folderDropList = asperaHttpGateway.globals.getOrCreateFolderDataList(dropContainerName);
  const newPaths: TransferSpecPath[] = [];
  const foundFiles: File[] = [];

  const handleFolderData = (file: File, path: TransferSpecPath) => {
    foundFiles.push(file);
    newPaths.push({
      source: (file as any).asperaDropPath || (file as any).webkitRelativePath || file.name,
      destination: path.destination,
    });
  };

  transferSpec.paths?.forEach(path => {
    if (folderList.get(path.source)) {
      folderList.get(path.source).files.forEach(file => {
        handleFolderData(file, path);
      });
    } else if (folderDropList.get(path.source)) {
      folderDropList.get(path.source).files.forEach(file => {
        handleFolderData(file, path);
      });
    } else {
      newPaths.push(path);
    }
  });

  return {
    files: foundFiles,
    newPath: newPaths,
  };
};

/**
 * Return array of File items to use for transfer
 *
 * @param formId the form item to use for parsing
 * @param transferSpec the transfer spec to test with for file list
 *
 * @returns the array of Files to use
 */
export const getFilesForTransfer = (formId: string, transferSpec: TransferSpec): Array<File> => {
  const form = asperaHttpGateway.globals.createOrUseForm(formId);
  if (!isValidForm(form)) {
    return [];
  }
  const filesFromForm = checkChildrenForFiles(form.childNodes);
  const dropFiles = asperaHttpGateway.globals.getOrCreateFormFileListFromDrop(dropContainerName);
  dropFiles.forEach(file => {
    filesFromForm.push(file);
  });
  return parseFilesFromSpec(filesFromForm, transferSpec);
};

/**
 * Convert an irritable into an array. This is useful for taking Maps and making Arrays (Map.values() Map.keys())
 *
 * @param iterable - an iterable to take and convert to an array
 *
 * @returns an array containing the iterable values
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const iterableToArray = (iterable: IterableIterator<unknown>): any[] => {
  const newArray = [];

  (function addItem(): void {
    const value = iterable.next();

    if (!value.done) {
      newArray.push(value.value);
      addItem();
    }
  }());

  return newArray;
};

/**
 * Figure out which feature to use based on current version of system.
 *
 * @param featureFlag - name of the feature flag to test
 *
 * @returns indicator if feature should be used
 */
export const getFeatureFlag = (featureFlag: FeatureFlags): boolean => {
  if (!asperaHttpGateway.globals.serverInfo?.version) {
    errorLog(messages.serverNotVerified);
    return false;
  }
  const versionData = asperaHttpGateway.globals.serverInfo.version.split('.');
  const major = versionData[0] ? Number(versionData[0]) : 0;
  const minor = versionData[1] ? Number(versionData[1]) : 0;
  const patch = versionData[2] ? Number(versionData[2]) : 0;
  const numberBased = (major * 10000000000) + (minor * 100000) + patch;
  switch (featureFlag) {
    case 'noBase64Encoding':
      return numberBased >= 20000300000;
  }
};

/**
 * Returns a string indicating the websocket URL to use for talking to the server
 *
 * @returns a string of the full Websocket URL
 */
export const getWebsocketUrl = (serverUrl: string, protocol: string): string => {
  let wsProtocol;
  if (serverUrl.indexOf('http:') === 0) {
    wsProtocol = 'ws';
  } else if (serverUrl.indexOf('https:') === 0) {
    wsProtocol = 'wss';
  } else {
    wsProtocol = protocol === 'https:' ? 'wss' : 'ws';
  }
  const url = serverUrl.replace('http://', '//').replace('https://', '//');

  return `${wsProtocol}:${url}/${getFeatureFlag('noBase64Encoding') ? 'v2' : 'v1'}/upload`;
};

export default {
  generatePromiseObjects,
  errorLog,
  generateErrorBody,
  isValidUrl,
  isValidTransferSpec,
  checkChildrenForFiles,
  isValidForm,
  getFilesForTransfer,
  folderTransferSpecExplode,
  parseFilesFromSpec,
  iterableToArray,
  getFeatureFlag,
};
