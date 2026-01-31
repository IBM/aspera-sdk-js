/**
 * Test the connection to the Aspera SDK.
 * This verifies that the SDK is running and reachable.
 */

import { testConnection } from '@ibm-aspera/sdk';

export function testAspera() {
  testConnection().then(response => {
    // The test was successful. The app is running
    alert(`Test successful\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    // The test failed. The app is not running or cannot be reached.
    console.error('Test failed', error);
    alert(`Test failed\n\n${JSON.stringify(error, undefined, 2)}`);
  })
}
