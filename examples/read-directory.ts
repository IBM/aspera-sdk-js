/**
 * Read directory contents using the Aspera SDK.
 * This example demonstrates how to enumerate files and folders within a local directory.
 * Supported for IBM Aspera for Desktop only.
 */

import { readDirectory } from '@ibm-aspera/sdk';
import type { ReadDirectoryOptions } from '@ibm-aspera/sdk';

window.directoryData = null;
window.directoryError = null;

export function readDirectoryAspera(options: ReadDirectoryOptions) {
  /**
   * readDirectory() reads the contents of a local directory and returns
   * entries as a flat list. Supported for IBM Aspera for Desktop only.
   *
   * Options:
   * - path: Absolute path to the directory
   * - depth: Max recursion depth (0 = direct children, omit for full traversal)
   * - filters.type: 'file' or 'directory' to filter by entry type
   * - filters.namePattern: Glob pattern for file names (e.g., '*.pdf')
   */
  readDirectory(options).then(response => {
    window.directoryData = response;
  }).catch(error => {
    window.directoryError = error;
    console.error('Read directory failed', error);
    alert(`Read directory failed\n\n${JSON.stringify(error, undefined, 2)}`);
  });
}
