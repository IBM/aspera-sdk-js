import './Views.scss';
import { Button, CodeSnippet, TextInput } from '@carbon/react';
import { useEffect, useState } from 'react';
import hljs from 'highlight.js';

export default function Initialize() {
  const [gatewayServer, setGatewayServer] = useState(localStorage.getItem('ASPERA-SDK-GATEWAY') || '');

  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  const setGatewayUrl = (value: string): void => {
    localStorage.setItem('ASPERA-SDK-GATEWAY', value);
    setGatewayServer(value);
  }

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{window.initializeAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <Button onClick={() => window.initializeAspera(false, gatewayServer, false)}>Initialize SDK</Button>
      <Button onClick={() => window.initializeAspera(true, gatewayServer, false)}>Initialize SDK (multi user)</Button>
      <Button onClick={() => window.initializeAspera(true, gatewayServer, true)}>Initialize SDK (force gateway)</Button>
      <TextInput id="gateway-server-id" className="code-input" value={gatewayServer} onChange={value => setGatewayUrl(value.target.value)} labelText="HTTP Gateway URL" helperText="The HTTP Gateway Server to start up with Desktop" />
    </div>
  );
};
