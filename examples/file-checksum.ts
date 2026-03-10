/**
 * Calculate a checksum for the user selected file using the Aspera SDK.
 */

import { showSelectFileDialog, getChecksum } from '@ibm-aspera/sdk';

// Global state for file checksum (used by the example app)
declare global {
  interface Window {
    checksumData: any;
    selectedFilePath: string | null;
  }
}

window.checksumData = null;
window.selectedFilePath = null;

export function selectAndCalculateChecksumAspera() {
  /**
   * This demonstrates a typical web application flow:
   * 1. Use showSelectFileDialog to let the user select a file
   * 2. Pass the selected file path to getChecksum.
   * 3. Display the checksum for demonstration purposes
   */

  // Step 1: Show file selection dialog (single file only)
  showSelectFileDialog({ multiple: false }).then(response => {
    /**
     * Response contains the selected file(s) in response.dataTransfer.files
     * Each file has a 'name' property which is the absolute path
     */
    const selectedFile = response.dataTransfer.files[0];

    if (!selectedFile) {
      alert('No file was selected');
      return;
    }

    const filePath = selectedFile.name;
    window.selectedFilePath = filePath;

    // Step 2: Read the selected file as an array buffer
    return getChecksum({path: filePath});
  }).then(response => {
    if (!response) {
      return; // User canceled or no file selected
    }

    alert(`Checksum calculated successfully!\n\Checksum method: ${response.checksumMethod}\nChecksum: ${response.checksum}`);
    window.checksumData = response;
  }).catch(error => {
    // Handle errors from either file selection or reading
    if (error.debugData?.code === -32002) {
      alert('User canceled file selection');
    } else {
      console.error('Failed to select or read file', error);
      alert(`Failed to select or read file\n\n${JSON.stringify(error, undefined, 2)}`);
    }
  });
}
