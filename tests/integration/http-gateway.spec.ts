import {
  startTransfer,
  removeTransfer,
  stopTransfer,
  resumeTransfer,
  showSelectFileDialog,
  showSelectFolderDialog,
  showPreferences,
  getAllTransfers,
  getTransfer,
  showDirectory,
  modifyTransfer,
  readAsArrayBuffer,
  readChunkAsArrayBuffer,
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
      expect(call.url).toBe(`${GATEWAY_URL}/presign`);
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
    it('should reject - not supported in HTTP Gateway mode', async () => {
      await expect(stopTransfer('some-id')).rejects.toEqual({
        error: true,
        message: 'IBM Aspera SDK has not been verified. Run test or init first',
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
});
