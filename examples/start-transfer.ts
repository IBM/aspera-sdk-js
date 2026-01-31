/**
 * Start an Aspera transfer with a given transfer specification.
 * This example shows how to initiate file transfers.
 */

import { startTransfer } from '@ibm-aspera/sdk';

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
