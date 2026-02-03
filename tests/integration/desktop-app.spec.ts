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
} from '../../src/index';
import {
  mockFetch,
  setupSdk,
  resetSdk,
  lastFetchCall,
  rpcOk,
  downloadSpec,
} from '../test-helpers';

describe('Desktop App', () => {
  const APP_ID = 'test-app-id';

  beforeEach(() => {
    setupSdk({mode: 'desktop-app', appId: APP_ID});
    mockFetch((url, body) => rpcOk({}, body?.id || 0));
  });

  afterEach(() => {
    resetSdk();
    jest.restoreAllMocks();
  });

  describe('startTransfer', () => {
    it('should call start_transfer RPC', async () => {
      await startTransfer(downloadSpec({token: 'test-token'}), {use_absolute_destination_path: false});

      const call = lastFetchCall();
      expect(call.body.method).toBe('start_transfer');
      expect(call.body.params).toEqual({
        transfer_spec: {direction: 'receive', remote_host: 'files.example.com', paths: [{source: '/remote/file.txt'}], token: 'test-token'},
        desktop_spec: {use_absolute_destination_path: false},
        app_id: APP_ID,
      });
    });
  });

  describe('removeTransfer', () => {
    it('should call remove_transfer RPC', async () => {
      await removeTransfer('transfer-uuid-123');

      const call = lastFetchCall();
      expect(call.body.method).toBe('remove_transfer');
      expect(call.body.params).toEqual({transfer_id: 'transfer-uuid-123'});
    });
  });

  describe('stopTransfer', () => {
    it('should call stop_transfer RPC', async () => {
      await stopTransfer('transfer-uuid-456');

      const call = lastFetchCall();
      expect(call.body.method).toBe('stop_transfer');
      expect(call.body.params).toEqual({transfer_id: 'transfer-uuid-456'});
    });
  });

  describe('resumeTransfer', () => {
    it('should call resume_transfer RPC', async () => {
      await resumeTransfer('transfer-uuid-789', {token: 'new-token'});

      const call = lastFetchCall();
      expect(call.body.method).toBe('resume_transfer');
      expect(call.body.params).toEqual({
        transfer_id: 'transfer-uuid-789',
        transfer_spec: {token: 'new-token'},
      });
    });
  });

  describe('showSelectFileDialog', () => {
    it('should call show_file_dialog RPC', async () => {
      await showSelectFileDialog({multiple: true});

      const call = lastFetchCall();
      expect(call.body.method).toBe('show_file_dialog');
      expect(call.body.params).toEqual({
        options: {multiple: true},
        app_id: APP_ID,
      });
    });
  });

  describe('showSelectFolderDialog', () => {
    it('should call show_folder_dialog RPC', async () => {
      await showSelectFolderDialog({multiple: false});

      const call = lastFetchCall();
      expect(call.body.method).toBe('show_folder_dialog');
      expect(call.body.params).toEqual({
        options: {multiple: false},
        app_id: APP_ID,
      });
    });
  });

  describe('showPreferences', () => {
    it('should call open_preferences RPC', async () => {
      await showPreferences();

      const call = lastFetchCall();
      expect(call.body.method).toBe('open_preferences');
    });
  });

  describe('getAllTransfers', () => {
    it('should call get_all_transfers RPC', async () => {
      await getAllTransfers();

      const call = lastFetchCall();
      expect(call.body.method).toBe('get_all_transfers');
      expect(call.body.params).toEqual({app_id: APP_ID});
    });
  });

  describe('getTransfer', () => {
    it('should call get_transfer RPC', async () => {
      await getTransfer('transfer-uuid-abc');

      const call = lastFetchCall();
      expect(call.body.method).toBe('get_transfer');
      expect(call.body.params).toEqual({transfer_id: 'transfer-uuid-abc'});
    });
  });

  describe('showDirectory', () => {
    it('should call show_directory RPC', async () => {
      await showDirectory('transfer-uuid-def');

      const call = lastFetchCall();
      expect(call.body.method).toBe('show_directory');
      expect(call.body.params).toEqual({transfer_id: 'transfer-uuid-def'});
    });
  });

  describe('modifyTransfer', () => {
    it('should call modify_transfer RPC', async () => {
      await modifyTransfer('transfer-uuid-ghi', {rate_policy: 'fair'});

      const call = lastFetchCall();
      expect(call.body.method).toBe('modify_transfer');
      expect(call.body.params).toEqual({
        transfer_id: 'transfer-uuid-ghi',
        transfer_spec: {rate_policy: 'fair'},
      });
    });
  });

  describe('readAsArrayBuffer', () => {
    it('should call read_as_array_buffer RPC', async () => {
      await readAsArrayBuffer('/path/to/image.png');

      const call = lastFetchCall();
      expect(call.body.method).toBe('read_as_array_buffer');
      expect(call.body.params).toEqual({
        request: {path: '/path/to/image.png'},
        app_id: APP_ID,
      });
    });
  });

  describe('readChunkAsArrayBuffer', () => {
    it('should call read_chunk_as_array_buffer RPC', async () => {
      await readChunkAsArrayBuffer('/path/to/large-file.bin', 1024, 4096);

      const call = lastFetchCall();
      expect(call.body.method).toBe('read_chunk_as_array_buffer');
      expect(call.body.params).toEqual({
        request: {path: '/path/to/large-file.bin', offset: 1024, chunkSize: 4096},
        app_id: APP_ID,
      });
    });
  });
});
