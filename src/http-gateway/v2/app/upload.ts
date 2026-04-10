import { asperaHttpGateway } from '../index';
import {
  errorLog,
  generatePromiseObjects,
  generateErrorBody,
  isValidTransferSpec,
  getFilesForTransfer,
  getWebsocketUrl,
  iterableToArray,
  folderTransferSpecExplode,
  getFeatureFlag
} from '../helpers/helpers';
import { messages } from '../constants/messages';
import { TransferSpec, HttpTransfer, FileSelected, DataTransferResponse, ConnectStyleFile, PromiseObject, TransferStatus, FolderData, UploadOptions } from '../models/models';
import { dropContainerName, keySplit } from '../constants/constants';
import { cleanupServerUrl } from './core';

/**
 * Used to update the transfer in the activity monitor for a specific transfer. If transfer not found it is ignored
 *
 * @param id the id of the transfer to update
 * @param status the status of the transfer
 * @param total the total bytes of the transfer
 * @param current the amount of bytes transferred thus far
 * @param error error body
 * @param currentFile the current file being transferred
 */
export const updateTransferActivity = (
  id: string,
  status: TransferStatus,
  total?: number,
  current?: number,
  error?: any,
  currentFile?: File
): void => {
  const transfer = asperaHttpGateway.activityTracking.getTransferById(id);
  if (!transfer || transfer.status === 'canceled' || transfer.status === 'completed') {
    return;
  }
  transfer.status = status;
  transfer.bytes_expected = total ? total : transfer.bytes_expected;
  transfer.bytes_written = current ? current : transfer.bytes_written;
  if (currentFile) {
    transfer.current_file = currentFile.name;
  }
  if (status === 'completed' || status === 'failed') {
    if (asperaHttpGateway.activityTracking.queuedUploads.length) {
      const transferToStart = asperaHttpGateway.activityTracking.queuedUploads.shift();
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      startWebSocketTransfer(transferToStart.id, transferToStart.transferSpec, transferToStart.files, undefined, {serverUrlOverride: transfer.serverUrlOverride || undefined});
    }
  }
  if (status === 'completed') {
    transfer.setEndTime();
    asperaHttpGateway.globals.deleteFormFromContainer(id.split(keySplit)[0]);
  } else if (status === 'failed') {
    transfer.error_desc = error.reason;
    transfer.error_code = error.code;
    asperaHttpGateway.globals.deleteFormFromContainer(id.split(keySplit)[0]);
  }
  asperaHttpGateway.activityTracking.triggerActivityCallbacks();
};

/**
 * Slice a file and read it in with FileReader.  This uses the callback to send the read event.
 * This function supports falling back to vendor prefix versions
 * of the slice function for older Firefox and Webkit browsers.
 *
 * @param file the file to slice
 * @param filePosition the start position of the file to slice
 * @param chunksize the end position of the file to slice
 * @param callback the callback to use for FileReader
 * @param fileReader the FileReader to use for reading in data
 */
export const handleBlobSlicing = (file: File, filePosition: number, chunksize: number, callback: any, fileReader: FileReader): void => {
  let chunk;
  if (typeof file.slice === 'function') {
    chunk = file.slice(filePosition, filePosition + chunksize);
  } else if (typeof (<any>file).mozSlice === 'function') {
    chunk = (<any>file).mozSlice(filePosition, filePosition + chunksize);
  } else if (typeof (<any>file).webkitSlice === 'function') {
    chunk = (<any>file).webkitSlice(filePosition, filePosition + chunksize);
  }
  fileReader.onload = callback;
  fileReader[getFeatureFlag('noBase64Encoding') ? 'readAsArrayBuffer' : 'readAsDataURL'](chunk);
};

/**
 * Software mode version of `handleBlobSlicing` for dealing with Buffer instead of File API
 *
 * @param file the file to slice (data string is a FileSystem readFile in binary format)
 * @param filePosition the start position of the file to slice
 * @param chunksize the end position of the file to slice
 * @param callback the callback to use for triggering event on slice
 *
 * @example
 * ```javascript
 * const fileInfo = fs.statSync(filePointer);
 * const file = {
 *    data: fs.readFileSync(filePointer, {encoding: 'binary'}),
 *    size: fileInfo.size,
 *    type: 'file',
 *    lastModified: fileInfo.mtime.toISOString(),
 *    name: filePointer,
 *  }
 * ```
 */
export const handleSoftwareModeSlicing = (
  file: {name: string; data: string; type: string; lastModified: string},
  filePosition: number,
  chunksize: number,
  callback: any
): void => {
  const chunk = file.data.slice(filePosition, filePosition + chunksize);
  callback({
    total: chunk.length,
    target: {
      result: getFeatureFlag('noBase64Encoding') ? chunk : Buffer.from(chunk).toString('base64'),
    }
  });
};

/**
 * Start sending chunked data through the opened websocket
 *
 * @param socket the WebSocket to use for data transfer
 * @param transferSpec the transferSpec to send for the upload
 * @param id the ID of the transfer for monitoring
 * @param queue the array of functions to call for sending data
 * @param fileReaderToUse the file reader to use for this transfer
 */
export const startSendingData = (
  socket: WebSocket,
  transferSpec: TransferSpec,
  files: File[],
  id: string,
  queue: (() => void)[],
  fileReaderToUse: FileReader
): void => {
  let totalFileSize = 0;
  let totalSentSize = 0;
  files.forEach(file => {
    totalFileSize += file.size;
  });
  updateTransferActivity(id, 'running', totalFileSize);

  files.forEach((file, index) => {
    let filePiece = 0;
    const totalSlices = Math.ceil(file.size / asperaHttpGateway.globals.chunkSize);
    for (let filePosition = 0; filePosition < file.size; filePosition += asperaHttpGateway.globals.chunkSize) {
      queue.push(() => {
        const sendChunkCallback = function (event: any) {
          const transfer = asperaHttpGateway.activityTracking.getTransferById(id);

          if (transfer && transfer.status === 'failed') {
            return;
          }

          if (transfer && transfer.status === 'canceled') {
            socket.close();
            return;
          }

          let binaryString = event.target.result;

          try {
            if (getFeatureFlag('noBase64Encoding')) {
              if (filePiece === 0) {
                socket.send(JSON.stringify({
                  slice_upload: {
                    name: (file as any).asperaDropPath || (file as any).webkitRelativePath || file.name,
                    type: file.type,
                    size: file.size,
                    slice: filePiece,
                    total_slices: totalSlices,
                    fileIndex: index
                  }
                }));
              }

              socket.send(binaryString);

              if (filePiece === totalSlices-1) {
                socket.send(JSON.stringify({
                  slice_upload: {
                    name: (file as any).asperaDropPath || (file as any).webkitRelativePath || file.name,
                    type: file.type,
                    size: file.size,
                    slice: filePiece,
                    total_slices: totalSlices,
                    fileIndex: index
                  }
                }));
              }
            } else {
              if (typeof event.target.result === 'string' && event.target.result.indexOf('base64,') > -1) {
                binaryString = event.target.result.split('base64,')[1];
              }

              socket.send(JSON.stringify({
                slice_upload: {
                  name: (file as any).asperaDropPath || (file as any).webkitRelativePath || file.name,
                  type: file.type,
                  size: file.size,
                  data: binaryString,
                  slice: filePiece,
                  total_slices: totalSlices,
                  fileIndex: index
                }
              }));
            }
          } catch (error) {
            updateTransferActivity(id, 'failed');
            errorLog(messages.unableToParseDataForUpload, error);
            throw Error();
          }
          filePiece++;
          if (event.total) {
            totalSentSize += event.total;
          }
          const foundTransfer = asperaHttpGateway.activityTracking.getTransferById(id);
          if (foundTransfer) {
            foundTransfer.recentPacketTransfer(event.total);
          }
          updateTransferActivity(id, 'running', undefined, totalSentSize, undefined, file);
          queue.shift();
        };
        if (asperaHttpGateway.globals.softwareMode) {
          handleSoftwareModeSlicing(file as any, filePosition, asperaHttpGateway.globals.chunkSize, sendChunkCallback);
        } else {
          handleBlobSlicing(file, filePosition, asperaHttpGateway.globals.chunkSize, sendChunkCallback, fileReaderToUse);
        }
      });
    }
  });

  try {
    socket.send(JSON.stringify({
      transfer_spec: transferSpec
    }));
  } catch (error) {
    updateTransferActivity(id, 'failed');
    errorLog(messages.unableToParseDataForUpload, error);
    throw Error();
  }
};

/**
 * Add file input to a form for getting files from the local computer
 *
 * @param form form to add new file input to
 */
export const addFilePickerToForm = (form: HTMLFormElement): HTMLElement => {
  const element = document.createElement('input');
  element.type = 'file';
  element.multiple = true;
  element.name = 'file-' + form.children.length;
  form.appendChild(element);
  return element;
};

/**
 * Add file input to a form with folder support for getting folders from the local computer
 *
 * NOTE: this cannot stop files from being picked.
 *
 * @param form form to add new file input to
 */
export const addFolderPickerToForm = (form: HTMLFormElement): HTMLElement => {
  const element: any = document.createElement('input');
  element.type = 'file';
  element.multiple = true;
  element.webkitdirectory = true;
  element.mozdirectory = true;
  element.msdirectory = true;
  element.odirectory = true;
  element.directory = true;
  element.name = 'file-' + form.children.length;
  form.appendChild(element);
  return element;
};

/**
 * Request file picker for choosing files
 *
 * @param id the ID of the form to use (must be unique to each transfer grouping)
 * @param callback the function to call once the files are added
 */
export const getFilesForUpload = (callback: (data: DataTransferResponse) => void, id: string): void => {
  if (!asperaHttpGateway.isReady) {
    errorLog(messages.serverNotVerified);
    return;
  }
  const formToUse = asperaHttpGateway.globals.createOrUseForm(id);
  const inputFile: any = addFilePickerToForm(formToUse);
  inputFile.onchange = () => {
    const files: FileSelected[] = [];
    if (!inputFile.files) {
      callback({dataTransfer: {files}});
      return;
    }
    for (let i = 0; i < inputFile.files.length; i++) {
      files.push(new FileSelected(inputFile.files[i]));
    }
    callback({dataTransfer: {files}});
  };
  inputFile.click();
};

/**
 * Request file picker for choosing files and use promise.
 * Uses `getFilesForUpload` logic wrapped in a Promise
 *
 * @param id the ID of the form to use (must be unique to each transfer grouping)
 *
 * @returns promise that resolves with the files (error state is never used)
 */
export const getFilesForUploadPromise = (id: string): Promise<DataTransferResponse> => {
  const promiseToUse = generatePromiseObjects();
  const promiseCallback = (data: DataTransferResponse) => {
    promiseToUse.resolver(data);
  };
  getFilesForUpload(promiseCallback, id);
  return promiseToUse.promise;
};

/**
 * Request folder picker for choosing folders
 * @remarks Feature not supported. Will be introduced in future release.
 *
 * @param id the ID of the form to use (must be unique to each transfer grouping)
 * @param callback the function to call once the folders are added
 */
export const getFoldersForUpload = (callback: (data: DataTransferResponse) => void, id: string): void => {
  if (!asperaHttpGateway.isReady) {
    errorLog(messages.serverNotVerified);
    return;
  }
  const formToUse = asperaHttpGateway.globals.createOrUseForm(id);
  const inputFile: any = addFolderPickerToForm(formToUse);
  inputFile.onchange = () => {
    const files: FileSelected[] = [];
    const folders: Map<string, FolderData> = new Map();
    if (!inputFile.files) {
      callback({dataTransfer: {files}});
      return;
    }
    for (let i = 0; i < inputFile.files.length; i++) {
      const file = inputFile.files[i];
      if (file.webkitRelativePath) {
        // TODO: Does Windows return using forward slash?
        const rootFolder = file.webkitRelativePath.split('/')[0];
        if (!folders.get(rootFolder)) {
          folders.set(rootFolder, {path: rootFolder, files: []});
        }
        folders.get(rootFolder).files.push(file);
      } else {
        files.push(new FileSelected(inputFile.files[i]));
      }
    }

    const formFolderData = asperaHttpGateway.globals.getOrCreateFolderDataList(id);

    iterableToArray(folders.values()).forEach((folder: FolderData) => {
      formFolderData.set(folder.path, folder);
      files.push(new FileSelected({name: folder.path, size: 0, type: 'inode/directory'}));
    });

    callback({dataTransfer: {files}});
  };
  inputFile.click();
};

/**
 * Request folder picker for choosing folders and use promise.
 * Uses `getFoldersForUpload` logic wrapped in a Promise
 * @remarks Feature not supported. Will be introduced in future release.
 *
 * @param id the ID of the form to use (must be unique to each transfer grouping)
 *
 * @returns promise that resolves with the folders/file list (error state is never used)
 */
export const getFoldersForUploadPromise = (id: string): Promise<DataTransferResponse> => {
  const promiseToUse = generatePromiseObjects();
  const promiseCallback = (data: DataTransferResponse) => {
    promiseToUse.resolver(data);
  };
  getFoldersForUpload(promiseCallback, id);
  return promiseToUse.promise;
};

/**
 * Start the Websockets and transfer
 *
 * @param id the ID to use for the transfer
 * @param transferSpec the transferSpec of the transfer
 * @param files the files to transfer
 * @param promiseInfo the promise data to resolve for the transfer if needed
 */
export const startWebSocketTransfer = (id: string, transferSpec: TransferSpec, files: File[], promiseInfo?: PromiseObject, options: UploadOptions = {}): void => {
  const queue: (() => void)[] = [];
  const fileReaderToUse = typeof FileReader === 'function' ? new FileReader() : null;
  const finalServerUrl = options.serverUrlOverride ? cleanupServerUrl(options.serverUrlOverride) : asperaHttpGateway.globals.serverUrl;

  const socket = new WebSocket(getWebsocketUrl(finalServerUrl, location.protocol));
  socket.onopen = (data) => {
    if (promiseInfo) {
      promiseInfo.resolver(data);
    }
    asperaHttpGateway.activityTracking.setTransfer(id, new HttpTransfer(id, transferSpec, files, undefined, {serverUrlOverride: options.serverUrlOverride}));
    startSendingData(socket, transferSpec, files, id, queue, fileReaderToUse);
  };

  socket.onclose = (data) => {
    const transfer = asperaHttpGateway.activityTracking.getTransferById(id);
    if (transfer && transfer.status !== 'completed') {
      updateTransferActivity(id, 'failed', undefined, undefined, data);
      errorLog(messages.websocketClosedUnexpect, {error: data});
    }
  };

  socket.onmessage = (data) => {
    if (data.data === 'end upload') {
      // TODO: check if fileReader is available due to dupe `end upload` events
      if (queue.length) {
        queue[0]();
      } else {
        setTimeout(() => {
          socket.close(1000);
        }, 5000);
        updateTransferActivity(id, 'completed');
      }
    }
  };

  socket.onerror = (error) => {
    errorLog(messages.websocketClosedUnexpect, error);
    updateTransferActivity(id, 'failed', undefined, undefined, error);
    if (promiseInfo) {
      promiseInfo.rejecter(error);
    }
  };
};

/**
 * Start a HTTP Gateway upload.
 *
 * @param transferSpec standard Connect transferSpec for uploading
 * @param id the ID of the form group to use for files
 * @param memoryFilesToLoad array of files from memory to use.  These will be used all the time and if transferSpec does not contain them an error will raise.
 * @param options options for customizing the upload
 *
 * @returns a promise that resolves if upload is successful and rejects if upload cannot be started
 */
export const upload = (transferSpec: TransferSpec, id: string, memoryFilesToLoad?: File[], options: UploadOptions = {}): Promise<any> => {
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

  const files = getFilesForTransfer(id, transferSpec);

  if (memoryFilesToLoad) {
    memoryFilesToLoad.forEach(file => {
      files.push(file);
    });
  }

  const folderExplodeData = folderTransferSpecExplode(id, transferSpec);

  if (folderExplodeData.files.length) {
    folderExplodeData.files.forEach(file => {
      files.push(file);
    });
    transferSpec.paths = folderExplodeData.newPath;
  }

  if (!files.length) {
    errorLog(messages.unableToGetFilesForUpload);
    return new Promise((resolve, reject) => {
      reject(generateErrorBody(messages.unableToGetFilesForUpload, {transferSpec, files}));
    });
  } else if (files.length !== transferSpec.paths.length) {
    errorLog(messages.unauthorizedFilesForUpload);
    return new Promise((resolve, reject) => {
      reject(generateErrorBody(messages.unauthorizedFilesForUpload, {transferSpec, files}));
    });
  }

  const promiseInfo = generatePromiseObjects();
  id = `${id}${keySplit}${(Math.random() * 10000000).toFixed()}`;

  const currentRunningTransfers = asperaHttpGateway.activityTracking.getActiveTransfers();

  if (currentRunningTransfers.length >= asperaHttpGateway.globals.concurrentUploads) {
    asperaHttpGateway.activityTracking.queuedUploads.push({id, transferSpec, files});
    asperaHttpGateway.activityTracking.setTransfer(id, new HttpTransfer(id, transferSpec, files, 'queued', {serverUrlOverride: options.serverUrlOverride}));
    setTimeout(() => {
      promiseInfo.resolver({});
    }, 100);
  } else {
    startWebSocketTransfer(id, transferSpec, files, promiseInfo, options);
  }

  return promiseInfo.promise;
};

/**
 * Create a dropzone linked to a form grouping.
 * All drops are stored in same place to allow body drops.
 *
 * @param callback the function to call once the files are dropped
 * @param elementSelector the selector of the element on the page that should watch for drop events
 */
export const createDropzone = (
  callback: (data: {event: any; files: {dataTransfer: {files: ConnectStyleFile[]}}}) => void,
  elementSelector: string,
): void => {
  const elements = document.querySelectorAll(elementSelector);
  if (!elements || !elements.length) {
    errorLog(messages.unableToFindElementOnPage);
    return;
  }
  asperaHttpGateway.globals.createOrUseForm(dropContainerName);
  const currentFiles = asperaHttpGateway.globals.getOrCreateFormFileListFromDrop(dropContainerName);
  const formFolderData = asperaHttpGateway.globals.getOrCreateFolderDataList(dropContainerName);

  const dragEvent = (event: any) => {
    event.preventDefault();
  };

  const dropEvent = (event: any) => {
    event.preventDefault();
    const files: ConnectStyleFile[] = [];
    if (event.dataTransfer && event.dataTransfer.items && event.dataTransfer.items.length && event.dataTransfer.items[0] && event.dataTransfer.items[0].kind !== 'string') {
      try {
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
          const fileEntry = event.dataTransfer.items[i].webkitGetAsEntry();
          if (fileEntry.isFile) {
            const file: File = event.dataTransfer.items[i].getAsFile();
            currentFiles.push(file);
            files.push({
              lastModified: file.lastModified,
              name: file.name,
              size: file.size,
              type: file.type
            });
          } else if (fileEntry.isDirectory) {
            const folder: FolderData = {
              path: fileEntry.name,
              files: [],
            };
            files.push({
              lastModified: 0,
              name: fileEntry.name,
              size: 0,
              type: 'inode/directory'
            });

            const recursiveReader = (entry: any) => {
              const reader = entry.createReader();
              reader.readEntries((entries: any[]) => {
                entries.forEach(entryItem => {
                  if (entryItem.isFile) {
                    entryItem.file((file: File) => {
                      (file as any).asperaDropPath = entryItem.fullPath;
                      folder.files.push(file);
                    });
                  } else if (entryItem.isDirectory) {
                    recursiveReader(entryItem);
                  }
                });
                formFolderData.set(folder.path, folder);
              });
            };

            recursiveReader(fileEntry);
          }
        }
      } catch (error) {
        errorLog(messages.unableToReadFolder, {event, error});
        alert(messages.unableToReadFolder);
      }
    } else if (event.dataTransfer.files) {
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        currentFiles.push(event.dataTransfer.files[i]);
        files.push(event.dataTransfer.files[i]);
      }
    }
    callback({event, files: {dataTransfer: {files}}});
  };

  elements.forEach(element => {
    element.addEventListener('dragover', dragEvent);
    element.addEventListener('drop', dropEvent);
    asperaHttpGateway.globals.dropzonesCreated.set(elementSelector, [{event: 'dragover', callback: dragEvent}, {event: 'drop', callback: dropEvent}]);
  });
};

/**
 * Remove dropzone added by gateway.
 *
 * @param elementSelector the selector of the element on the page that should remove
 */
export const removeDropzone = (elementSelector: string): void => {
  const foundDropzone = asperaHttpGateway.globals.dropzonesCreated.get(elementSelector);

  if (foundDropzone) {
    foundDropzone.forEach(data => {
      const elements = document.querySelectorAll(elementSelector);

      if (elements && elements.length) {
        elements.forEach(element => {
          element.removeEventListener(data.event, data.callback);
        });
      }
    });
  }
};

export default {
  upload,
  updateTransferActivity,
  startSendingData,
  addFilePickerToForm,
  createDropzone,
  removeDropzone,
  getFilesForUploadPromise,
  getFilesForUpload,
  getFoldersForUploadPromise,
  getFoldersForUpload,
};
