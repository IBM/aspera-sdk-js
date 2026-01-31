/**
 * Monitor and manage Aspera transfers.
 * This example demonstrates how to track transfer progress and manage transfer lifecycle.
 */

import { getAllTransfers, registerActivityCallback, removeTransfer, stopTransfer, resumeTransfer, showDirectory, getTransfer } from '@ibm-aspera/sdk';

export function monitorTransfersAspera() {
  /**
   * Setup all monitor callbacks and store transfers with latest
   * data in the transferStore to render on a UI.
   */

  // Create local store to hold all transfers
  /** @type {Map<string, any>} */
  const transferStore = new Map();

  /**
   * Create a function to parse transfers and place in map.
   * Monitor and get all return similar responses.
   * @param {any[]} transfers
   */
  const parseTransfers = (transfers: any[]) => {
    transfers.forEach(item => {
      transferStore.set(item.uuid, item);
    });
  }

  // On load get all transfers. This needs to be done after init.
  getAllTransfers().then(transfers => {
    parseTransfers(transfers);
  }).catch(error => {
    console.error('Could not get all transfers on load', error);
  });

  // Register event listener for new transfers
  registerActivityCallback(response => {
    parseTransfers(response.transfers);
  });

  // Used for demo. Normally use this store to render on the UI
  return transferStore;
}

export function removeTransferAspera(transferId: string) {
  /** Remove a transfer from the monitor in app and from SDK responses */
  removeTransfer(transferId).then(response => {
    // Transfer was removed. Remove it from local store
    alert('Transfer removed');
    console.info('Transfer removed', response);
  }).catch(error => {
    // Transfer could not be removed
    console.error('Transfer removal failed', error);
    alert(`Transfer removal failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function stopTransferAspera(transferId: string) {
  /** Stop an active transfer. You can resume this transfer later. */
  stopTransfer(transferId).then(() => {
    // Transfer was stopped. Next update from activity should indicate this.
    alert('Transfer stopped');
    console.info('Transfer stopped');
  }).catch(error => {
    // Transfer could not be stopped
    console.error('Transfer stopping failed', error);
    alert(`Transfer stopping failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function resumeTransferAspera(transferId: string) {
  /** Resume a stopped transfer. */
  resumeTransfer(transferId).then(response => {
    // Transfer was resumed. Next update from activity should indicate this.
    alert('Transfer resumed');
    console.info('Transfer resumed', response);
  }).catch(error => {
    // Transfer could not be resumed
    console.error('Transfer resuming failed', error);
    alert(`Transfer resuming failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function showDirectoryAspera(transferId: string) {
  /** Open the local directory of the downloaded item. */
  showDirectory(transferId).then(response => {
    console.info('Show directory', response);
  }).catch(error => {
    // Transfer info could not be retrieved
    console.error('Show local directory failed', error);
    alert(`Show local directory failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function transferInfoAspera(transferId: string) {
  /** Get all details on a specific transfer. */
  getTransfer(transferId).then(response => {
    alert('Transfer info retrieved. See console for object.');
    console.info('Get transfer', response);
  }).catch(error => {
    // Transfer info could not be retrieved
    console.error('Transfer info get failed', error);
    alert(`Transfer info get failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}
