/**
 * Select files or folders using the Aspera SDK file picker.
 * This example demonstrates how to let users select items from their local filesystem.
 */

import { showSelectFileDialog, showSelectFolderDialog } from '@ibm-aspera/sdk';

// Global state for selected files (used by the example app)
declare global {
  interface Window {
    selectedFiles: any[];
  }
}

window.selectedFiles = [];

export function selectItemsAspera(selectFolders: boolean) {
  /**
   * showSelectFolderDialog will only allow picking folders.
   * showSelectFileDialog will only allow picking files.
   * They both return the same response type. So swapping
   * out the function is safe.
   */
  (selectFolders ? showSelectFolderDialog({multiple: true}) : showSelectFileDialog({multiple: true})).then(response => {
    /**
     * File list for transferSpec is returned in `response.dataTransfer.files` array
     * where name is the path to the selected item.
     */
    alert(`Selected items:\n\n${JSON.stringify(response, undefined, 2)}`);
    response.dataTransfer.files.forEach(item => window.selectedFiles.push(item));
  }).catch(error => {
    // If code -32002 then user canceled selecting. Otherwise another failure.
    if (error.debugData?.code === -32002) {
      alert('User canceled selecting items');
    } else {
      console.error('Selecting items failed', error);
      alert(`Selecting items failed\n\n${JSON.stringify(error, undefined, 2)}`);
    }
  });
}
