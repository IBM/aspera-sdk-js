import { HttpGateway } from './models/http-gateway-global.model';
import {
  initHttpGateway,
  testHttpGatewayConnection,
  registerActivityCallback,
  deregisterActivityCallback,
  getTransferById,
  getAllTransfers,
  clearNonActiveTransfers,
  cancelTransfer,
  removeTransfer
} from './app/core';
import { download } from './app/download';
import { upload, getFilesForUpload, getFilesForUploadPromise, getFoldersForUpload, getFoldersForUploadPromise, createDropzone, removeDropzone } from './app/upload';

export const asperaHttpGateway: HttpGateway = new HttpGateway();

asperaHttpGateway.initHttpGateway = initHttpGateway;
asperaHttpGateway.testHttpGatewayConnection = testHttpGatewayConnection;
asperaHttpGateway.download = download;
asperaHttpGateway.upload = upload;
asperaHttpGateway.getFilesForUpload = getFilesForUpload;
asperaHttpGateway.getFilesForUploadPromise = getFilesForUploadPromise;
asperaHttpGateway.getFoldersForUpload = getFoldersForUpload;
asperaHttpGateway.getFoldersForUploadPromise = getFoldersForUploadPromise;
asperaHttpGateway.createDropzone = createDropzone;
asperaHttpGateway.removeDropzone = removeDropzone;
asperaHttpGateway.registerActivityCallback = registerActivityCallback;
asperaHttpGateway.deregisterActivityCallback = deregisterActivityCallback;
asperaHttpGateway.getTransferById = getTransferById;
asperaHttpGateway.getAllTransfers = getAllTransfers;
asperaHttpGateway.clearNonActiveTransfers = clearNonActiveTransfers;
asperaHttpGateway.removeTransfer = removeTransfer;
asperaHttpGateway.cancelTransfer = cancelTransfer;

if (typeof (<any>window) === 'object') {
  (<any>window).onbeforeunload = asperaHttpGateway.checkForPageLeave;
  (<any>window).addEventListener('beforeunload', asperaHttpGateway.checkForPageLeave);
  (<any>window).asperaHttpGateway = asperaHttpGateway;
}

export {
  initHttpGateway,
  testHttpGatewayConnection,
  registerActivityCallback,
  deregisterActivityCallback,
  getTransferById,
  getAllTransfers,
  clearNonActiveTransfers,
  cancelTransfer,
  removeTransfer
} from './app/core';
export { download } from './app/download';
export { upload, getFilesForUpload, getFilesForUploadPromise, getFoldersForUpload, getFoldersForUploadPromise, createDropzone, removeDropzone } from './app/upload';

export default {
  asperaHttpGateway,
  initHttpGateway,
  testHttpGatewayConnection,
  download,
  upload,
  getFilesForUpload,
  getFilesForUploadPromise,
  getFoldersForUpload,
  getFoldersForUploadPromise,
  createDropzone,
  removeDropzone,
  registerActivityCallback,
  deregisterActivityCallback,
  getTransferById,
  getAllTransfers,
  clearNonActiveTransfers,
  removeTransfer,
  cancelTransfer,
};
