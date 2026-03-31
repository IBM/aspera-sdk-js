import {AsperaSdk} from './models/aspera-sdk.model';
import {authenticate, createDropzone, deregisterActivityCallback, deregisterStatusCallback, getAllTransfers, getCapabilities, getChecksum, getFilesList, getInfo, getStatus, getTransfer, hasCapability, init, initDragDrop, initSession, modifyTransfer, showPreferencesPage, readAsArrayBuffer, readChunkAsArrayBuffer, readDirectory, registerActivityCallback, registerStatusCallback, removeDropzone, removeTransfer, resumeTransfer, setBranding, showAbout, showDirectory, showPreferences, showSaveFileDialog, showSelectFileDialog, showSelectFolderDialog, showTransferManager, showTransferMonitor, startTransfer, stopTransfer, testConnection, testSshPorts,currentTransferClient} from './app/core';
import {getInstallerInfo} from './app/installer';
import {getInstallerUrls, isSafari} from './helpers/helpers';
import * as httpGatewayCalls from './http-gateway';

export const asperaSdk: AsperaSdk = new AsperaSdk();

asperaSdk.init = init;
asperaSdk.authenticate = authenticate;
asperaSdk.testSshPorts = testSshPorts;
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
asperaSdk.showSaveFileDialog = showSaveFileDialog;
asperaSdk.showPreferences = showPreferences;
asperaSdk.showTransferManager = showTransferManager;
asperaSdk.showTransferMonitor = showTransferMonitor;
asperaSdk.showPreferencesPage = showPreferencesPage;
asperaSdk.modifyTransfer = modifyTransfer;
asperaSdk.createDropzone = createDropzone;
asperaSdk.removeDropzone = removeDropzone;
asperaSdk.getInstallerInfo = getInstallerInfo;
asperaSdk.registerStatusCallback = registerStatusCallback;
asperaSdk.deregisterStatusCallback = deregisterStatusCallback;
asperaSdk.initSession = initSession;
asperaSdk.getStatus = getStatus;
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
asperaSdk.currentTransferClient = currentTransferClient;
asperaSdk.httpGatewayCalls = httpGatewayCalls;

const launch = asperaSdk.globals.launch;
asperaSdk.launch = launch;

if (typeof (<any>window) === 'object') {
  (<any>window).asperaSdk = asperaSdk;
}

export {
  isSafari,
  init,
  authenticate,
  testSshPorts,
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
  showSaveFileDialog,
  showPreferences,
  showTransferManager,
  showTransferMonitor,
  showPreferencesPage as openPreferencesPage,
  modifyTransfer,
  createDropzone,
  removeDropzone,
  initDragDrop,
  getInstallerInfo,
  registerStatusCallback,
  deregisterStatusCallback,
  initSession,
  getStatus,
  setBranding,
  getInfo,
  readAsArrayBuffer,
  readChunkAsArrayBuffer,
  getInstallerUrls,
  getCapabilities,
  hasCapability,
  getChecksum,
  readDirectory,
  currentTransferClient,
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
  SaveFileDialogOptions,
  GetChecksumOptions,
  InitOptions,
  InstallerInfo,
  InstallerInfoResponse,
  InstallerOptions,
  InstallerUrlInfo,
  ModifyTransferOptions,
  ShowPreferencesPageOptions as OpenPreferencesPageOptions,
  OverwritePolicy,
  PaginatedFilesResponse,
  Pagination,
  Path,
  PreferencesPage,
  ReadAsArrayBufferResponse,
  ReadChunkAsArrayBufferResponse,
  ReadDirectoryOptions,
  ReadDirectoryResponse,
  ResumePolicy,
  ResumeTransferOptions,
  SafariExtensionEvent,
  SdkCapabilities,
  TestSshPortsOptions,
  TransferSpec,
  TransferStatus,
  SdkStatus,
  TransferClient,
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
