/**
 * Display installer information and provide download links.
 * This example shows how to help users install the Aspera SDK if not already installed.
 */

import { getInstallerInfo, launch } from '@ibm-aspera/sdk';

export function installerAspera() {
  /**
   * Basic JavaScript to get the installers and
   * load it into the DOM.
   * After successful init you should usually remove this.
   */

  getInstallerInfo().then(response => {
    const header = document.createElement('h4');
    header.innerText = 'IBM Aspera Installer';
    header.style.cssText = 'margin-bottom: 20px; color: #fff;';

    const launchButton = document.createElement('button');
    launchButton.innerText = 'Launch'
    launchButton.style.cssText = 'display: block; width: 100%; margin-bottom: 16px; padding: 8px';
    launchButton.type = 'button';
    launchButton.onclick = () => {
      // Provide a way to launch the SDK if already installed
      launch();
    }

    const buttons = response.entries.map(entry => {
      // Loop over each entry and make a button to click it to open download
      // Normally just one item. But some may have more. So iterate the entries
      const button = document.createElement('button');
      button.type = 'button';
      button.style.cssText = 'display: block; width: 100%; margin-bottom: 16px; padding: 8px';
      button.innerText = `Install (${entry.platform} - ${entry.type})`;
      button.onclick = () => {
        window.open(entry.url, '_blank', 'noopener,noreferrer');
      };

      return button;
    });

    buttons.unshift(launchButton);

    // Create the wrapper element and add it to body as fixed element
    const wrapper = document.createElement('div');
    wrapper.id = 'aspera-installer-test';
    wrapper.style.cssText = 'position: fixed; bottom: 0px; right: 32px; height: 260px; width: 280px; background-color: #444; padding: 16px 20px;';
    wrapper.append(header, ...buttons);

    document.body.append(wrapper);
  }).catch(error => {
    console.error('Installer info get failed', error);
  });
}
