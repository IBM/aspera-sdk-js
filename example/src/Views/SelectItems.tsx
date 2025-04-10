import './Views.scss';
import { Button, CodeSnippet, ListItem, UnorderedList } from '@carbon/react';
import { selectItemsAspera, selectedFiles } from './sdk-code';
import { useEffect, useReducer } from 'react';
import hljs from 'highlight.js';

let destroyed = false;

export default function SelectItems() {
  const [_, forceUpdate] = useReducer(x => x + 1, 0);

  const monitorFileChanges = (): void => {
    if (!destroyed) {
      forceUpdate();
      setTimeout(monitorFileChanges, 1000);
    }
  };

  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
    monitorFileChanges();

    return () => {
      destroyed = true;
    }
  }, []);

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{selectItemsAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <Button onClick={() => selectItemsAspera(false)}>Select files</Button>
      <Button onClick={() => selectItemsAspera(true)}>Select folders</Button>
      <div className="ending-content">
        {selectedFiles.length ? (
          <UnorderedList>
            {selectedFiles.map((file: {name: string; size: number; type: string}) => <ListItem>{file.name} ({file.size} - {file.type})</ListItem>)}
          </UnorderedList> ) : (
            <h4>No files selected</h4>
          )
        }
      </div>
    </div>
  );
};
