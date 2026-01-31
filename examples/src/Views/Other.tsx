import './Views.scss';
import { Button, CodeSnippet } from '@carbon/react';
import { useEffect } from 'react';
import hljs from 'highlight.js';

export default function Test() {
  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  const codeSnippet = [window.getInfoAspera.toString(), window.showPreferencesAspera.toString(), window.registerStatusCallbackAspera.toString()].join('\n\n')

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{codeSnippet}</CodeSnippet>
      <h2>Try it out</h2>
      <Button onClick={window.getInfoAspera}>Get info</Button>
      <Button onClick={window.showPreferencesAspera}>Open preferences</Button>
      <Button onClick={window.registerStatusCallbackAspera}>Status changes</Button>
    </div>
  );
};
