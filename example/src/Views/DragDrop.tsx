import './Views.scss';
import { Button, CodeSnippet } from '@carbon/react';
import { setupDropAspera } from './sdk-code';
import { useEffect } from 'react';
import hljs from 'highlight.js';

export default function DragDrop() {
  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{setupDropAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <div className="drop-zone" id="drop-zone">
        Drag and drop files here
      </div>
      <Button onClick={() => setupDropAspera('#drop-zone')}>Setup Drag & drop</Button>
    </div>
  );
};
