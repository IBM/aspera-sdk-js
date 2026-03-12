import './Views.scss';
import { Button, CodeSnippet, Dropdown, TextInput } from '@carbon/react';
import { useEffect, useState } from 'react';
import hljs from 'highlight.js';

type ChecksumMethod = 'md5'|'sha1'|'sha256'|'sha512';
const checksumMethods: ChecksumMethod[] = ['md5', 'sha1', 'sha256', 'sha512'];

export default function FileChecksum() {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [checksumData, setFileChecksum] = useState<{checksum: string; checksumMethod: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checksumMethod, setChecksumMethod] = useState<ChecksumMethod>('md5');
  const [offset, setOffset] = useState<string>('0');
  const [chunkSize, setChunkSize] = useState<string>('0');

  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  const handleSelectAndCalculateChecksum = async () => {
    setLoading(true);
    setError(null);
    setFileChecksum(null);
    setSelectedFile('');

    try {
      await window.selectAndCalculateChecksumAspera({
        checksumMethod,
        offset: Number(offset) || 0,
        chunkSize: Number(chunkSize) || 0,
      });
    } catch (err) {
      console.error('Failed to select and get file checksum', err);
    } finally {
      setLoading(false);
    }
  };

  // Listen for updates from the window object
  useEffect(() => {
    const checkForData = setInterval(() => {
      if (window.checksumData) {
        setFileChecksum(window.checksumData);
        window.checksumData = null;
      }
      if (window.selectedFilePath) {
        setSelectedFile(window.selectedFilePath);
        window.selectedFilePath = null;
      }
    }, 100);

    return () => clearInterval(checkForData);
  }, []);

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{window.selectAndCalculateChecksumAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <div className="input-group">
        <Dropdown
          id="checksum-method"
          titleText="Checksum Method"
          label="Select method"
          items={[...checksumMethods]}
          selectedItem={checksumMethod}
          onChange={({ selectedItem }) => selectedItem && setChecksumMethod(selectedItem)}
        />
        <TextInput id="checksum-offset" className="code-input" value={offset} onChange={e => setOffset(e.target.value)} labelText="Offset" helperText="Byte offset to start reading from" />
        <TextInput id="checksum-chunk-size" className="code-input" value={chunkSize} onChange={e => setChunkSize(e.target.value)} labelText="Chunk Size" helperText="Number of bytes to read. 0 reads the entire file" />
        <Button
          onClick={handleSelectAndCalculateChecksum}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'File Checksum'}
        </Button>
      </div>
      <div className="ending-content">
        {error && (
          <div className="error-message">
            <h4>Error</h4>
            <p>{error}</p>
          </div>
        )}
        {checksumData && (
          <div>
            <p><strong>Method:</strong> {checksumData.checksumMethod}</p>
            <p><strong>Checksum:</strong> {checksumData.checksum}</p>
          </div>
        )}
        {selectedFile && (
          <div>
            <p><strong>File:</strong> {selectedFile}</p>
          </div>
        )}
      </div>
    </div>
  );
}
