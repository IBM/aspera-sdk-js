/**
 * Select and preview an image file using the Aspera SDK.
 * This demonstrates a typical web application flow for file selection and reading.
 */

import { showSelectFileDialog, readAsArrayBuffer } from '@ibm-aspera/sdk';

// Global state for image preview (used by the example app)
declare global {
  interface Window {
    imagePreviewData: any;
    selectedImagePath: string | null;
  }
}

window.imagePreviewData = null;
window.selectedImagePath = null;

export function selectAndPreviewImageAspera() {
  /**
   * This demonstrates a typical web application flow:
   * 1. Use showSelectFileDialog to let the user select a file
   * 2. Pass the selected file path to readAsArrayBuffer
   * 3. Display the image preview using the base64-encoded data
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
    window.selectedImagePath = filePath;

    // Step 2: Read the selected file as an array buffer
    return readAsArrayBuffer(filePath);
  }).then(response => {
    if (!response) {
      return; // User canceled or no file selected
    }

    /**
     * Response contains:
     * - data: base64-encoded file contents
     * - type: MIME type of the file
     */
    alert(`Image loaded successfully!\n\nMIME Type: ${response.type}\nData length: ${response.data.length} characters`);
    window.imagePreviewData = response;
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
