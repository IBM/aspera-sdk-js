/**
 * Transfer client UI functions.
 * These functions interact with the native UI of the transfer client (IBM Aspera for Desktop or Connect).
 */

import { showAbout, showPreferences, showTransferManager, openPreferencesPage } from '@ibm-aspera/sdk';

export function showAboutAspera() {
  /** Show the about page of the transfer client. */
  showAbout().then(response => {
    console.info('Show about response', response);
  }).catch(error => {
    console.error('Show about failed', error);
    alert(`Show about failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function showPreferencesAspera() {
  /** Open preference window for IBM Aspera. */
  showPreferences().catch(error => {
    console.error('Show preferences failed', error);
    alert(`Show preferences failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function showTransferManagerAspera() {
  /** Open the transfer manager UI of the native transfer client. */
  showTransferManager().then(response => {
    console.info('Show transfer manager response', response);
  }).catch(error => {
    console.error('Show transfer manager failed', error);
    alert(`Show transfer manager failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function openPreferencesPageAspera(page: string) {
  /** Open the preferences page to a specific tab. */
  openPreferencesPage({page: page as any}).then(response => {
    console.info('Open preferences page response', response);
  }).catch(error => {
    console.error('Open preferences page failed', error);
    alert(`Open preferences page failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}
