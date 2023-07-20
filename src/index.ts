import {Desktop} from './models/aspera-desktop.model';
import {
  initDesktop,
  registerActivityCallback,
  deregisterActivityCallback,
  startTransfer,
  testDesktopConnection,
  removeTransfer,
  showDirectory,
  stopTransfer,
  getTransfers,
  registerRemovedCallback,
  deregisterRemovedCallback,
  showSelectFileDialog,
  showSelectFolderDialog,
  showPreferences,
  modifyTransfer,
  createDropzone,
  removeDropzone,
} from './app/core';

export const asperaDesktop: Desktop = new Desktop();

asperaDesktop.initDesktop = initDesktop;
asperaDesktop.testDesktopConnection = testDesktopConnection;
asperaDesktop.startTransfer = startTransfer;
asperaDesktop.registerActivityCallback = registerActivityCallback;
asperaDesktop.deregisterActivityCallback = deregisterActivityCallback;
asperaDesktop.removeTransfer = removeTransfer;
asperaDesktop.showDirectory = showDirectory;
asperaDesktop.stopTransfer = stopTransfer;
asperaDesktop.getTransfers = getTransfers;
asperaDesktop.registerRemovedCallback = registerRemovedCallback;
asperaDesktop.deregisterRemovedCallback = deregisterRemovedCallback;
asperaDesktop.showSelectFileDialog = showSelectFileDialog;
asperaDesktop.showSelectFolderDialog = showSelectFolderDialog;
asperaDesktop.showPreferences = showPreferences;
asperaDesktop.modifyTransfer = modifyTransfer;
asperaDesktop.createDropzone = createDropzone;
asperaDesktop.removeDropzone = removeDropzone;

const launch = asperaDesktop.globals.launch;
asperaDesktop.launch = launch;

if (typeof (<any>window) === 'object') {
  (<any>window).asperaDesktop = asperaDesktop;
}

export {
  initDesktop,
  testDesktopConnection,
  startTransfer,
  launch,
  registerActivityCallback,
  deregisterActivityCallback,
  removeTransfer,
  showDirectory,
  stopTransfer,
  getTransfers,
  registerRemovedCallback,
  deregisterRemovedCallback,
  showSelectFileDialog,
  showSelectFolderDialog,
  showPreferences,
  modifyTransfer,
  createDropzone,
  removeDropzone,
};

export default {
  initDesktop,
  testDesktopConnection,
  startTransfer,
  launch,
  registerActivityCallback,
  deregisterActivityCallback,
  removeTransfer,
  showDirectory,
  stopTransfer,
  getTransfers,
  registerRemovedCallback,
  deregisterRemovedCallback,
  showSelectFileDialog,
  showSelectFolderDialog,
  showPreferences,
  modifyTransfer,
  createDropzone,
  removeDropzone,
};
