import {
  startTransfer,
  removeTransfer,
  stopTransfer,
  resumeTransfer,
  registerActivityCallback,
  showSelectFileDialog,
  showSelectFolderDialog,
  showSaveFileDialog,
  showAbout,
  showPreferences,
  getAllTransfers,
  getTransfer,
  showDirectory,
  modifyTransfer,
  readAsArrayBuffer,
  readChunkAsArrayBuffer,
  getChecksum,
  readDirectory,
  showTransferManager,
  showTransferMonitor,
  authenticate,
  testSshPorts,
  openPreferencesPage,
  hasCapability,
  asperaSdk,
} from '../../src/index';
import {
  mockFetch,
  setupSdk,
  resetSdk,
  lastFetchCall,
  presignOk,
  presignError,
  downloadSpec,
  uploadSpec,
} from '../test-helpers';

describe('HTTP Gateway', () => {
  const GATEWAY_URL = 'https://gateway.example.com/aspera/http-gwy';

  beforeEach(() => {
    setupSdk({mode: 'http-gateway', gatewayUrl: GATEWAY_URL});
    mockFetch(() => presignOk());
  });

  afterEach(() => {
    resetSdk();
    jest.restoreAllMocks();
  });

  // ============================================================================
  // Supported APIs
  // ============================================================================

  describe('startTransfer (download)', () => {
    it('should POST to /presign with correct body', async () => {
      const transferSpec = downloadSpec({
        remote_host: 'storage.example.com',
        paths: [{source: '/downloads/large-file.zip'}],
        token: 'bearer-token-123',
      });

      await startTransfer(transferSpec, {});

      const call = lastFetchCall();
      expect(call.url).toBe(`${GATEWAY_URL}/v3/presign`);
      expect(call.method).toBe('POST');
      expect(call.headers['Content-Type']).toBe('application/json');
      expect(call.body).toEqual({
        transfer_spec: {
          direction: 'receive',
          remote_host: 'storage.example.com',
          paths: [{source: '/downloads/large-file.zip'}],
          token: 'bearer-token-123',
        },
        method: 'GET',
        protocol: 'https',
        headers: {host: 'gateway.example.com'},
      });
    });

    it('should include auth headers when provided', async () => {
      await startTransfer(downloadSpec(), {
        http_gateway_authentication: {token: 'my-token', access_key: 'my-key'},
      });

      const call = lastFetchCall();
      expect(call.headers['Authorization']).toBe('Bearer my-token');
      expect(call.headers['X-Aspera-AccessKey']).toBe('my-key');
    });

    it('should return running transfer on success', async () => {
      const result = await startTransfer(downloadSpec(), {});

      expect(result.status).toBe('running');
      expect(result.transfer_client).toBe('http-gateway');
      expect(result.httpGatewayTransfer).toBe(true);
      expect(result.httpRequestId).toBe('test-request-id');
    });

    it('should return failed transfer on error', async () => {
      mockFetch(() => presignError(403, 'Access denied'));

      const result = await startTransfer(downloadSpec(), {});

      expect(result.status).toBe('failed');
      expect(result.error_code).toBe(403);
      expect(result.error_desc).toBe('Access denied');
    });
  });

  describe('startTransfer (upload)', () => {
    it('should reject when files not selected by user', async () => {
      await expect(startTransfer(uploadSpec({token: 'upload-token'}), {})).rejects.toEqual({
        error: true,
        message: 'The specified path has not been allowed by the user.',
      });
    });
  });

  describe('removeTransfer', () => {
    it('should remove transfer from store', async () => {
      const result = await startTransfer(downloadSpec(), {});
      const transferId = result.uuid;

      expect(asperaSdk.httpGatewayTransferStore.has(transferId)).toBe(true);

      await removeTransfer(transferId);

      expect(asperaSdk.httpGatewayTransferStore.has(transferId)).toBe(false);
    });

    it('should abort XHR and remove transfer from both stores for an upload', async () => {
      const mockFile = new File(['upload content'], 'file.txt', {type: 'text/plain'});
      asperaSdk.httpGatewaySelectedFiles.set('file.txt', mockFile);

      const result = await startTransfer(uploadSpec({paths: [{source: 'file.txt'}]}), {});
      const transferId = result.uuid;

      expect(asperaSdk.httpGatewayRequestStore.has(transferId)).toBe(true);

      const abortSpy = jest.spyOn(XMLHttpRequest.prototype, 'abort');

      await removeTransfer(transferId);

      expect(abortSpy).toHaveBeenCalled();
      expect(asperaSdk.httpGatewayTransferStore.has(transferId)).toBe(false);
      expect(asperaSdk.httpGatewayRequestStore.has(transferId)).toBe(false);
    });
  });

  describe('getAllTransfers', () => {
    it('should return all transfers from store', async () => {
      await startTransfer(downloadSpec({paths: [{source: '/file1.txt'}]}), {});
      await startTransfer(downloadSpec({paths: [{source: '/file2.txt'}]}), {});

      const transfers = await getAllTransfers();

      expect(transfers.length).toBe(2);
    });

    it('should return empty array when no transfers', async () => {
      const transfers = await getAllTransfers();

      expect(transfers).toEqual([]);
    });
  });

  describe('getTransfer', () => {
    it('should return transfer by ID', async () => {
      const result = await startTransfer(downloadSpec(), {});
      const transferId = result.uuid;

      const transfer = await getTransfer(transferId);

      expect(transfer.uuid).toBe(transferId);
    });

    it('should reject when transfer not found', async () => {
      await expect(getTransfer('nonexistent-id')).rejects.toEqual({
        error: true,
        message: 'Unable to get transfer',
      });
    });
  });

  describe('readAsArrayBuffer', () => {
    it('should read file and return base64-encoded data', async () => {
      const mockFile = new File(['test content'], 'test.txt', {type: 'text/plain'});
      asperaSdk.httpGatewaySelectedFiles.set('/path/to/test.txt', mockFile);

      const result = await readAsArrayBuffer('/path/to/test.txt');

      expect(result).toEqual({
        data: 'dGVzdCBjb250ZW50', // base64 of "test content"
        type: 'text/plain',
      });
    });

    it('should reject when file not selected by user', async () => {
      await expect(readAsArrayBuffer('/not/selected/file.txt')).rejects.toEqual({
        error: true,
        message: 'The specified path has not been allowed by the user.',
      });
    });
  });

  describe('readChunkAsArrayBuffer', () => {
    it('should read file chunk and return base64-encoded data', async () => {
      const mockFile = new File(['test content for chunked reading'], 'large.bin', {type: 'application/octet-stream'});
      asperaSdk.httpGatewaySelectedFiles.set('/path/to/large.bin', mockFile);

      const result = await readChunkAsArrayBuffer('/path/to/large.bin', 0, 10);

      expect(result).toEqual({
        data: 'dGVzdCBjb250ZQ==', // base64 of "test conte" (first 10 chars)
        type: 'application/octet-stream',
      });
    });

    it('should reject when file not selected by user', async () => {
      await expect(readChunkAsArrayBuffer('/not/selected/file.bin', 0, 10)).rejects.toEqual({
        error: true,
        message: 'The specified path has not been allowed by the user.',
      });
    });
  });

  // ============================================================================
  // Unsupported APIs (should reject with error)
  // ============================================================================

  describe('stopTransfer', () => {
    it('should abort XHR and set status to cancelled for an in-progress upload', async () => {
      const mockFile = new File(['upload content'], 'file.txt', {type: 'text/plain'});
      asperaSdk.httpGatewaySelectedFiles.set('file.txt', mockFile);

      const result = await startTransfer(uploadSpec({paths: [{source: 'file.txt'}]}), {});
      const transferId = result.uuid;

      expect(asperaSdk.httpGatewayRequestStore.has(transferId)).toBe(true);

      const abortSpy = jest.spyOn(XMLHttpRequest.prototype, 'abort');

      await stopTransfer(transferId);

      expect(abortSpy).toHaveBeenCalled();
      expect(asperaSdk.httpGatewayTransferStore.has(transferId)).toBe(true);
      expect(asperaSdk.httpGatewayTransferStore.get(transferId).status).toBe('cancelled');
      expect(asperaSdk.httpGatewayRequestStore.has(transferId)).toBe(false);
    });

    it('should emit a cancelled status update via activity callback', async () => {
      const mockFile = new File(['upload content'], 'file.txt', {type: 'text/plain'});
      asperaSdk.httpGatewaySelectedFiles.set('file.txt', mockFile);

      const updates: any[] = [];
      registerActivityCallback((data) => updates.push(data));

      const result = await startTransfer(uploadSpec({paths: [{source: 'file.txt'}]}), {});

      await stopTransfer(result.uuid);

      const lastUpdate = updates[updates.length - 1];
      expect(lastUpdate.transfers[0].status).toBe('cancelled');
    });

    it('should reject when transfer not found', async () => {
      await expect(stopTransfer('nonexistent-id')).rejects.toEqual({
        error: true,
        message: 'Unable to stop transfer',
      });
    });
  });

  describe('resumeTransfer', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(resumeTransfer('some-id', {})).rejects.toEqual({
        error: true,
        message: 'IBM Aspera SDK has not been verified. Run test or init first',
      });
    });
  });

  describe('showAbout', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(showAbout()).rejects.toEqual({
        error: true,
        message: 'Show about is not supported for current transfer client',
      });
    });
  });

  describe('showPreferences', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(showPreferences()).rejects.toEqual({
        error: true,
        message: 'IBM Aspera SDK has not been verified. Run test or init first',
      });
    });
  });

  describe('showDirectory', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(showDirectory('some-id')).rejects.toEqual({
        error: true,
        message: 'IBM Aspera SDK has not been verified. Run test or init first',
      });
    });
  });

  describe('modifyTransfer', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(modifyTransfer('some-id', {rate_policy: 'fair'})).rejects.toEqual({
        error: true,
        message: 'IBM Aspera SDK has not been verified. Run test or init first',
      });
    });
  });

  describe('getChecksum', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(getChecksum({path: '/path/to/file.txt'})).rejects.toEqual({
        error: true,
        message: 'File checksum not supported for current transfer client',
      });
    });
  });

  describe('readDirectory', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(readDirectory({path: '/path/to/folder'})).rejects.toEqual({
        error: true,
        message: 'Read directory is not supported for current transfer client',
      });
    });
  });

  describe('showTransferManager', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(showTransferManager()).rejects.toEqual({
        error: true,
        message: 'Show transfer manager is not supported for current transfer client',
      });
    });
  });

  describe('showTransferMonitor', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(showTransferMonitor('transfer-uuid-123')).rejects.toEqual({
        error: true,
        message: 'Show transfer monitor is not supported for current transfer client',
      });
    });
  });

  describe('authenticate', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(authenticate({remote_host: 'files.example.com', direction: 'send', paths: [{source: '/file.txt'}]})).rejects.toEqual({
        error: true,
        message: 'Authenticate is not supported for current transfer client',
      });
    });
  });

  describe('testSshPorts', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(testSshPorts({remote_host: 'files.example.com'})).rejects.toEqual({
        error: true,
        message: 'Test SSH ports is not supported for current transfer client',
      });
    });
  });

  describe('showSaveFileDialog', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(showSaveFileDialog({title: 'Save file'})).rejects.toEqual({
        error: true,
        message: 'Show save file dialog is not supported for current transfer client',
      });
    });
  });

  describe('openPreferencesPage', () => {
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(openPreferencesPage({page: 'general'})).rejects.toEqual({
        error: true,
        message: 'Open preferences page is not supported for current transfer client',
      });
    });
  });

  describe('hasCapability', () => {
    it('should return false for capabilities not supported by HTTP Gateway', () => {
      expect(hasCapability('showAbout')).toBe(false);
      expect(hasCapability('showPreferences')).toBe(false);
      expect(hasCapability('showTransferManager')).toBe(false);
      expect(hasCapability('showTransferMonitor')).toBe(false);
      expect(hasCapability('authenticate')).toBe(false);
      expect(hasCapability('testSshPorts')).toBe(false);
      expect(hasCapability('showSaveFileDialog')).toBe(false);
      expect(hasCapability('fileChecksum')).toBe(false);
      expect(hasCapability('readDirectory')).toBe(false);
      expect(hasCapability('getFilesList')).toBe(false);
      expect(hasCapability('setBranding')).toBe(false);
      expect(hasCapability('showDirectory')).toBe(false);
    });

    it('should return true for capabilities supported by HTTP Gateway', () => {
      expect(hasCapability('imagePreview')).toBe(true);
    });
  });
});
