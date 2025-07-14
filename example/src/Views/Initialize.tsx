import './Views.scss';
import { Button, CodeSnippet, TextInput } from '@carbon/react';
import { useEffect, useState } from 'react';
import hljs from 'highlight.js';

export default function Initialize() {
  const [gatewayServer, setGatewayServer] = useState('');

  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{window.initializeAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <TextInput id="gateway-server-id" className="code-input" value={gatewayServer} onChange={value => setGatewayServer(value.target.value)} labelText="HTTP Gateway URL" helperText="The HTTP Gateway Server to start up with Desktop" />
      <Button onClick={() => window.initializeAspera(false, gatewayServer, false)}>Initialize SDK</Button>
      <Button onClick={() => window.initializeAspera(true, gatewayServer, false)}>Initialize SDK (multi user)</Button>
    </div>
  );
};
