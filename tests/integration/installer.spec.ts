import {getInstallerInfo} from '../../src/index';
import {mockFetch, resetSdk, lastFetchCall} from '../test-helpers';

describe('getInstallerInfo', () => {
  const CLOUDFRONT_URL = 'https://downloads.ibmaspera.com/downloads/desktop/latest/stable';
  const OFFLINE_ENDPOINT = 'https://mycompany.example.com/aspera/installers';

  // Returns a fresh copy to avoid mutation across tests
  const getCloudFrontResponse = () => ({
    entries: [
      {version: '1.0.16', platform: 'macos', type: 'pkg', arch: 'universal', url: 'https://downloads.ibmaspera.com/downloads/desktop/macos/1.0.16/stable/universal/ibm-aspera-desktop-1.0.16.pkg'},
      {version: '1.0.16', platform: 'windows', type: 'exe', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.exe'},
      {version: '1.0.16', platform: 'windows', type: 'msi', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.msi'},
      {version: '1.0.16', platform: 'linux', type: 'appimage', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x86_64.AppImage'},
      {version: '1.0.16', platform: 'linux', type: 'deb', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-amd64.deb'},
    ],
  });

  const getOfflineResponse = () => ({
    entries: [
      {version: '1.0.16', platform: 'macos', type: 'pkg', arch: 'universal', url: 'macos/1.0.16/stable/universal/ibm-aspera-desktop-1.0.16.pkg'},
      {version: '1.0.16', platform: 'windows', type: 'exe', arch: 'x64', url: 'windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.exe'},
      {version: '1.0.16', platform: 'windows', type: 'msi', arch: 'x64', url: 'windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.msi'},
      {version: '1.0.16', platform: 'linux', type: 'appimage', arch: 'x64', url: 'linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x86_64.AppImage'},
      {version: '1.0.16', platform: 'linux', type: 'deb', arch: 'x64', url: 'linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-amd64.deb'},
    ],
  });

  afterEach(() => {
    resetSdk();
    jest.restoreAllMocks();
  });

  describe('CloudFront mode (default)', () => {
    it('should fetch from CloudFront latest.json', async () => {
      mockFetch(() => ({status: 200, body: getCloudFrontResponse()}));

      await getInstallerInfo({all: true});

      const call = lastFetchCall();
      expect(call.url).toBe(`${CLOUDFRONT_URL}/latest.json`);
      expect(call.method).toBe('GET');
    });

    it('should return all entries when options.all is true', async () => {
      mockFetch(() => ({status: 200, body: getCloudFrontResponse()}));

      const result = await getInstallerInfo({all: true});

      expect(result).toEqual({
        entries: [
          {version: '1.0.16', platform: 'macos', type: 'pkg', arch: 'universal', url: 'https://downloads.ibmaspera.com/downloads/desktop/macos/1.0.16/stable/universal/ibm-aspera-desktop-1.0.16.pkg'},
          {version: '1.0.16', platform: 'windows', type: 'exe', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.exe'},
          {version: '1.0.16', platform: 'windows', type: 'msi', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.msi'},
          {version: '1.0.16', platform: 'linux', type: 'appimage', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x86_64.AppImage'},
          {version: '1.0.16', platform: 'linux', type: 'deb', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-amd64.deb'},
        ],
      });
    });

    it('should filter entries by current platform when options.all is false', async () => {
      // Mock userAgent to return macOS
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      });

      mockFetch(() => ({status: 200, body: getCloudFrontResponse()}));

      const result = await getInstallerInfo();

      expect(result).toEqual({
        entries: [
          {
            version: '1.0.16',
            platform: 'macos',
            type: 'pkg',
            arch: 'universal',
            url: 'https://downloads.ibmaspera.com/downloads/desktop/macos/1.0.16/stable/universal/ibm-aspera-desktop-1.0.16.pkg',
          },
        ],
      });

      // Restore userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('should filter entries for Windows platform', async () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true,
      });

      mockFetch(() => ({status: 200, body: getCloudFrontResponse()}));

      const result = await getInstallerInfo();

      expect(result).toEqual({
        entries: [
          {version: '1.0.16', platform: 'windows', type: 'exe', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.exe'},
          {version: '1.0.16', platform: 'windows', type: 'msi', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.msi'},
        ],
      });

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('should filter entries for Linux platform', async () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64)',
        configurable: true,
      });

      mockFetch(() => ({status: 200, body: getCloudFrontResponse()}));

      const result = await getInstallerInfo();

      expect(result).toEqual({
        entries: [
          {version: '1.0.16', platform: 'linux', type: 'appimage', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x86_64.AppImage'},
          {version: '1.0.16', platform: 'linux', type: 'deb', arch: 'x64', url: 'https://downloads.ibmaspera.com/downloads/desktop/linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-amd64.deb'},
        ],
      });

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('should reject when fetch fails', async () => {
      mockFetch(() => {
        throw new Error('Network error');
      });

      await expect(getInstallerInfo({all: true})).rejects.toEqual({
        error: true,
        message: 'Unable to get latest installers',
      });
    });
  });

  describe('Offline mode (custom endpoint)', () => {
    it('should fetch from custom endpoint', async () => {
      mockFetch(() => ({status: 200, body: getOfflineResponse()}));

      await getInstallerInfo({endpoint: OFFLINE_ENDPOINT, all: true});

      const call = lastFetchCall();
      expect(call.url).toBe(`${OFFLINE_ENDPOINT}/latest.json`);
    });

    it('should prepend endpoint to relative URLs', async () => {
      mockFetch(() => ({status: 200, body: getOfflineResponse()}));

      const result = await getInstallerInfo({endpoint: OFFLINE_ENDPOINT, all: true});

      expect(result).toEqual({
        entries: [
          {version: '1.0.16', platform: 'macos', type: 'pkg', arch: 'universal', url: `${OFFLINE_ENDPOINT}/macos/1.0.16/stable/universal/ibm-aspera-desktop-1.0.16.pkg`},
          {version: '1.0.16', platform: 'windows', type: 'exe', arch: 'x64', url: `${OFFLINE_ENDPOINT}/windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.exe`},
          {version: '1.0.16', platform: 'windows', type: 'msi', arch: 'x64', url: `${OFFLINE_ENDPOINT}/windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.msi`},
          {version: '1.0.16', platform: 'linux', type: 'appimage', arch: 'x64', url: `${OFFLINE_ENDPOINT}/linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x86_64.AppImage`},
          {version: '1.0.16', platform: 'linux', type: 'deb', arch: 'x64', url: `${OFFLINE_ENDPOINT}/linux/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-amd64.deb`},
        ],
      });
    });

    it('should not modify URLs that are already absolute', async () => {
      // Mix of absolute and relative URLs
      const mixedResponse = {
        entries: [
          {version: '1.0.16', platform: 'macos', type: 'pkg', arch: 'universal', url: 'https://other-cdn.example.com/ibm-aspera-desktop-1.0.16.pkg'},
          {version: '1.0.16', platform: 'windows', type: 'exe', arch: 'x64', url: 'windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.exe'},
        ],
      };
      mockFetch(() => ({status: 200, body: mixedResponse}));

      const result = await getInstallerInfo({endpoint: OFFLINE_ENDPOINT, all: true});

      expect(result).toEqual({
        entries: [
          {version: '1.0.16', platform: 'macos', type: 'pkg', arch: 'universal', url: 'https://other-cdn.example.com/ibm-aspera-desktop-1.0.16.pkg'},
          {version: '1.0.16', platform: 'windows', type: 'exe', arch: 'x64', url: `${OFFLINE_ENDPOINT}/windows/1.0.16/stable/x64/ibm-aspera-desktop-1.0.16-x64.exe`},
        ],
      });
    });

    it('should strip /latest.json from endpoint if provided', async () => {
      mockFetch(() => ({status: 200, body: getOfflineResponse()}));

      await getInstallerInfo({endpoint: `${OFFLINE_ENDPOINT}/latest.json`, all: true});

      const call = lastFetchCall();
      expect(call.url).toBe(`${OFFLINE_ENDPOINT}/latest.json`);
    });

    it('should reject when endpoint is not a valid URL', async () => {
      await expect(getInstallerInfo({endpoint: 'not-a-valid-url'})).rejects.toEqual({
        error: true,
        message: 'The specified endpoint is not a valid URL',
      });
    });
  });
});
