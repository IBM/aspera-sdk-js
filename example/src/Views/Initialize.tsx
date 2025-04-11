import './Views.scss';
import { Button, CodeSnippet } from '@carbon/react';
import { useEffect } from 'react';
import hljs from 'highlight.js';

export default function Initialize() {
  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{window.initializeAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <Button onClick={() => window.initializeAspera(false)}>Initialize SDK</Button>
      <Button onClick={() => window.initializeAspera(true)}>Initialize SDK (multi user)</Button>
    </div>
  );
};
