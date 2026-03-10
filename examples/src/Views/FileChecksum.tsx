import './Views.scss';
import { Button, CodeSnippet } from '@carbon/react';
import { useEffect, useState } from 'react';
import hljs from 'highlight.js';

export default function FileChecksum() {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [checksumData, setFileChecksum] = useState<{data: string; type: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      await window.selectAndCalculateChecksumAspera();
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
            <p>{checksumData.data}</p>
          </div>
        )}
        {selectedFile && (
          <div>
            <p>{selectedFile}</p>
          </div>
        )}
      </div>
    </div>
  );
}
