import './Views.scss';
import { Button, CodeSnippet } from '@carbon/react';
import { getInfoAspera, showPreferencesAspera, registerStatusCallbackAspera, registerSafariExtensionStatusCallbackAspera } from './sdk-code';
import { useEffect } from 'react';
import hljs from 'highlight.js';

export default function Test() {
  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  const codeSnippet = [getInfoAspera.toString(), showPreferencesAspera.toString(), registerStatusCallbackAspera.toString(), registerSafariExtensionStatusCallbackAspera.toString()].join('\n\n')

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{codeSnippet}</CodeSnippet>
      <h2>Try it out</h2>
      <Button onClick={getInfoAspera}>Get info</Button>
      <Button onClick={showPreferencesAspera}>Open preferences</Button>
      <Button onClick={registerStatusCallbackAspera}>Monitor app status changes</Button>
      <Button onClick={registerSafariExtensionStatusCallbackAspera}>Monitor Safari Extension status changes</Button>
    </div>
  );
};
