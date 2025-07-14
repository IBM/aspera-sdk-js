/**
 * This JS file is used for code snippet examples.
 * TypeScript file declrarations of toString
 * do not maintain comments or newlines.
 */

window.selectedFiles = [];

function initializeAspera(supportMulti, httpGatewayUrl, forceHttpGateway) {
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

  /**
   * HTTP Gateway URL can be set to support fallback to a gateway.
   * You can also force it to not start the desktop app.
   */
  asperaSdk.init({appId, supportMultipleUsers, httpGatewayUrl, forceHttpGateway}).then(() => {
    // The SDK started. Transfers and file picker can now be used.
    alert('SDK started');
  }).catch(error => {
    // The SDK could not start. The app may not be running.
    console.error('SDK could not start', error);
    alert(`Init failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function testAspera() {
  asperaSdk.testConnection().then(response => {
    // The test was successful. The app is running
    alert(`Test successful\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    // The test failed. The app is not running or cannot be reached.
    console.error('Test failed', error);
    alert(`Test failed\n\n${JSON.stringify(error, undefined, 2)}`);
  })
}

function selectItemsAspera(selectFolders) {
  /**
   * showSelectFolderDialog will only allow picking folders.
   * showSelectFileDialog will only allow picking files.
   * They both return the same response type. So swapping
   * out the function is safe.
   */
  (selectFolders ? asperaSdk.showSelectFolderDialog() : asperaSdk.showSelectFileDialog()).then(response => {
    /**
     * File list for transferSpec is returned in `response.dataTransfer.files` array
     * where name is the path to the selected item.
     */
    alert(`Selected items:\n\n${JSON.stringify(response, undefined, 2)}`);
    response.dataTransfer.files.forEach(item => window.selectedFiles.push(item));
  }).catch(error => {
    // If code -32002 then user canceled selecting. Otherwise another failure.
    if (error.debugData?.code === -32002) {
      alert('User canceled selecting items');
    } else {
      console.error('Selecting items failed', error);
      alert(`Selecting items failed\n\n${JSON.stringify(error, undefined, 2)}`);
    }
  });
}

function startTransferAspera(transferSpec) {
  /** The AsperaSpec defines rules on how the client app should work with transfers */
  const asperaSpec = {use_absolute_destination_path: false};

  asperaSdk.startTransfer(transferSpec, asperaSpec).then(response => {
    // Transfer accepted and is starting
    alert(`Transfer started:\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    // Transfer not accepted by the Aspera app
    console.error('Start transfer failed', error);
    alert(`Start transfer failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function setupDropAspera(dropZone) {
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
    response.files.dataTransfer.files.forEach(item => window.selectedFiles.push(item));
  };

  /**
   * While not needed normally. You can also remove the dropdzone.
   * This will remove the listener and no longer accept drops to that element.
   */
  const cancelDropzone = () => {
    asperaSdk.removeDropzone(dropZone);
  };

  asperaSdk.initDragDrop().then(() => {
    // Drag and drop can now be safely registered
    // Register the dropZone
    asperaSdk.createDropzone(dropCallback, dropZone);
  }).catch(error => {
    // Drag and drop init failed. This is rare.
    console.error('Drag and drop could not start', error);
    alert(`Drag and drop failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function monitorTransfersAspera() {
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
    });
  }

  // On load get all transfers. This needs to be done after init.
  asperaSdk.getAllTransfers().then(transfers => {
    parseTransfers(transfers);
  }).catch(error => {
    console.error('Could not get all transfers on load', error);
  });

  // Register event listener for new transfers
  asperaSdk.registerActivityCallback(response => {
    parseTransfers(response.transfers);
  });

  // Register event listener for transfers removed from app
  asperaSdk.registerRemovedCallback(transfer => {
    transferStore.delete(transfer.uuid);
  });

  // Used for demo. Normally use this store to render on the UI
  return transferStore;
}

function removeTransferAspera(transferId) {
  /** Remove a transfer from the monitor in app and from SDK responses */
  asperaSdk.removeTransfer(transferId).then(response => {
    // Transfer was removed. Remove it from local store
    alert('Transfer removed');
    console.info('Transfer removed', response);
  }).catch(error => {
    // Transfer could not be removed
    console.error('Transfer removal failed', error);
    alert(`Transfer removal failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function stopTransferAspera(transferId) {
  /** Stop an active transfer. You can resume this transfer later. */
  asperaSdk.stopTransfer(transferId).then(() => {
    // Transfer was stopped. Next update from activity should indicate this.
    alert('Transfer stopped');
    console.info('Transfer stopped', response);
  }).catch(error => {
    // Transfer could not be stopped
    console.error('Transfer stopping failed', error);
    alert(`Transfer stopping failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function resumeTransferAspera(transferId) {
  /** Resume a stopped transfer. */
  asperaSdk.resumeTransfer(transferId).then(response => {
    // Transfer was resumed. Next update from activity should indicate this.
    alert('Transfer resumed');
    console.info('Transfer resumed', response);
  }).catch(error => {
    // Transfer could not be resumed
    console.error('Transfer resuming failed', error);
    alert(`Transfer resuming failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function showDirectoryAspera(transferId) {
  /** Open the local directory of the downloaded item. */
  asperaSdk.showDirectory(transferId).then(response => {
    console.info('Show directory', response);
  }).catch(error => {
    // Transfer info could not be retrieved
    console.error('Show local directory failed', error);
    alert(`Show local directory failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function transferInfoAspera(transferId) {
  /** Get all details on a specific transfer. */
  asperaSdk.getTransfer(transferId).then(response => {
    alert('Transfer info retrieved. See console for object.');
    console.info('Get transfer', response);
  }).catch(error => {
    // Transfer info could not be retrieved
    console.error('Transfer info get failed', error);
    alert(`Transfer info get failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function getInfoAspera() {
  /** Get metadata about the IBM Aspera installation. */
  asperaSdk.getInfo().then(response => {
    alert(`Get info response\n\n${JSON.stringify(response, undefined, 2)}`);
    console.info('Get info response', response);
  }).catch(error => {
    console.error('Get info failed', error);
    alert(`Get info failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function showPreferencesAspera() {
  /** Open preference window for IBM Aspera. */
  asperaSdk.showPreferences().catch(error => {
    console.error('Show preferences failed', error);
    alert(`Show preferences failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

function registerStatusCallbackAspera() {
  /**
   * Register status callback. This will monitor if the app is closed or reopens.
   * This test currently just consoles all changes.
   */
  alert('Registered app status changes. Monitor the console for events.');

  asperaSdk.registerStatusCallback(status => {
    console.info('Status changed', status);
  });
}

function registerSafariExtensionStatusCallbackAspera() {
  /**
   * Register status callback for the Safari Extension.
   * This will monitor if the extension has changes.
   * `isSafari` is provided by the Aspera SDK.
   *
   * This test currently just consoles all changes.
   */

  if (asperaSdk.isSafari()) {
    alert('Registered safari extension changes. Monitor the console for events.');

    asperaSdk.registerSafariExtensionStatusCallback(status => {
      console.info('Status changed for Safari Extension', status);
    });
  } else {
    alert('Register safari extension not set since not in Safari');
  }
}

function installerAspera() {
  /**
   * Basic JavaScript to get the installers and
   * load it into the DOM.
   * After successful init you should usually remove this.
   */

  asperaSdk.getInstallerInfo().then(response => {
    const header = document.createElement('h4');
    header.innerText = 'IBM Aspera Installer';
    header.style = 'margin-bottom: 20px; color: #fff;';

    const launchButton = document.createElement('button');
    launchButton.innerText = 'Launch'
    launchButton.style = 'display: block; width: 100%; margin-bottom: 16px; padding: 8px';
    launchButton.type = 'button';
    launchButton.onclick = () => {
      // Provide a way to launch the SDK if already installed
      asperaSdk.launch();
    }

    const buttons = response.entries.map(entry => {
      // Loop over each entry and make a button to click it to open download
      // Normally just one item. But some may have more. So iterate the entries
      const button = document.createElement('button');
      button.type = 'button';
      button.style = 'display: block; width: 100%; margin-bottom: 16px; padding: 8px';
      button.innerText = `Install (${entry.platform} - ${entry.type})`;
      button.onclick = () => {
        window.open(entry.url, '_blank', 'noopener,noreferrer');
      };

      return button;
    });

    buttons.unshift(launchButton);

    // Create the wrapper element and add it to body as fixed element
    const wrapper = document.createElement('div');
    wrapper.id = 'aspera-installer-test';
    wrapper.style = 'position: fixed; bottom: 0px; right: 32px; height: 260px; width: 280px; background-color: #444; padding: 16px 20px;';
    wrapper.append(header, ...buttons);

    document.body.append(wrapper);
  }).catch(error => {
    console.error('Installer info get failed', error);
  });
}
