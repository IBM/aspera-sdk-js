import './Views.scss';
import { Button, CodeSnippet } from '@carbon/react';
import { selectItemsAspera } from './sdk-code';
import { useEffect } from 'react';
import hljs from 'highlight.js';

export default function SelectItems() {
  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{selectItemsAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <Button onClick={() => selectItemsAspera(false)}>Select files</Button>
      <Button onClick={() => selectItemsAspera(true)}>Select folders</Button>
    </div>
  );
};
