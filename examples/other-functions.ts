/**
 * Other useful Aspera SDK functions.
 * This includes getting SDK info, showing preferences, and monitoring app status.
 */

import { getInfo, showPreferences, registerStatusCallback } from '@ibm-aspera/sdk';

export function getInfoAspera() {
  /** Get metadata about the IBM Aspera installation. */
  getInfo().then(response => {
    alert(`Get info response\n\n${JSON.stringify(response, undefined, 2)}`);
    console.info('Get info response', response);
  }).catch(error => {
    console.error('Get info failed', error);
    alert(`Get info failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function showPreferencesAspera() {
  /** Open preference window for IBM Aspera. */
  showPreferences().catch(error => {
    console.error('Show preferences failed', error);
    alert(`Show preferences failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function registerStatusCallbackAspera() {
  /**
   * Register status callback. This will monitor if the app is closed or reopens.
   * This test currently just consoles all changes.
   */
  alert('Registered app status changes. Monitor the console for events.');

  registerStatusCallback(status => {
    console.info('Status changed', status);
  });
}
