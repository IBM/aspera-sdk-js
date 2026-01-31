/**
 * Setup drag and drop functionality for file selection.
 * This example demonstrates how to register drop zones for file drag and drop.
 */

import { initDragDrop, createDropzone, removeDropzone } from '@ibm-aspera/sdk';

// Global state for selected files (used by the example app)
declare global {
  interface Window {
    selectedFiles: any[];
  }
}

export function setupDropAspera(dropZone: string) {
  /**
   * dropZone is a CSS style selector for an element that should be
   * registered to watch for file drop events.
   *
   * You only need to init once and then can register each dropZone
   * inidividually. Depending on how many drop zones may need to loop
   * or split init and set dropzones.
   */

  // For safety you can prevent at highest level drop default actions
  // This is useful to avoid browser opening file if not dropped in the
  // Dropzone
  window.addEventListener('drop', event => {
    event.preventDefault();
  });
  window.addEventListener('dragover', event => {
    event.preventDefault();
  });

  /** The callback for when files are dropped */
  const dropCallback = (response: any) => {
    response.event.stopPropagation();
    /**
     * File list for transferSpec is returned in `response.files.dataTransfer.files` array
     * where name is the path to the selected item.
     */
    alert(`Dropped items:\n\n${JSON.stringify(response.files, undefined, 2)}`);
    response.files.dataTransfer.files.forEach((item: any) => window.selectedFiles.push(item));
  };

  /**
   * While not needed normally. You can also remove the dropdzone.
   * This will remove the listener and no longer accept drops to that element.
   */
  const cancelDropzone = () => {
    removeDropzone(dropZone);
  };

  initDragDrop().then(() => {
    // Drag and drop can now be safely registered
    // Register the dropZone
    createDropzone(dropCallback, dropZone, {drop: true, allowPropagation: true});
  }).catch(error => {
    // Drag and drop init failed. This is rare.
    console.error('Drag and drop could not start', error);
    alert(`Drag and drop failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}
