/**
 * Global type declarations for window object extensions.
 * These are the example functions made available globally.
 */

declare global {
  interface Window {
    // Example functions
    initializeAspera: (supportMulti: boolean, httpGatewayUrl?: string, forceHttpGateway?: boolean, forceConnect?: boolean) => void;
    testAspera: () => void;
    selectItemsAspera: (selectFolders: boolean) => void;
    selectAndPreviewImageAspera: () => void;
    startTransferAspera: (transferSpec: any) => void;
    setupDropAspera: (dropZone: string) => void;
    monitorTransfersAspera: () => Map<string, any>;
    removeTransferAspera: (transferId: string) => void;
    stopTransferAspera: (transferId: string) => void;
    resumeTransferAspera: (transferId: string) => void;
    showDirectoryAspera: (transferId: string) => void;
    transferInfoAspera: (transferId: string) => void;
    getInfoAspera: () => void;
    showPreferencesAspera: () => void;
    registerStatusCallbackAspera: () => void;
    installerAspera: () => void;

    // Global state used by examples
    selectedFiles: any[];
    imagePreviewData: any;
    selectedImagePath: string | null;
  }
}

export {};
