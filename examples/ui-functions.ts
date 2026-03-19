/**
 * Transfer client UI functions.
 * These functions interact with the native UI of the transfer client (IBM Aspera for Desktop or Connect).
 */

import { showAbout, showPreferences } from '@ibm-aspera/sdk';

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
