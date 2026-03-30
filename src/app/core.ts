import {messages} from '../constants/messages';
import {client} from '../helpers/client/client';
import {errorLog, generateErrorBody, generatePromiseObjects, isSafari, isValidTransferSpec, randomUUID, throwError, withTimeout} from '../helpers/helpers';
import {httpDownload, httpUpload, setupHttpGateway} from '../http-gateway';
import {handleHttpGatewayDrop, httpGatewayReadAsArrayBuffer, httpGatewayReadChunkAsArrayBuffer, httpGatewaySelectFileFolderDialog, httpGetAllTransfers, httpGetTransfer, httpRemoveTransfer, httpStopTransfer, sendTransferUpdate} from '../http-gateway/core';
import {asperaSdk} from '../index';
import {AsperaSdkInfo, AsperaSdkClientInfo, TransferResponse} from '../models/aspera-sdk.model';
import {CustomBrandingOptions, DataTransferResponse, DropzoneEventData, DropzoneEventType, DropzoneOptions, AsperaSdkSpec, BrowserStyleFile, AsperaSdkTransfer, FileDialogOptions, FolderDialogOptions, SaveFileDialogOptions, InitOptions, ModifyTransferOptions, Pagination, PaginatedFilesResponse, ResumeTransferOptions, TransferSpec, ReadChunkAsArrayBufferResponse, ReadAsArrayBufferResponse, OpenRpcSpec, SdkCapabilities, SdkStatus, GetChecksumOptions, ChecksumFileResponse, ReadDirectoryOptions, ReadDirectoryResponse, ShowPreferencesPageOptions, PreferencesPage, TestSshPortsOptions} from '../models/models';
import {statusService} from './status';
import {initConnect} from '../connect/core';
import * as ConnectTypes from '@ibm-aspera/connect-sdk-js/dist/esm/core/types';

/**
 * Check if IBM Aspera for Desktop connection works. This function is called by init
 * when initializing the SDK. This function can be used at any point for checking.
 *
 * @returns a promise that resolves if server can connect or rejects if not
 */
export const testConnection = (): Promise<any> => {
  if (asperaSdk.isReady || asperaSdk.useConnect) {
    return Promise.resolve(asperaSdk.globals.sdkResponseData);
  }

  return client.request('get_info')
    .then((data: AsperaSdkClientInfo) => {
      asperaSdk.globals.asperaSdkInfo = data;
      asperaSdk.globals.asperaAppVerified = true;
      return asperaSdk.globals.sdkResponseData;
    });
};

/**
 * RPC discovery used internally during IBM Aspera for desktop initialization to determine
 * the supported RPC methods of the user's version of IBM Aspera for desktop.
 *
 * For convenience, this function will return an empty [] if the SDK is currently configured to use
 * either HTTP Gateway or Connect transfer clients.
 *
 * @returns a promise that resolves if discovery is successful
 */
const rpcDiscover = (): Promise<any> => {
  if (asperaSdk.useHttpGateway || asperaSdk.useConnect) {
    return Promise.resolve({methods: []});
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  return client.request('rpc.discover')
    .then((data: OpenRpcSpec) => {
      asperaSdk.globals.rpcMethods = data.methods.map(m => m.name);
      return data;
    })
    .catch(error => {
      errorLog(messages.rpcDiscoverFailed, error);
      return Promise.reject(generateErrorBody(messages.rpcDiscoverFailed, error));
    });
};

/**
 * Initialize drag and drop. HTTP Gateway and Connect does not need to init.
 * Ignore if only HTTP Gateway
 * @param initCall - Indicate if called via init flow and should not reject
 *
 * @returns a promise that resolves if the initialization was successful or not
 */
export const initDragDrop = (initCall?: boolean): Promise<boolean> => {
  if (asperaSdk.useHttpGateway || asperaSdk.useConnect) {
    return Promise.resolve(true);
  } else if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  client.request('init_drag_drop')
    .then((data: boolean) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.dragDropInitFailed, error);

      if (initCall) {
        promiseInfo.resolver(false);
        errorLog(messages.dragDropInitFailedInit, error);
      } else {
        promiseInfo.rejecter(generateErrorBody(messages.dragDropInitFailed, error));
      }
    });

  return promiseInfo.promise;
};

/**
 * Get the current SDK lifecycle status synchronously.
 *
 * @returns the current status, or undefined if no init has been called yet
 */
export const getStatus = (): SdkStatus | undefined => {
  return statusService.getStatus();
};

const setupAppId = (options?: {appId?: string; supportMultipleUsers?: boolean}): void => {
  asperaSdk.globals.appId = options?.appId ?? randomUUID();

  if (options?.supportMultipleUsers) {
    asperaSdk.globals.supportMultipleUsers = true;
    asperaSdk.globals.sessionId = randomUUID();
  }
};

const connectDesktop = (): Promise<void> => {
  return asperaSdk.activityTracking.setup()
    .then(() => testConnection())
    .then(() => rpcDiscover())
    .then(() => initDragDrop(true))
    .then((): void => undefined);
};

/**
 * Initialize the SDK and connect to a transfer client. Returns a promise that resolves
 * when the transfer client is ready, or rejects if it cannot be reached.
 *
 * By default, the SDK connects to IBM Aspera for desktop. Set `connectSettings.useConnect`
 * to use IBM Aspera Connect instead. If `httpGatewaySettings` is provided, the gateway is
 * set up first — when `forceGateway` is true it becomes the sole transport; when false it
 * is set up as a supplementary transport and the primary client (Desktop or Connect) is
 * still initialized afterward.
 *
 * Note that the promise behavior varies by transfer client. For Desktop, the promise
 * remains pending until the application is detected. For Connect, the promise resolves
 * immediately after initialization begins — use {@link registerStatusCallback} to track
 * when Connect is actually ready. For a non-blocking alternative that provides consistent
 * lifecycle status events across all transfer clients, see {@link initSession}.
 *
 * @param options - Initialization options. See {@link InitOptions}.
 *
 * @returns a promise that resolves with SDK metadata when the transfer client is ready
 *
 * @example
 * init({ appId: 'my-app' })
 *   .then(() => {
 *     // Transfer client is ready — enable UI
 *   })
 *   .catch(error => {
 *     // Could not connect — prompt user to install or launch
 *   });
 */
export const init = (options?: InitOptions): Promise<any> => {
  setupAppId(options);

  const handleErrors = (error: unknown) => {
    errorLog(messages.serverError, error);
    asperaSdk.globals.asperaAppVerified = false;
    throw generateErrorBody(messages.serverError, error);
  };

  const getDesktopStartCalls = (): Promise<unknown> => {
    if (options?.connectSettings?.fallback && !options?.connectSettings?.useConnect) {
      const timeout = options?.retryTimeout ?? 5000;
      return withTimeout(connectDesktop(), timeout)
        .then(() => asperaSdk.globals.sdkResponseData)
        .catch(() => initConnect(options.connectSettings));
    }

    return connectDesktop()
      .then(() => asperaSdk.globals.sdkResponseData)
      .catch(handleErrors);
  };

  const getTransferClientCalls = (): Promise<unknown> => {
    return options?.connectSettings?.useConnect ? initConnect(options.connectSettings) : getDesktopStartCalls();
  };

  if (options?.httpGatewaySettings?.url && !asperaSdk.globals.httpGatewayVerified) {
    return setupHttpGateway(options.httpGatewaySettings.url).then(() => {
      if (options?.httpGatewaySettings?.forceGateway) {
        return Promise.resolve(asperaSdk.globals.sdkResponseData);
      }

      return getTransferClientCalls();
    }).catch(error => {
      errorLog(messages.httpInitFail, error);

      if (options?.httpGatewaySettings?.forceGateway) {
        throw generateErrorBody(messages.httpInitFail, error);
      }

      return getTransferClientCalls();
    });
  }

  return getTransferClientCalls();
};

/**
 * Initialize the SDK and begin detecting a transfer client. This function returns
 * immediately — lifecycle status is communicated asynchronously via {@link registerStatusCallback}.
 *
 * The SDK supports three transfer clients. By default, IBM Aspera for desktop is used.
 * Set `connectSettings.useConnect` to use IBM Aspera Connect instead. Desktop and Connect
 * are mutually exclusive — one or the other is detected, not both.
 *
 * ## HTTP Gateway
 *
 * HTTP Gateway is a server-side component that enables browser-based transfers without
 * a desktop application. It can be used in two modes:
 *
 * - **Sole transport** (`forceGateway: true`): HTTP Gateway is the only transport.
 *   No Desktop or Connect detection occurs. Status transitions to `RUNNING` when the
 *   gateway responds successfully, or `FAILED` if it does not.
 *
 * - **Supplementary transport** (`forceGateway: false`): HTTP Gateway is set up first
 *   as an additional transport for browser-based uploads and downloads. The primary
 *   transfer client (Desktop or Connect) is then detected separately. If HTTP Gateway
 *   setup fails, the primary client is still detected. Features that require a desktop
 *   application (native file dialogs, drag and drop, etc.) are only available when the
 *   primary client is running.
 *
 * ## Status lifecycle
 *
 * Use {@link registerStatusCallback} to receive status updates. Use {@link getStatus} to
 * read the current status synchronously at any time.
 *
 * **Desktop path**: `INITIALIZING` → `RUNNING` (app detected), `DEGRADED` (timeout but
 * HTTP Gateway is available as a supplementary transport), or `FAILED` (timeout, no
 * fallback). Detection continues in the background after `DEGRADED` or `FAILED` — if the
 * user launches the app later, the status transitions to `RUNNING`.
 *
 * **Connect path**: `INITIALIZING` → `RUNNING`, `FAILED`, `OUTDATED`, or
 * `EXTENSION_INSTALL` depending on the state of the Connect browser extension
 * and application.
 *
 * **HTTP Gateway path** (`forceGateway: true`): `INITIALIZING` → `RUNNING` or `FAILED`.
 *
 * @param options - Initialization options. See {@link InitOptions}.
 *
 * @example
 * // Detect IBM Aspera for desktop (default)
 * initSession({ appId: 'my-app' });
 *
 * @example
 * // Detect IBM Aspera for desktop with status handling
 * registerStatusCallback(status => {
 *   if (status === 'RUNNING') {
 *     // Transfer client is ready — enable UI
 *   } else if (status === 'FAILED') {
 *     // Not detected — prompt user to install or launch
 *   }
 * });
 *
 * initSession({ appId: 'my-app' });
 *
 * @example
 * // Use IBM Aspera Connect
 * initSession({
 *   appId: 'my-app',
 *   connectSettings: {
 *     useConnect: true,
 *   },
 * });
 *
 * @example
 * // Use HTTP Gateway as the sole transport (no desktop app needed)
 * initSession({
 *   appId: 'my-app',
 *   httpGatewaySettings: {
 *     url: 'https://example.com/aspera/http-gwy',
 *     forceGateway: true,
 *   },
 * });
 *
 * @example
 * // HTTP Gateway as supplementary transport with Desktop as primary
 * initSession({
 *   appId: 'my-app',
 *   httpGatewaySettings: {
 *     url: 'https://example.com/aspera/http-gwy',
 *     forceGateway: false,
 *   },
 * });
 */
export const initSession = (options?: InitOptions): void => {
  setupAppId(options);

  const retryInterval = options?.retryInterval ?? 2000;
  const retryTimeout = options?.retryTimeout ?? 5000;

  const onFallback = options?.connectSettings?.fallback && !options?.connectSettings?.useConnect
    ? (): void => {
      initConnect(options.connectSettings);
    }
    : undefined;

  const startDesktopDetection = (): void => {
    statusService.startPolling(connectDesktop, retryInterval, retryTimeout, onFallback);
  };

  const startTransferClient = (): void => {
    if (options?.connectSettings?.useConnect) {
      initConnect(options.connectSettings);
    } else {
      startDesktopDetection();
    }
  };

  // HTTP Gateway path
  if (options?.httpGatewaySettings?.url && !asperaSdk.globals.httpGatewayVerified) {
    statusService.setStatus('INITIALIZING');

    setupHttpGateway(options.httpGatewaySettings.url).then(() => {
      if (options?.httpGatewaySettings?.forceGateway) {
        statusService.setStatus('RUNNING');
        return;
      }

      startTransferClient();
    }).catch(error => {
      errorLog(messages.httpInitFail, error);

      if (options?.httpGatewaySettings?.forceGateway) {
        statusService.setStatus('FAILED');
        return;
      }

      startTransferClient();
    });
    return;
  }

  startTransferClient();
};

/**
 * Tests SSH port connectivity to a transfer server.
 *
 * Supported for Connect and IBM Aspera for desktop. Not supported for HTTP Gateway.
 *
 * @param options options including the remote host, SSH port, and timeout.
 *
 * @returns a promise that resolves if the SSH port test is successful and rejects otherwise.
 */
export const testSshPorts = (options: TestSshPortsOptions): Promise<any> => {
  if (asperaSdk.useHttpGateway) {
    return throwError(messages.testSshPortsNotSupported);
  }

  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.testSshPorts(options);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    request: {
      remote_host: options.remote_host,
      ssh_port: options.ssh_port ?? 33001,
      timeout_sec: options.timeout_sec ?? 3,
    }
  };

  client.request('test_ssh_ports', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.testSshPortsFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.testSshPortsFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Authenticates a transfer specification against the remote server.
 *
 * Supported for Connect and IBM Aspera for desktop. Not supported for HTTP Gateway.
 *
 * @param transferSpec the transfer specification to authenticate.
 *
 * @returns a promise that resolves if authentication is successful and rejects otherwise.
 */
export const authenticate = (transferSpec: TransferSpec): Promise<any> => {
  if (asperaSdk.useHttpGateway) {
    return throwError(messages.authenticateNotSupported);
  }

  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.authenticate(transferSpec as unknown as ConnectTypes.TransferSpec);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  client.request('authenticate', {transfer_spec: transferSpec})
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.authenticateFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.authenticateFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Start a transfer
 *
 * @param transferSpec standard transferSpec for transfer
 * @param asperaSdkSpec IBM Aspera settings when starting a transfer.
 *
 * @returns a promise that resolves if transfer initiation is successful and rejects if transfer cannot be started
 */
export const startTransfer = (transferSpec: TransferSpec, asperaSdkSpec?: AsperaSdkSpec): Promise<AsperaSdkTransfer> => {
  if (!isValidTransferSpec(transferSpec)) {
    return throwError(messages.notValidTransferSpec, {transferSpec});
  }

  if (asperaSdk.useHttpGateway) {
    return transferSpec.direction === 'receive' ? httpDownload(transferSpec, asperaSdkSpec) : httpUpload(transferSpec, asperaSdkSpec);
  } else if (asperaSdk.useConnect) {
    /**
     * There is a bug in the Connect transfer client where Connect's HTTP server will no longer return ANY responses if a dialog was opened
     * when starting the transfer (ex: request or file overwrite confirmation).
     */
    if (asperaSdkSpec?.allow_dialogs !== false) {
      console.warn(
        '[Aspera SDK] `allow_dialogs` was not set to `false` in AsperaSdkSpec and has been overridden. ' +
    'Connect dialogs block all subsequent HTTP responses. ' +
    'Set `allow_dialogs: false` explicitly to suppress this warning. ' +
    'More info: https://github.com/IBM/aspera-sdk-js/issues/196'
      );
      asperaSdkSpec.allow_dialogs = false;
    }

    return asperaSdk.globals.connect.startTransferPromise(transferSpec as unknown as ConnectTypes.TransferSpec, asperaSdkSpec).then(response => {
      (response.transfer_specs[0] as any).transfer_client = 'connect';
      return response.transfer_specs[0] as unknown as AsperaSdkTransfer;
    });
  } else if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_spec: transferSpec,
    desktop_spec: asperaSdkSpec || {},
    app_id: asperaSdk.globals.appId,
  };

  client.request('start_transfer', payload)
    .then((data: any) => {
      data.transfer_client = 'desktop';
      promiseInfo.resolver(data);
    })
    .catch(error => {
      errorLog(messages.transferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.transferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Register a callback event for getting transfer updates
 *
 * @param callback callback function to receive transfers
 *
 * @returns ID representing the callback for deregistration purposes
 */
export const registerActivityCallback = (callback: (transfers: TransferResponse) => void): string => {
  return asperaSdk.activityTracking.setCallback(callback);
};

/**
 * Remove a callback from the transfer callback
 *
 * @param id the ID returned by `registerActivityCallback`
 */
export const deregisterActivityCallback = (id: string): void => {
  asperaSdk.activityTracking.removeCallback(id);
};

/**
 * Register a callback for SDK lifecycle status changes. The callback fires immediately
 * with the current status (if one exists) and again whenever the status changes.
 *
 * Status values:
 *
 * - `INITIALIZING` — The SDK is detecting a transfer client.
 * - `RUNNING` — A transfer client is ready. Full functionality is available.
 * - `DEGRADED` — The primary transfer client (IBM Aspera for desktop) was not detected, but HTTP
 *   Gateway is available as a fallback. This is only available if XXX...
 * - `FAILED` — No transfer client could be reached. This could be because the user does
 *    not have a transfer client installed, it is not running, or in the case of HTTP Gateway,
 *    it was not reachable.
 * - `DISCONNECTED` — The transfer client was previously running but lost connection. This is specific
 *    to IBM Aspera for desktop. For example, if the user quits the app this status will trigger.
 * - `OUTDATED` — (Connect only) The Connect installation needs updating.
 * - `EXTENSION_INSTALL` — (Connect only) The browser extension needs to be installed.
 *
 * For IBM Aspera for desktop, detection continues in the background after `FAILED` or `DEGRADED`.
 * If the user launches the application later, the status transitions to `RUNNING`.
 *
 * @param callback callback function to receive status events
 *
 * @returns ID representing the callback for deregistration purposes
 *
 * @example
 * const id = registerStatusCallback(status => {
 *   if (status === 'RUNNING') {
 *     // Full functionality — enable all UI
 *   } else if (status === 'DEGRADED') {
 *     // Transfers work via HTTP Gateway
 *   } else if (status === 'FAILED') {
 *     // Nothing available — prompt user to install
 *   }
 * });
 *
 * // Later, to stop listening:
 * deregisterStatusCallback(id);
 */
export const registerStatusCallback = (callback: (status: SdkStatus) => void): string => {
  return statusService.registerCallback(callback);
};

/**
 * Remove a callback from getting connection status events.
 *
 * @param id the ID returned by `registerStatusCallback`
 */
export const deregisterStatusCallback = (id: string): void => {
  statusService.deregisterCallback(id);
};

/**
 * Remove a transfer. This will stop the transfer if it is in progress.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves if transfer is removed and rejects if transfer cannot be removed
 */
export const removeTransfer = (id: string): Promise<any> => {
  if (asperaSdk.useHttpGateway) {
    return httpRemoveTransfer(id);
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.removeTransfer(id);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
  };

  client.request('remove_transfer', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.removeTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.removeTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Stop a transfer.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves if transfer is stopped and rejects if transfer cannot be stopped
 */
export const stopTransfer = (id: string): Promise<any> => {
  if (asperaSdk.useHttpGateway) {
    return httpStopTransfer(id);
  }

  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.stopTransfer(id);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
  };

  client.request('stop_transfer', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.stopTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.stopTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Resume a paused or failed transfer.
 *
 * @param id transfer uuid
 * @param options resume transfer options
 *
 * @returns a promise that resolves with the new transfer object if transfer is resumed
 */
export const resumeTransfer = (id: string, options?: ResumeTransferOptions): Promise<AsperaSdkTransfer> => {
  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.resumeTransfer(id, options).then(response => {
      (response.transfer_spec as any).transfer_client = 'connect';
      return response.transfer_spec as unknown as AsperaSdkTransfer;
    });
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
    transfer_spec: options,
  };

  client.request('resume_transfer', payload)
    .then((data: AsperaSdkTransfer) => {
      data.transfer_client = 'desktop';
      promiseInfo.resolver(data);
    })
    .catch(error => {
      errorLog(messages.resumeTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.resumeTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Displays a file browser dialog for the user to select files.
 *
 * @param options file dialog options
 *
 * @returns a promise that resolves with the selected file(s) and rejects if user cancels dialog
 */
export const showSelectFileDialog = (options?: FileDialogOptions): Promise<DataTransferResponse> => {
  if (asperaSdk.useHttpGateway) {
    return httpGatewaySelectFileFolderDialog(options, false);
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showSelectFileDialogPromise(options).then(response => {
      return response as unknown as DataTransferResponse;
    });
  } else if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    options: options || {},
    app_id: asperaSdk.globals.appId,
  };

  client.request('show_file_dialog', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showSelectFileDialogFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showSelectFileDialogFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Displays a folder browser dialog for the user to select folders.
 *
 * @param options folder dialog options
 *
 * @returns a promise that resolves with the selected folder(s) and rejects if user cancels dialog
 */
export const showSelectFolderDialog = (options?: FolderDialogOptions): Promise<DataTransferResponse> => {
  if (asperaSdk.useHttpGateway) {
    return httpGatewaySelectFileFolderDialog(options, true);
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showSelectFolderDialogPromise(options).then(response => {
      return response as unknown as DataTransferResponse;
    });
  } else if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    options: options || {},
    app_id: asperaSdk.globals.appId,
  };

  client.request('show_folder_dialog', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showSelectFolderDialogFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showSelectFolderDialogFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Displays a save file dialog for the user to choose a save location and filename.
 *
 * Supported for Connect and IBM Aspera for desktop. Not supported for HTTP Gateway.
 *
 * @param options save file dialog options
 *
 * @returns a promise that resolves with the selected save path and rejects if user cancels dialog
 */
export const showSaveFileDialog = (options?: SaveFileDialogOptions): Promise<DataTransferResponse> => {
  if (asperaSdk.useHttpGateway) {
    return throwError(messages.showSaveFileDialogNotSupported);
  }

  if (asperaSdk.useConnect) {
    const connectPromiseInfo = generatePromiseObjects();
    asperaSdk.globals.connect.showSaveFileDialog({
      success: (data: any) => connectPromiseInfo.resolver(data as unknown as DataTransferResponse),
      error: (error: any) => connectPromiseInfo.rejecter(error),
    }, options);
    return connectPromiseInfo.promise;
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    options: options || {},
    app_id: asperaSdk.globals.appId,
  };

  client.request('show_save_file_dialog', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showSaveFileDialogFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showSaveFileDialogFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Shows the about page of the transfer client.
 *
 * This is supported when using Connect or IBM Aspera for desktop, but not HTTP Gateway.
 *
 * @returns a promise that resolves when the about page is shown.
 */
export const showAbout = (): Promise<any> => {
  if (asperaSdk.useHttpGateway) {
    return throwError(messages.showAboutNotSupported);
  }

  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showAbout();
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  client.request('show_about')
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showAboutFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showAboutFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Opens the IBM Aspera preferences page.
 *
 * @returns a promise that resolves when the preferences page is opened.
 */
export const showPreferences = (): Promise<any> => {
  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showPreferences();
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  client.request('open_preferences')
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showPreferencesFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showPreferencesFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Opens the transfer manager UI of the native transfer client.
 *
 * Supported for Connect and IBM Aspera for desktop. Not supported for HTTP Gateway.
 *
 * @returns a promise that resolves when the transfer manager is opened.
 */
export const showTransferManager = (): Promise<any> => {
  if (asperaSdk.useHttpGateway) {
    return throwError(messages.showTransferManagerNotSupported);
  }

  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showTransferManager();
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  client.request('show_transfer_manager')
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showTransferManagerFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showTransferManagerFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Maps consumer-facing preference page names to the page names supported by
 * the IBM Aspera for desktop RPC server.
 */
const mapPreferencesPageForDesktop = (page: PreferencesPage): string => {
  switch (page) {
  case 'network': return 'proxies';
  case 'bandwidth': return 'transfers';
  default: return page;
  }
};

/**
 * Opens the preferences page of the transfer client to a specific tab.
 *
 * Supported for Connect and IBM Aspera for desktop. Not supported for HTTP Gateway.
 *
 * @param options options including the page (tab) to open
 *
 * @returns a promise that resolves when the preferences page is opened.
 */
export const showPreferencesPage = (options: ShowPreferencesPageOptions): Promise<any> => {
  if (asperaSdk.useHttpGateway) {
    return throwError(messages.openPreferencesPageNotSupported);
  }

  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showPreferencesPage(options);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    tab: mapPreferencesPageForDesktop(options.page),
  };

  client.request('open_preferences', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.openPreferencesPageFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.openPreferencesPageFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Opens the transfer rate monitor graph for a specific transfer.
 *
 * Supported for Connect and IBM Aspera for desktop. Not supported for HTTP Gateway.
 *
 * @param transferId the unique identifier of the transfer to monitor.
 *
 * @returns a promise that resolves when the transfer monitor is opened.
 */
export const showTransferMonitor = (transferId: string): Promise<any> => {
  if (asperaSdk.useHttpGateway) {
    return throwError(messages.showTransferMonitorNotSupported);
  }

  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showTransferMonitor(transferId);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  client.request('show_transfer_monitor', {transfer_id: transferId})
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showTransferMonitorFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showTransferMonitorFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Get all transfers associated with the current application.
 *
 * @returns a promise that resolves with an array of transfers.
 */
export const getAllTransfers = (): Promise<AsperaSdkTransfer[]> => {
  const promiseInfo = generatePromiseObjects();

  if (asperaSdk.useHttpGateway) {
    return Promise.resolve(httpGetAllTransfers());
  } else if (asperaSdk.useConnect) {
    asperaSdk.globals.connect.getAllTransfers({
      success: data => {
        data.transfers.forEach(t => {
          (t as any).transfer_client = 'connect';
        });
        promiseInfo.resolver(data.transfers);
      }, error: error => {
        promiseInfo.rejecter(error);
      },
    });

    return promiseInfo.promise;
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const payload = {
    app_id: asperaSdk.globals.appId,
  };

  client.request('get_all_transfers', payload)
    .then((data: AsperaSdkTransfer[]) => {
      data.forEach(t => {
        t.transfer_client = 'desktop';
      });
      promiseInfo.resolver(data);
    })
    .catch(error => {
      errorLog(messages.getAllTransfersFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.getAllTransfersFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Get a specific transfer by ID.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves with the transfer.
 */
export const getTransfer = (id: string): Promise<AsperaSdkTransfer> => {
  if (asperaSdk.useHttpGateway) {
    const transfer = httpGetTransfer(id);

    if (transfer) {
      return Promise.resolve(transfer);
    } else {
      return Promise.reject(generateErrorBody(messages.getTransferFailed, {reason: 'Not found'}));
    }
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.getTransfer(id).then(response => {
      (response.transfer_info as any).transfer_client = 'connect';
      return response.transfer_info as unknown as AsperaSdkTransfer;
    });
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
  };

  client.request('get_transfer', payload)
    .then((data: AsperaSdkTransfer) => {
      data.transfer_client = 'desktop';
      promiseInfo.resolver(data);
    })
    .catch(error => {
      errorLog(messages.getTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.getTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Get paginated file-level progress for a specific transfer.
 *
 * @param id transfer uuid
 * @param pagination optional pagination options (limit and offset)
 *
 * @returns a promise that resolves with the paginated file progress list
 */
export const getFilesList = (id: string, pagination?: Pagination): Promise<PaginatedFilesResponse> => {
  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload: any = {
    transfer_id: id,
  };

  if (pagination) {
    payload.pagination = pagination;
  }

  client.request('get_files_list', payload)
    .then((data: PaginatedFilesResponse) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.getFilesListFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.getFilesListFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Opens and highlights the downloaded file in Finder or Windows Explorer. If multiple files,
 * then only the first file will be selected.
 *
 * @param id transfer uuid
 *
 * @returns a promise that resolves if the file can be shown and rejects if not
 */
export const showDirectory = (id: string): Promise<any> => {
  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.showDirectory(id);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
  };

  client.request('show_directory', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.showDirectoryFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.showDirectoryFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Modify the speed of a running transfer.
 *
 * @param id transfer uuid
 * @param options transfer rate options
 *
 * @returns a promise that resolves if the transfer rate can be modified and rejects if not
 */
export const modifyTransfer = (id: string, options: ModifyTransferOptions): Promise<AsperaSdkTransfer> => {
  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.modifyTransfer(id, options).then(response => {
      return response as unknown as AsperaSdkTransfer;
    });
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    transfer_id: id,
    transfer_spec: options,
  };

  client.request('modify_transfer', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.modifyTransferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.modifyTransferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Set the custom branding template to be used by IBM Aspera. If the app is already
 * configured to use a different branding, then the branding template you specify will be
 * stored by the app, allowing the end user to switch at any point.
 *
 * @param id custom branding template id. This should be consistent across page loads.
 * @param options custom branding options
 *
 * @returns a promise that resolves if the branding was properly set.
 */
export const setBranding = (id: string, options: CustomBrandingOptions): Promise<any> => {
  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const branding = {
    id,
    name: options.name,
    theme: options.theme,
  };

  const payload = {
    branding,
  };

  client.request('update_branding', payload)
    .then((data: any) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.setBrandingFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.setBrandingFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Create a dropzone for the given element selector.
 *
 * @param callback the function to call once the files are dropped
 * @param elementSelector the selector of the element on the page that should watch for drop events
 * @param options options to configure which drag and drop events trigger the listener
 */
export const createDropzone = (
  callback: (data: DropzoneEventData) => void,
  elementSelector: string,
  options?: DropzoneOptions,
): void => {
  const resolvedOptions: Required<DropzoneOptions> = {
    dragEnter: options?.dragEnter ?? false,
    dragOver: options?.dragOver ?? false,
    dragLeave: options?.dragLeave ?? false,
    drop: options?.drop ?? true,
    allowPropagation: options?.allowPropagation ?? true,
    allowDefaultBehavior: options?.allowDefaultBehavior ?? false,
  };

  if (asperaSdk.useConnect) {
    const connectOptions = {
      dragenter: resolvedOptions.dragEnter,
      dragover: resolvedOptions.dragOver,
      dragleave: resolvedOptions.dragLeave,
      drop: resolvedOptions.drop,
      allowPropagation: resolvedOptions.allowPropagation,
      disablePreventDefault: resolvedOptions.allowDefaultBehavior,
    } as unknown as ConnectTypes.DragDropOptions;

    asperaSdk.globals.connect.setDragDropTargets(elementSelector, connectOptions, result => {
      callback({
        event: result.event,
        files: result.files as unknown as DataTransferResponse,
      });
    });

    return;
  }

  const elements = document.querySelectorAll(elementSelector);
  if (!elements || !elements.length) {
    errorLog(messages.unableToFindElementOnPage);
    return;
  }

  const handleEventDefaults = (event: DragEvent) => {
    if (!resolvedOptions.allowDefaultBehavior) {
      event.preventDefault();
    }
    if (!resolvedOptions.allowPropagation) {
      event.stopPropagation();
    }
  };

  const handleRequiredEventDefaults = (event: DragEvent) => {
    event.preventDefault();
    if (!resolvedOptions.allowPropagation) {
      event.stopPropagation();
    }
  };

  const registeredListeners: {event: DropzoneEventType; callback: (event: DragEvent) => void}[] = [];

  if (resolvedOptions.dragEnter) {
    registeredListeners.push({
      event: 'dragenter',
      callback: (event: DragEvent) => {
        handleEventDefaults(event);
        callback({event});
      },
    });
  }

  if (resolvedOptions.dragLeave) {
    registeredListeners.push({
      event: 'dragleave',
      callback: (event: DragEvent) => {
        handleEventDefaults(event);
        callback({event});
      },
    });
  }

  if (resolvedOptions.drop || resolvedOptions.dragOver) {
    registeredListeners.push({
      event: 'dragover',
      callback: (event: DragEvent) => {
        handleRequiredEventDefaults(event);
        if (resolvedOptions.dragOver) {
          callback({event});
        }
      },
    });
  }

  if (resolvedOptions.drop) {
    registeredListeners.push({
      event: 'drop',
      callback: (event: DragEvent) => {
        handleRequiredEventDefaults(event);
        if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length && event.dataTransfer.files[0]) {
          const files: BrowserStyleFile[] = [];

          for (let i = 0; i < event.dataTransfer.files.length; i++) {
            const file = event.dataTransfer.files[i];
            files.push({
              lastModified: file.lastModified,
              name: file.name,
              size: file.size,
              type: file.type
            });
          }

          const payload = {
            files,
            app_id: asperaSdk.globals.appId,
          };

          if (asperaSdk.isReady) {
            client.request('dropped_files', payload)
              .then((data: DataTransferResponse) => callback({event, files: data}))
              .catch(error => {
                errorLog(messages.unableToReadDropped, error);
              });
          } else if (asperaSdk.httpGatewayIsReady) {
            handleHttpGatewayDrop(event.dataTransfer.items, callback, event);
          }
        }
      },
    });
  }

  elements.forEach(element => {
    registeredListeners.forEach(({event, callback: listener}) => {
      element.addEventListener(event, listener);
    });
  });

  asperaSdk.globals.dropZonesCreated.set(elementSelector, registeredListeners);
};

/**
 * Remove dropzone.
 *
 * @param elementSelector the selector of the element on the page that should remove
 */
export const removeDropzone = (elementSelector: string): void => {
  const foundDropzone = asperaSdk.globals.dropZonesCreated.get(elementSelector);

  if (foundDropzone) {
    const elements = document.querySelectorAll(elementSelector);

    foundDropzone.forEach((data) => {
      if (elements && elements.length) {
        elements.forEach(element => {
          element.removeEventListener(data.event, data.callback);
        });
      }
    });

    asperaSdk.globals.dropZonesCreated.delete(elementSelector);
  }
};

/**
 * Get metadata about the IBM Aspera installation.
 *
 * @returns a promise that returns information about the user's IBM Aspera installation.
 */
export const getInfo = (): Promise<AsperaSdkInfo> => {
  if (asperaSdk.useHttpGateway || asperaSdk.useConnect) {
    return Promise.resolve(asperaSdk.globals.sdkResponseData);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  return new Promise((resolve, _) => {
    resolve(asperaSdk.globals.sdkResponseData);
  });
};

/**
 * Read an entire file as an array buffer (base64-encoded).
 *
 * Note: The maximum file size allowed is 50 MiB.
 *
 * @param path path to the file to read
 *
 * @returns a promise that resolves with the file data as a base64-encoded string and mime type
 */
export const readAsArrayBuffer = (path: string): Promise<ReadAsArrayBufferResponse> => {
  if (asperaSdk.useHttpGateway) {
    return httpGatewayReadAsArrayBuffer(path);
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.readAsArrayBuffer({path});
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    request: {
      path,
    },
    app_id: asperaSdk.globals.appId,
  };

  client.request('read_as_array_buffer', payload)
    .then((data: ReadAsArrayBufferResponse) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.readAsArrayBufferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.readAsArrayBufferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Read a chunk of a file as an array buffer (base64-encoded).
 *
 * Note: The maximum chunk size allowed is 50 MiB.
 *
 * @param path path to the file to read
 * @param offset offset to start reading the file, in bytes
 * @param chunkSize the size of the chunk to read, in bytes
 *
 * @returns a promise that resolves with the file chunk data as a base64-encoded string and mime type
 */
export const readChunkAsArrayBuffer = (path: string, offset: number, chunkSize: number): Promise<ReadChunkAsArrayBufferResponse> => {
  if (asperaSdk.useHttpGateway) {
    return httpGatewayReadChunkAsArrayBuffer(path, offset, chunkSize);
  } else if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.readChunkAsArrayBuffer({path, offset, chunkSize});
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    request: {
      path,
      offset,
      chunkSize,
    },
    app_id: asperaSdk.globals.appId,
  };

  client.request('read_chunk_as_array_buffer', payload)
    .then((data: ReadChunkAsArrayBufferResponse) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.readChunkAsArrayBufferFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.readChunkAsArrayBufferFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Get a checksum of the specified chunk size of the file.
 *
 * @param options checksum options including path, offset, chunkSize, and checksumMethod
 *
 * @returns a promise that resolves with the checksum information
 */
export const getChecksum = (options: GetChecksumOptions): Promise<ChecksumFileResponse> => {
  if (asperaSdk.useHttpGateway) {
    return throwError(messages.getChecksumNotSupported);
  }

  if (asperaSdk.useConnect) {
    return asperaSdk.globals.connect.getChecksum(options);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    request: {
      path: options.path,
      offset: options.offset || 0,
      chunkSize: options.chunkSize || 0,
      checksumMethod: options.checksumMethod || 'md5',
    },
    app_id: asperaSdk.globals.appId,
  };

  client.request('get_checksum', payload)
    .then((data: ChecksumFileResponse) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.getChecksumFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.getChecksumFailed, error));
    });

  return promiseInfo.promise;
};

/**
 * Read the contents of a directory, returning all entries as a flat list.
 *
 * This API is only supported when using IBM Aspera for desktop.
 *
 * @param options options including the directory path, optional recursion depth, and filters
 *
 * @returns a promise that resolves with the directory entries and total count
 */
export const readDirectory = (options: ReadDirectoryOptions): Promise<ReadDirectoryResponse> => {
  if (asperaSdk.useHttpGateway) {
    return throwError(messages.readDirectoryNotSupported);
  }

  if (asperaSdk.useConnect) {
    return throwError(messages.readDirectoryNotSupported);
  }

  if (!asperaSdk.isReady) {
    return throwError(messages.serverNotVerified);
  }

  const promiseInfo = generatePromiseObjects();

  const payload = {
    request: {
      path: options.path,
      depth: options.depth,
      filters: options.filters,
    },
    app_id: asperaSdk.globals.appId,
  };

  client.request('read_directory', payload)
    .then((data: ReadDirectoryResponse) => promiseInfo.resolver(data))
    .catch(error => {
      errorLog(messages.readDirectoryFailed, error);
      promiseInfo.rejecter(generateErrorBody(messages.readDirectoryFailed, error));
    });

  return promiseInfo.promise;
};

const supportsMethod = (method: string): boolean => {
  // HTTP Gateway v2 specific overrides
  if (asperaSdk.useOldHttpGateway && (method === 'read_as_array_buffer' || method === 'read_chunk_as_array_buffer')) {
    return false;
  }

  // We currently do not support calculating file checksums when using HTTP Gateway. In theory it should be possible
  // to calculate this directly in the browser similar to how `readAsArrayBuffer()` is implemented.
  // HTTP Gateway also does not support showing native transfer client UI (about, preferences, etc.).
  if (asperaSdk.useHttpGateway && (method === 'get_checksum' || method === 'show_about' || method === 'open_preferences' || method === 'show_transfer_manager' || method === 'show_transfer_monitor' || method === 'authenticate' || method === 'test_ssh_ports' || method === 'show_save_file_dialog' || method === 'read_directory')) {
    return false;
  }

  // Reading directory contents is only supported by the Desktop App (not Connect).
  if (asperaSdk.useConnect && method === 'read_directory') {
    return false;
  }

  // HTTP Gateway and Connect do not have any RPC methods so fallback to true
  if (asperaSdk.useHttpGateway || asperaSdk.useConnect) {
    return true;
  }

  return asperaSdk.globals.rpcMethods.includes(method);
};

/**
 * Returns an object describing the high-level capabilities supported by the user's
 * transfer client (e.g. IBM Aspera for desktop, Connect, or HTTP Gateway).
 *
 * Use this for feature detection at a semantic level as capabilities may change depending on the
 * transfer client.
 *
 * Rather than caching the return value of this function, it's recommended to call it on the fly as
 * capabilities may change if your application supports multiple transfer clients. As a result, it's
 * recommend to use the slightly more ergonomic {@link hasCapability}.
 *
 * @returns an object with boolean flags for each capability.
 *
 * @example
 * // Conditionally render UI based on capabilities
 * const caps = asperaSdk.getCapabilities();
 * // Determine if your web application can render image previews for user selected files
 * if (caps.imagePreview) {
 *   asperaSdk.readAsArrayBuffer(path);
 * }
 */
export const getCapabilities = (): SdkCapabilities => {
  return {
    imagePreview: supportsMethod('read_as_array_buffer') && supportsMethod('read_chunk_as_array_buffer'),
    fileChecksum: supportsMethod('get_checksum'),
    showAbout: supportsMethod('show_about'),
    showPreferences: supportsMethod('open_preferences'),
    showTransferManager: supportsMethod('show_transfer_manager'),
    showTransferMonitor: supportsMethod('show_transfer_monitor'),
    authenticate: supportsMethod('authenticate'),
    testSshPorts: supportsMethod('test_ssh_ports'),
    showSaveFileDialog: supportsMethod('show_save_file_dialog'),
    readDirectory: supportsMethod('read_directory'),
  };
};

/**
 * Check if the SDK and underlying transfer client supports a specific capability or feature.
 *
 * Capabilities depend on the transfer client being used (HTTP Gateway, Connect, or IBM Aspera for desktop).
 *
 * This function may be useful if you want to conditionally perform certain actions rather than
 * potentially getting an error.
 *
 * For example, only IBM Aspera for desktop supports traversing a folder's contents. An application can
 * check `hasCapability('readDirectory')` to optionally show a folder browser only when the feature is available.
 * For example, when a user does not have IBM Aspera for desktop installed and is using HTTP Gateway, your
 * application can disable this feature. Later, if that same user installs IBM Aspera for desktop, your application
 * will show the feature as enabled without any additional changes.
 *
 * @param capability the capability to check.
 *
 * @returns `true` if the capability is supported, `false` otherwise
 *
 * @example
 * ```typescript
 * // Determine if your web application can render image previews for user selected files
 * if (asperaSdk.hasCapability('imagePreview')) {
 *   const response = await asperaSdk.readAsArrayBuffer(path);
 * }
 * ```
 */
export const hasCapability = (capability: keyof SdkCapabilities): boolean => {
  return !!getCapabilities()[capability];
};
