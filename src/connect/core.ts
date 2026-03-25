import {asperaSdk} from '../index';
import {Connect, ConnectInstaller} from '@ibm-aspera/connect-sdk-js';
import * as ConnectTypes from '@ibm-aspera/connect-sdk-js/dist/esm/core/types';
import {InitOptions} from '../models/models';

let transferMonitorActivated = false;
let installerFlowActivated = false;

/**
 * Connect Core Logic
 *
 * @remarks
 * Most logic is called directly by Desktop SDK functions
 * You may not need to import anything from this file.
 */

export const handleTransfers = (transfers: ConnectTypes.TransferInfo[]): void => {
  asperaSdk.activityTracking.handleTransferActivity({
    type: 'transferUpdated',
    data: {transfers},
  });
};

export const connectInstallationFlow = (): void => {
  if (installerFlowActivated) {
    return;
  }

  installerFlowActivated = true;

  const handleInstallerEvent = (eventType: ConnectTypes.EventString, eventStatus: ConnectTypes.ConnectStatusStrings) => {
    // Verify that the event matches
    if (asperaSdk.globals.connectAW4.Connect.EVENT.STATUS !== eventType) {
      return;
    }

    // Depending on status show the proper installer screen
    switch (eventStatus) {
    case asperaSdk.globals.connectAW4.Connect.STATUS.INITIALIZING:
      asperaSdk.globals.connectInstaller.showLaunching();
      break;
    case asperaSdk.globals.connectAW4.Connect.STATUS.EXTENSION_INSTALL:
      asperaSdk.globals.connectInstaller.showExtensionInstall();
      break;
    case asperaSdk.globals.connectAW4.Connect.STATUS.FAILED:
      asperaSdk.globals.connectInstaller.showDownload();
      break;
    case asperaSdk.globals.connectAW4.Connect.STATUS.OUTDATED:
      asperaSdk.globals.connectInstaller.showUpdate();
      break;
    case asperaSdk.globals.connectAW4.Connect.STATUS.RUNNING:
      asperaSdk.globals.connectInstaller.connected();
      break;
    }
  };

  asperaSdk.globals.connect.addEventListener(asperaSdk.globals.connectAW4.Connect.EVENT.STATUS, handleInstallerEvent);
};

export const initConnect = (connectSettings: InitOptions['connectSettings']): Promise<unknown> => {
  asperaSdk.globals.connect = new Connect({
    minVersion: connectSettings.minVersion || '3.10.1',
    dragDropEnabled: connectSettings.dragDropEnabled,
    connectMethod: connectSettings.method,
  });
  asperaSdk.globals.connectInstaller = new ConnectInstaller({
    sdkLocation: connectSettings.sdkLocation,
    correlationId: connectSettings.correlationId,
    style: 'carbon',
    version: connectSettings.version,
  });
  asperaSdk.globals.connectAW4 = {
    Connect,
    ConnectInstaller,
  };

  asperaSdk.globals.connect.addEventListener(Connect.EVENT.STATUS, (eventType, eventStatus: ConnectTypes.ConnectStatusStrings) => {
    if (eventType === Connect.EVENT.STATUS) {
      asperaSdk.globals.connectStatus = eventStatus;

      asperaSdk.activityTracking.sendManualEventCallback(eventStatus);

      if (eventStatus === 'RUNNING' && !transferMonitorActivated) {
        transferMonitorActivated = true;
        asperaSdk.globals.connect.addEventListener(Connect.EVENT.TRANSFER, (_event, data: ConnectTypes.AllTransfersInfo) => {
          handleTransfers(data.transfers);
        });
      }
    }
  });

  asperaSdk.globals.connect.initSession(asperaSdk.globals.appId);

  if (!connectSettings.hideIncludedInstaller) {
    connectInstallationFlow();
  }

  return Promise.resolve({connectMode: true});
};
