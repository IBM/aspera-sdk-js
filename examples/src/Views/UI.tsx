import './Views.scss';
import { Button, CodeSnippet } from '@carbon/react';
import { useEffect } from 'react';
import hljs from 'highlight.js';

export default function UI() {
  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  const codeSnippet = [window.showAboutAspera.toString(), window.showPreferencesAspera.toString(), window.showTransferManagerAspera.toString()].join('\n\n');

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
    </div>
  );
}
