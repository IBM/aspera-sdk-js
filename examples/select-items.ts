/**
 * Select files or folders using the Aspera SDK file picker.
 * This example demonstrates how to let users select items from their local filesystem.
 */

import { showSelectFileDialog, showSelectFolderDialog, showSaveFileDialog } from '@ibm-aspera/sdk';

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
    // If code -32002 then user cancelled selecting. Otherwise another failure.
    if (error.debugData?.code === -32002) {
      alert('User cancelled selecting items');
    } else {
      console.error('Selecting items failed', error);
      alert(`Selecting items failed\n\n${JSON.stringify(error, undefined, 2)}`);
    }
  });
}

export function showSaveFileDialogAspera() {
  /** Open a save file dialog for the user to choose a save location. */
  showSaveFileDialog({title: 'Save file'}).then(response => {
    console.info('Save file dialog response', response);
    alert(`Save file dialog response:\n\n${JSON.stringify(response, undefined, 2)}`);
  }).catch(error => {
    if (error.debugData?.code === -32002) {
      alert('User cancelled save file dialog');
    } else {
      console.error('Save file dialog failed', error);
      alert(`Save file dialog failed\n\n${JSON.stringify(error, undefined, 2)}`);
    }
  });
}
