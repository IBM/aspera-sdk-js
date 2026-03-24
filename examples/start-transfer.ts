/**
 * Start an Aspera transfer with a given transfer specification.
 * This example shows how to initiate file transfers.
 */

import { startTransfer, authenticate, testSshPorts } from '@ibm-aspera/sdk';

export function startTransferAspera(transferSpec: any) {
  /** The AsperaSpec defines rules on how the client app should work with transfers */
  const asperaSpec = {use_absolute_destination_path: false};

  startTransfer(transferSpec, asperaSpec).then(response => {
    // Transfer accepted and is starting
    alert(`Transfer started:\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    // Transfer not accepted by the Aspera app
    console.error('Start transfer failed', error);
    alert(`Start transfer failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function authenticateAspera(transferSpec: any) {
  /** Authenticate a transfer specification against the remote server. */
  authenticate(transferSpec).then(response => {
    console.info('Authenticate response', response);
    alert(`Authentication successful:\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    console.error('Authenticate failed', error);
    alert(`Authentication failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}

export function testSshPortsAspera(remoteHost: string) {
  /** Test SSH port connectivity to the transfer server. */
  testSshPorts({remote_host: remoteHost}).then(response => {
    console.info('Test SSH ports response', response);
    alert(`Test SSH ports successful:\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    console.error('Test SSH ports failed', error);
    alert(`Test SSH ports failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}
