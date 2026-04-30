import {
  startTransfer,
  removeTransfer,
  stopTransfer,
  resumeTransfer,
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
} from '../../src/index';
import {
  mockFetch,
  setupSdk,
  resetSdk,
  lastFetchCall,
  rpcOk,
  downloadSpec,
} from '../test-helpers';
import { asperaSdk } from '../../src/index';

describe('Desktop App', () => {
  const APP_ID = 'test-app-id';

  beforeEach(() => {
    setupSdk({mode: 'desktop-app', appId: APP_ID});
    mockFetch((url, body) => rpcOk([], body?.id || 0));
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

    it('should stamp transfer_client as desktop', async () => {
      const result = await startTransfer(downloadSpec(), {});

      expect(result.transfer_client).toBe('desktop');
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

    it('should stamp transfer_client as desktop', async () => {
      const result = await resumeTransfer('transfer-uuid-789');

      expect(result.transfer_client).toBe('desktop');
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

  describe('showSaveFileDialog', () => {
    it('should call show_save_file_dialog RPC', async () => {
      await showSaveFileDialog({title: 'Save file', suggestedName: 'report.pdf'});

      const call = lastFetchCall();
      expect(call.body.method).toBe('show_save_file_dialog');
      expect(call.body.params).toEqual({
        options: {title: 'Save file', suggestedName: 'report.pdf'},
        app_id: APP_ID,
      });
    });
  });

  describe('showAbout', () => {
    it('should call show_about RPC', async () => {
      await showAbout();

      const call = lastFetchCall();
      expect(call.body.method).toBe('show_about');
    });
  });

  describe('showPreferences', () => {
    it('should call open_preferences RPC', async () => {
      await showPreferences();

      const call = lastFetchCall();
      expect(call.body.method).toBe('open_preferences');
    });
  });

  describe('showTransferManager', () => {
    it('should call show_transfer_manager RPC', async () => {
      await showTransferManager();

      const call = lastFetchCall();
      expect(call.body.method).toBe('show_transfer_manager');
    });
  });

  describe('showTransferMonitor', () => {
    it('should call show_transfer_monitor RPC with transfer_id', async () => {
      await showTransferMonitor('transfer-uuid-123');

      const call = lastFetchCall();
      expect(call.body.method).toBe('show_transfer_monitor');
      expect(call.body.params).toEqual({transfer_id: 'transfer-uuid-123'});
    });
  });

  describe('authenticate', () => {
    it('should call authenticate RPC with transfer_spec', async () => {
      const transferSpec = {remote_host: 'files.example.com', direction: 'send' as const, paths: [{source: '/file.txt'}]};
      await authenticate(transferSpec);

      const call = lastFetchCall();
      expect(call.body.method).toBe('authenticate');
      expect(call.body.params).toEqual({transfer_spec: transferSpec});
    });
  });

  describe('testSshPorts', () => {
    it('should call test_ssh_ports RPC with options', async () => {
      await testSshPorts({remote_host: 'files.example.com', ssh_port: 22, timeout_sec: 5});

      const call = lastFetchCall();
      expect(call.body.method).toBe('test_ssh_ports');
      expect(call.body.params).toEqual({request: {remote_host: 'files.example.com', ssh_port: 22, timeout_sec: 5}});
    });

    it('should use default ssh_port and timeout_sec when not provided', async () => {
      await testSshPorts({remote_host: 'files.example.com'});

      const call = lastFetchCall();
      expect(call.body.method).toBe('test_ssh_ports');
      expect(call.body.params).toEqual({request: {remote_host: 'files.example.com', ssh_port: 33001, timeout_sec: 3}});
    });
  });

  describe('getAllTransfers', () => {
    it('should call get_all_transfers RPC', async () => {
      await getAllTransfers();

      const call = lastFetchCall();
      expect(call.body.method).toBe('get_all_transfers');
      expect(call.body.params).toEqual({app_id: APP_ID});
    });

    it('should stamp transfer_client as desktop on each transfer', async () => {
      mockFetch((url, body) => rpcOk([{uuid: 't1'}, {uuid: 't2'}], body?.id || 0));

      const result = await getAllTransfers();

      result.forEach(t => expect(t.transfer_client).toBe('desktop'));
    });
  });

  describe('getTransfer', () => {
    it('should call get_transfer RPC', async () => {
      await getTransfer('transfer-uuid-abc');

      const call = lastFetchCall();
      expect(call.body.method).toBe('get_transfer');
      expect(call.body.params).toEqual({transfer_id: 'transfer-uuid-abc'});
    });

    it('should stamp transfer_client as desktop', async () => {
      const result = await getTransfer('transfer-uuid-abc');

      expect(result.transfer_client).toBe('desktop');
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

  describe('getChecksum', () => {
    it('should call get_checksum RPC with default values', async () => {
      await getChecksum({path: '/path/to/file.txt'});

      const call = lastFetchCall();
      expect(call.body.method).toBe('get_checksum');
      expect(call.body.params).toEqual({
        request: {
          path: '/path/to/file.txt',
          offset: 0,
          chunkSize: 0,
          checksumMethod: 'md5',
        },
        app_id: APP_ID,
      });
    });

    it('should call get_checksum RPC with custom offset and chunkSize', async () => {
      await getChecksum({
        path: '/path/to/large-file.bin',
        offset: 1024,
        chunkSize: 4096,
        checksumMethod: 'sha256',
      });

      const call = lastFetchCall();
      expect(call.body.method).toBe('get_checksum');
      expect(call.body.params).toEqual({
        request: {
          path: '/path/to/large-file.bin',
          offset: 1024,
          chunkSize: 4096,
          checksumMethod: 'sha256',
        },
        app_id: APP_ID,
      });
    });

    it('should call get_checksum RPC with sha1 algorithm', async () => {
      await getChecksum({
        path: '/path/to/document.pdf',
        checksumMethod: 'sha1',
      });

      const call = lastFetchCall();
      expect(call.body.method).toBe('get_checksum');
      expect(call.body.params.request.checksumMethod).toBe('sha1');
    });

    it('should call get_checksum RPC with sha512 algorithm', async () => {
      await getChecksum({
        path: '/path/to/archive.zip',
        checksumMethod: 'sha512',
      });

      const call = lastFetchCall();
      expect(call.body.method).toBe('get_checksum');
      expect(call.body.params.request.checksumMethod).toBe('sha512');
    });
  });

  describe('readDirectory', () => {
    it('should call read_directory RPC with path only', async () => {
      await readDirectory({path: '/path/to/folder'});

      const call = lastFetchCall();
      expect(call.body.method).toBe('read_directory');
      expect(call.body.params).toEqual({
        request: {path: '/path/to/folder', depth: undefined, filters: undefined},
        app_id: APP_ID,
      });
    });

    it('should call read_directory RPC with all options', async () => {
      await readDirectory({
        path: '/path/to/folder',
        depth: 2,
        filters: {type: 'file', namePattern: '*.pdf'},
      });

      const call = lastFetchCall();
      expect(call.body.method).toBe('read_directory');
      expect(call.body.params).toEqual({
        request: {
          path: '/path/to/folder',
          depth: 2,
          filters: {type: 'file', namePattern: '*.pdf'},
        },
        app_id: APP_ID,
      });
    });
  });

  describe('openPreferencesPage', () => {
    it('should call open_preferences RPC with tab', async () => {
      await openPreferencesPage({page: 'general'});

      const call = lastFetchCall();
      expect(call.body.method).toBe('open_preferences');
      expect(call.body.params).toEqual({tab: 'general'});
    });

    it('should pass through "security" as-is', async () => {
      await openPreferencesPage({page: 'security'});

      const call = lastFetchCall();
      expect(call.body.params).toEqual({tab: 'security'});
    });

    it('should pass through "transfers" as-is', async () => {
      await openPreferencesPage({page: 'transfers'});

      const call = lastFetchCall();
      expect(call.body.params).toEqual({tab: 'transfers'});
    });

    it('should map "network" to "proxies" for Desktop App', async () => {
      await openPreferencesPage({page: 'network'});

      const call = lastFetchCall();
      expect(call.body.params).toEqual({tab: 'proxies'});
    });

    it('should map "bandwidth" to "transfers" for Desktop App', async () => {
      await openPreferencesPage({page: 'bandwidth'});

      const call = lastFetchCall();
      expect(call.body.params).toEqual({tab: 'transfers'});
    });
  });

  describe('hasCapability', () => {
    it('should return true for capabilities whose RPC methods are discovered', () => {
      asperaSdk.globals.rpcMethods = ['show_about', 'open_preferences', 'show_transfer_manager', 'show_transfer_monitor', 'authenticate', 'test_ssh_ports', 'show_save_file_dialog', 'read_as_array_buffer', 'read_chunk_as_array_buffer', 'get_checksum', 'read_directory', 'get_files_list', 'update_branding', 'show_directory'];

      expect(hasCapability('showAbout')).toBe(true);
      expect(hasCapability('showPreferences')).toBe(true);
      expect(hasCapability('showTransferManager')).toBe(true);
      expect(hasCapability('showTransferMonitor')).toBe(true);
      expect(hasCapability('authenticate')).toBe(true);
      expect(hasCapability('testSshPorts')).toBe(true);
      expect(hasCapability('showSaveFileDialog')).toBe(true);
      expect(hasCapability('imagePreview')).toBe(true);
      expect(hasCapability('fileChecksum')).toBe(true);
      expect(hasCapability('readDirectory')).toBe(true);
      expect(hasCapability('getFilesList')).toBe(true);
      expect(hasCapability('setBranding')).toBe(true);
      expect(hasCapability('showDirectory')).toBe(true);
    });

    it('should return false for capabilities whose RPC methods are not discovered', () => {
      asperaSdk.globals.rpcMethods = [];

      expect(hasCapability('showAbout')).toBe(false);
      expect(hasCapability('showPreferences')).toBe(false);
      expect(hasCapability('showTransferManager')).toBe(false);
      expect(hasCapability('showTransferMonitor')).toBe(false);
      expect(hasCapability('authenticate')).toBe(false);
      expect(hasCapability('testSshPorts')).toBe(false);
      expect(hasCapability('showSaveFileDialog')).toBe(false);
      expect(hasCapability('imagePreview')).toBe(false);
      expect(hasCapability('fileChecksum')).toBe(false);
      expect(hasCapability('readDirectory')).toBe(false);
      expect(hasCapability('getFilesList')).toBe(false);
      expect(hasCapability('setBranding')).toBe(false);
      expect(hasCapability('showDirectory')).toBe(false);
    });

    it('should handle partial RPC method availability', () => {
      asperaSdk.globals.rpcMethods = ['open_preferences', 'read_as_array_buffer'];

      expect(hasCapability('showAbout')).toBe(false);
      expect(hasCapability('showPreferences')).toBe(true);
      // imagePreview requires both read_as_array_buffer AND read_chunk_as_array_buffer
      expect(hasCapability('imagePreview')).toBe(false);
      expect(hasCapability('readDirectory')).toBe(false);
    });
  });
});
