import './Views.scss';
import { Button, CodeSnippet, Dropdown, ListItem, TextInput, UnorderedList } from '@carbon/react';
import { useEffect, useReducer, useState } from 'react';
import hljs from 'highlight.js';

const MAX_VISIBLE_ENTRIES = 5;

const entryTypeOptions = [
  { id: 'all', text: 'All' },
  { id: 'file', text: 'Files only' },
  { id: 'directory', text: 'Directories only' },
];

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

let destroyed = false;

export default function SelectItems() {
  const [_, forceUpdate] = useReducer(x => x + 1, 0);

  // Read directory state
  const [dirPath, setDirPath] = useState<string>('');
  const [depth, setDepth] = useState<string>('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>('all');
  const [namePattern, setNamePattern] = useState<string>('');
  const [directoryData, setDirectoryData] = useState<any>(null);
  const [dirLoading, setDirLoading] = useState(false);

  const monitorFileChanges = (): void => {
    if (!destroyed) {
      forceUpdate();
      setTimeout(monitorFileChanges, 1000);
    }
  };

  useEffect(() => {
    document.querySelectorAll('.cds--snippet-container > pre > code').forEach(el => el.classList.add('language-javascript'));
    hljs.highlightAll();
    monitorFileChanges();

    return () => {
      destroyed = true;
    }
  }, []);

  // Poll for directory data updates
  useEffect(() => {
    const checkForData = setInterval(() => {
      if (window.directoryData) {
        setDirectoryData(window.directoryData);
        window.directoryData = null;
        setDirLoading(false);
      }
      if (window.directoryError) {
        window.directoryError = null;
        setDirLoading(false);
      }
    }, 100);

    return () => clearInterval(checkForData);
  }, []);

  const handleReadDirectory = () => {
    setDirLoading(true);
    setDirectoryData(null);

    const options: any = { path: dirPath };
    if (depth !== '') {
      options.depth = Number(depth);
    }

    const filters: any = {};
    if (entryTypeFilter !== 'all') {
      filters.type = entryTypeFilter;
    }
    if (namePattern) {
      filters.namePattern = namePattern;
    }
    if (Object.keys(filters).length > 0) {
      options.filters = filters;
    }

    window.readDirectoryAspera(options);
  };

  const codeSnippet = [window.selectItemsAspera.toString(), window.showSaveFileDialogAspera.toString(), window.readDirectoryAspera.toString()].join('\n\n');

  const visibleEntries = directoryData?.entries.slice(0, MAX_VISIBLE_ENTRIES) ?? [];
  const totalEntries = directoryData?.totalCount ?? 0;
  const hiddenCount = totalEntries - visibleEntries.length;

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{codeSnippet}</CodeSnippet>
      <h2>Try it out</h2>
      <Button onClick={() => window.selectItemsAspera(false)}>Select files</Button>
      <Button onClick={() => window.selectItemsAspera(true)}>Select folder</Button>
      <Button onClick={() => window.showSaveFileDialogAspera()}>Save file dialog</Button>
      <div className="ending-content">
        {window.selectedFiles.length ? (
          <UnorderedList>
            {window.selectedFiles.map((file: {name: string; size: number; type: string}, index: number) => <ListItem key={index}>{file.name} ({file.size} - {file.type})</ListItem>)}
          </UnorderedList> ) : (
            <h4>No files selected</h4>
          )
        }
      </div>

      <h3 style={{marginTop: '2rem'}}>Read directory</h3>
      <p style={{marginBottom: '1.5rem'}}>First select a folder above, then enter the returned path below to enumerate its contents.</p>
      <div className="input-group">
        <TextInput
          id="dir-path"
          className="code-input"
          value={dirPath}
          onChange={e => setDirPath(e.target.value)}
          labelText="Path"
          helperText="Absolute path to the directory to read"
        />
        <TextInput
          id="dir-depth"
          className="code-input"
          value={depth}
          onChange={e => setDepth(e.target.value)}
          labelText="Depth"
          helperText="Max recursion depth. 0 = direct children only. Leave empty for full traversal."
        />
        <Dropdown
          id="dir-entry-type"
          titleText="Entry type"
          label="Select type"
          items={entryTypeOptions}
          itemToString={(item: any) => item?.text ?? ''}
          selectedItem={entryTypeOptions.find(o => o.id === entryTypeFilter)}
          onChange={({ selectedItem }: any) => selectedItem && setEntryTypeFilter(selectedItem.id)}
        />
        <TextInput
          id="dir-name-pattern"
          className="code-input"
          value={namePattern}
          onChange={e => setNamePattern(e.target.value)}
          labelText="Name pattern"
          helperText='Glob pattern for file names (e.g., "*.pdf")'
        />
        <Button onClick={handleReadDirectory} disabled={dirLoading || !dirPath}>
          {dirLoading ? 'Loading...' : 'Read directory'}
        </Button>
      </div>

      <div className="ending-content">
        {directoryData && directoryData.entries.length > 0 && (
          <div className="directory-listing">
            <div className="directory-header">
              <span className="entry-type">Type</span>
              <span className="entry-path">Path</span>
              <span className="entry-size">Size</span>
            </div>
            {visibleEntries.map((entry: any, i: number) => (
              <div key={i} className="directory-entry">
                <span className="entry-type">{entry.type === 'directory' ? 'dir' : 'file'}</span>
                <span className="entry-path">{entry.relativePath}</span>
                <span className="entry-size">{entry.type === 'file' ? formatSize(entry.size) : '--'}</span>
              </div>
            ))}
            {hiddenCount > 0 && (
              <div className="directory-overflow">
                ... {hiddenCount} remaining {hiddenCount === 1 ? 'entry' : 'entries'}
              </div>
            )}
            <div className="directory-total">
              {totalEntries} total {totalEntries === 1 ? 'entry' : 'entries'}
            </div>
          </div>
        )}
        {directoryData && directoryData.entries.length === 0 && (
          <h4>No entries found</h4>
        )}
      </div>
    </div>
  );
};
