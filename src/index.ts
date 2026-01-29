import {AsperaSdk} from './models/aspera-sdk.model';
import {createDropzone, deregisterActivityCallback, deregisterStatusCallback, getAllTransfers, getInfo, getTransfer, init, initDragDrop, modifyTransfer, readAsArrayBuffer, readChunkAsArrayBuffer, registerActivityCallback, registerStatusCallback, removeDropzone, removeTransfer, resumeTransfer, setBranding, showDirectory, showPreferences, showSelectFileDialog, showSelectFolderDialog, startTransfer, stopTransfer, testConnection,} from './app/core';
import {getInstallerInfo} from './app/installer';
import {getInstallerUrls, isSafari} from './helpers/helpers';
import * as httpGatewayCalls from './http-gateway';

export const asperaSdk: AsperaSdk = new AsperaSdk();

asperaSdk.init = init;
asperaSdk.testConnection = testConnection;
asperaSdk.startTransfer = startTransfer;
asperaSdk.registerActivityCallback = registerActivityCallback;
asperaSdk.deregisterActivityCallback = deregisterActivityCallback;
asperaSdk.removeTransfer = removeTransfer;
asperaSdk.showDirectory = showDirectory;
asperaSdk.stopTransfer = stopTransfer;
asperaSdk.resumeTransfer = resumeTransfer;
asperaSdk.getAllTransfers = getAllTransfers;
asperaSdk.getTransfer = getTransfer;
asperaSdk.showSelectFileDialog = showSelectFileDialog;
asperaSdk.showSelectFolderDialog = showSelectFolderDialog;
asperaSdk.showPreferences = showPreferences;
asperaSdk.modifyTransfer = modifyTransfer;
asperaSdk.createDropzone = createDropzone;
asperaSdk.removeDropzone = removeDropzone;
asperaSdk.getInstallerInfo = getInstallerInfo;
asperaSdk.registerStatusCallback = registerStatusCallback;
asperaSdk.deregisterStatusCallback = deregisterStatusCallback;
asperaSdk.initDragDrop = initDragDrop;
asperaSdk.setBranding = setBranding;
asperaSdk.getInfo = getInfo;
asperaSdk.readAsArrayBuffer = readAsArrayBuffer;
asperaSdk.readChunkAsArrayBuffer = readChunkAsArrayBuffer;
asperaSdk.isSafari = isSafari;
asperaSdk.getInstallerUrls = getInstallerUrls;
asperaSdk.httpGatewayCalls = httpGatewayCalls;

const launch = asperaSdk.globals.launch;
asperaSdk.launch = launch;

if (typeof (<any>window) === 'object') {
  (<any>window).asperaSdk = asperaSdk;
}

export {
  isSafari,
  init,
  testConnection,
  startTransfer,
  launch,
  registerActivityCallback,
  deregisterActivityCallback,
  removeTransfer,
  showDirectory,
  stopTransfer,
  resumeTransfer,
  getAllTransfers,
  getTransfer,
  showSelectFileDialog,
  showSelectFolderDialog,
  showPreferences,
  modifyTransfer,
  createDropzone,
  removeDropzone,
  initDragDrop,
  getInstallerInfo,
  registerStatusCallback,
  deregisterStatusCallback,
  setBranding,
  getInfo,
  readAsArrayBuffer,
  readChunkAsArrayBuffer,
  getInstallerUrls,
};

export default asperaSdk;

export type {
  ReadAsArrayBufferRequest,
  ReadAsArrayBufferResponse,
  ReadChunkAsArrayBufferRequest,
  ReadChunkAsArrayBufferResponse,
} from './models/models';
