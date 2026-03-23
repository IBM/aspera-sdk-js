import './Views.scss';
import { Button, CodeSnippet, Dropdown, TextInput } from '@carbon/react';
import { useEffect, useState } from 'react';
import hljs from 'highlight.js';

const preferencePages = [
  {id: 'general', text: 'General'},
  {id: 'transfers', text: 'Transfers'},
  {id: 'network', text: 'Network'},
  {id: 'bandwidth', text: 'Bandwidth'},
  {id: 'security', text: 'Security'},
];

export default function UI() {
  const [selectedPage, setSelectedPage] = useState(preferencePages[0]);
  const [monitorTransferId, setMonitorTransferId] = useState('');

  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  const codeSnippet = [window.showAboutAspera.toString(), window.showPreferencesAspera.toString(), window.showTransferManagerAspera.toString(), window.showTransferMonitorAspera.toString(), window.openPreferencesPageAspera.toString()].join('\n\n');

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>
        {codeSnippet}
      </CodeSnippet>
      <h2>Try it out</h2>
      <Button onClick={window.showAboutAspera}>Open About</Button>
      <Button onClick={window.showPreferencesAspera}>Open Preferences</Button>
      <Button onClick={window.showTransferManagerAspera}>Open Transfer Manager</Button>
      <div style={{marginTop: '1rem', display: 'flex', alignItems: 'flex-end', gap: '1rem'}}>
        <TextInput
          id="transfer-monitor-id"
          labelText="Transfer ID"
          placeholder="Enter transfer ID"
          value={monitorTransferId}
          onChange={(e: any) => setMonitorTransferId(e.target.value)}
          style={{minWidth: '14rem'}}
        />
        <Button onClick={() => window.showTransferMonitorAspera(monitorTransferId)}>Open Transfer Monitor</Button>
      </div>
      <div style={{marginTop: '1rem', display: 'flex', alignItems: 'flex-end', gap: '1rem'}}>
        <Dropdown
          id="preferences-page-dropdown"
          titleText="Preferences page"
          label="Select a page"
          items={preferencePages}
          itemToString={(item: any) => item?.text || ''}
          selectedItem={selectedPage}
          onChange={({selectedItem}: any) => setSelectedPage(selectedItem)}
          style={{minWidth: '14rem'}}
        />
        <Button onClick={() => window.openPreferencesPageAspera(selectedPage.id)}>Open Preferences Page</Button>
      </div>
    </div>
  );
}
