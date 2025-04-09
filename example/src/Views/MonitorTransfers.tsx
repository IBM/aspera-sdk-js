import './Views.scss';
import { CodeSnippet, UnorderedList, ListItem, Link } from '@carbon/react';
import { iterableToArray } from '../helpers';
import { monitorTransfersAspera, removeTransferAspera, stopTransferAspera, resumeTransferAspera, showDirectoryAspera, transferInfoAspera } from './sdk-code';
import { useEffect, useReducer } from 'react';
import hljs from 'highlight.js';

export default function MonitorTransfers() {
  const [_, forceUpdate] = useReducer(x => x + 1, 0);

  let transfers: Map<string, any> = new Map();
  let destroyed = false;

  const monitorTransfers = (): void => {
    if (!destroyed) {
      forceUpdate();

      setTimeout(monitorTransfers, 3000);
    }
  }

  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();

    transfers = monitorTransfersAspera();
    monitorTransfers();

    // Unmount cleanup
    return () => {
      destroyed = true;
    }
  }, []);

  const getTransferContent = (transfer: any): React.ReactNode => {
    const running = transfer.status === 'running' || transfer.status === 'queued';
    const canResume = transfer.status === 'paused';
    const canOpen = transfer.status === 'completed' && transfer.transfer_spec.direction === 'receive';

    return (
      <ListItem key={transfer.uuid} title={transfer.uuid}>
        {transfer.status} - {(transfer.percentage * 100).toFixed(2)}%
        <Link onClick={() => removeTransferAspera(transfer.uuid)}>Remove</Link>
        {running && <Link onClick={() => stopTransferAspera(transfer.uuid)}>Stop</Link>}
        {canResume && <Link onClick={() => resumeTransferAspera(transfer.uuid)}>Resume</Link>}
        {canOpen && <Link onClick={() => showDirectoryAspera(transfer.uuid)}>Show local</Link>}
        <Link onClick={() => transferInfoAspera(transfer.uuid)}>Info</Link>
      </ListItem>
    );
  }

  const transferArray = iterableToArray(transfers.values());

  const codeSnippet = [monitorTransfersAspera.toString(), removeTransferAspera.toString(), stopTransferAspera.toString(), resumeTransferAspera.toString(), showDirectoryAspera.toString(), transferInfoAspera.toString()].join('\n\n')

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{codeSnippet}</CodeSnippet>
      <h2>See it in action</h2>
      <div className="ending-content">
        {transferArray.length ? <UnorderedList>{transferArray.map(transfer => getTransferContent(transfer))}</UnorderedList> : <h4>No transfers</h4>}
      </div>
    </div>
  );
};
