import './Views.scss';
import { Button, CodeSnippet } from '@carbon/react';
import { useEffect } from 'react';
import hljs from 'highlight.js';

export default function Test() {
  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{window.testAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <Button onClick={window.testAspera}>Test SDK</Button>
    </div>
  );
};
