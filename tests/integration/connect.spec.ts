import {
  startTransfer,
  removeTransfer,
  stopTransfer,
  resumeTransfer,
  showSelectFileDialog,
  showSelectFolderDialog,
  showAbout,
  showPreferences,
  getAllTransfers,
  getTransfer,
  showDirectory,
  modifyTransfer,
  readAsArrayBuffer,
  readChunkAsArrayBuffer,
  getChecksum,
} from '../../src/index';
import {
  setupSdk,
  resetSdk,
  lastConnectCall,
  getConnectMock,
  downloadSpec,
} from '../test-helpers';

describe('Connect SDK', () => {
  beforeEach(() => {
    setupSdk({mode: 'connect'});
  });

  afterEach(() => {
    resetSdk();
    jest.restoreAllMocks();
  });

  describe('startTransfer', () => {
    it('should call startTransferPromise on Connect SDK', async () => {
      await startTransfer(downloadSpec({token: 'test-token'}), {use_absolute_destination_path: false});

      const call = lastConnectCall();
      expect(call.method).toBe('startTransferPromise');
      expect(call.args[0]).toEqual({
        direction: 'receive',
        remote_host: 'files.example.com',
        paths: [{source: '/remote/file.txt'}],
        token: 'test-token',
      });
      // `allow_dialogs` explicitly overridden (https://github.com/IBM/aspera-sdk-js/issues/196).
      expect(call.args[1]).toEqual({allow_dialogs: false, use_absolute_destination_path: false});
    });
  });

  describe('removeTransfer', () => {
    it('should call removeTransfer on Connect SDK', async () => {
      await removeTransfer('transfer-uuid-123');

      const mock = getConnectMock();
      expect(mock.removeTransfer).toHaveBeenCalledWith('transfer-uuid-123');
    });
  });

  describe('stopTransfer', () => {
    it('should call stopTransfer on Connect SDK', async () => {
      await stopTransfer('transfer-uuid-456');

      const mock = getConnectMock();
      expect(mock.stopTransfer).toHaveBeenCalledWith('transfer-uuid-456');
    });
  });

  describe('resumeTransfer', () => {
    it('should call resumeTransfer on Connect SDK', async () => {
      await resumeTransfer('transfer-uuid-789', {token: 'new-token'});

      const mock = getConnectMock();
      expect(mock.resumeTransfer).toHaveBeenCalledWith('transfer-uuid-789', {token: 'new-token'});
    });
  });

  describe('showSelectFileDialog', () => {
    it('should call showSelectFileDialogPromise on Connect SDK', async () => {
      await showSelectFileDialog({multiple: true});

      const mock = getConnectMock();
      expect(mock.showSelectFileDialogPromise).toHaveBeenCalledWith({multiple: true});
    });
  });

  describe('showSelectFolderDialog', () => {
    it('should call showSelectFolderDialogPromise on Connect SDK', async () => {
      await showSelectFolderDialog({multiple: false});

      const mock = getConnectMock();
      expect(mock.showSelectFolderDialogPromise).toHaveBeenCalledWith({multiple: false});
    });
  });

  describe('showAbout', () => {
    it('should call showAbout on Connect SDK', async () => {
      await showAbout();

      const mock = getConnectMock();
      expect(mock.showAbout).toHaveBeenCalled();
    });
  });

  describe('showPreferences', () => {
    it('should call showPreferences on Connect SDK', async () => {
      await showPreferences();

      const mock = getConnectMock();
      expect(mock.showPreferences).toHaveBeenCalled();
    });
  });

  describe('getAllTransfers', () => {
    it('should call getAllTransfers on Connect SDK', async () => {
      await getAllTransfers();

      const mock = getConnectMock();
      expect(mock.getAllTransfers).toHaveBeenCalled();
    });
  });

  describe('getTransfer', () => {
    it('should call getTransfer on Connect SDK', async () => {
      await getTransfer('transfer-uuid-abc');

      const mock = getConnectMock();
      expect(mock.getTransfer).toHaveBeenCalledWith('transfer-uuid-abc');
    });
  });

  describe('showDirectory', () => {
    it('should call showDirectory on Connect SDK', async () => {
      await showDirectory('transfer-uuid-def');

      const mock = getConnectMock();
      expect(mock.showDirectory).toHaveBeenCalledWith('transfer-uuid-def');
    });
  });

  describe('modifyTransfer', () => {
    it('should call modifyTransfer on Connect SDK', async () => {
      await modifyTransfer('transfer-uuid-ghi', {rate_policy: 'fair'});

      const mock = getConnectMock();
      expect(mock.modifyTransfer).toHaveBeenCalledWith('transfer-uuid-ghi', {rate_policy: 'fair'});
    });
  });

  describe('readAsArrayBuffer', () => {
    it('should call readAsArrayBuffer on Connect SDK', async () => {
      await readAsArrayBuffer('/path/to/image.png');

      const mock = getConnectMock();
      expect(mock.readAsArrayBuffer).toHaveBeenCalledWith({path: '/path/to/image.png'});
    });
  });

  describe('readChunkAsArrayBuffer', () => {
    it('should call readChunkAsArrayBuffer on Connect SDK', async () => {
      await readChunkAsArrayBuffer('/path/to/large-file.bin', 1024, 4096);

      const mock = getConnectMock();
      expect(mock.readChunkAsArrayBuffer).toHaveBeenCalledWith({
        path: '/path/to/large-file.bin',
        offset: 1024,
        chunkSize: 4096,
      });
    });
  });

  describe('getChecksum', () => {
    it('should call getChecksum on Connect SDK with default values', async () => {
      await getChecksum({path: '/path/to/file.txt'});

      const mock = getConnectMock();
      // Passes options as-is to Connect SDK
      expect(mock.getChecksum).toHaveBeenCalledWith({path: '/path/to/file.txt'});
    });

    it('should call getChecksum on Connect SDK with custom options', async () => {
      await getChecksum({
        path: '/path/to/large-file.bin',
        offset: 2048,
        chunkSize: 8192,
        checksumMethod: 'sha256',
      });

      const mock = getConnectMock();
      expect(mock.getChecksum).toHaveBeenCalledWith({
        path: '/path/to/large-file.bin',
        offset: 2048,
        chunkSize: 8192,
        checksumMethod: 'sha256',
      });
    });

    it('should call getChecksum on Connect SDK with sha1 algorithm', async () => {
      await getChecksum({
        path: '/path/to/document.pdf',
        checksumMethod: 'sha1',
      });

      const mock = getConnectMock();
      // Passes options as-is to Connect SDK
      expect(mock.getChecksum).toHaveBeenCalledWith({
        path: '/path/to/document.pdf',
        checksumMethod: 'sha1',
      });
    });

    it('should call getChecksum on Connect SDK with sha512 algorithm', async () => {
      await getChecksum({
        path: '/path/to/archive.zip',
        offset: 0,
        chunkSize: 1024,
        checksumMethod: 'sha512',
      });

      const mock = getConnectMock();
      expect(mock.getChecksum).toHaveBeenCalledWith({
        path: '/path/to/archive.zip',
        offset: 0,
        chunkSize: 1024,
        checksumMethod: 'sha512',
      });
    });
  });
});
