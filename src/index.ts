import {Browser} from './models/aspera-browser.model';
import {createDropzone, deregisterActivityCallback, deregisterRemovedCallback, deregisterSafariExtensionStatusCallback, deregisterStatusCallback, getAllTransfers, getInfo, getTransfer, init, initDragDrop, modifyTransfer, registerActivityCallback, registerRemovedCallback, registerSafariExtensionStatusCallback, registerStatusCallback, removeDropzone, removeTransfer, resumeTransfer, setBranding, showDirectory, showPreferences, showSelectFileDialog, showSelectFolderDialog, startTransfer, stopTransfer, testConnection,} from './app/core';
import {getInstallerInfo} from './app/installer';
import {isSafari} from './helpers/helpers';

export const asperaBrowser: Browser = new Browser();

asperaBrowser.init = init;
asperaBrowser.testConnection = testConnection;
asperaBrowser.startTransfer = startTransfer;
asperaBrowser.registerActivityCallback = registerActivityCallback;
asperaBrowser.deregisterActivityCallback = deregisterActivityCallback;
asperaBrowser.removeTransfer = removeTransfer;
asperaBrowser.showDirectory = showDirectory;
asperaBrowser.stopTransfer = stopTransfer;
asperaBrowser.resumeTransfer = resumeTransfer;
asperaBrowser.getAllTransfers = getAllTransfers;
asperaBrowser.getTransfer = getTransfer;
asperaBrowser.registerRemovedCallback = registerRemovedCallback;
asperaBrowser.deregisterRemovedCallback = deregisterRemovedCallback;
asperaBrowser.showSelectFileDialog = showSelectFileDialog;
asperaBrowser.showSelectFolderDialog = showSelectFolderDialog;
asperaBrowser.showPreferences = showPreferences;
asperaBrowser.modifyTransfer = modifyTransfer;
asperaBrowser.createDropzone = createDropzone;
asperaBrowser.removeDropzone = removeDropzone;
asperaBrowser.getInstallerInfo = getInstallerInfo;
asperaBrowser.registerStatusCallback = registerStatusCallback;
asperaBrowser.deregisterStatusCallback = deregisterStatusCallback;
asperaBrowser.registerSafariExtensionStatusCallback = registerSafariExtensionStatusCallback;
asperaBrowser.deregisterSafariExtensionStatusCallback = deregisterSafariExtensionStatusCallback;
asperaBrowser.initDragDrop = initDragDrop;
asperaBrowser.setBranding = setBranding;
asperaBrowser.getInfo = getInfo;
asperaBrowser.isSafari = isSafari;

const launch = asperaBrowser.globals.launch;
asperaBrowser.launch = launch;

if (typeof (<any>window) === 'object') {
  (<any>window).asperaBrowser = asperaBrowser;
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
  registerRemovedCallback,
  deregisterRemovedCallback,
  showSelectFileDialog,
  showSelectFolderDialog,
  showPreferences,
  modifyTransfer,
  createDropzone,
  removeDropzone,
  getInstallerInfo,
  registerStatusCallback,
  deregisterStatusCallback,
  registerSafariExtensionStatusCallback,
  deregisterSafariExtensionStatusCallback,
  setBranding,
  getInfo,
};

export default {
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
  registerRemovedCallback,
  deregisterRemovedCallback,
  showSelectFileDialog,
  showSelectFolderDialog,
  showPreferences,
  modifyTransfer,
  createDropzone,
  removeDropzone,
  getInstallerInfo,
  registerStatusCallback,
  deregisterStatusCallback,
  registerSafariExtensionStatusCallback,
  deregisterSafariExtensionStatusCallback,
  setBranding,
  getInfo,
};
