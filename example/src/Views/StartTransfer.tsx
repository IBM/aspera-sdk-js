import './Views.scss';
import { Button, CodeSnippet, TextArea } from '@carbon/react';
import { useEffect, useState } from 'react';
import hljs from 'highlight.js';

export default function StartTransfer() {
  const [transferSpec, setTransferSpec] = useState('');

  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  const startTransfer = (): void => {
    try {
      window.startTransferAspera(JSON.parse(transferSpec));
    } catch (error) {
      console.error('Start transfer failed to parse transferSpec', {error, transferSpec});
      alert('Unable to parse transfer spec for starting transfer');
    }
  }

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{window.startTransferAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <TextArea className="code-input" value={transferSpec} onChange={value => setTransferSpec(value.target.value)} labelText="Transfer spec" helperText="Paste a transfer spec to test a transfer. For uploads be sure to select the items first on the 'Select items' page." />
      <Button onClick={startTransfer}>Start transfer</Button>
    </div>
  );
};
