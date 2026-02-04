# Migration Guide: Connect SDK to Unified SDK

This guide helps developers migrate from the deprecated `@ibm-aspera/connect-sdk-js` package to the new unified `@ibm-aspera/sdk` package.

## Overview

The new IBM Aspera JavaScript SDK is a unified SDK that supports all Aspera transfer clients:

- **IBM Aspera Connect** - Browser plugin/extension (what you're using today)
- **IBM Aspera for desktop** - The modern desktop application (recommended for new development)
- **IBM Aspera HTTP Gateway** - Browser-only transfers without a desktop client

The unified SDK provides a single, consistent API regardless of which transfer client is used.

## Migration Strategy

We recommend a two-phase approach:

1. **Phase 1: Migrate to the unified SDK using Connect mode** - Minimum changes to keep using Connect
2. **Phase 2: Migrate from Connect to IBM Aspera for desktop** - When you're ready to switch

---

# Phase 1: Migrate to the Unified SDK (Connect Mode)

This phase involves the minimum changes needed to migrate to the new SDK while continuing to use IBM Aspera Connect as your transfer client.

This can also be used by a web application to support both IBM Aspera Connect and IBM Aspera for desktop simultaneously.

The following guide assumes you were previously using the `@ibm-aspera/connect-sdk-js` npm package. If instead your application included the Connect SDK via script tag, then update the script tag as follows:

```html
<!-- Before -->
<script src="https://d3gcli72yxqn2z.cloudfront.net/@ibm-aspera/connect-sdk-js/latest/connect-sdk.js"></script>

<!-- After -->
 <!-- Check npmjs.com for latest version (https://www.npmjs.com/package/@ibm-aspera/sdk) -->
 <script src="https://cdn.jsdelivr.net/npm/@ibm-aspera/sdk@0.2.30/dist/js/aspera-sdk.js"></script>

```

## Step 1: Update the Package

```bash
npm uninstall @ibm-aspera/connect-sdk-js
npm install @ibm-aspera/sdk
```

## Step 2: Update Initialization

### Before

```javascript
import { Connect, ConnectInstaller } from '@ibm-aspera/connect-sdk-js';

const connect = new Connect({
  minVersion: '3.10.1',
  dragDropEnabled: true,
});

const installer = new ConnectInstaller({
  sdkLocation: '/path/to/sdk',
});

connect.addEventListener(Connect.EVENT.STATUS, (event, status) => {
  if (event === 'status') {
      if (status === 'RUNNING') {
        // Connect is running
      } else {
        // Handle other status events
      }
  }
});

connect.initSession('my-application-id');
```

### After

```javascript
import { init } from '@ibm-aspera/sdk';
init({
  appId: 'my-application-id',
  connectSettings: {
    useConnect: true,  // This keeps you on Connect
    minVersion: '3.10.1',
    dragDropEnabled: true,
    sdkLocation: '/path/to/sdk',
  },
}).then(() => {
  // init finished but will monitor for Connect status changes
}).catch((error) => {
  console.error('Initialization failed', error);
});
```

When `useConnect` is set to `true` the `init` function will handle initializing `ConnectInstaller` and showing the default Aspera-provided
installer modal.

If you have your own custom installer UI for your web application, you can turn off the default behavior and receive status events yourself. For example:

```javascript
import { init, registerStatusCallback } from '@ibm-aspera/sdk';

// Register a callback for Connect status events
registerStatusCallback(status => {
  if (status === 'RUNNING') {
    // Connect is running
  } else {
    // Handle other status events
  }
});

init({
  appId: 'my-app-id',
  connectSettings: {
    useConnect: true,
    minVersion: '3.10.1',
    dragDropEnabled: true,
    sdkLocation: '/path/to/sdk',
    hideIncludedInstaller: true, // This disables the default installer modal
  },
}).then(() => {
  // Connect is ready
}).catch((error) => {
  console.error('Initialization failed', error);
});
```

## Supporting Both Clients During Transition

The unified SDK allows you to support both IBM Aspera Connect and IBM Aspera for desktop simultaneously. This is useful for gradual rollouts or when different users have different requirements.

- **`useConnect: true`** — Forces the SDK to use IBM Aspera Connect
- **`useConnect: false` or omitted** — Uses IBM Aspera for desktop

You can dynamically choose which client to use based on user preferences, feature flags, or application settings:

```javascript
import { init } from '@ibm-aspera/sdk';

// Example: Allow users to choose their preferred client
const shouldUseConnect = getUserPreference('useConnect'); // Your app's logic

init({
  appId: 'my-application-id',
  connectSettings: shouldUseConnect ? {
    useConnect: true,
    sdkLocation: '/path/to/sdk',
  } : undefined,
}).then(() => {
  // SDK is ready - works the same regardless of which client is used
});
```

This approach lets you migrate users incrementally while maintaining a single code path.

## Step 3: Update Transfer Calls

### Before

```javascript
connect.startTransferPromise(transferSpec, connectSpec)
  .then((result) => {
    console.log('Transfer started', result.transfer_specs[0]);
  });
```

### After

```javascript
import { startTransfer } from '@ibm-aspera/sdk';

startTransfer(transferSpec, asperaSpec)
  .then((transfer) => {
    console.log('Transfer started', transfer);
  });
```

## Step 4: Update Transfer Monitoring

### Before

```javascript
connect.addEventListener('transfer', (event, data) => {
  if (event === 'transfer') {
    console.log('Transfer updated', data.transfers[0]);
  }
});
```

### After

```javascript
import { registerActivityCallback } from '@ibm-aspera/sdk';

registerActivityCallback(transfers => {
  console.log('Transfer updated', transfers[0]);
});
```

## Step 5: Update Drag and Drop

### Before

```javascript
connect.setDragDropTargets('body', { drop: true }, result => {
  console.log('Files dropped', result.files);
});
```

### After

```javascript
import { createDropzone } from '@ibm-aspera/sdk';

createDropzone(
  result => {
    console.log('Files dropped', result.files);
  },
  'body'
);
```

## Step 6: Update Remaining API Calls

Most of the SDK calls available in `@ibm-aspera/connect-sdk-js` have equivalents in `@ibm-aspera/sdk`. Most also have similar or identical function signatures to make migration easier.

Note: Most callback-based functions have been migrated to promises-based functions.

| `@ibm-aspera/connect-sdk-js` | `@ibm-aspera/sdk` | Notes |
| --- | --- | --- |
| `new Connect()` + `initSession()` | `init()` ||
| `new ConnectInstaller()` | `init()` with `connectSettings` | Installer handling is built into `init()` |
| `addEventListener(Connect.EVENT.STATUS, ...)` | `registerStatusCallback()` ||
| `addEventListener(Connect.EVENT.TRANSFER, ...)` | `registerActivityCallback()` ||
| `removeEventListener()` | `deregisterStatusCallback()` / `deregisterActivityCallback()` ||
| `startTransfer()` `startTransferPromise()` `startTransfers()` | `startTransfer()` ||
| `stopTransfer()` | `stopTransfer()` ||
| `resumeTransfer()` | `resumeTransfer()` ||
| `removeTransfer()` | `removeTransfer()` ||
| `getAllTransfers()` | `getAllTransfers()` ||
| `getTransfer()` | `getTransfer()` ||
| `modifyTransfer()` | `modifyTransfer()` ||
| `showSelectFileDialog()` `showSelectFileDialogPromise()` | `showSelectFileDialog()` ||
| `showSelectFolderDialog()` `showSelectFolderDialogPromise()` | `showSelectFolderDialog()` ||
| `showDirectory()` | `showDirectory()` ||
| `showPreferences()` | `showPreferences()` ||
| `setDragDropTargets()` | `createDropzone()` | See example above |
| `readAsArrayBuffer()` | `readAsArrayBuffer()` ||
| `readChunkAsArrayBuffer()` | `readChunkAsArrayBuffer()` ||
| `version()` | `getInfo()` | Returns SDK and client info |
| `getStatus()` | `asperaSdk.globals.connectStatus` | Read property directly for Connect only. No direct equivalent for IBM Aspera for Desktop as it is assumed to be running if `init` resolves. |
| `showAbout()` | — | Not available |
| `showPreferencesPage()` | — | Not available |
| `showSaveFileDialog()` | — | Not available |
| `showTransferManager()` | — | Not available |
| `showTransferMonitor()` | — | Not available |
| `authenticate()` | — | Not available |
| `getChecksum()` | — | Not available |
| `testSshPorts()` | - | Not available |
| `start()` / `stop()` | — | Handled internally by `init()` |

Note: If you need access to any of the older Connect APIs, you can directly access the Connect client via `asperaSdk.globals.connect`. For example:
```javascript
asperaSdk.globals.connect.showAbout();
```

---

# Phase 2: Migrate from Connect to IBM Aspera for Desktop

> **Note:** This section is for when you're ready to move away from Connect to the modern IBM Aspera for desktop application. This is optional but recommended for new web applications.

IBM Aspera for desktop is the recommended transfer client going forward. It offers:

- Better performance and reliability
- Modern user interface
- Active development and support
- No browser plugin/extension dependencies

## Step 1: Update Initialization

Remove `connectSettings` from your `init()` call:

```javascript
import { init } from '@ibm-aspera/sdk';

// Before (Connect mode)
init({
  appId: 'my-application-id',
  connectSettings: {
    useConnect: true,
    // ... other Connect settings
  },
});

// After (Desktop mode)
init({
  appId: 'my-application-id',
});
```

That's it! All other SDK calls (`startTransfer`, `registerActivityCallback`, etc.) remain exactly the same.

## Getting Help

- [API Documentation](https://ibm.github.io/aspera-sdk-js/docs/)
- [Code Examples](https://github.com/IBM/aspera-sdk-js/tree/main/examples)
- [Live Demo](https://ibm.github.io/aspera-sdk-js)
- [GitHub Issues](https://github.com/IBM/aspera-sdk-js/issues)
