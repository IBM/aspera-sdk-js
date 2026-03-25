/**
 * Initialize the Aspera SDK with various configuration options.
 * This example demonstrates how to configure the SDK for different scenarios.
 */

import { initSession, registerStatusCallback } from '@ibm-aspera/sdk';

export function initializeAspera(supportMulti: boolean, httpGatewayUrl?: string, forceHttpGateway?: boolean, forceConnect?: boolean) {
  /** Define desktop settings for initialization */
  const settings = {
    /**
     * An ID for your application. For multi user applications
     * this can include the user ID or other identifier
     */
    appId: 'my-application-unique-id',
    /**
     * Indicate if machine runs the app with multiple user's at once
     * like a virtual machine.
     */
    supportMultipleUsers: !!supportMulti,
    /** HTTP Gateway settings for fallback or forced usage */
    httpGatewaySettings: httpGatewayUrl ? {
      url: httpGatewayUrl,
      forceGateway: forceHttpGateway || false,
    } : undefined,
    /** Connect settings. Connect will be used instead of Desktop. Not required if not using Connect. */
    connectSettings: {
      useConnect: forceConnect || false,
      dragDropEnabled: true,
    },
  };

  registerStatusCallback(status => {
    console.info('Status:', status);
  });

  /**
   * HTTP Gateway URL can be set to support fallback to a gateway.
   * You can also force it to not start the desktop app.
   * Connect can be forced to not use Desktop and use Connect only
   */
  initSession(settings);
}
