import { init, testConnection, showSelectFolderDialog, showSelectFileDialog, startTransfer, initDragDrop, createDropzone, removeDropzone, getAllTransfers, registerActivityCallback, registerRemovedCallback, removeTransfer, stopTransfer, resumeTransfer, getTransfer, showDirectory, getInfo, showPreferences, registerStatusCallback, registerSafariExtensionStatusCallback, isSafari } from '@ibm-aspera/sdk';

/**
 * This JS file is used for code snippet examples.
 * TypeScript file declrarations of toString
 * do not maintain comments or newlines.
 */

export function initializeAspera(supportMulti) {
  /**
   * An ID for your application. For multi user applications
   * this can include the user ID or other identifier
   */
  const appId = 'my-application-unique-id';

  /**
   * Indicate if machine runs the app with multiple user's at once
   * like a virtual machine.
   */
  const supportMultipleUsers = !!supportMulti;

  init({appId, supportMultipleUsers}).then(() => {
    // The SDK started. Transfers and file picker can now be used.
    alert('SDK started');
  }).catch(error => {
    // The SDK could not start. The app may not be running.
    console.error('SDK could not start', error);
    alert(`Init failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function testAspera() {
  testConnection().then(response => {
    // The test was successful. The app is running
    alert(`Test successful\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    // The test failed. The app is not running or cannot be reached.
    console.log('Test failed', error);
    alert(`Test failed\n\n${JSON.stringify(error, undefined, 2)}`);
  })
}

export function selectItemsAspera(selectFolders) {
  /**
   * showSelectFolderDialog will only allow picking folders.
   * showSelectFileDialog will only allow picking files.
   * They both return the same response type. So swapping
   * out the function is safe.
   */
  (selectFolders ? showSelectFolderDialog() : showSelectFileDialog()).then(response => {
    /**
     * File list for transferSpec is returned in `response.dataTransfer.files` array
     * where name is the path to the selected item.
     */
    alert(`Selected items:\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    // If code -32002 then user canceled selecting. Otherwise another failure.
    if (error.debugData.code === -32002) {
      alert('User canceled selecting items');
    } else {
      console.log('Selecting items failed', error);
      alert(`Selecting items failed\n\n${JSON.stringify(error, undefined, 2)}`);
    }
  });
}

export function startTransferAspera(transferSpec) {
  /** The AsperaSpec defines rules on how the client app should work with transfers */
  const asperaSpec = {use_absolute_destination_path: false};

  startTransfer(transferSpec, asperaSpec).then(response => {
    // Transfer accepted and is starting
    alert(`Transfer started:\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    // Transfer not accepted by the Aspera app
    console.log('Start transfer failed', error);
    alert(`Start transfer failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function setupDropAspera(dropZone) {
  /**
   * dropZone is a CSS style selector for an element that should be
   * registered to watch for file drop events.
   *
   * You only need to init once and then can register each dropZone
   * inidividually. Depending on how many drop zones may need to loop
   * or split init and set dropzones.
   */

  // For safety you can prevent at highest level drop default actions
  // This is useful to avoid browser opening file if not dropped in the
  // Dropzone
  window.addEventListener('drop', event => {
    event.preventDefault();
  });
  window.addEventListener('dragover', event => {
    event.preventDefault();
  });

  /** The callback for when files are dropped */
  const dropCallback = response => {
    response.event.stopPropagation();
    /**
     * File list for transferSpec is returned in `response.files.dataTransfer.files` array
     * where name is the path to the selected item.
     */
    alert(`Dropped items:\n\n${JSON.stringify(response.files, undefined, 2)}`);
  };

  /**
   * While not needed normally. You can also remove the dropdzone.
   * This will remove the listener and no longer accept drops to that element.
   */
  const cancelDropzone = () => {
    removeDropzone(dropZone);
  };

  initDragDrop().then(() => {
    // Drag and drop can now be safely registered
    // Register the dropZone
    createDropzone(dropCallback, dropZone);
  }).catch(error => {
    // Drag and drop init failed. This is rare.
    console.log('Drag and drop could not start', error);
    alert(`Drag and drop failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function monitorTransfersAspera() {
  /**
   * Setup all monitor callbacks and store transfers with latest
   * data in the transferStore to render on a UI.
   */

  // Create local store to hold all transfers
  /** @type {Map<string, AsperaSdkTransfer>} */
  const transferStore = new Map();

  /**
   * Create a function to parse transfers and place in map.
   * Monitor and get all return similar responses.
   * @param {AsperaSdkTransfer[]} transfers
   */
  const parseTransfers = transfers => {
    transfers.forEach(item => {
      transferStore.set(item.uuid, item);
    })
  }

  // On load get all transfers. This needs to be done after init.
  getAllTransfers().then(transfers => {
    parseTransfers(transfers);
  }).catch(error => {
    console.log('Could not get all transfers on load', error);
  });

  // Register event listener for new transfers
  registerActivityCallback(response => {
    parseTransfers(response.transfers);
  });

  // Register event listener for transfers removed from app
  registerRemovedCallback(transfer => {
    transferStore.delete(transfer.uuid);
  });

  // Used for demo. Normally use this store to render on the UI
  return transferStore;
}

export function removeTransferAspera(transferId) {
  /** Remove a transfer from the monitor in app and from SDK responses */
  removeTransfer(transferId).then(response => {
    // Transfer was removed. Remove it from local store
      alert('Transfer removed');
      console.log('Transfer removed', response);
  }).catch(error => {
    // Transfer could not be removed
    console.log('Transfer removal failed', error);
    alert(`Transfer removal failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function stopTransferAspera(transferId) {
  /** Stop an active transfer. You can resume this transfer later. */
  stopTransfer(transferId).then(() => {
    // Transfer was stopped. Next update from activity should indicate this.
      alert('Transfer stopped');
      console.log('Transfer stopped', response);
  }).catch(error => {
    // Transfer could not be stopped
    console.log('Transfer stopping failed', error);
    alert(`Transfer stopping failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function resumeTransferAspera(transferId) {
  /** Resume a stopped transfer. */
  resumeTransfer(transferId).then(response => {
    // Transfer was resumed. Next update from activity should indicate this.
      alert('Transfer resumed');
      console.log('Transfer resumed', response);
  }).catch(error => {
    // Transfer could not be resumed
    console.log('Transfer resuming failed', error);
    alert(`Transfer resuming failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function showDirectoryAspera(transferId) {
  /** Open the local directory of the downloaded item. */
  showDirectory(transferId).then(response => {
    console.log('Show directory', response);
  }).catch(error => {
    // Transfer info could not be retrieved
    console.log('Show local directory failed', error);
    alert(`Show local directory failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function transferInfoAspera(transferId) {
  /** Get all details on a specific transfer. */
  getTransfer(transferId).then(response => {
    alert('Transfer info retrieved. See console for object.');
    console.log('Get transfer', response);
  }).catch(error => {
    // Transfer info could not be retrieved
    console.log('Transfer info get failed', error);
    alert(`Transfer info get failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function getInfoAspera() {
  /** Get metadata about the IBM Aspera installation. */
  getInfo().then(response => {
    alert(`Get info response\n\n${JSON.stringify(response, undefined, 2)}`);
    console.log('Get info response', response);
  }).catch(error => {
    console.log('Get info failed', error);
    alert(`Get info failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function showPreferencesAspera() {
  /** Open preference window for IBM Aspera. */
  showPreferences().catch(error => {
    console.log('Show preferences failed', error);
    alert(`Show preferences failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function registerStatusCallbackAspera() {
  /**
   * Register status callback. This will monitor if the app is closed or reopens.
   * This test currently just consoles all changes.
   */
  alert('Registered app status changes');

  registerStatusCallback(status => {
    console.log('Status changed', status);
  });
}

export function registerSafariExtensionStatusCallbackAspera() {
  /**
   * Register status callback for the Safari Extension.
   * This will monitor if the extension has changes.
   * `isSafari` is provided by the Aspera SDK.
   *
   * This test currently just consoles all changes.
   */

  if (isSafari()) {
    alert('Registered safari extension changes');

    registerSafariExtensionStatusCallback(status => {
      console.log('Status changed for Safari Extension', status);
    });
  } else {
    alert('Register safari extension not set since not in Safari');
  }
}
