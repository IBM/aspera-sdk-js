import './Views.scss';
import { getAllTransfers } from '@ibm-aspera/sdk';
import { CodeSnippet, UnorderedList, ListItem, Link, Button } from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { iterableToArray } from '../helpers';
import { useEffect, useReducer } from 'react';
import hljs from 'highlight.js';

let transfers: Map<string, any> = new Map();
let destroyed = false;

export default function MonitorTransfers() {
  const [_, forceUpdate] = useReducer(x => x + 1, 0);

  const monitorTransfers = (): void => {
    if (!destroyed) {
      forceUpdate();
      setTimeout(monitorTransfers, 1000);
    }
  }

  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
    transfers = window.monitorTransfersAspera();
    monitorTransfers();

    // Unmount cleanup
    return () => {
      destroyed = true;
    }
  }, []);

  const reloadTransfers = (): void => {
    getAllTransfers().then((transferUpdate: any[]) => {
      transferUpdate.forEach(item => {
        transfers.set(item.uuid, item);
      });
    }).catch((error: unknown) => {
      console.error('Could not get all transfers on reload', error);
    });
  }

  const removeTransfer = (transferId: string): void => {
    transfers.delete(transferId);
    window.removeTransferAspera(transferId);
  }

  const getTransferContent = (transfer: any): React.ReactNode => {
    const running = (transfer.status === 'running' || transfer.status === 'queued') && !transfer.httpGatewayTransfer;
    const canResume = transfer.status === 'paused' && !transfer.httpGatewayTransfer;
    const canOpen = transfer.status === 'completed' && transfer.transfer_spec.direction === 'receive' && !transfer.httpGatewayTransfer;

    return (
      <ListItem className="transfer-row" key={transfer.uuid} title={transfer.uuid}>
        {transfer.status} - {(transfer.percentage * 100).toFixed(1)}%
        <Link onClick={() => removeTransfer(transfer.uuid)}>Remove</Link>
        {running && <Link onClick={() => window.stopTransferAspera(transfer.uuid)}>Stop</Link>}
        {canResume && <Link onClick={() => window.resumeTransferAspera(transfer.uuid)}>Resume</Link>}
        {canOpen && <Link onClick={() => window.showDirectoryAspera(transfer.uuid)}>Show local</Link>}
        <Link onClick={() => window.transferInfoAspera(transfer.uuid)}>Info</Link>
      </ListItem>
    );
  }

  const transferArray = iterableToArray(transfers.values());
  const codeSnippet = [window.monitorTransfersAspera.toString(), window.removeTransferAspera.toString(), window.stopTransferAspera.toString(), window.resumeTransferAspera.toString(), window.showDirectoryAspera.toString(), window.transferInfoAspera.toString()].join('\n\n')

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{codeSnippet}</CodeSnippet>
      <h2>See it in action</h2>
      <div className="ending-content">
        {transferArray.length ? (
          <UnorderedList>
            {transferArray.map(transfer => getTransferContent(transfer))}
          </UnorderedList> ) : (
            <h4>
              No transfers
              <Button kind="ghost" aria-label="Reload transfers" iconDescription="Reload transfers" hasIconOnly={true} renderIcon={Renew} size="sm" style={{marginLeft: '1rem'}} onClick={reloadTransfers} />
            </h4>
          )
        }
      </div>
    </div>
  );
};
