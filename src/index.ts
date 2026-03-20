import {AsperaSdk} from './models/aspera-sdk.model';
import {createDropzone, deregisterActivityCallback, deregisterStatusCallback, getAllTransfers, getCapabilities, getChecksum, getFilesList, getInfo, getTransfer, hasCapability, init, initDragDrop, modifyTransfer, readAsArrayBuffer, readChunkAsArrayBuffer, readDirectory, registerActivityCallback, registerStatusCallback, removeDropzone, removeTransfer, resumeTransfer, setBranding, showAbout, showDirectory, showPreferences, showSelectFileDialog, showSelectFolderDialog, showTransferManager, startTransfer, stopTransfer, testConnection,} from './app/core';
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
asperaSdk.showAbout = showAbout;
asperaSdk.showDirectory = showDirectory;
asperaSdk.stopTransfer = stopTransfer;
asperaSdk.resumeTransfer = resumeTransfer;
asperaSdk.getAllTransfers = getAllTransfers;
asperaSdk.getTransfer = getTransfer;
asperaSdk.getFilesList = getFilesList;
asperaSdk.showSelectFileDialog = showSelectFileDialog;
asperaSdk.showSelectFolderDialog = showSelectFolderDialog;
asperaSdk.showPreferences = showPreferences;
asperaSdk.showTransferManager = showTransferManager;
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
asperaSdk.getCapabilities = getCapabilities;
asperaSdk.hasCapability = hasCapability;
asperaSdk.getChecksum = getChecksum;
asperaSdk.readDirectory = readDirectory;
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
  showAbout,
  showDirectory,
  stopTransfer,
  resumeTransfer,
  getAllTransfers,
  getTransfer,
  getFilesList,
  showSelectFileDialog,
  showSelectFolderDialog,
  showPreferences,
  showTransferManager,
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
  getCapabilities,
  hasCapability,
  getChecksum,
  readDirectory,
};

export type {
  AsperaSdkSpec,
  AsperaSdkTransfer,
  BrowserStyleFile,
  ChecksumFileResponse,
  DirectoryEntry,
  DirectoryListFilters,
  CustomBrandingOptions,
  CustomTheme,
  CustomThemeItems,
  DataTransferResponse,
  DropzoneEventData,
  DropzoneEventType,
  EntryType,
  DropzoneOptions,
  FileDialogOptions,
  FileError,
  FileFilter,
  FileStat,
  FileStatus,
  FolderDialogOptions,
  GetChecksumOptions,
  InitOptions,
  InstallerInfo,
  InstallerInfoResponse,
  InstallerOptions,
  InstallerUrlInfo,
  ModifyTransferOptions,
  OverwritePolicy,
  PaginatedFilesResponse,
  Pagination,
  Path,
  ReadAsArrayBufferResponse,
  ReadChunkAsArrayBufferResponse,
  ReadDirectoryOptions,
  ReadDirectoryResponse,
  ResumePolicy,
  ResumeTransferOptions,
  SafariExtensionEvent,
  SdkCapabilities,
  TransferSpec,
  TransferStatus,
  WebsocketEvent,
} from './models/models';

export type {
  ActivityMessage,
  ActivityMessageTypes,
  AsperaSdkClientInfo,
  AsperaSdkInfo,
  TransferResponse,
} from './models/aspera-sdk.model';

export { AsperaSdk, AsperaSdkGlobals } from './models/aspera-sdk.model';

export type { HttpGatewayInfo } from './http-gateway/models';

export default asperaSdk;
