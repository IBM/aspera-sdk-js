import {isSafari} from './helpers';

/**
 * Lightweight check for the Connect browser extension.
 * Does NOT launch Connect — only checks if the extension is installed.
 *
 * Chrome/Firefox/Edge: dispatches AsperaConnectCheck, listens for window message
 * Safari: dispatches AsperaConnectCheck, listens for document event
 */
export const detectConnectExtension = (timeoutMs: number): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);

    if (isSafari()) {
      const handler = (): void => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          document.removeEventListener('AsperaConnectCheckResponse', handler);
          resolve(true);
        }
      };
      document.addEventListener('AsperaConnectCheckResponse', handler);
    } else {
      const handler = (evt: MessageEvent): void => {
        if (
          !resolved &&
          typeof evt.data === 'object' &&
          evt.data?.type === 'AsperaConnectCheckResponse'
        ) {
          resolved = true;
          clearTimeout(timer);
          window.removeEventListener('message', handler);
          resolve(true);
        }
      };
      window.addEventListener('message', handler);
    }

    // Poll interval self-cleans via the resolved flag
    const poll = setInterval(() => {
      if (resolved) {
        clearInterval(poll);
        return;
      }
      document.dispatchEvent(new CustomEvent('AsperaConnectCheck'));
    }, 200);

    // Fire immediately
    document.dispatchEvent(new CustomEvent('AsperaConnectCheck'));
  });
};
