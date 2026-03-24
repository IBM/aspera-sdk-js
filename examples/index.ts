/**
 * Main entry point for Aspera SDK examples.
 * This file imports all example functions and makes them available globally
 * for use in the example application.
 */

// Import all example functions
import { initializeAspera } from './initialize';
import { testAspera } from './test-connection';
import { selectItemsAspera, showSaveFileDialogAspera } from './select-items';
import { selectAndPreviewImageAspera } from './image-preview';
import { selectAndCalculateChecksumAspera } from './file-checksum';
import { startTransferAspera, authenticateAspera, testSshPortsAspera } from './start-transfer';
import { setupDropAspera } from './drag-drop';
import {
  monitorTransfersAspera,
  removeTransferAspera,
  stopTransferAspera,
  resumeTransferAspera,
  showDirectoryAspera,
  transferInfoAspera
} from './monitor-transfers';
import {
  getInfoAspera,
  registerStatusCallbackAspera
} from './other-functions';
import { installerAspera } from './installer';
import { showAboutAspera, showPreferencesAspera, showTransferManagerAspera, showTransferMonitorAspera, openPreferencesPageAspera } from './ui-functions';
import { readDirectoryAspera } from './read-directory';

// Extend window interface to include all example functions
declare global {
  interface Window {
    initializeAspera: typeof initializeAspera;
    testAspera: typeof testAspera;
    selectItemsAspera: typeof selectItemsAspera;
    showSaveFileDialogAspera: typeof showSaveFileDialogAspera;
    selectAndPreviewImageAspera: typeof selectAndPreviewImageAspera;
    selectAndCalculateChecksumAspera: typeof selectAndCalculateChecksumAspera;
    startTransferAspera: typeof startTransferAspera;
    authenticateAspera: typeof authenticateAspera;
    testSshPortsAspera: typeof testSshPortsAspera;
    setupDropAspera: typeof setupDropAspera;
    monitorTransfersAspera: typeof monitorTransfersAspera;
    removeTransferAspera: typeof removeTransferAspera;
    stopTransferAspera: typeof stopTransferAspera;
    resumeTransferAspera: typeof resumeTransferAspera;
    showDirectoryAspera: typeof showDirectoryAspera;
    transferInfoAspera: typeof transferInfoAspera;
    getInfoAspera: typeof getInfoAspera;
    showPreferencesAspera: typeof showPreferencesAspera;
    registerStatusCallbackAspera: typeof registerStatusCallbackAspera;
    installerAspera: typeof installerAspera;
    showAboutAspera: typeof showAboutAspera;
    showTransferManagerAspera: typeof showTransferManagerAspera;
    showTransferMonitorAspera: typeof showTransferMonitorAspera;
    openPreferencesPageAspera: typeof openPreferencesPageAspera;
    readDirectoryAspera: typeof readDirectoryAspera;
  }
}

// Make all functions available globally on the window object
window.initializeAspera = initializeAspera;
window.testAspera = testAspera;
window.selectItemsAspera = selectItemsAspera;
window.showSaveFileDialogAspera = showSaveFileDialogAspera;
window.selectAndPreviewImageAspera = selectAndPreviewImageAspera;
window.selectAndCalculateChecksumAspera = selectAndCalculateChecksumAspera;
window.startTransferAspera = startTransferAspera;
window.authenticateAspera = authenticateAspera;
window.testSshPortsAspera = testSshPortsAspera;
window.setupDropAspera = setupDropAspera;
window.monitorTransfersAspera = monitorTransfersAspera;
window.removeTransferAspera = removeTransferAspera;
window.stopTransferAspera = stopTransferAspera;
window.resumeTransferAspera = resumeTransferAspera;
window.showDirectoryAspera = showDirectoryAspera;
window.transferInfoAspera = transferInfoAspera;
window.getInfoAspera = getInfoAspera;
window.showPreferencesAspera = showPreferencesAspera;
window.registerStatusCallbackAspera = registerStatusCallbackAspera;
window.installerAspera = installerAspera;
window.showAboutAspera = showAboutAspera;
window.showTransferManagerAspera = showTransferManagerAspera;
window.showTransferMonitorAspera = showTransferMonitorAspera;
window.openPreferencesPageAspera = openPreferencesPageAspera;
window.readDirectoryAspera = readDirectoryAspera;

// Export all functions for direct imports if needed
export {
  initializeAspera,
  testAspera,
  selectItemsAspera,
  showSaveFileDialogAspera,
  selectAndPreviewImageAspera,
  selectAndCalculateChecksumAspera,
  startTransferAspera,
  authenticateAspera,
  testSshPortsAspera,
  setupDropAspera,
  monitorTransfersAspera,
  removeTransferAspera,
  stopTransferAspera,
  resumeTransferAspera,
  showDirectoryAspera,
  transferInfoAspera,
  getInfoAspera,
  showPreferencesAspera,
  registerStatusCallbackAspera,
  installerAspera,
  showAboutAspera,
  showTransferManagerAspera,
  showTransferMonitorAspera,
  openPreferencesPageAspera,
  readDirectoryAspera
};
